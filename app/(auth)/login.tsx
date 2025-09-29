// app/(auth)/login.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [pin, setPin] = useState('');

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync('userPin');
      setSavedPin(stored);
      if (stored) attemptBiometricAuth();
    })();
  }, []);

  const attemptBiometricAuth = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) return;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Log in with Biometrics',
      disableDeviceFallback: false, // allows PIN fallback
    });

    if (result.success) {
      router.replace('/');
    }
  };

  const handlePinSubmit = async () => {
    if (!savedPin) {
      if (pin.length < 4) {
        Alert.alert('Oops!', 'PIN must be at least 4 digits.');
        return;
      }
      await SecureStore.setItemAsync('userPin', pin);
      Alert.alert('PIN set!', 'You can now login using PIN or biometrics.');
      router.replace('/');
    } else {
      if (pin === savedPin) {
        router.replace('/');
      } else {
        Alert.alert('Invalid PIN', 'Please try again.');
      }
    }
    setPin('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{savedPin ? 'Enter PIN' : 'Set up PIN'}</Text>
      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        placeholder="••••"
        secureTextEntry
        keyboardType="numeric"
        maxLength={6}
      />
      <Button
        title={savedPin ? 'Unlock' : 'Save PIN'}
        onPress={handlePinSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20
  },
  title: { fontSize: 24, marginBottom: 20 },
  input: {
    width: '50%', borderBottomWidth: 1, padding: 10, fontSize: 20, textAlign: 'center', marginBottom: 20
  },
});
