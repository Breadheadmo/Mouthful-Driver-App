import { db } from '../../../firebase/config'

export const subscribeSingleOrder = (orderId, callback) => {
  const ref = db.collection('restaurant_orders').doc(orderId)
  return ref.onSnapshot(
    doc => {
      this.data.length = 0
      let singleOrder = doc.data()
      callback?.(singleOrder)
    },
    error => {
      console.warn(error)
    },
  )
}
