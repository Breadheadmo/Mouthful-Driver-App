import { useState, useEffect, useRef } from 'react'
import { subscribeProducts as subscribeToSearchedProductsAPI } from './firebaseProductsClient'
import { useConfig } from '../../config'

const useSearchProducts = searchedText => {
  const config = useConfig()

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState([])

  const unsubscribeFromSearchedProducts = useRef(null)

  useEffect(() => {
    setLoading(true)
    unsubscribeFromSearchedProducts.current?.()
    unsubscribeFromSearchedProducts.current = subscribeToSearchedProductsAPI(
      config.tables?.vendorProductsTableName,
      onSearchedProductsUpdate,
    )
    return () => {
      unsubscribeFromSearchedProducts.current?.()
    }
  }, [searchedText])

  const onSearchedProductsUpdate = querySnapshot => {
    const vendorProducts = []
    querySnapshot?.forEach(doc => {
      if (!searchedText) {
        vendorProducts.push({
          id: doc.id,
          ...doc,
        })
      } else {
        const { name } = doc
        const text = searchedText != null ? searchedText?.toLowerCase() : ''
        const index = name.toLowerCase().search(text)
        if (index !== -1) {
          vendorProducts.push({
            id: doc.id,
            ...doc,
          })
        }
      }
    })

    setProducts(vendorProducts)
    setLoading(false)
  }

  return { products, loading }
}

export default useSearchProducts
