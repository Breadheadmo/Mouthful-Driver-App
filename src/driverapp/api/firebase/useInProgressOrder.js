import { useState, useEffect } from 'react'
import { subscribeToInprogressOrder as subscribeToInprogressOrderAPI } from './FirebaseOrderClient'

const useInProgressOrder = (config, orderID) => {
  const [order, setOrder] = useState()

  useEffect(() => {
    if (!orderID) {
      return
    }

    console.log('Using config:', config)

    const unsubscribeFromInprogressOrder = subscribeToInprogressOrderAPI(
      config,
      orderID,
      onInprogressOrderUpdate,
    )
    return unsubscribeFromInprogressOrder
  }, [orderID])

  const onInprogressOrderUpdate = currentOrder => {
    setOrder(currentOrder)
  }

  return { order }
}

export default useInProgressOrder
