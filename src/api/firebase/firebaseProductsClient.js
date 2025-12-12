import firestore from '@react-native-firebase/firestore'

export const subscribeProducts = (vendorProductsTableName, callback) => {
  const productsRef = firestore().collection(vendorProductsTableName)

  return productsRef.onSnapshot(querySnapshot => {
    const products = []
    querySnapshot?.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data(),
      })
    })
    callback?.(products)
  })
}

export const subscribeToOrders = (
  vendorOrdersTableName,
  authorID,
  callback,
) => {
  // The current user (viewer) is the admin of a vendor, so they can manage all the orders placed for that vendor
  const ref = firestore()
    .collection(vendorOrdersTableName)
    .where('authorID', '==', authorID)
    .orderBy('createdAt', 'desc')

  return ref.onSnapshot(
    querySnapshot => {
      const orders = []
      querySnapshot?.forEach(doc => {
        const order = doc.data()
        orders.push({
          id: doc.id,
          ...order,
        })
      })
      callback?.(orders)
    },
    error => {
      console.warn(error)
    },
  )
}
