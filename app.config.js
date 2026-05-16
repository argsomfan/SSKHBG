export default {
  expo: {
    name: "SSKHBG",
    slug: "sskhbg",
    owner: "sskhbg",
    scheme: "sskhbg",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#050607"
    },
    plugins: ["expo-router", "expo-sqlite"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.nicklas.sskhbg",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      package: "com.nicklas.sskhbg"
    },
    extra: {
      router: {},
      eas: {
        projectId: "92b8c339-25bb-4589-9ed1-bc0bb67e28a1"
      }
    }
  }
};
