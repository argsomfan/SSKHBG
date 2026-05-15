import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { initializeDatabase } from '../src/db/seed';
import { SskhbgConvexProvider } from '../src/convex/SskhbgConvexProvider';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        await initializeDatabase();
      } catch (e) {
        console.log('INIT ERROR', e);
      } finally {
        setReady(true);
      }
    }

    init();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Laddar databas...</Text>
      </View>
    );
  }

  return (
    <SskhbgConvexProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SskhbgConvexProvider>
  );
}
