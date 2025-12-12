import { db } from '../../../firebase/config'

export const persistOrder = async order => {
  return db.collection('restaurant_orders').add(order)
}
