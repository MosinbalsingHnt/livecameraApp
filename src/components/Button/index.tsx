import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../../theme';

type Variant = 'primary' | 'danger' | 'secondary' | 'info';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  flex?: boolean;
};

const bg: Record<Variant, string> = {
  primary: colors.primary,
  danger: colors.danger,
  info: colors.info,
  secondary: colors.surfaceAlt,
};

export const Button = ({ title, onPress, variant = 'primary', disabled, flex }: Props) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
    style={({ pressed }) => [
      styles.btn,
      { backgroundColor: bg[variant] },
      variant === 'secondary' && styles.outline,
      flex && { flex: 1 },
      pressed && { opacity: 0.85 },
      disabled && { opacity: 0.45 },
    ]}>
    <Text style={styles.text}>{title}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  btn: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  outline: { borderWidth: 1, borderColor: colors.border },
  text: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
