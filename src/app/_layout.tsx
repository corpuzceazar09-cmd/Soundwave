import { Stack } from 'expo-router';
import { AuthProvider } from '@/lib/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(editor)" />
        <Stack.Screen name="(user)" />
      </Stack>
    </AuthProvider>
  );
}
