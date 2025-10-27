import { View, Text, TextInput, TouchableOpacity, Alert, Switch, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { savePIN, getPIN, savePINEnabled, isPinEnabled, getCurrentUser, deleteCurrentUser } from "./storage";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AntDesign from "@expo/vector-icons/AntDesign";

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
    if (!currentPin && !pinEnabled) {
      Alert.alert("Set a PIN first", "You must set a PIN before enabling PIN login.");
      return;
    }
    if (!userId) return;

    if (pinEnabled) {
      await savePINEnabled(false, userId);
      await deleteCurrentUser();
      setPinEnabled(false);
      Alert.alert("PIN login disabled");
      router.replace("/login");
    } else {
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
    <ScrollView
      className="flex-1 p-6"
      style={{ backgroundColor: "#FAF3E0" }} // ☕ latte background
    >
      {/* Header */}
      <View className="flex-row items-center mb-8 mt-4">
        <Ionicons name="key-outline" size={30} color="#6B4F3B" />
        <Text className="text-3xl font-bold ml-3 text-[#4B2E05]">PIN Settings</Text>
      </View>

      {/* Enable PIN Section */}
      <View
        className="flex-row justify-between items-center mb-10 p-4 rounded-2xl"
        style={{
          backgroundColor: "#FFF8F0",
          borderColor: "#B08968",
          borderWidth: 1,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center">
          <MaterialIcons name="lock-outline" size={26} color="#6B4F3B" />
          <Text className="text-lg font-semibold ml-3 text-[#4B2E05]">Enable PIN Login</Text>
        </View>
        <Switch
          value={pinEnabled}
          onValueChange={handleTogglePIN}
          thumbColor={pinEnabled ? "#4B2E05" : "#E6CCB2"}
          trackColor={{ false: "#E6CCB2", true: "#DDB892" }}
        />
      </View>

      {/* Change PIN Section */}
      <View
        className="p-5 rounded-2xl mb-8"
        style={{
          backgroundColor: "#FFF8F0",
          borderColor: "#B08968",
          borderWidth: 1,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center mb-4">
          <AntDesign name="form" size={26} color="#6B4F3B" />
          <Text className="text-lg font-bold ml-3 text-[#4B2E05]">Enter / Change PIN</Text>
        </View>

        {currentPin && (
          <TextInput
            placeholder="Current PIN"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={4}
            value={oldPin}
            onChangeText={setOldPin}
            placeholderTextColor={"#6B4F3B"}
            className="border p-4 mb-4 text-center text-black rounded-xl"
            style={{
              backgroundColor: "#FAEBD7",
              borderColor: "#DDB892",
              borderWidth: 1,
            }}
          />
        )}
        <TextInput
          placeholder="New PIN"
          secureTextEntry
          keyboardType="number-pad"
          maxLength={4}
          value={newPin}
          onChangeText={setNewPin}
          placeholderTextColor={"#6B4F3B"}
          className="border p-4 mb-4 text-center text-black rounded-xl"
          style={{
            backgroundColor: "#FAEBD7",
            borderColor: "#DDB892",
            borderWidth: 1,
          }}
        />
        <TextInput
          placeholder="Confirm New PIN"
          secureTextEntry
          keyboardType="number-pad"
          maxLength={4}
          value={confirmPin}
          onChangeText={setConfirmPin}
          placeholderTextColor={"#6B4F3B"}
          className="border p-4 mb-4 text-center text-black rounded-xl"
          style={{
            backgroundColor: "#FAEBD7",
            borderColor: "#DDB892",
            borderWidth: 1,
          }}
        />

        <TouchableOpacity
          onPress={handleChangePIN}
          style={{
            backgroundColor: "#6B4F3B", // dark mocha
            padding: 14,
            borderRadius: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          <Ionicons name="save-outline" size={22} color="white" style={{ marginRight: 8 }} />
          <Text className="text-white text-lg font-semibold">Save / Change PIN</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View className="items-center mt-6 mb-10">
        <Text className="text-sm italic text-[#7B5E42]">
          ☕ Keep your account secure — like guarding your favorite brew!
        </Text>
      </View>
    </ScrollView>
  );
}
