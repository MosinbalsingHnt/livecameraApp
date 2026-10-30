import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../../components/Badge';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Input } from '../../../components/Input';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { orientationOptions } from '../../../hooks/orientationOptions';
import { useOrientation } from '../../../hooks/useOrientation';
import { useSettingsStore } from '../../../store/settingsStore';
import { colors, type } from '../../../theme';
import { useHealthCheck } from '../api/useHealthCheck';

const Section = ({ title }: { title: string }) => <Text style={styles.section}>{title.toUpperCase()}</Text>;

export const SettingsScreen = () => {
  const saved = useSettingsStore();
  const [baseUrl, setBaseUrl] = useState(saved.baseUrl);
  const [vehicleId, setVehicleId] = useState(saved.vehicleId);
  const health = useHealthCheck();
  const { orientation, set: setOrientation } = useOrientation();

  const save = () => saved.save(baseUrl, vehicleId);
  const test = () => {
    save();
    // wait a tick so the saved base URL is used by the request interceptor
    setTimeout(() => health.refetch(), 0);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Section title="AI Engine" />
      <Card>
        <Input label="Base URL" value={baseUrl} onChangeText={setBaseUrl}
          placeholder="http://192.168.1.10:8100" keyboardType="url" />
        <Input label="Vehicle ID" value={vehicleId} onChangeText={setVehicleId} placeholder="PCMC-DEMO-01" />
        <View style={styles.row}>
          <Button flex variant="secondary" title="Save" onPress={save} />
          <Button flex variant="info" title={health.isFetching ? 'Testing…' : 'Test connection'}
            onPress={test} disabled={health.isFetching} />
        </View>
        {health.isSuccess && (
          <View style={styles.result}>
            <Badge label={`Connected · ${health.data.service}`} color={colors.primary} bg={colors.primarySoft} />
          </View>
        )}
        {health.isError && (
          <View style={styles.result}>
            <Badge label={`Failed · ${health.error.message}`} color={colors.danger} bg={colors.dangerSoft} />
          </View>
        )}
      </Card>

      <Section title="Camera orientation" />
      <Card>
        <SegmentedControl value={orientation} onChange={setOrientation}
          options={orientationOptions} />
      </Card>

      <Text style={styles.hint}>Device ID · {saved.deviceId}</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  section: { ...type.caption, color: colors.muted, marginTop: 8, marginBottom: 10, marginLeft: 4 },
  row: { flexDirection: 'row', gap: 12 },
  result: { marginTop: 14, flexDirection: 'row' },
  hint: { color: colors.muted, marginTop: 24, fontSize: 12, textAlign: 'center' },
});
