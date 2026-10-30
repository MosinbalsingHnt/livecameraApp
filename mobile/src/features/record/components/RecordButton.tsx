import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../../theme';

/** Camera-app style shutter: red dot when idle, red square while recording. */
export const RecordButton = ({ recording, onPress }: { recording: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={styles.ring} accessibilityLabel={recording ? 'Stop' : 'Start'}>
    <View style={[styles.core, recording && styles.square]} />
  </Pressable>
);

const styles = StyleSheet.create({
  ring: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.danger },
  square: { width: 30, height: 30, borderRadius: 8 },
});
