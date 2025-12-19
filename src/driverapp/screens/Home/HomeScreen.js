import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import {
  Text,
  Image,
  PermissionsAndroid,
  Platform,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';

import { useDispatch, useSelector } from 'react-redux';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, AnimatedRegion } from 'react-native-maps';
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
  const [activeTripId, setActiveTripId] = useState(null);

  // DISTANCE ONLY (ETA REMOVED)
  const [tripDistanceKm, setTripDistanceKm] = useState(0);

  const polylineOpacity = useRef(new Animated.Value(1)).current;
  const carCoordinate = useRef(
    new AnimatedRegion({
      latitude: currentUser?.location?.latitude || 0,
      longitude: currentUser?.location?.longitude || 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;

  const mapRef = useRef(null);
  const lastDistanceRef = useRef(0); // For smoothing

  // -------------------------------------------------------
  // HEADER
  // -------------------------------------------------------
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => <Text style={styles.headerStyle}>{localized('Home')}</Text>,
      headerLeft: () => <Hamburger onPress={() => navigation.openDrawer()} />,
      headerRight: () => (
        <TouchableOpacity style={styles.logoutButton} onPress={goOffline}>
          <Image
            source={require('../../../assets/icons/shutdown.png')}
            style={styles.logoutButtonImage}
          />
        </TouchableOpacity>
      ),
    });
  }, []);

  // -------------------------------------------------------
  // DRIVER STATE
  // -------------------------------------------------------
  useEffect(() => {
    if (!orderRequest && !inProgressOrderID && updatedDriver?.isActive) {
      setIsWaitingForOrders(true);
      setRouteCoordinates([]);
      setActiveTripId(null);
      setTripDistanceKm(0);

      if (positionWatchID) {
        Geolocation.clearWatch(positionWatchID);
        setPositionWatchID(null);
      }
      polylineOpacity.setValue(1);
    } else {
      setIsWaitingForOrders(false);
    }

    if (updatedDriver) {
      dispatch(setUserData({ user: updatedDriver }));
    }
  }, [inProgressOrderID, orderRequest, updatedDriver]);

  // -------------------------------------------------------
  // INITIAL MAP POSITION
  // -------------------------------------------------------
  useEffect(() => {
    if (!currentUser?.location) return;

    setRegion({
      latitude: currentUser.location.latitude,
      longitude: currentUser.location.longitude,
      latitudeDelta: 0.00922,
      longitudeDelta: 0.00421,
    });

    carCoordinate.timing({
      latitude: currentUser.location.latitude,
      longitude: currentUser.location.longitude,
      duration: 0,
      useNativeDriver: false,
    }).start();
  }, [currentUser?.location]);

  // -------------------------------------------------------
  // CLEANUP
  // -------------------------------------------------------
  const endTripCleanup = () => {
    Animated.timing(polylineOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setRouteCoordinates([]);
      setActiveTripId(null);
      setTripDistanceKm(0);
      polylineOpacity.setValue(1);
    });

    if (positionWatchID) {
      Geolocation.clearWatch(positionWatchID);
      setPositionWatchID(null);
    }
  };

  // -------------------------------------------------------
  // MAIN TRIP EFFECT
  // -------------------------------------------------------
  useEffect(() => {
    if (!orders?.length || !currentUser?.location) {
      endTripCleanup();
      return;
    }

    const activeOrder = orders[0];

    if (activeOrder.status === 'In Transit') {
      if (activeTripId !== activeOrder.id) {
        setActiveTripId(activeOrder.id);
        setRouteCoordinates([]);
      }
      computePolylineCoordinates([activeOrder]);
      trackDriverLocation();
    } else {
      if (activeTripId) endTripCleanup();
    }
  }, [orders, currentUser?.location]);

  // -------------------------------------------------------
  // POLYLINE + DISTANCE
  // -------------------------------------------------------
  const computePolylineCoordinates = useCallback(
    orders => {
      if (!orders?.length || !currentUser?.location) return;

      const order = orders[0];
      if (order.status !== 'In Transit') return;

      const sourceCoordinate = {
        latitude: currentUser.location.latitude,
        longitude: currentUser.location.longitude,
      };

      const destLocation = order.address?.location || order.author?.location;
      if (!destLocation) return;

      const destCoordinate = {
        latitude: destLocation.latitude,
        longitude: destLocation.longitude,
      };

      setIsPolylineLoading(true);

      getDirections(
        sourceCoordinate,
        destCoordinate,
        config.googleAPIKey,
        coords => {
          setIsPolylineLoading(false);
          if (!coords?.length) return;

          setRouteCoordinates(coords);

          // Initial distance calculation
          let meters = 0;
          for (let i = 1; i < coords.length; i++) {
            meters += getDistance(
              coords[i - 1].latitude,
              coords[i - 1].longitude,
              coords[i].latitude,
              coords[i].longitude
            );
          }

          lastDistanceRef.current = meters / 1000; // Set initial km
          setTripDistanceKm((meters / 1000).toFixed(1));

          mapRef.current?.fitToCoordinates(coords, {
            edgePadding: { top: 80, bottom: 140, left: 80, right: 80 },
            animated: true,
          });
        }
      );
    },
    [currentUser, config.googleAPIKey]
  );

  // -------------------------------------------------------
  // LOCATION TRACKING
  // -------------------------------------------------------
  const watchPosition = () =>
    Geolocation.watchPosition(
      position => {
        const { latitude, longitude } = position.coords;
        const locationDict = { location: { latitude, longitude } };

        dispatch(setUserData({ user: { ...currentUser, ...locationDict } }));
        updateUser(currentUser.id, locationDict);

        // Animate car
        carCoordinate.timing({
          latitude,
          longitude,
          duration: 500,
          useNativeDriver: false,
        }).start();

        // Smoothly update remaining distance
        if (routeCoordinates.length >= 2) {
          let remainingMeters = 0;
          for (let i = 1; i < routeCoordinates.length; i++) {
            remainingMeters += getDistance(
              routeCoordinates[i - 1].latitude,
              routeCoordinates[i - 1].longitude,
              routeCoordinates[i].latitude,
              routeCoordinates[i].longitude
            );
          }
          const remainingKm = remainingMeters / 1000;

          // Smooth with simple alpha blending
          const alpha = 0.3;
          lastDistanceRef.current =
            lastDistanceRef.current * (1 - alpha) + remainingKm * alpha;

          setTripDistanceKm(lastDistanceRef.current.toFixed(1));
        }

      },
      error => console.log('Location error:', error),
      { enableHighAccuracy: true, distanceFilter: 10 }
    );

  const trackDriverLocation = () => {
    if (positionWatchID) return;

    if (Platform.OS === 'ios') {
      setPositionWatchID(watchPosition());
    } else {
      PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ).then(granted => {
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPositionWatchID(watchPosition());
        }
      });
    }
  };

  // -------------------------------------------------------
  // MAP ELEMENTS
  // -------------------------------------------------------
  const renderMapElements = () => {
    if (!orders?.length || routeCoordinates.length < 2) return null;

    return (
      <>
        <Animated.View style={{ opacity: polylineOpacity }}>
          <Polyline coordinates={routeCoordinates} strokeWidth={5} strokeColor="#0000FF" />
        </Animated.View>

        <Marker.Animated coordinate={carCoordinate}>
          <Image
            source={require('../../../core/delivery/assets/car-icon.png')}
            style={styles.mapCarIcon}
          />
        </Marker.Animated>
      </>
    );
  };

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------
  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        region={region}
        provider={Platform.OS === 'ios' ? null : PROVIDER_GOOGLE}
        style={styles.mapStyle}
      >
        {renderMapElements()}
      </MapView>

      {tripDistanceKm > 0 && (
        <View style={styles.tripInfoContainer}>
          <Text style={styles.tripInfoText}>{tripDistanceKm} km</Text>
        </View>
      )}

      {isPolylineLoading && (
        <View style={styles.polylineLoading}>
          <ActivityIndicator size="large" color="#0000FF" />
        </View>
      )}

      {orderRequest && (
        <NewOrderRequestModal
          onAccept={accept}
          onReject={reject}
          isVisible={!!orderRequest}
        />
      )}

      {orders && currentUser.inProgressOrderID && (
        <OrderPreviewCard
          driver={currentUser}
          order={orders}
        />
      )}
    </View>
  );
}

export default HomeScreen;
