import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  Text,
  Image,
  PermissionsAndroid,
  Platform,
  View,
  TouchableOpacity,
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

  // ⭐ NEW: MAP REF FOR AUTO-ZOOMING ⭐
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

  // Cleanup Geolocation
  useEffect(() => {
    return () => {
      if (positionWatchID != null) Geolocation.clearWatch(positionWatchID);
    };
  }, [positionWatchID]);

  // -------------------------------------------------------
  // MAIN MAP EFFECT
  // -------------------------------------------------------
  useEffect(() => {
    if (orders?.length > 0) {
      computePolylineCoordinates(orders);

      if (currentUser?.inProgressOrderID) {
        trackDriverLocation();
      }
    } else {
      if (positionWatchID) Geolocation.clearWatch(positionWatchID);
      setRouteCoordinates([]);
    }
  }, [orders]);

  // -------------------------------------------------------
  // BUTTON HANDLERS
  // -------------------------------------------------------
  const onGoOnline = () => {
    goOnline(currentUser.id).catch(error => {
      console.log('Go online error:', error);
    });
  };
  
  const onGoOffline = () => {
    goOffline(currentUser.id).catch(error => {
      console.log('Go offline error:', error);
    });
  };

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

  const onAcceptNewOrder = () => {
    if (orderRequest) {
      accept(orderRequest, currentUser).catch(error => {
        console.log('Accept order error:', error);
      });
    }
  };
  
  const onRejectNewOrder = () => {
    if (orderRequest) {
      reject(orderRequest, currentUser).catch(error => {
        console.log('Reject order error:', error);
      });
    }
  };

  // -------------------------------------------------------
  // POLYLINE COMPUTATION (FULLY PATCHED + AUTO-ZOOM)
  // -------------------------------------------------------
  const computePolylineCoordinates = useCallback(
    orders => {
      console.log('computePolylineCoordinates called with orders:', orders?.length, 'currentUser location:', currentUser?.location);
      if (!orders?.length || !currentUser?.location) {
        console.log('Skipping polyline computation: no orders or user location');
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
        console.log('No destination coordinate found for order status:', order.status);
        setRouteCoordinates([]);
        return;
      }

      console.log('Computing polyline from:', sourceCoordinate, 'to:', destCoordinate);

      try {
        getDirections(sourceCoordinate, destCoordinate, config.googleAPIKey, coords => {
          const safeCoords = Array.isArray(coords) ? coords : [];

          // ⭐ Filter ZERO_RESULTS here — silently ignore
          if (safeCoords.length < 2) {
            setRouteCoordinates([]);
            return;
          }

          setRouteCoordinates(safeCoords);

          // ⭐ AUTO-ZOOM MAP TO POLYLINE
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
        setRouteCoordinates([]);
      }
    },
    [currentUser, config.googleAPIKey]
  );

  // -------------------------------------------------------
  // UPDATE POLYLINE WHEN DRIVER MOVES (CRASH-PROOF)
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

        if (distance < 1) {
          setRouteCoordinates(routeCoordinates.slice(1));
        } else if (distance > 2) {
          computePolylineCoordinates(orders);
        }
      } catch (error) {
        console.log('updatePolyline failed:', error);
      }
    },
    [orders, routeCoordinates, computePolylineCoordinates]
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
  // RENDER MAP ELEMENTS (NO CRASHES EVER)
  // -------------------------------------------------------
  const renderMapElements = () => {
    if (
      !orders?.length ||
      !Array.isArray(routeCoordinates) ||
      routeCoordinates.length < 2 ||
      isWaitingForOrders
    ) {
      return null;
    }

    const order = orders[0];

    return (
      <React.Fragment key={'map_elements'}>
        <Polyline
          coordinates={routeCoordinates}
          strokeWidth={5}
          strokeColor="#0000FF"
        />

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
        <Marker
          coordinate={routeCoordinates[routeCoordinates.length - 1]}
        >
          <Image
            source={require('../../../core/delivery/assets/destination-icon.png')}
            style={styles.mapCarIcon}
          />
        </Marker>
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
          ref={mapRef}   // ⭐ REQUIRED FOR AUTO-ZOOM ⭐
          region={region}
          showsUserLocation={isWaitingForOrders}
          provider={Platform.OS === 'ios' ? null : PROVIDER_GOOGLE}
          style={styles.mapStyle}
        >
          {renderMapElements()}
        </MapView>

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
