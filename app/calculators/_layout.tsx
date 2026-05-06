import { Stack } from 'expo-router';

export default function CalculatorsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: 'Kalkylator'
      }}
    />
  );
}