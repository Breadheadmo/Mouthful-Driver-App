import React from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { createStackNavigator } from '@react-navigation/stack'
import { createDrawerNavigator } from '@react-navigation/drawer'
import { useSelector } from 'react-redux'
import { Image } from 'expo-image'
import { useTheme, useTranslations } from '../core/dopebase'
import { IMDrawerMenu } from '../core/ui/drawer/IMDrawerMenu/IMDrawerMenu'
import {
  LoadScreen,
  LoginScreen,
  SignupScreen,
  SmsAuthenticationScreen,
  ResetPasswordScreen,
  WalkthroughScreen,
  WelcomeScreen,
} from '../core/onboarding'
import { IMChatScreen } from '../core/chat'
import MyProfileScreen from '../components/MyProfileScreen'
import {
  IMEditProfileScreen,
  IMUserSettingsScreen,
  IMContactUsScreen,
} from '../core/profile'

import DriverHomeScreen from '../driverapp/screens/Home/HomeScreen'
import DriverOrdersScreen from '../driverapp/screens/Orders/OrdersScreen'
import { NavigationContainer } from '@react-navigation/native'
import { useConfig } from '../config'
import useNotificationOpenedApp from '../core/helpers/notificationOpenedApp'
import IMNotificationScreen from '../core/notifications/IMNotificationScreen/IMNotificationScreen'

const Login = createStackNavigator()
const LoginStack = () => {
  return (
    <Login.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName="Welcome">
      <Login.Screen name="Login" component={LoginScreen} />
      <Login.Screen name="Signup" component={SignupScreen} />
      <Login.Screen name="Welcome" component={WelcomeScreen} />
      <Login.Screen name="Sms" component={SmsAuthenticationScreen} />
      <Login.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Login.Navigator>
  )
}

const DriverMain = createStackNavigator()
const DriverMainNavigation = () => {
  const { theme, appearance } = useTheme()
  return (
    <DriverMain.Navigator
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: theme.colors[appearance].primaryBackground,
        },
        headerTitleAlign: 'center',
        headerTintColor: theme.colors[appearance].primaryText,
      })}
      initialRouteName="Home"
      headerMode="float">
      <DriverMain.Screen name="Home" component={DriverHomeScreen} />
      
      <DriverMain.Screen name="Notification" component={IMNotificationScreen} />
      <DriverMain.Screen name="MyProfile" component={MyProfileScreen} />
      <DriverMain.Screen
        name="DriverOrderList"
        component={DriverOrdersScreen}
      />
      <DriverMain.Screen name="Contact" component={IMContactUsScreen} />
      <DriverMain.Screen name="Settings" component={IMUserSettingsScreen} />
      <DriverMain.Screen name="AccountDetail" component={IMEditProfileScreen} />
      <DriverMain.Screen name="PersonalChat" component={IMChatScreen} />
    </DriverMain.Navigator>
  )
}

const DriverDrawer = createDrawerNavigator()
const DriverDrawerStack = () => {
  const config = useConfig()
  return (
    <DriverDrawer.Navigator
      initialRouteName="Main"
      screenOptions={{ headerShown: false }}
      drawerContent={({ navigation }) => (
        <IMDrawerMenu
          navigation={navigation}
          menuItems={config.drawerMenuConfig.driverDrawerConfig.upperMenu}
          menuItemsSettings={
            config.drawerMenuConfig.driverDrawerConfig.lowerMenu
          }
        />
      )}
      drawerPosition="left"
      drawerStyle={{ width: 250 }}>
      <DriverDrawer.Screen name="Main" component={DriverMainNavigation} />
    </DriverDrawer.Navigator>
  )
}

const RootStack = createStackNavigator()
const RootNavigator = () => {
  const currentUser = useSelector(state => state.auth.user)
  return (
    <RootStack.Navigator
      initialRouteName="LoadScreen"
      screenOptions={{ headerShown: false, animationEnabled: false }}
      headerMode="none">
      <RootStack.Screen
        options={{ headerShown: false }}
        name="LoadScreen"
        component={LoadScreen}
      />
      <RootStack.Screen
        options={{ headerShown: false }}
        name="Walkthrough"
        component={WalkthroughScreen}
      />
      <RootStack.Screen
        options={{ headerShown: false }}
        name="LoginStack"
        component={LoginStack}
      />

      <RootStack.Screen
        options={{ headerShown: false }}
        name="MainStack"
        component={DriverDrawerStack}
      />
    </RootStack.Navigator>
  )
}

const linking = {
  prefixes: ['https://mychat.com', 'mychat://', 'http://localhost:19006'],
  config: {
    screens: {
      // PersonalChat: 'channelxxx=:channel',
    },
  },
}

const AppNavigator = () => {
  const { appearance, theme } = useTheme()

  return (
    <NavigationContainer
      linking={linking}
      theme={
        appearance === 'dark'
          ? theme.navContainerTheme.dark
          : theme.navContainerTheme.light
      }>
      <RootNavigator />
    </NavigationContainer>
  )
}

export { RootNavigator, AppNavigator }

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapImage: { width: 25, height: 25 },
})
