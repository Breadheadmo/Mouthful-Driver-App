import { useState, useEffect } from 'react'
import { subscribeToActiveDrivers } from './AdminDriverMapClient'

const useAdminActiveDrivers = () => {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    
    const unsubscribe = subscribeToActiveDrivers(data => {
      setDrivers(data || [])
      setLoading(false)
    })

    return () => {
      unsubscribe && unsubscribe()
    }
  }, [])

  return { drivers, loading }
}

export default useAdminActiveDrivers
