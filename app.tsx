import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import TabsNavigation from "./app/(tabs)/_layout"; // adjust path
import { navigationRef } from "./RootNavigation";
import Toast from "react-native-toast-message";

export default function App() {
  return (
    <NavigationContainer ref={navigationRef}>
      <TabsNavigation />
      <Toast /> {/* Must be here globally */}
    </NavigationContainer>
  );
}
