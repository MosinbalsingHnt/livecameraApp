import React from 'react';
import { Smartphone } from 'lucide-react-native';
import type { OrientationMode } from '../services/orientation';

export const orientationOptions: {
  value: OrientationMode;
  label: string;
  icon: (color: string) => React.ReactNode;
}[] = [
  { value: 'portrait', label: 'Vertical', icon: c => <Smartphone size={16} color={c} /> },
  {
    value: 'landscape',
    label: 'Horizontal',
    icon: c => (
      <Smartphone size={16} color={c} style={{ transform: [{ rotate: '90deg' }] }} />
    ),
  },
];
