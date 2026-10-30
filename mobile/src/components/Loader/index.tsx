import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../../theme';

export const Loader = () => (
  <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
    <ActivityIndicator color={colors.primary} size="large" />
  </View>
);
