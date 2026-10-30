import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ClipboardList, Trash2 } from 'lucide-react-native';
import { queryClient } from '../../../services/api';
import { useSessionsStore } from '../../../store/sessionsStore';
import { colors, radius, type } from '../../../theme';
import type { LocalSession } from '../../../types';
import { clearOldSessions, pumpAll } from '../../record/services/uploader';
import { SessionCard } from '../components/SessionCard';

type Filter = 'all' | 'active' | 'processing' | 'done' | 'failed';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'processing', label: 'Processing' },
  { key: 'done', label: 'Done' },
  { key: 'failed', label: 'Failed' },
];

const groupOf = (s: LocalSession): Exclude<Filter, 'all'> =>
  s.state === 'live' || s.state === 'uploading' ? 'active' : s.state;

const Summary = ({ label, value, tone }: { label: string; value: string | number; tone?: string }) => (
  <View style={styles.summary}>
    <Text style={[styles.summaryValue, tone ? { color: tone } : null]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label.toUpperCase()}</Text>
  </View>
);

export const SessionsScreen = () => {
  const sessions = useSessionsStore(s => s.sessions);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const all = useMemo(
    () => Object.values(sessions).sort((a, b) => b.videoStartedAtUtc.localeCompare(a.videoStartedAtUtc)),
    [sessions],
  );
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: all.length, active: 0, processing: 0, done: 0, failed: 0 };
    all.forEach(s => { c[groupOf(s)] += 1; });
    return c;
  }, [all]);
  const list = filter === 'all' ? all : all.filter(s => groupOf(s) === filter);

  const chunksUp = all.reduce((n, s) => n + s.chunks.filter(c => c.uploaded).length, 0);
  const chunksAll = all.reduce((n, s) => n + s.chunks.length, 0);
  const events = all.reduce((n, s) => n + s.eventsFound, 0);

  // pull down: retry anything waiting and refresh the server status of every session
  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([
      pumpAll(),
      queryClient.invalidateQueries({ queryKey: ['session-status'] }),
      new Promise<void>(r => setTimeout(r, 600)),
    ]).catch(() => {});
    setRefreshing(false);
  };

  const confirmClear = () =>
    Alert.alert(
      'Clear old sessions?',
      'This removes all sessions from this list and deletes their video files from the phone. Anything not yet uploaded will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearOldSessions() },
      ],
    );

  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={list}
      keyExtractor={s => s.sessionId}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={refresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.surface}
        />
      }
      ListHeaderComponent={
        all.length > 0 ? (
          <View style={styles.header}>
            <View style={styles.summaries}>
              <Summary label="Sessions" value={all.length} />
              <View style={styles.divider} />
              <Summary label="Uploaded" value={`${chunksUp}/${chunksAll}`} tone={colors.info} />
              <View style={styles.divider} />
              <Summary label="Events" value={events} tone={events > 0 ? colors.warn : undefined} />
            </View>

            <View style={styles.filterRow}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={FILTERS}
                keyExtractor={f => f.key}
                contentContainerStyle={styles.filters}
                renderItem={({ item }) => {
                  const on = filter === item.key;
                  return (
                    <Pressable
                      onPress={() => setFilter(item.key)}
                      style={[styles.filter, on && styles.filterOn]}>
                      <Text style={[styles.filterText, on && styles.filterTextOn]}>{item.label}</Text>
                      <Text style={[styles.filterCount, on && styles.filterTextOn]}>{counts[item.key]}</Text>
                    </Pressable>
                  );
                }}
              />
              <Pressable
                onPress={confirmClear}
                accessibilityLabel="Clear old sessions"
                hitSlop={8}
                style={styles.clear}>
                <Trash2 size={18} color={colors.muted} />
              </Pressable>
            </View>
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <ClipboardList size={34} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            {all.length ? `No ${filter} sessions` : 'No sessions yet'}
          </Text>
          <Text style={styles.emptyText}>
            {all.length
              ? 'Try another filter.'
              : 'Recorded drives will show up here with their upload status.'}
          </Text>
        </View>
      }
      renderItem={({ item, index }) => <SessionCard session={item} index={index} />}
    />
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, flexGrow: 1 },
  header: { marginBottom: 14, gap: 14 },
  summaries: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
    borderRadius: radius.lg, paddingVertical: 14,
  },
  summary: { flex: 1, alignItems: 'center' },
  summaryValue: { color: colors.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  summaryLabel: { ...type.caption, fontSize: 10, color: colors.muted, marginTop: 4 },
  divider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: colors.border },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filters: { gap: 8, paddingRight: 8 },
  filter: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, height: 36, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
  },
  filterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  filterCount: { color: colors.muted, fontSize: 12, fontWeight: '700', opacity: 0.8 },
  filterTextOn: { color: '#04140a', opacity: 1 },
  clear: {
    width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
  },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingTop: 80 },
  emptyIcon: {
    width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  emptyTitle: { ...type.h2, color: colors.text },
  emptyText: { color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },
});
