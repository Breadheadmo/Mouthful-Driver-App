import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import MapView, { Marker, Callout } from 'react-native-maps'
import DeliverIcon from '../../../../../../assets/icons/deliver.png'
import styles from './styles'
import { useAdminDeliveryMapMarkers, useAdminActiveDrivers, getNearestDrivers } from '../../api'

export default function AdminDeliveryMapScreen({ navigation }) {
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  })
  const [showDrivers, setShowDrivers] = useState(true)
  const [selectedDelivery, setSelectedDelivery] = useState(null)

  const { markers } = useAdminDeliveryMapMarkers()
  const { drivers, loading } = useAdminActiveDrivers()

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Delivery',
      headerTitle: 'MapScreen',
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => setShowDrivers(!showDrivers)}
          style={{ paddingRight: 15 }}
        >
          <Text style={{ color: '#007AFF', fontSize: 16 }}>
            {showDrivers ? 'Hide Drivers' : 'Show Drivers'}
          </Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation, showDrivers])

  // Get nearest drivers to selected delivery
  const nearestDrivers = selectedDelivery
    ? getNearestDrivers(drivers, selectedDelivery.location, 50) // within 50km
    : []

  return (
    <View style={styles.container}>
      <MapView region={region} style={styles.map} customMapStyle={mapStyle}>
        {/* Delivery Markers */}
        {markers.map((marker, index) => (
          <Marker
            key={`delivery-${index}`}
            coordinate={{
              latitude: marker.data.location.lat,
              longitude: marker.data.location.lng,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
            image={DeliverIcon}
            title={'Delivery Location'}
            onPress={() => setSelectedDelivery({
              location: {
                latitude: marker.data.location.lat,
                longitude: marker.data.location.lng,
              },
              id: marker.id,
            })}
          />
        ))}

        {/* Active Driver Markers */}
        {showDrivers && drivers.map((driver, index) => {
          const isNearSelected = selectedDelivery && 
            nearestDrivers.some(d => d.id === driver.id)
          
          return (
            <Marker
              key={`driver-${driver.id}-${index}`}
              coordinate={{
                latitude: driver.data.location.latitude,
                longitude: driver.data.location.longitude,
              }}
              pinColor={isNearSelected ? '#00FF00' : '#0000FF'}
              title={`${driver.data.firstName} ${driver.data.lastName}`}
            >
              <Callout>
                <View style={{ padding: 5 }}>
                  <Text style={{ fontWeight: 'bold' }}>
                    {driver.data.firstName} {driver.data.lastName}
                  </Text>
                  {driver.data.phone && (
                    <Text style={{ fontSize: 12 }}>{driver.data.phone}</Text>
                  )}
                  {driver.data.carName && (
                    <Text style={{ fontSize: 12 }}>
                      {driver.data.carName} - {driver.data.carNumber}
                    </Text>
                  )}
                  {driver.distance && (
                    <Text style={{ fontSize: 12, color: '#007AFF', marginTop: 3 }}>
                      {driver.distance} km away
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          )
        })}
      </MapView>

      {/* Driver List Panel */}
      {selectedDelivery && nearestDrivers.length > 0 && (
        <View style={styles.driverListPanel}>
          <Text style={styles.panelTitle}>
            Nearest Drivers ({nearestDrivers.length})
          </Text>
          {nearestDrivers.slice(0, 5).map((driver, index) => (
            <View key={`list-${driver.id}`} style={styles.driverItem}>
              <Text style={styles.driverName}>
                {index + 1}. {driver.data.firstName} {driver.data.lastName}
              </Text>
              <Text style={styles.driverDistance}>{driver.distance} km</Text>
            </View>
          ))}
        </View>
      )}

      {showDrivers && !loading && (
        <View style={styles.statsPanel}>
          <Text style={styles.statsText}>
            Active Drivers: {drivers.length}
          </Text>
        </View>
      )}
    </View>
  )
}

const mapStyle = [
  {
    featureType: 'administrative',
    elementType: 'geometry',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'poi',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'road',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
  {
    featureType: 'transit',
    stylers: [
      {
        visibility: 'off',
      },
    ],
  },
]
