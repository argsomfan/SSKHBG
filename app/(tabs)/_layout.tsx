import { Tabs } from 'expo-router';
import { Colors } from '../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.primary
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '800'
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: '#777',
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Hem' }} />
      <Tabs.Screen name="bibliotek" options={{ title: 'Bibliotek' }} />
      <Tabs.Screen name="lakemedel" options={{ title: 'Läkemedel' }} />
      <Tabs.Screen name="search" options={{ title: 'Sök' }} />

      <Tabs.Screen name="diagnoser" options={{ href: null }} />
      <Tabs.Screen name="pm" options={{ href: null }} />
      <Tabs.Screen name="omvardnad" options={{ href: null }} />
      <Tabs.Screen name="cards" options={{ href: null }} />
      <Tabs.Screen name="kalkylatorer" options={{ href: null }} />
      <Tabs.Screen name="favoriter" options={{ href: null }} />
      <Tabs.Screen name="omvardnad_word" options={{ href: null }} />
    </Tabs>
  );
}