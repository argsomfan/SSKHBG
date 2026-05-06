import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FavoriterScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1, padding: 16, paddingTop: 36 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 12 }}>
          Favoriter
        </Text>
        <Text>Kommer i nästa fas.</Text>
      </View>
    </SafeAreaView>
  );
}