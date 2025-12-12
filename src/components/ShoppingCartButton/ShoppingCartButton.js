import React from 'react'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import { useSelector } from 'react-redux'
import IconBadge from 'react-native-icon-badge'
import { useTheme } from '../../core/dopebase'
import dynamicStyles from './styles'

const ShoppingCartButton = props => {
  const { onPress } = props
  const cartItems = useSelector(state => state.cart.cartItems)
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onPress}>
        <IconBadge
          MainElement={
            <Image
              source={require('../../assets/icons/cart.png')}
              style={{
                width: 25,
                height: 25,
                margin: 6,
                tintColor: theme.colors[appearance].primaryForeground,
              }}
            />
          }
          BadgeElement={
            <Text style={{ color: '#FFFFFF' }}>
              {cartItems.reduce((prev, next) => prev + next.quantity, 0)}
            </Text>
          }
          Hidden={cartItems.length === 0}
          IconBadgeStyle={{
            width: 20,
            height: 20,
            backgroundColor: '#ff5e69',
          }}
        />
      </TouchableOpacity>
    </View>
  )
}

export default ShoppingCartButton
