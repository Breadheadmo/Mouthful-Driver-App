import React, { useState, useEffect, useRef } from 'react'
import { View, Text, ActivityIndicator, Alert } from 'react-native'
import Modal from 'react-native-modal'
import { useTheme, useTranslations, Button } from '../../../core/dopebase'
import useOrderClaim from '../../api/firebase/useOrderClaim'
import dynamicStyles from './styles'

const MODAL_TIMEOUT_MS = 30000 // 30 seconds

export default function NewOrderRequestModal({
  isVisible,
  orderRequest, // { requestData: { orderId, estimatedDistance, estimatedTime }, order: { products, address, author, ... } }
  requestLoading,
  onModalHide,
  onOrderAccepted, // callback after successful claim
  onOrderRejected, // callback after reject
}) {
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const { claimOrder, rejectOrder, claimLoading, claimError } = useOrderClaim()
  
  const [timeLeft, setTimeLeft] = useState(MODAL_TIMEOUT_MS / 1000)
  const [isProcessing, setIsProcessing] = useState(false)
  const timeoutRef = useRef(null)
  const timerRef = useRef(null)

  // Start countdown timer when modal becomes visible
  useEffect(() => {
    if (!isVisible || !orderRequest) {
      return
    }

    setTimeLeft(MODAL_TIMEOUT_MS / 1000)

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Auto-close timeout
    timeoutRef.current = setTimeout(() => {
      handleTimeout()
    }, MODAL_TIMEOUT_MS)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isVisible, orderRequest])

  const handleTimeout = async () => {
    // Auto-reject after timeout
    if (orderRequest?.requestData?.orderId) {
      await handleReject()
    }
  }

  const handleAccept = async () => {
    if (!orderRequest?.requestData?.orderId) {
      return
    }

    setIsProcessing(true)

    const result = await claimOrder(orderRequest.requestData.orderId)

    if (result.success) {
      // Clear timers and close modal
      if (timerRef.current) clearInterval(timerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      
      setIsProcessing(false)
      onOrderAccepted?.()
      onModalHide?.()
    } else if (result.alreadyTaken) {
      // Order was claimed by another driver
      Alert.alert(
        localized('Order Taken'),
        localized('This order was already claimed by another driver.'),
        [{ text: 'OK', onPress: () => {
          onOrderRejected?.()
          onModalHide?.()
        }}]
      )
      setIsProcessing(false)
    } else {
      // Network or other error
      Alert.alert(
        localized('Error'),
        result.message || localized('Failed to accept order. Please try again.'),
        [
          { text: localized('Retry'), onPress: handleAccept },
          { text: localized('Cancel'), onPress: () => setIsProcessing(false) }
        ]
      )
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!orderRequest?.requestData?.orderId) {
      return
    }

    setIsProcessing(true)

    const result = await rejectOrder(orderRequest.requestData.orderId)

    if (result.success) {
      // Clear timers and close modal
      if (timerRef.current) clearInterval(timerRef.current)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      
      setIsProcessing(false)
      onOrderRejected?.()
      onModalHide?.()
    } else {
      // Rejection failed; allow retry
      Alert.alert(
        localized('Error'),
        result.message || localized('Failed to reject order.'),
        [
          { text: localized('Retry'), onPress: handleReject },
          { text: localized('Cancel'), onPress: () => setIsProcessing(false) }
        ]
      )
      setIsProcessing(false)
    }
  }

  if (!orderRequest || !isVisible) {
    return null
  }

  const { requestData, order } = orderRequest
  const restaurantName = order?.author?.name || 'Restaurant'
  const itemsCount = order?.products?.length || 0
  const address = order?.address
  const estimatedDistance = requestData?.estimatedDistance || '—'
  const estimatedTime = requestData?.estimatedTime || '—'

  return (
    <Modal
      style={styles.modalContainer}
      swipeDirection="down"
      isVisible={isVisible}
      onModalHide={onModalHide}
      backdropOpacity={0.7}
      useNativeDriver
    >
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.title}>{localized('New Delivery Request')}</Text>

        {/* Loading state */}
        {requestLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors[appearance].primary} />
            <Text style={styles.loadingText}>{localized('Loading order details...')}</Text>
          </View>
        )}

        {/* Order details */}
        {!requestLoading && (
          <View style={styles.detailsContainer}>
            {/* Restaurant & Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{restaurantName}</Text>
              <Text style={styles.sectionSubtitle}>
                {itemsCount} {itemsCount === 1 ? localized('item') : localized('items')}
              </Text>
            </View>

            {/* Address */}
            {address && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{localized('Delivery To')}</Text>
                <Text style={styles.sectionText}>
                  {address.line1}{address.line2 ? `, ${address.line2}` : ''}
                </Text>
                <Text style={styles.sectionText}>
                  {address.city}, {address.postalCode}
                </Text>
              </View>
            )}

            {/* Distance & Time */}
            <View style={styles.section}>
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={styles.sectionLabel}>{localized('Distance')}</Text>
                  <Text style={styles.sectionText}>{estimatedDistance}</Text>
                </View>
                <View style={styles.col}>
                  <Text style={styles.sectionLabel}>{localized('Est. Time')}</Text>
                  <Text style={styles.sectionText}>{estimatedTime}</Text>
                </View>
              </View>
            </View>

            {/* Error message */}
            {claimError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{claimError}</Text>
              </View>
            )}

            {/* Countdown timer */}
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>
                {localized('Respond in')} {timeLeft}s
              </Text>
            </View>
          </View>
        )}

        {/* Action buttons */}
        {!requestLoading && (
          <View style={styles.actionContainer}>
            <Button
              containerStyle={[styles.actionButtonContainer, isProcessing && styles.buttonDisabled]}
              textStyle={styles.actionButtonText}
              onPress={handleAccept}
              disabled={isProcessing || claimLoading}
              text={claimLoading ? localized('Accepting...') : localized('Accept')}
            />
            <Button
              containerStyle={[styles.secondaryButtonContainer, isProcessing && styles.buttonDisabled]}
              textStyle={styles.secondaryButtonText}
              onPress={handleReject}
              disabled={isProcessing || claimLoading}
              text={localized('Reject')}
            />
          </View>
        )}
      </View>
    </Modal>
  )
}
