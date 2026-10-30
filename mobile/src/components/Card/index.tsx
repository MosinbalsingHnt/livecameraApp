import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius } from '../../theme';

export const Card = ({ style, ...rest }: ViewProps) => (
  <View style={[styles.card, style]} {...rest} />
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
  },
});
