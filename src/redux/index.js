import { combineReducers } from 'redux'
import { auth } from '../core/onboarding/redux/auth'
import { chat } from '../core/chat/redux'
import { orders } from '../core/delivery/redux'
import { cart } from '../core/cart/redux/reducers'
import { checkout } from '../core/payments/redux/checkout'
import { vendor } from '../core/vendor/redux'

const AppReducer = combineReducers({
  auth,
  chat,
  cart,
  orders,
  checkout,
  vendor,
})

export default AppReducer
