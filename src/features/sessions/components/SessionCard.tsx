import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { colors, type } from '../../../theme';
import type { LocalSession, SessionState } from '../../../types';
import { resumeSession } from '../../record/services/uploader';
import { useSessionStatus } from '../api/useSessionStatus';

// a 'live' session from before this launch was killed mid-drive
const APP_STARTED_AT = new Date().toISOString();

const tones: Record<SessionState, { fg: string; bg: string; label: string }> = {
  live: { fg: colors.danger, bg: colors.dangerSoft, label: 'Live' },
  uploading: { fg: colors.info, bg: colors.infoSoft, label: 'Uploading' },
  processing: { fg: colors.warn, bg: colors.warnSoft, label: 'Processing' },
  done: { fg: colors.primary, bg: colors.primarySoft, label: 'Done' },
  failed: { fg: colors.danger, bg: colors.dangerSoft, label: 'Failed' },
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <View style={{ flex: 1 }}>
    <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

export const SessionCard = ({ session }: { session: LocalSession }) => {
  useSessionStatus(session);
  const t = tones[session.state];
  const total = session.chunks.length;
  const up = session.chunks.filter(c => c.uploaded).length;
  const needsRetry =
    session.state === 'uploading' ||
    session.state === 'failed' ||
    (session.state === 'live' && session.videoStartedAtUtc < APP_STARTED_AT);

  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.id} numberOfLines={1}>{session.sessionId}</Text>
        <Badge label={t.label} color={t.fg} bg={t.bg} />
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: total ? `${(up / total) * 100}%` : '0%', backgroundColor: t.fg }]} />
      </View>

      <View style={styles.stats}>
        <Stat label="Chunks" value={`${up}/${total}`} />
        <Stat label="GPS pending" value={session.gpsPending.length} />
        <Stat label="Events" value={session.eventsFound} />
      </View>

      {session.alerts.length > 0 && (
        <Text style={styles.alerts}>Alerts: {session.alerts.join(', ')}</Text>
      )}
      {session.lastError ? <Text style={styles.err} numberOfLines={2}>{session.lastError}</Text> : null}
      {needsRetry && (
        <View style={{ marginTop: 14 }}>
          <Button title="Retry upload" onPress={() => resumeSession(session.sessionId)} />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  id: { color: colors.text, fontWeight: '800', fontSize: 15, flex: 1 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, marginTop: 14, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  stats: { flexDirection: 'row', marginTop: 14 },
  statLabel: { ...type.caption, color: colors.muted },
  statValue: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 4 },
  alerts: { color: colors.muted, marginTop: 12, fontSize: 12 },
  err: { color: colors.warn, marginTop: 10, fontSize: 12 },
});
