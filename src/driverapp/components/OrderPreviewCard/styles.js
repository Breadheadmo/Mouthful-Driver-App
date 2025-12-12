import { StyleSheet } from 'react-native'

const dynamicStyles = (theme, appearance) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      height: 144,
      padding: 20,
      flex: 1,
    },
    contentView: {
      position: 'relative',
      flex: 1,
    },
    textContainer: {},
    headline: {
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 5,
    },
    description: {
      fontSize: 12,
    },
    buttonsContainer: {
      marginTop: 12,
      flexDirection: 'row',
    },
    actionButtonContainer: {
      borderRadius: 5,
      padding: 14,
      backgroundColor:
        theme.colors[appearance].primaryForeground,
      alignSelf: 'center',
    },
    actionButtonText: {
      color: theme.colors[appearance].primaryBackground,
      fontSize: 14,
      fontWeight: 'bold',
    },
    secondaryButtonContainer: {
      padding: 13,
      borderWidth: 1,
      borderColor: theme.colors[appearance].primaryForeground,
      borderRadius: 5,
      alignSelf: 'center',
      marginLeft: 5,
    },
    secondaryButtonText: {
      color: theme.colors[appearance].primaryForeground,
      fontSize: 14,
      fontWeight: 'bold',
      textAlign: 'center',
    },
  })

export default dynamicStyles
