import { Redirect } from 'expo-router';

export default function DrawerIndex() {
  // Redirect to the home tab when someone navigates to /(drawer)
  return <Redirect href="/(drawer)/(tabs)/home" />;
}