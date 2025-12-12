import { useState, useEffect } from 'react'
import { subscribeProducts as subscribeProductsAPI } from './firebaseProductsClient'

const useProducts = config => {
  const [products, setProducts] = useState()

  useEffect(() => {
    if (config?.isMultiVendorEnabled) {
      return
    }
    const unsubscribeProducts = subscribeProductsAPI(
      config.tables?.vendorProductsTableName,
      onProductsUpdate,
    )
    return unsubscribeProducts
  }, [])

  const onProductsUpdate = productList => {
    setProducts(productList)
  }

  return { products }
}

export default useProducts
