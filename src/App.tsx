import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from './services/api';
import { lockOrientation } from './services/orientation';
import { useUiStore } from './store/uiStore';
import { RootNavigator } from './navigation/RootNavigator';

export default function App() {
  const orientation = useUiStore(s => s.orientation);
  useEffect(() => lockOrientation(orientation), [orientation]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar barStyle="light-content" />
        <RootNavigator />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
