import { Text, View } from 'react-native';
import { BackButton } from '../../src/components/BackButton';

export default function Syrgas() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <BackButton fallbackPath="/kalkylatorer" />
      <Text>Syrgas kommer här</Text>
    </View>
  );
}
