import React from 'react';
import { ClipboardList, Settings, Video } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RecordScreen } from '../features/record/screens/RecordScreen';
import { SessionsScreen } from '../features/sessions/screens/SessionsScreen';
import { SettingsScreen } from '../features/settings/screens/SettingsScreen';
import { colors } from '../theme';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const icon = (Icon: LucideIcon) => ({ color, focused }: { color: string; focused: boolean }) => (
  <Icon size={24} color={color} strokeWidth={focused ? 2.5 : 2} />
);

export const BottomTabNavigator = () => (
  <Tab.Navigator
    initialRouteName="Record"
    screenOptions={{
      headerStyle: { backgroundColor: colors.bg },
      headerShadowVisible: false,
      headerTintColor: colors.text,
      headerTitleStyle: { fontWeight: '800', fontSize: 20 },
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 62, paddingTop: 6 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
    }}>
    <Tab.Screen name="Record" component={RecordScreen}
      options={{ headerShown: false, tabBarIcon: icon(Video) }} />
    <Tab.Screen name="Sessions" component={SessionsScreen} options={{ tabBarIcon: icon(ClipboardList) }} />
    <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarIcon: icon(Settings) }} />
  </Tab.Navigator>
);
