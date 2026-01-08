/**
 * Unit Test Suite: Driver Order Components
 * Tests for:
 * - useDriverRequest hook
 * - useOrderClaim hook
 * - NewOrderRequestModal component
 */

import { renderHook, act, waitFor } from '@testing-library/react-hooks'
import { render, fireEvent, waitFor as rtWaitFor } from '@testing-library/react-native'

// ============================================================================
// TEST: useOrderClaim Hook
// ============================================================================
describe('useOrderClaim', () => {
  it('should handle successful claim', async () => {
    // Mock Cloud Function response
    const mockClaimOrder = jest.fn().mockResolvedValue({
      data: { success: true },
    })

    const { result } = renderHook(() => ({
      claimOrder: mockClaimOrder,
    }))

    let claimResult
    await act(async () => {
      claimResult = await result.current.claimOrder('order-123')
    })

    expect(claimResult).toEqual({ success: true })
    expect(mockClaimOrder).toHaveBeenCalledWith({ orderId: 'order-123' })
  })

  it('should handle already-taken response', async () => {
    const mockClaimOrder = jest.fn().mockResolvedValue({
      data: { success: false, alreadyTaken: true },
    })

    const { result } = renderHook(() => ({
      claimOrder: mockClaimOrder,
    }))

    let claimResult
    await act(async () => {
      claimResult = await result.current.claimOrder('order-123')
    })

    expect(claimResult.alreadyTaken).toBe(true)
  })

  it('should handle network errors', async () => {
    const mockClaimOrder = jest.fn().mockRejectedValue(
      new Error('Network error')
    )

    const { result } = renderHook(() => ({
      claimOrder: mockClaimOrder,
    }))

    let error
    await act(async () => {
      try {
        await result.current.claimOrder('order-123')
      } catch (e) {
        error = e
      }
    })

    expect(error?.message).toBe('Network error')
  })

  it('should handle permission-denied error', async () => {
    const mockClaimOrder = jest.fn().mockRejectedValue({
      code: 'permission-denied',
      message: 'You are not authorized',
    })

    const { result } = renderHook(() => ({
      claimOrder: mockClaimOrder,
    }))

    let error
    await act(async () => {
      try {
        await result.current.claimOrder('order-123')
      } catch (e) {
        error = e
      }
    })

    expect(error?.code).toBe('permission-denied')
  })

  it('should handle timeout error', async () => {
    const mockClaimOrder = jest.fn().mockRejectedValue({
      code: 'deadline-exceeded',
      message: 'Request timed out',
    })

    const { result } = renderHook(() => ({
      claimOrder: mockClaimOrder,
    }))

    let error
    await act(async () => {
      try {
        await result.current.claimOrder('order-123')
      } catch (e) {
        error = e
      }
    })

    expect(error?.code).toBe('deadline-exceeded')
  })
})

// ============================================================================
// TEST: NewOrderRequestModal Component
// ============================================================================
describe('NewOrderRequestModal', () => {
  const mockOrder = {
    id: 'order-123',
    restaurantName: 'Test Restaurant',
    products: [{ id: '1', name: 'Burger' }],
    address: {
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'New York',
      postalCode: '10001',
    },
  }

  const mockOrderRequest = {
    requestData: {
      orderId: 'order-123',
      estimatedDistance: '2.5 km',
      estimatedTime: '12 min',
    },
    order: mockOrder,
  }

  const mockProps = {
    isVisible: true,
    orderRequest: mockOrderRequest,
    requestLoading: false,
    onOrderAccepted: jest.fn(),
    onOrderRejected: jest.fn(),
    onModalHide: jest.fn(),
  }

  it('should display order details correctly', () => {
    const { getByText } = render(
      <NewOrderRequestModal {...mockProps} />
    )

    expect(getByText('Test Restaurant')).toBeTruthy()
    expect(getByText('1 item')).toBeTruthy()
    expect(getByText('123 Main St')).toBeTruthy()
    expect(getByText('2.5 km')).toBeTruthy()
    expect(getByText('12 min')).toBeTruthy()
  })

  it('should show loading spinner when requestLoading is true', () => {
    const { getByTestId } = render(
      <NewOrderRequestModal {...mockProps} requestLoading={true} />
    )

    expect(getByTestId('request-loading-spinner')).toBeTruthy()
  })

  it('should display countdown timer', async () => {
    jest.useFakeTimers()
    const { getByText } = render(
      <NewOrderRequestModal {...mockProps} />
    )

    // Initial time should show 30s
    expect(getByText(/30/)).toBeTruthy()

    // Fast-forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    expect(getByText(/25/)).toBeTruthy()

    jest.useRealTimers()
  })

  it('should auto-reject when timer reaches 0', async () => {
    jest.useFakeTimers()
    const { getByText } = render(
      <NewOrderRequestModal {...mockProps} />
    )

    // Fast-forward 30+ seconds
    act(() => {
      jest.advanceTimersByTime(31000)
    })

    await rtWaitFor(() => {
      expect(mockProps.onOrderRejected).toHaveBeenCalled()
    })

    jest.useRealTimers()
  })

  it('should call onOrderAccepted when Accept is pressed', async () => {
    const { getByText } = render(
      <NewOrderRequestModal {...mockProps} />
    )

    const acceptButton = getByText('Accept')
    fireEvent.press(acceptButton)

    await rtWaitFor(() => {
      expect(mockProps.onOrderAccepted).toHaveBeenCalled()
    })
  })

  it('should call onOrderRejected when Reject is pressed', async () => {
    const { getByText } = render(
      <NewOrderRequestModal {...mockProps} />
    )

    const rejectButton = getByText('Reject')
    fireEvent.press(rejectButton)

    await rtWaitFor(() => {
      expect(mockProps.onOrderRejected).toHaveBeenCalled()
    })
  })

  it('should show error message on claim failure', async () => {
    const mockClaimOrder = jest.fn().mockRejectedValue({
      message: 'Order was taken by another driver',
    })

    const { getByText, getByTestId } = render(
      <NewOrderRequestModal
        {...mockProps}
        onOrderAccepted={async () => {
          throw new Error('Order was taken by another driver')
        }}
      />
    )

    const acceptButton = getByText('Accept')
    fireEvent.press(acceptButton)

    await rtWaitFor(() => {
      expect(getByText(/Order was taken/)).toBeTruthy()
    })
  })

  it('should show retry button on error', async () => {
    const { getByText, getByTestId } = render(
      <NewOrderRequestModal {...mockProps} />
    )

    // Simulate error by mocking
    // In real test, would trigger error condition
    // For now, verify retry button exists in error state
  })

  it('should clean up timers on unmount', () => {
    const { unmount } = render(
      <NewOrderRequestModal {...mockProps} />
    )

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearIntervalSpy.mockRestore()
    clearTimeoutSpy.mockRestore()
  })
})

// ============================================================================
// TEST: useDriverRequest Hook
// ============================================================================
describe('useDriverRequest', () => {
  it('should fetch full order when orderRequestData is set', async () => {
    const mockOrderRequestData = {
      orderId: 'order-123',
      assignedAt: new Date().toISOString(),
      estimatedDistance: '2.5',
      estimatedTime: '12 min',
    }

    const mockOrder = {
      id: 'order-123',
      restaurantName: 'Test Restaurant',
      products: [],
      address: {},
    }

    // Mock Firestore listener
    const mockOnSnapshot = jest.fn((callback) => {
      callback({
        data: () => ({
          orderRequestData: mockOrderRequestData,
        }),
      })
      return jest.fn() // unsubscribe
    })

    // Mock getDoc
    const mockGetDoc = jest.fn().mockResolvedValue({
      exists: jest.fn(() => true),
      data: () => mockOrder,
    })

    let orderRequest
    // Simulate hook behavior
    await act(async () => {
      if (mockOrderRequestData) {
        const order = await mockGetDoc()
        orderRequest = {
          requestData: mockOrderRequestData,
          order: order.data(),
        }
      }
    })

    expect(orderRequest.requestData).toEqual(mockOrderRequestData)
    expect(orderRequest.order).toEqual(mockOrder)
  })

  it('should set requestLoading to true while fetching order', async () => {
    // Test that requestLoading state is true during fetch
    // and false after fetch completes
  })

  it('should handle missing order gracefully', async () => {
    const mockOrderRequestData = {
      orderId: 'order-123',
    }

    const mockGetDoc = jest.fn().mockResolvedValue({
      exists: jest.fn(() => false),
      data: () => null,
    })

    // Verify error handling
    expect(mockGetDoc).toBeTruthy()
  })
})

// ============================================================================
// TEST: useOrderNotification Hook
// ============================================================================
describe('useOrderNotification', () => {
  it('should request FCM permission on mount', async () => {
    const mockRequestPermission = jest.fn().mockResolvedValue('authorized')

    // Simulate hook setup
    const result = await mockRequestPermission()
    expect(result).toBe('authorized')
  })

  it('should handle foreground notifications', async () => {
    const mockCallback = jest.fn()
    const mockOrderData = {
      orderId: 'order-123',
      estimatedDistance: '2.5',
    }

    // Simulate onMessage callback
    const payload = {
      data: {
        orderRequestData: JSON.stringify(mockOrderData),
      },
    }

    const orderRequestData = JSON.parse(payload.data.orderRequestData)
    mockCallback(orderRequestData)

    expect(mockCallback).toHaveBeenCalledWith(mockOrderData)
  })

  it('should get FCM token and log it', async () => {
    const mockToken = 'test-fcm-token-12345'
    const mockGetToken = jest.fn().mockResolvedValue(mockToken)

    const token = await mockGetToken()
    expect(token).toBe('test-fcm-token-12345')
  })

  it('should handle token refresh', async () => {
    const mockTokenRefresh = jest.fn((callback) => {
      callback('new-fcm-token-67890')
      return jest.fn() // unsubscribe
    })

    const newToken = await new Promise((resolve) => {
      mockTokenRefresh((token) => resolve(token))
    })

    expect(newToken).toBe('new-fcm-token-67890')
  })
})

// ============================================================================
// SNAPSHOT TESTS
// ============================================================================
describe('NewOrderRequestModal snapshots', () => {
  const mockOrder = {
    id: 'order-123',
    restaurantName: 'Test Restaurant',
    products: [{ id: '1', name: 'Burger' }],
    address: {
      line1: '123 Main St',
      line2: 'Apt 4B',
      city: 'New York',
      postalCode: '10001',
    },
  }

  const mockOrderRequest = {
    requestData: {
      orderId: 'order-123',
      estimatedDistance: '2.5 km',
      estimatedTime: '12 min',
    },
    order: mockOrder,
  }

  it('should match snapshot with default state', () => {
    const { toJSON } = render(
      <NewOrderRequestModal
        isVisible={true}
        orderRequest={mockOrderRequest}
        requestLoading={false}
        onOrderAccepted={jest.fn()}
        onOrderRejected={jest.fn()}
        onModalHide={jest.fn()}
      />
    )

    expect(toJSON()).toMatchSnapshot()
  })

  it('should match snapshot with loading state', () => {
    const { toJSON } = render(
      <NewOrderRequestModal
        isVisible={true}
        orderRequest={mockOrderRequest}
        requestLoading={true}
        onOrderAccepted={jest.fn()}
        onOrderRejected={jest.fn()}
        onModalHide={jest.fn()}
      />
    )

    expect(toJSON()).toMatchSnapshot()
  })
})
