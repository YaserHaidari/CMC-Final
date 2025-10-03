import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { getCurrentUser, isPinEnabled } from "./storage";

export default function AuthLoaderScreen() {
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const userId = await getCurrentUser();

      if (userId) {
        // User already exists in SecureStore
        const pinEnabled = await isPinEnabled(userId);

        if (pinEnabled) {
          router.replace("/pin"); // show PIN login first
        } else {
          router.replace("/home"); // go straight to home or login if PIN not enabled
        }
      } else {
        router.replace("/login"); // first-time users
      }
    }

    checkAuth();
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#007bff" />
    </View>
  );
}
