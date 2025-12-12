import { firebase } from '../../core/api/firebase/config'

export class OrdersAPIManager {
  constructor(callback = console.log, config) {
    this.callback = callback
    this.config = config
  }

  subscribe = driverID => {
    if (!driverID) {
      console.log('driverID////////////////////', driverID)
      return
    }
    console.log('driver.................', driverID)
    this.ref = firebase
      .firestore()
      .collection(this.config.FIREBASE_COLLECTIONS.ORDERS)
      .where('driverID', '==', driverID)
      .orderBy('createdAt', 'desc')

    this.unsubscribeSnapshot = this.ref.onSnapshot(this.onDataUpdate, error => {
      console.log(error)
      alert(error)
    })
  }

  unsubscribe = () => {
    this.unsubscribeSnapshot && this.unsubscribeSnapshot()
  }

  onDataUpdate = querySnapshot => {
    this.callback && this.callback(querySnapshot.docs.map(doc => doc.data()))
  }
}
