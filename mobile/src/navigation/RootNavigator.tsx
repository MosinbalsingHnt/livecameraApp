import React from 'react';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { BottomTabNavigator } from './BottomTabNavigator';
import { colors } from '../theme';

export const RootNavigator = () => (
  <NavigationContainer
    theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, border: colors.border } }}>
    <BottomTabNavigator />
  </NavigationContainer>
);
