import React from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { useSessionsStore } from '../../../store/sessionsStore';
import { colors, type } from '../../../theme';
import { clearOldSessions } from '../../record/services/uploader';
import { SessionCard } from '../components/SessionCard';

export const SessionsScreen = () => {
  const sessions = useSessionsStore(s => s.sessions);
  const list = Object.values(sessions).sort((a, b) =>
    b.videoStartedAtUtc.localeCompare(a.videoStartedAtUtc),
  );
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
      ListHeaderComponent={
        list.length > 0 ? (
          <View style={styles.header}>
            <Button variant="secondary" title="Clear old sessions" onPress={confirmClear} />
          </View>
        ) : undefined
      }
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
  header: { marginBottom: 12 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 80 },
  emptyTitle: { ...type.h2, color: colors.text },
  emptyText: { color: colors.muted, textAlign: 'center', paddingHorizontal: 32 },
});
