import React from 'react'
import { TouchableOpacity, Image } from 'react-native'
import { useTheme } from '../../core/dopebase'
import dynamicStyles from './styles'

export default Hamburger = props => {
  const { theme, appearance } = useTheme()
  const { onPress } = props
  const styles = dynamicStyles(theme, appearance)

  return (
    <TouchableOpacity style={styles.headerButtonContainer} onPress={onPress}>
      <Image
        style={styles.headerButtonImage}
        source={theme.icons.menuHamburger}
      />
    </TouchableOpacity>
  )
}
