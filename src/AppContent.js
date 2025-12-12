import React, { useEffect } from 'react'
import { StatusBar } from 'react-native'
import { StripeProvider } from '@stripe/stripe-react-native'
import Geocoder from 'react-native-geocoding'
import { OnboardingConfigProvider } from './core/onboarding/hooks/useOnboardingConfig'
import { useConfig } from './config'
import { ProfileConfigProvider } from './core/profile/hooks/useProfileConfig'
import { AppNavigator } from './navigations/AppNavigation'
import { VendorConfigProvider } from './core/vendor/hooks/useVendorConfig'

const AppContent = () => {
  const config = useConfig()

  useEffect(() => {
    console.log('initializing Geocoder with key ' + config.googleAPIKey)
    Geocoder.init(config.googleAPIKey)
  }, [config?.googleAPIKey])

  return (
    <VendorConfigProvider config={config}>
      <ProfileConfigProvider config={config}>
        <OnboardingConfigProvider config={config}>
          <StripeProvider
            publishableKey={config.stripeConfig.PUBLISHABLE_KEY}
            merchantIdentifier={config.stripeConfig.MERCHANT_ID}>
            <StatusBar />
            <AppNavigator />
          </StripeProvider>
        </OnboardingConfigProvider>
      </ProfileConfigProvider>
    </VendorConfigProvider>
  )
}

export default AppContent
