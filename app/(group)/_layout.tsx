import React from 'react';
import { Stack } from 'expo-router';
import { GroupGate } from '../../src/ui/components';
export default function GroupLayout() { return <GroupGate><Stack screenOptions={{ headerShown: false }} /></GroupGate>; }
