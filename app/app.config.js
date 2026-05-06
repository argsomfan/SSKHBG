export default {
  expo: {
    name: "SSKHBG",
    slug: "sskhbg",
    scheme: "sskhbg",
    version: "1.0.0",
    orientation: "portrait",
    plugins: ["expo-router", "expo-sqlite"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nicklas.sskhbg"
    },
    android: {
      package: "com.nicklas.sskhbg"
    }
  }
};