import { Tabs } from 'expo-router';
import { Image, Text } from 'react-native';
import { Colors } from '../../src/theme';
import { BrandImages } from '../../src/theme/brand';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.chrome,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800'
        },
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderStrong,
          height: 82,
          paddingBottom: 18,
          paddingTop: 8
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Agent',
          tabBarIcon: ({ focused }) => (
            <Image
              source={BrandImages.icon}
              resizeMode="contain"
              style={{
                height: 24,
                opacity: focused ? 1 : 0.48,
                width: 24
              }}
            />
          )
        }}
      />
      <Tabs.Screen
        name="bibliotek"
        options={{
          title: 'Bibliotek',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 21, fontWeight: '900' }}>▦</Text>
          )
        }}
      />
      <Tabs.Screen
        name="lakemedel"
        options={{
          title: 'Läkemedel',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22, fontWeight: '900' }}>✚</Text>
          )
        }}
      />
      <Tabs.Screen
        name="kalkylatorer"
        options={{
          title: 'Kalkyl',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22, fontWeight: '900' }}>∑</Text>
          )
        }}
      />
      <Tabs.Screen
        name="fakta"
        options={{
          title: 'Fakta',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22, fontWeight: '900' }}>✎</Text>
          )
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Sök',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 22, fontWeight: '900' }}>⌕</Text>
          )
        }}
      />

      <Tabs.Screen name="diagnoser" options={{ href: null }} />
      <Tabs.Screen name="pm" options={{ href: null }} />
      <Tabs.Screen name="omvardnad" options={{ href: null }} />
      <Tabs.Screen name="cards" options={{ href: null }} />
      <Tabs.Screen name="favoriter" options={{ href: null }} />
      <Tabs.Screen name="omvardnad_word" options={{ href: null }} />
    </Tabs>
  );
}
