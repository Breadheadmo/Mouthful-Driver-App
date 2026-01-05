import React, { useEffect } from 'react'
import { LogBox, StatusBar } from 'react-native'
import { Provider } from 'react-redux'
import SplashScreen from 'react-native-splash-screen'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import {
  DopebaseProvider,
  extendTheme,
  TranslationProvider,
  ActionSheetProvider,
} from './core/dopebase'
import configureStore from './redux/store'
import AppContent from './AppContent'
import translations from './translations/'
import { ConfigProvider } from './config'
import { AuthProvider } from './core/onboarding/hooks/useAuth'
import { ProfileAuthProvider } from './core/profile/hooks/useProfileAuth'
import { authManager } from './core/onboarding/api'
import InstamobileTheme from './theme'
import { checkPermissionStatus } from './messagingService'

const store = configureStore()

const App = () => {
  const theme = extendTheme(InstamobileTheme)
  const headerBackgroundColor = theme.colors.light.secondaryBackground

  useEffect(() => {
    checkPermissionStatus()
    SplashScreen.hide()
    LogBox.ignoreAllLogs(true)
  }, [])

  return (
    <Provider store={store}>
      <TranslationProvider translations={translations}>
        <DopebaseProvider theme={theme}>
          <ConfigProvider>
            <AuthProvider authManager={authManager}>
              <ProfileAuthProvider authManager={authManager}>
                <ActionSheetProvider>
                  <SafeAreaProvider>
                    <SafeAreaView
                      style={{
                        flex: 1,
                        backgroundColor: headerBackgroundColor,
                      }}
                    >
                      <StatusBar
                        barStyle="dark-content"
                        backgroundColor={headerBackgroundColor}
                      />
                      <AppContent />
                    </SafeAreaView>
                  </SafeAreaProvider>
                </ActionSheetProvider>
              </ProfileAuthProvider>
            </AuthProvider>
          </ConfigProvider>
        </DopebaseProvider>
      </TranslationProvider>
    </Provider>
  )
}

export default App
