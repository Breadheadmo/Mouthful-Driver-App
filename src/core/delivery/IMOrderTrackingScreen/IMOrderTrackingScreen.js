import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import {
  Text,
  View,
  Dimensions,
  Image,
  ScrollView,
  Platform,
} from 'react-native'
import MapView, { Marker, Polyline } from 'react-native-maps'
import { Bar } from 'react-native-progress'
import { useTheme, useTranslations } from '../../../core/dopebase'
import dynamicStyles from './styles'
import { useSingleOrder } from '../api'
import IMDeliveryView from '../IMDelivery/IMDeliveryView'
import { getDirections, getETA } from '../api/directions'
import { useDeliverConfig } from '../hooks/useDeliveryConfig'

function IMOrderTrackingScreen({ navigation, route }) {
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)
  const mapRef = useRef(null)

  const { config } = useDeliverConfig()
  const item = route.params.item
  const [eta, setEta] = useState(0)
  const [region, setRegion] = useState(null)
  const [routeCoordinates, setRouteCoordinates] = useState([])

  const { order } = useSingleOrder(item)
  const { width } = Dimensions.get('screen')

  const stages = [
    'Order Placed',
    'Order Shipped',
    'In Transit',
    'Order Completed',
  ]

  // ---------- PATCHED: CRASH-FREE getETA ----------
  const computeETA = async () => {
    const preparingTime = 900
    try {
      if (
        (order.status === 'Order Placed' ||
          order.status === 'Driver Pending' ||
          order.status === 'Driver Accepted' ||
          order.status === 'Driver Rejected') &&
        order.address &&
        order.author
      ) {
        const eta = await getETA(
          {
            latitude: order.vendor.latitude,
            longitude: order.vendor.longitude,
          },
          order.address.location
            ? order.address.location
            : order.author.location,
          config.googleAPIKey,
        )
        setEta(2 * eta + preparingTime)
        return
      }

      if (order.driver && order.vendor && order.address) {
        if (order.status === 'Order Shipped') {
          const eta1 = await getETA(
            order.driver.location,
            {
              latitude: order.vendor.latitude,
              longitude: order.vendor.longitude,
            },
            config.googleAPIKey,
          )
          const eta2 = await getETA(
            {
              latitude: order.vendor.latitude,
              longitude: order.vendor.longitude,
            },
            order.address.location
              ? order.address.location
              : order.author.location,
            config.googleAPIKey,
          )
          setEta(eta1 + eta2 + preparingTime)
          return
        }

        if (order.status === 'In Transit') {
          const eta = await getETA(
            order.driver.location,
            order.address.location,
            config.googleAPIKey,
          )
          setEta(eta)
          return
        }
      }
      setEta(0)
    } catch (e) {
      console.log('ETA Error:', e)
      setEta(0)
    }
  }

  // ---------- PATCHED: SAFE POLYLINE ONLY FOR "In Transit" ----------
  const computePolylineCoordinates = () => {
    if (!order || order.status !== 'In Transit') {
      return
    }

    const driver = order.driver
    const dest = order.address?.location || order.author?.location

    if (!driver || !driver.location) {
      console.log('Skipping polyline: DRIVER missing')
      return
    }
    if (!dest) {
      console.log('Skipping polyline: DEST missing')
      return
    }

    const sourceCoordinate = {
      latitude: driver.location.latitude,
      longitude: driver.location.longitude,
    }
    const destCoordinate = {
      latitude: dest.latitude,
      longitude: dest.longitude,
    }

    console.log('→ SOURCE:', sourceCoordinate)
    console.log('→ DEST:', destCoordinate)

    getDirections(
      sourceCoordinate,
      destCoordinate,
      config.googleAPIKey,
      coordinates => {
        if (!coordinates || coordinates.length === 0) {
          console.log('Polyline skipped: ZERO_RESULTS')
          return
        }
        const points = [sourceCoordinate, ...coordinates, destCoordinate]
        setRouteCoordinates(coordinates)
        centerMap(points)
      },
      err => console.log('Directions Error:', err),
    )
  }

  const centerMap = points => {
    if (!points || points.length === 0) {
      return
    }

    let maxLat = -90,
      minLat = 90,
      maxLng = -180,
      minLng = 180
    points.forEach(c => {
      maxLat = Math.max(maxLat, c.latitude)
      minLat = Math.min(minLat, c.latitude)
      maxLng = Math.max(maxLng, c.longitude)
      minLng = Math.min(minLng, c.longitude)
    })

    const newRegion = {
      latitude: (maxLat + minLat) / 2,
      longitude: (maxLng + minLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.01,
      longitudeDelta: (maxLng - minLng) * 1.5 || 0.01,
    }
    setRegion(newRegion)

    if (mapRef.current) {
      mapRef.current.animateToRegion(newRegion, 700)
    }
  }

  useEffect(() => {
    computeETA()
    computePolylineCoordinates()
  }, [order?.status])

  useLayoutEffect(() => {
    navigation.setOptions({
      title: localized('Your Order'),
      headerRight: () => <View />,
    })
  }, [navigation])

  // ---------- TIME VALUES ----------
  const deliveryDate = new Date()
  if (eta > 0) {
    deliveryDate.setSeconds(deliveryDate.getSeconds() + eta)
  }
  const latestArrivalDate = new Date()
  latestArrivalDate.setSeconds(deliveryDate.getSeconds() + eta + 20 * 60)

  const etaString =
    eta > 0
      ? `${deliveryDate.getHours().toString().padStart(2, '0')}:${deliveryDate
          .getMinutes()
          .toString()
          .padStart(2, '0')}`
      : ''

  const latestArrivalString =
    eta > 0
      ? `${latestArrivalDate
          .getHours()
          .toString()
          .padStart(2, '0')}:${latestArrivalDate
          .getMinutes()
          .toString()
          .padStart(2, '0')}`
      : ''

  const tempIndex = stages.indexOf(order.status)
  const stagesIndex = tempIndex === -1 ? 0 : tempIndex

  return (
    <ScrollView style={styles.scroll}>
      <View style={styles.container}>
        {order.status === 'Order Completed' ? (
          <View style={styles.upperPane}>
            <Text style={styles.time}>{localized('Order Delivered')}</Text>
          </View>
        ) : (
          <View style={styles.upperPane}>
            <Text style={styles.time}>{etaString}</Text>
            <Text style={styles.eta}>{localized('Estimated arrival')}</Text>
          </View>
        )}

        {order.status !== 'Order Completed' && (
          <Bar
            progress={0.25 * (stagesIndex + 1)}
            color={theme.colors[appearance].primaryForeground}
            borderWidth={0}
            width={width - 20}
            unfilledColor={theme.colors[appearance].grey0}
            style={styles.bar}
          />
        )}

        <Text style={styles.prepText}>
          {order.status === 'Order Placed' ||
          order.status === 'Driver Pending' ||
          order.status === 'Driver Accepted' ||
          order.status === 'Driver Rejected'
            ? localized('Preparing your order...')
            : order.status === 'In Transit'
            ? order.driver.firstName + localized(' is heading your way')
            : order.status === 'Order Shipped'
            ? order.driver.firstName + localized(' is picking up your order')
            : ''}
        </Text>

        {order.status !== 'Order Completed' && (
          <Text style={styles.eta}>
            {localized('Latest arrival by')} {latestArrivalString}
          </Text>
        )}

        {/* ----- MAP + POLYLINE ONLY FOR "In Transit" ----- */}
        {region && order.status === 'In Transit' && (
          <MapView
            ref={mapRef}
            initialRegion={region}
            provider={Platform.OS === 'ios' ? undefined : 'google'}
            showsUserLocation={true}
            style={styles.mapStyle}
          >
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={5}
              strokeColor="#007AFF"
            />

            {order.driver && order.driver.location && (
              <Marker
                title={order.driver.firstName}
                coordinate={{
                  latitude: order.driver.location.latitude,
                  longitude: order.driver.location.longitude,
                }}
              >
                <Image
                  source={require('../assets/car-icon.png')}
                  style={styles.mapCarIcon}
                />
              </Marker>
            )}

            {order.address && order.address.location && (
              <Marker
                title={`${order.address.line1} ${order.address.line2}`}
                coordinate={{
                  latitude: order.address.location.latitude,
                  longitude: order.address.location.longitude,
                }}
              >
                <Image
                  source={require('../assets/destination-icon.png')}
                  style={styles.mapCarIcon}
                />
              </Marker>
            )}
          </MapView>
        )}

        {((order?.status !== 'In Transit' &&
          order?.status !== 'Order Shipped') ||
          (region && order?.status === 'In Transit')) && (
          <IMDeliveryView navigation={navigation} order={order} />
        )}
      </View>
    </ScrollView>
  )
}

export default IMOrderTrackingScreen
