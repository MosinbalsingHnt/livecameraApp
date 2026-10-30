import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, type } from '../../theme';

export const Input = ({ label, ...rest }: TextInputProps & { label: string }) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.focused]}
        {...rest}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { ...type.caption, color: colors.muted, marginBottom: 8 },
  input: {
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 50,
    fontSize: 16,
  },
  focused: { borderColor: colors.primary },
});
