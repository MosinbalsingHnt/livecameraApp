import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Crosshair } from 'lucide-react-native';
import { colors, type } from '../../../theme';
import type { GpsPoint } from '../../../types';

const STALE_MS = 5_000;

/** Live position while recording: coordinates, speed and accuracy of the latest fix. */
export const LiveCoords = ({ fix, now }: { fix: GpsPoint | null; now: number }) => {
  const stale = !!fix && now - fix.t_epoch_ms > STALE_MS;
  const tone = !fix ? colors.muted : stale ? colors.warn : colors.primary;
  const extras = fix
    ? [
        fix.speed_kmh != null ? `${Math.round(fix.speed_kmh)} km/h` : null,
        fix.accuracy_m != null ? `±${Math.round(fix.accuracy_m)} m` : null,
      ].filter(Boolean)
    : [];

  return (
    <View style={styles.row}>
      <Crosshair size={16} color={tone} />
      <View style={styles.body}>
        <Text style={styles.label}>LIVE LOCATION{stale ? ' · NO RECENT FIX' : ''}</Text>
        <Text style={styles.coords} numberOfLines={1}>
          {fix ? `${fix.lat.toFixed(6)}, ${fix.lon.toFixed(6)}` : 'Waiting for GPS fix…'}
        </Text>
      </View>
      {extras.length > 0 && <Text style={[styles.extra, { color: tone }]}>{extras.join(' · ')}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  body: { flex: 1 },
  label: { ...type.caption, color: colors.muted },
  coords: {
    color: colors.text, fontSize: 16, fontWeight: '800', marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  extra: { fontSize: 12, fontWeight: '700' },
});
