import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '../theme';

type BackButtonProps = {
  fallbackPath?: string;
  label?: string;
};

export function BackButton({
  fallbackPath = '/',
  label = 'Tillbaka'
}: BackButtonProps) {
  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackPath as never);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={goBack}
      style={styles.button}
    >
      <Text style={styles.text}>{`< ${label}`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 11,
    paddingVertical: 8
  },

  text: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '900'
  }
});
