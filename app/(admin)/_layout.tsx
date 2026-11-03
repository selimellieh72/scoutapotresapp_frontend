import React from 'react';
import { Stack } from 'expo-router';
import { AdminGate } from '../../src/ui/components';
export default function AdminLayout() { return <AdminGate><Stack screenOptions={{ headerShown: false }} /></AdminGate>; }
