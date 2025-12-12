import { StyleSheet } from 'react-native'

const dynamicStyles = (theme, appearance) => {
  const colorSet = theme.colors[appearance]

  return new StyleSheet.create({
    headerButtonContainer: {
      padding: 10,
    },
    headerButtonImage: {
      justifyContent: 'center',
      width: 25,
      height: 25,
      margin: 6,
      tintColor: colorSet.primaryForeground,
    },
  })
}

export default dynamicStyles
