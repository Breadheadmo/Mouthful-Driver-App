import React, { useLayoutEffect } from 'react'
import { FlatList, Text, View, TouchableOpacity } from 'react-native'
import {
  useTheme,
  useTranslations,
  ActivityIndicator,
  EmptyStateView,
} from '../../../core/dopebase'
import { Image } from 'expo-image'
import { useSelector } from 'react-redux'
import dynamicStyles from './styles'
import Hamburger from '../../../components/Hamburger/Hamburger'
import { useOrders } from '../../api'
import { useConfig } from '../../../config'
import { useDriverRequestMutations } from '../../api'

const OrdersScreen = props => {
  const { navigation } = props
  const { accept, reject, updateStatus } = useDriverRequestMutations(config)
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)
  const config = useConfig()

  const currentUser = useSelector(state => state.auth.user)

  const { orders } = useOrders(config, currentUser.id)

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <Text style={styles.headerStyle}>{localized('Orders')}</Text>
      ),
      headerLeft: () => (
        <Hamburger
          onPress={() => {
            navigation.openDrawer()
          }}
        />
      ),
    })
  }, [])

  const onAccept = order => {
    if (order) {
      accept(order, currentUser)
        .then(() => {
          console.log('Status', order.status)
          // Update the order status to 'Accepted'
          order.status = 'Accepted'
          // Optionally refresh the order data or directly update the local state
          if (order.status === 'Accepted') {
          }
        })
        .catch(error => {
          console.error('Failed to accept order:', error)
        })
    }
  }

  const onPickup = order => {
    if (order) {
      updateStatus(order, currentUser)
        .then(() => {
          order.status = 'In Transit'
          navigation.navigate('Home', { order })
        })
        .catch(error => {
          console.error('Failed to accept order:', error)
        })
    }
  }

  const onReject = order => {
    if (order) {
      reject(order, currentUser)
        .then(() => {
          order.status = 'Rejected'
        })
        .catch(error => {
          console.error('Failed to reject order:', error)
        })
    }
  }

  const renderItem = ({ item }) => {
    const address = item.address
    const addressText = localized('Deliver to: ')

    return (
      <View style={styles.container}>
        <View>
          {item != null &&
            item.products != null &&
            item.products[0] != null &&
            item.products[0].photo != null &&
            item.products[0].photo.length > 0 && (
              <Image
                placeholderColor={theme.colors[appearance].grey9}
                style={styles.photo}
                source={{ uri: item.products[0].photo }}
              />
            )}
          <View style={styles.overlay} />
          <Text style={styles.address}>
            {`${addressText} ${address?.line1} ${address?.line2} ${address?.city} ${address?.postalCode}`}
          </Text>
        </View>
        {item.products.map(product => {
          return (
            <View style={styles.rowContainer} key={product.id}>
              <Text style={styles.count}>{product.quantity}</Text>
              <Text style={styles.title}>{product.name}</Text>
              <Text style={styles.price}>R{product.price}</Text>
            </View>
          )
        })}
        <View style={styles.actionContainer}>
          <Text style={styles.total}>
            {localized('Total: R')}
            {item.products
              .reduce((prev, next) => prev + next.price * next.quantity, 0)
              .toFixed(2)}
          </Text>
          {item.status === 'Driver Pending' ? (
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.actionButtonContainer}
                onPress={() => onAccept(item)}
              >
                <Text style={styles.actionButtonText}>
                  {localized('Accept')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButtonContainer1}
                onPress={() => onReject(item)}
              >
                <Text style={styles.actionButtonText}>
                  {localized('Reject')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.statusText}>{item.status}</Text>
              {item.status !== 'Rejected' && item.status !== 'Delivered' && (
                <View>
                  <TouchableOpacity onPress={() => onPickup(item)}>
                    <Text style={styles.statusText1}>
                      {localized('Pickup')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    )
  }

  const emptyStateConfig = {
    title: localized('No Orders'),
    description: localized(
      'You have not delivered any orders yet. All your orders will be displayed here.',
    ),
  }

  if (orders == null) {
    return <ActivityIndicator />
  }

  if (orders.length == 0) {
    return (
      <View style={styles.emptyViewContainer}>
        <EmptyStateView emptyStateConfig={emptyStateConfig} />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.orderList}
      data={orders}
      renderItem={renderItem}
      keyExtractor={item => `${item.id}`}
      initialNumToRender={5}
    />
  )
}

export default OrdersScreen
