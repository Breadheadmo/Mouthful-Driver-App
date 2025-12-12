import { combineReducers } from 'redux'
import { auth } from '../../core/onboarding/redux/auth'
import { chat } from '../../core/chat/redux'
import { orders } from '../../core/delivery/redux'
import { cart } from '../../core/cart/redux/reducers'
import { checkout } from '../../core/payments/redux/checkout'
import { vendor } from '../../core/vendor/redux'
const LOG_OUT = 'LOG_OUT'

// combine reducers to build the state
const appReducer = combineReducers({
  auth,
  chat,
  cart,
  orders,
  checkout,
  vendor,
})

const rootReducer = (state, action) => {
  if (action.type === LOG_OUT) {
    state = undefined
  }

  return appReducer(state, action)
}

export default rootReducer
