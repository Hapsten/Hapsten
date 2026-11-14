import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { SplashOverlay } from '@/components/splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen
          name="discover"
          options={{ presentation: 'card', title: 'Discover' }}
        />
        <Stack.Screen name="searching" options={{ title: 'Searching' }} />
        <Stack.Screen name="venue-picker" options={{ presentation: 'modal', title: 'Venue' }} />
        <Stack.Screen name="plans" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="map" options={{ title: 'Map' }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="create"
          options={{ presentation: 'modal', title: 'Create event' }}
        />
      </Stack>
    </AuthProvider>
  );
}
