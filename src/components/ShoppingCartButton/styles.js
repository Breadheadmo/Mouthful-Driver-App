import { StyleSheet } from 'react-native'

const dynamicStyles = (theme, appearance) => {
  return new StyleSheet.create({
    container: {
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    button: {
      backgroundColor: '#859a9b',
      borderRadius: 20,
      padding: 10,
      marginBottom: 20,
      shadowColor: '#303838',
      shadowOffset: { width: 0, height: 5 },
      shadowRadius: 10,
      shadowOpacity: 0.35,
    },
  })
}

export default dynamicStyles
