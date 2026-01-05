import { StyleSheet } from 'react-native'
import { widthPercentageToDP as w } from 'react-native-responsive-screen'

const dynamicStyles = (theme, appearance) =>
  StyleSheet.create({
    container: {
      width: w(100),
      backgroundColor: theme.colors[appearance].primaryBackground,
      alignItems: 'center',
      borderTopRightRadius: 10,
      borderTopLeftRadius: 10,
    },
    modalContainer: {
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    buttonText: {
      color: theme.colors[appearance].primaryText,
    },
    actionContainer: {
      flexDirection: 'row',
      marginTop: 35,
    },
    actionButtonContainer: {
      flex: 1,
      borderRadius: 5,
      padding: 10,
      margin: 10,
      backgroundColor: theme.colors[appearance].primaryForeground,
    },
    actionButtonText: {
      fontWeight: 'bold',
      color: theme.colors[appearance].primaryBackground,
      fontSize: 16,
    },
    title: {
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 'bold',
      padding: 10,
      marginVertical: 10,
      fontSize: 18,
      textAlign: 'center',
      color: theme.colors[appearance].primaryText,
      borderColor: theme.colors[appearance].grey3,
    },
    cancel: {
      color: '#FF0000',
      textAlign: 'center',
      marginBottom: 32,
      fontSize: 14,
      marginTop: 5,
    },
  })

export default dynamicStyles
