import { Stack } from 'expo-router';
import { AuthProvider } from '@/lib/auth';

const SCREEN_OPTIONS = { headerShown: false };

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={SCREEN_OPTIONS} />
    </AuthProvider>
  );
}
