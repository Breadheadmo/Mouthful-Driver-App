import { useState, useEffect } from 'react'
import { subscribeToOrders as subscribeToOrdersAPI } from './firebaseProductsClient'
import { useConfig } from '../../config'

const useOrders = authorID => {
  const config = useConfig()

  const [loading, setloading] = useState(true)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    if (!authorID) {
      return
    }
    setloading(true)
    const unsubscribeToOrders = subscribeToOrdersAPI(
      config.tables?.vendorOrdersTableName,
      authorID,
      onOrdersUpdate,
    )
    return unsubscribeToOrders
  }, [])

  const onOrdersUpdate = list => {
    setOrders(list)
    setloading(false)
  }

  return { orders, loading }
}

export default useOrders
