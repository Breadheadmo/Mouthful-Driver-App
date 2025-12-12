import React, { useEffect } from 'react';
import { View, Image, Text, StatusBar } from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import { useNavigation } from '@react-navigation/core';
import { useTheme, useTranslations } from '../../../dopebase';
import deviceStorage from '../../utils/AuthDeviceStorage';
import dynamicStyles from './styles';
import { useOnboardingConfig } from '../../hooks/useOnboardingConfig';

const WalkthroughScreen = () => {
  const navigation = useNavigation();

  const { config } = useOnboardingConfig();

  const { localized } = useTranslations();
  const { theme, appearance } = useTheme();
  const styles = dynamicStyles(theme, appearance);

  const slides = config.onboardingConfig.walkthroughScreens.map((screenSpec, index) => ({
    key: index.toString(),
    text: screenSpec.description,
    title: screenSpec.title,
    image: screenSpec.icon,
  }));

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });

    const unsubscribe = navigation.addListener('blur', () => {
      StatusBar.setBackgroundColor(theme.colors.light.secondaryBackground);
      StatusBar.setBarStyle('dark-content');
    });

    StatusBar.setBackgroundColor(theme.colors.light.secondaryForeground);
    StatusBar.setBarStyle(appearance === 'dark' ? 'light-content' : 'dark-content');

    return unsubscribe;
  }, [navigation, theme.colors.secondaryForeground, appearance]);

  const _onDone = () => {
    deviceStorage.setShouldShowOnboardingFlow('false');
    if (config?.isDelayedLoginEnabled) {
      navigation.navigate('DelayedHome');
    } else {
      navigation.navigate('LoginStack', { screen: 'Welcome' });
    }
  };

  const _renderItem = ({ item, dimensions }) => (
    <View style={[styles.container, dimensions]}>
      <Image style={styles.image} source={item.image} />
      <View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.text}>{item.text}</Text>
      </View>
    </View>
  );

  const _renderNextButton = () => <Text style={styles.button}>{localized('Next')}</Text>;

  const _renderSkipButton = () => <Text style={styles.button}>{localized('Skip')}</Text>;

  const _renderDoneButton = () => <Text style={styles.button}>{localized('Done')}</Text>;

  return (
    <AppIntroSlider
      data={slides}
      slides={slides}
      onDone={_onDone}
      renderItem={_renderItem}
      showSkipButton
      onSkip={_onDone}
      renderNextButton={_renderNextButton}
      renderSkipButton={_renderSkipButton}
      renderDoneButton={_renderDoneButton}
    />
  );
};

export default WalkthroughScreen;
