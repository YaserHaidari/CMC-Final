import { Redirect } from 'expo-router';

export default function TabsIndex() {
  // Redirect to home tab by default
  return <Redirect href="/(drawer)/(tabs)/home" />;
}