import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSessionsStore } from '../../../store/sessionsStore';
import { colors, type } from '../../../theme';
import { SessionCard } from '../components/SessionCard';

export const SessionsScreen = () => {
  const sessions = useSessionsStore(s => s.sessions);
  const list = Object.values(sessions).sort((a, b) =>
    b.videoStartedAtUtc.localeCompare(a.videoStartedAtUtc),
  );
  return (
    <FlatList
      style={styles.root}
      contentContainerStyle={styles.content}
      data={list}
      keyExtractor={s => s.sessionId}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyText}>Recorded drives will show up here with their upload status.</Text>
        </View>
      }
      renderItem={({ item }) => <SessionCard session={item} />}
    />
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, flexGrow: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 80 },
  emptyTitle: { ...type.h2, color: colors.text },
  emptyText: { color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },
});
