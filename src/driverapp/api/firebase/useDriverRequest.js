import { useState, useEffect } from 'react'
import { subscribeToDriver as subscribeToDriverAPI } from './FirebaseDriverClient'

const useDriverRequest = (config, driverID) => {
  const [updatedDriver, setUpdateDriverInfo] = useState()

  useEffect(() => {
    if (!driverID) {
      return
    }
    const unsubcribeToDriver = subscribeToDriverAPI(
      config,
      driverID,
      onOrderRequestUpdate,
    )
    return unsubcribeToDriver
  }, [driverID])

  const onOrderRequestUpdate = data => {
    setUpdateDriverInfo(data)
  }

  return {
    orderRequest: updatedDriver?.orderRequestData,
    inProgressOrderID: updatedDriver?.orderRequestData,
    updatedDriver,
  }
}

export default useDriverRequest
