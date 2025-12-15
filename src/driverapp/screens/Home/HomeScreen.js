import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  Text,
  Image,
  PermissionsAndroid,
  Platform,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { useDispatch, useSelector } from 'react-redux';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';

import {
  useTheme,
  useTranslations,
  EmptyStateView,
} from '../../../core/dopebase';

import dynamicStyles from './styles';
import Hamburger from '../../../components/Hamburger/Hamburger';
import { setUserData } from '../../../core/onboarding/redux/auth';
import { updateUser } from '../../../core/users';
import { getDistance } from '../../../core/location';

import {
  useDriverRequest,
  useDriverRequestMutations,
  useOrders,
} from '../../api';

import {
  NewOrderRequestModal,
  OrderPreviewCard,
} from '../../components';

import { getDirections } from '../../../core/delivery/api/directions';
import { useConfig } from '../../../config';

function HomeScreen(props) {
  const { navigation } = props;
  const { localized } = useTranslations();
  const { theme, appearance } = useTheme();
  const styles = dynamicStyles(theme, appearance);

  const config = useConfig();
  const dispatch = useDispatch();

  const currentUser = useSelector(state => state.auth.user);
  const { orders } = useOrders(config, currentUser?.id);

  const { inProgressOrderID, orderRequest, updatedDriver } =
    useDriverRequest(config, currentUser?.id);

  const { accept, reject, goOffline, goOnline } =
    useDriverRequestMutations(config);

  const [isWaitingForOrders, setIsWaitingForOrders] = useState(false);
  const [region, setRegion] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [positionWatchID, setPositionWatchID] = useState(null);
  const [isPolylineLoading, setIsPolylineLoading] = useState(false);

  const mapRef = useRef(null);

  // -------------------------------------------------------
  // HEADER SETUP
  // -------------------------------------------------------
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <Text style={styles.headerStyle}>{localized('Home')}</Text>,
      headerLeft: () => <Hamburger onPress={() => navigation.openDrawer()} />,
      headerRight: () => (
        <TouchableOpacity style={styles.logoutButton} onPress={onGoOffline}>
          <Image
            source={require('../../../assets/icons/shutdown.png')}
            style={styles.logoutButtonImage}
          />
        </TouchableOpacity>
      ),
    });
  }, []);

  // -------------------------------------------------------
  // DRIVER STATE → ONLINE/OFFLINE UI
  // -------------------------------------------------------
  useEffect(() => {
    if (!orderRequest && !inProgressOrderID && updatedDriver?.isActive) {
      setIsWaitingForOrders(true);
      setRouteCoordinates([]);
    } else {
      setIsWaitingForOrders(false);
    }

    if (updatedDriver) {
      dispatch(setUserData({ user: updatedDriver }));
    }
  }, [inProgressOrderID, orderRequest, updatedDriver]);

  // -------------------------------------------------------
  // SET INITIAL USER MAP POSITION
  // -------------------------------------------------------
  useEffect(() => {
    if (!currentUser?.location) return;

    setRegion({
      latitude: currentUser.location.latitude,
      longitude: currentUser.location.longitude,
      latitudeDelta: 0.00922,
      longitudeDelta: 0.00421,
    });
  }, [currentUser?.id]);

  // -------------------------------------------------------
  // CLEAR POLYLINE ON APP LOAD IF ORDER NOT IN TRANSIT
  // -------------------------------------------------------
  useEffect(() => {
    if (currentUser?.inProgressOrderID) {
      const activeOrder = orders?.[0];
      if (!activeOrder || activeOrder.status !== 'In Transit') {
        setRouteCoordinates([]);
      }
    }
  }, []);

  // Cleanup Geolocation
  useEffect(() => {
    return () => {
      if (positionWatchID != null) Geolocation.clearWatch(positionWatchID);
    };
  }, [positionWatchID]);

  // -------------------------------------------------------
  // MAIN MAP EFFECT → ONLY IN TRANSIT
  // -------------------------------------------------------
  useEffect(() => {
    if (!orders?.length) {
      if (positionWatchID) Geolocation.clearWatch(positionWatchID);
      setRouteCoordinates([]);
      return;
    }

    const activeOrder = orders[0];

    if (activeOrder.status === 'In Transit') {
      computePolylineCoordinates([activeOrder]);
      trackDriverLocation();
    } else {
      setRouteCoordinates([]);
      if (positionWatchID) Geolocation.clearWatch(positionWatchID);
    }
  }, [orders]);

  // -------------------------------------------------------
  // BUTTON HANDLERS
  // -------------------------------------------------------
  const onGoOnline = () => goOnline(currentUser.id);
  const onGoOffline = () => goOffline(currentUser.id);

  const onMessagePress = () => {
    const order = orders[0];
    const customerID = order.author?.id;
    const viewerID = currentUser.id;

    let channel = {
      id: viewerID < customerID ? viewerID + customerID : customerID + viewerID,
      participants: [order.author],
    };

    props.navigation.navigate('PersonalChat', { channel });
  };

  const emptyStateConfig = {
    title: localized("You're offline"),
    description: localized(
      'Go online in order to start getting delivery requests.'
    ),
    callToAction: localized('Go Online'),
    onPress: onGoOnline,
  };

  const onAcceptNewOrder = () =>
    orderRequest && accept(orderRequest, currentUser);
  const onRejectNewOrder = () =>
    orderRequest && reject(orderRequest, currentUser);

  // -------------------------------------------------------
  // POLYLINE COMPUTATION + LOADING + DESTINATION MARKER
  // -------------------------------------------------------
  const computePolylineCoordinates = useCallback(
    orders => {
      if (!orders?.length || !currentUser?.location) {
        setRouteCoordinates([]);
        return;
      }

      const order = orders[0];
      const driver = currentUser;

      const sourceCoordinate = {
        latitude: driver.location.latitude,
        longitude: driver.location.longitude,
      };

      let destCoordinate = null;

      if (order.status === 'Order Shipped' && order.vendor) {
        destCoordinate = {
          latitude: order.vendor.latitude,
          longitude: order.vendor.longitude,
        };
      } else if (order.status === 'In Transit') {
        const destLocation = order.address?.location || order.author?.location;
        if (destLocation) {
          destCoordinate = {
            latitude: destLocation.latitude,
            longitude: destLocation.longitude,
          };
        }
      }

      if (!destCoordinate) {
        setRouteCoordinates([]);
        return;
      }

      setIsPolylineLoading(true);
      try {
        getDirections(sourceCoordinate, destCoordinate, config.googleAPIKey, coords => {
          const safeCoords = Array.isArray(coords) ? coords : [];
          setIsPolylineLoading(false);

          // Always show destination marker
          if (safeCoords.length < 2) {
            setRouteCoordinates([sourceCoordinate, destCoordinate]);
            return;
          }

          setRouteCoordinates(safeCoords);

          if (mapRef.current) {
            setTimeout(() => {
              mapRef.current.fitToCoordinates(safeCoords, {
                edgePadding: { top: 80, bottom: 80, left: 80, right: 80 },
                animated: true,
              });
            }, 300);
          }
        });
      } catch (error) {
        console.log('computePolylineCoordinates error:', error);
        setIsPolylineLoading(false);
        setRouteCoordinates([sourceCoordinate, destCoordinate]);
      }
    },
    [currentUser, config.googleAPIKey]
  );

  // -------------------------------------------------------
  // REAL-TIME POLYLINE UPDATES
  // -------------------------------------------------------
  const updatePolyline = useCallback(
    coords => {
      try {
        if (
          !orders?.length ||
          !Array.isArray(routeCoordinates) ||
          routeCoordinates.length < 2
        ) {
          computePolylineCoordinates(orders);
          return;
        }

        const firstPoint = routeCoordinates[0];
        const distance = getDistance(
          firstPoint.latitude,
          firstPoint.longitude,
          coords.latitude,
          coords.longitude
        );

        // Remove first point if driver moved past it for smooth animation
        if (distance < 1) {
          setRouteCoordinates(prev => prev.slice(1));
        } else if (distance > 2) {
          computePolylineCoordinates(orders);
        }

        // Stop polyline at the end
        const lastPoint = routeCoordinates[routeCoordinates.length - 1];
        const destLocation = orders[0]?.address?.location || orders[0]?.author?.location;
        if (lastPoint.latitude === destLocation?.latitude &&
            lastPoint.longitude === destLocation?.longitude) {
          Geolocation.clearWatch(positionWatchID);
        }
      } catch (error) {
        console.log('updatePolyline failed:', error);
      }
    },
    [orders, routeCoordinates, computePolylineCoordinates, positionWatchID]
  );

  // -------------------------------------------------------
  // LOCATION TRACKING
  // -------------------------------------------------------
  const watchPosition = () => {
    return Geolocation.watchPosition(
      position => {
        const coords = position.coords;
        if (!coords) return;

        const locationDict = {
          location: { latitude: coords.latitude, longitude: coords.longitude },
        };

        dispatch(setUserData({ user: { ...currentUser, ...locationDict } }));
        updateUser(currentUser.id, locationDict);
        updatePolyline(coords);

        setRegion(prev => ({
          ...prev,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));
      },
      error => console.log("Location Error:", error),
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 1000,
        distanceFilter: 10,
      }
    );
  };

  const handleAndroidLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setPositionWatchID(watchPosition());
      }
    } catch (err) {
      console.log(err);
    }
  };

  const trackDriverLocation = () => {
    if (Platform.OS === 'ios') {
      setPositionWatchID(watchPosition());
    } else {
      handleAndroidLocationPermission();
    }
  };

  // -------------------------------------------------------
  // RENDER MAP ELEMENTS
  // -------------------------------------------------------
  const renderMapElements = () => {
    if (!orders?.length || !Array.isArray(routeCoordinates)) return null;

    return (
      <React.Fragment key={'map_elements'}>
        {routeCoordinates.length >= 2 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={5}
            strokeColor="#0000FF"
          />
        )}

        {/* DRIVER MARKER */}
        <Marker
          title={currentUser.firstName}
          coordinate={{
            latitude: currentUser.location.latitude,
            longitude: currentUser.location.longitude,
          }}
        >
          <Image
            source={require('../../../core/delivery/assets/car-icon.png')}
            style={styles.mapCarIcon}
          />
        </Marker>

        {/* DESTINATION MARKER */}
        {routeCoordinates.length > 0 && (
          <Marker
            coordinate={routeCoordinates[routeCoordinates.length - 1]}
          >
            <Image
              source={require('../../../core/delivery/assets/destination-icon.png')}
              style={styles.mapCarIcon}
            />
          </Marker>
        )}
      </React.Fragment>
    );
  };

  // -------------------------------------------------------
  // MAIN RENDER
  // -------------------------------------------------------
  if (currentUser && !currentUser.isActive) {
    return (
      <View style={styles.inactiveViewContainer}>
        <EmptyStateView emptyStateConfig={emptyStateConfig} />
      </View>
    );
  }

  if (currentUser?.isActive) {
    return (
      <View style={styles.container}>
        <MapView
          key={routeCoordinates.length} // forces re-render on polyline update
          ref={mapRef}
          region={region}
          showsUserLocation={true}
          provider={Platform.OS === 'ios' ? null : PROVIDER_GOOGLE}
          style={styles.mapStyle}
        >
          {renderMapElements()}
        </MapView>

        {/* LOADING INDICATOR */}
        {isPolylineLoading && (
          <View style={styles.polylineLoading}>
            <ActivityIndicator size="large" color="#0000FF" />
          </View>
        )}

        {orderRequest && (
          <NewOrderRequestModal
            onAccept={onAcceptNewOrder}
            onReject={onRejectNewOrder}
            isVisible={!!orderRequest}
            onModalHide={onRejectNewOrder}
          />
        )}

        {orders && currentUser.inProgressOrderID && (
          <OrderPreviewCard
            onMessagePress={onMessagePress}
            driver={currentUser}
            order={orders}
          />
        )}
      </View>
    );
  }

  return null;
}

export default HomeScreen;
