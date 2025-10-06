import { View, Text, TextInput, TouchableOpacity, Alert, Switch, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { savePIN, getPIN, savePINEnabled, isPinEnabled, getCurrentUser, deleteCurrentUser } from "./storage";
import { router } from "expo-router";

export default function PinLoginSettingsScreen() {
  const [currentPin, setCurrentPin] = useState("");
  const [pinEnabled, setPinEnabled] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const uid = await getCurrentUser();
      if (!uid) {
        Alert.alert("Error", "No logged-in user found for PIN settings");
        return;
      }
      setUserId(uid);

      const pin = await getPIN(uid);
      if (pin) setCurrentPin(pin);

      const enabled = await isPinEnabled(uid);
      setPinEnabled(enabled);
    }
    fetchData();
  }, []);

  const handleTogglePIN = async () => {
  if (!currentPin && !pinEnabled) { // trying to enable without a PIN
    Alert.alert("Set a PIN first", "You must set a PIN before enabling PIN login.");
    return;
  }
  if (!userId) return;

  if (pinEnabled) {
    // User is disabling PIN
    await savePINEnabled(false, userId);  // disable PIN
    await deleteCurrentUser();            // remove remembered user
    setPinEnabled(false);
    Alert.alert("PIN login disabled");
    router.replace("/login");             // redirect to login page
  } else {
    // User is enabling PIN
    await savePINEnabled(true, userId);
    setPinEnabled(true);
    Alert.alert("PIN login enabled");
  }
};


  const handleChangePIN = async () => {
    if (!userId) {
      Alert.alert("Error", "No logged-in user found for PIN");
      return;
    }

    if (currentPin && oldPin !== currentPin) {
      Alert.alert("Incorrect current PIN");
      return;
    }

    if (newPin.length < 4) {
      Alert.alert("New PIN too short", "Use at least 4 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert("New PIN and confirmation do not match");
      return;
    }

    try {
      await savePIN(newPin, userId);
      await savePINEnabled(true, userId);

      setCurrentPin(newPin);
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      setPinEnabled(true);

      Alert.alert("Success", "Your PIN has been saved and enabled.");
    } catch (error) {
      console.error("Error saving PIN:", error);
      Alert.alert("Error", "Failed to save PIN. Try again.");
    }
  };

  return (
    <ScrollView className="flex-1 bg-white p-6">
      <Text className="text-3xl font-bold mb-10">PIN Settings</Text>

      <View className="flex-row justify-between items-center mb-10">
        <Text className="text-lg font-bold">Enable PIN </Text>
        <Switch value={pinEnabled} onValueChange={handleTogglePIN} />
      </View>

      <Text className="text-lg font-bold mb-10">Enter / Change PIN</Text>
      {currentPin && (
        <TextInput
          placeholder="Current PIN"
          secureTextEntry
          keyboardType="number-pad"
          maxLength={4}
          value={oldPin}
          onChangeText={setOldPin}
          placeholderTextColor={"black"}
          className="border p-4 mb-5 text-center text-black border-gray-250 rounded"
        />
      )}
      <TextInput
        placeholder="New PIN"
        secureTextEntry
        keyboardType="number-pad"
        maxLength={4}
        value={newPin}
        onChangeText={setNewPin}
        placeholderTextColor={"black"}
        className="border p-4 mb-5 text-center text-black border-gray-250 rounded"
      />
      <TextInput
        placeholder="Confirm New PIN"
        secureTextEntry
        keyboardType="number-pad"
        maxLength={4}
        value={confirmPin}
        onChangeText={setConfirmPin}
        placeholderTextColor={"black"}
        className="border p-4 mb-5 text-center text-black border-gray-250 rounded"
      />
      <TouchableOpacity 
  onPress={handleChangePIN} 
  style={{
    backgroundColor: '#00c4cc',  // your custom color
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  }}
>
  <Text style={{ color: 'white', fontSize: 18, textAlign: 'center' }}>
    Save / Change PIN
  </Text>
</TouchableOpacity>

    </ScrollView>
  );
}
