import {
  accept as acceptAPI,
  markAsCompleted as markAsCompletedAPI,
  markAsPickedUp as markAsPickedUpAPI,
  onDelete as onDeleteAPI,
  reject as rejectAPI,
} from './FirebaseOrderClient'

const useOrderMutations = config => {
  const accept = (order, driver) => {
    return acceptAPI(config, order, driver)
  }
  const markAsCompleted = (order, driver) => {
    return markAsCompletedAPI(config, order, driver)
  }
  const markAsPickedUp = order => {
    return markAsPickedUpAPI(config, order)
  }
  const onDelete = orderID => {
    return onDeleteAPI(config, orderID)
  }
  const reject = (order, driver) => {
    return rejectAPI(config, order, driver)
  }
  return { accept, markAsCompleted, markAsPickedUp, onDelete, reject }
}

export default useOrderMutations
