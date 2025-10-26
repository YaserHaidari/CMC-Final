import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getPIN, getCurrentUser, getRememberedUser } from "./storage";
import loginUser from "@/lib/firebase/loginUser";
import Svg, { Path } from "react-native-svg";
import { deleteCurrentUser } from "./storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function PinLoginScreen() {
  const [pin, setPin] = useState("");
  const [savedPin, setSavedPin] = useState("");
  const [userData, setUserData] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();
  const PIN_LENGTH = 4;

  useEffect(() => {
    async function fetchPinAndUser() {
      const userId = await getCurrentUser();
      if (!userId) return;

      const pinStored = await getPIN(userId);
      setSavedPin(pinStored || "");

      const remembered = await getRememberedUser(userId);
      setUserData(remembered || null);
    }
    fetchPinAndUser();
  }, []);

  const handlePress = (num: string) => {
    if (pin.length < PIN_LENGTH) setPin(pin + num);
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  const handleLogin = async () => {
    if (pin.length === PIN_LENGTH) {
      if (pin === savedPin && userData) {
        const result = await loginUser(userData.email, userData.password);
        if (result === true) router.replace("/home");
        else setError("Failed to login. Please try again.");
      } else {
        Alert.alert("Incorrect PIN", "The PIN you entered is incorrect.");
        setPin("");
      }
    }
  };

  const handleSwitchUser = async () => {
    await deleteCurrentUser();
    router.replace("/login");
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View key={i} style={styles.dot}>
          {i < pin.length && <View style={styles.filledDot} />}
        </View>
      ))}
    </View>
  );

  const renderKeypad = () => {
    const keys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["", "0", "del"],
    ];
    return keys.map((row, idx) => (
      <View key={idx} style={styles.keypadRow}>
        {row.map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.key}
            onPress={() => (key === "del" ? handleDelete() : key && handlePress(key))}
          >
            {key === "del" ? <Ionicons name="backspace-outline" size={28} color="#6B4F3B" /> : <Text style={styles.keyText}>{key}</Text>}
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      {/* Top Coffee Wave */}
      <Svg style={styles.topShape} viewBox="0 0 1430 320">
        <Path
          fill="#c5b383ff"
          d="M0,64L80,106.7C160,149,320,235,480,229.3C640,224,800,128,960,122.7C1120,117,1280,203,1360,245.3L1440,288L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"
        />
      </Svg>
      <Svg style={styles.sideShape} viewBox="0 0 1430 320">
        <Path
          fill="#dccb9cff"
          d="M0,64L80,106.7C160,149,320,235,480,229.3C640,224,800,128,960,122.7C1120,117,1280,203,1360,245.3L1440,288L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"
        />
      </Svg>

      {/* Title */}
      <Text style={styles.title}>☕ Enter Your PIN</Text>
      {renderDots()}

      {/* Keypad */}
      <View style={styles.keypad}>{renderKeypad()}</View>

      {/* Login Button */}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons name="login" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.loginText}>Login</Text>
        </View>
      </TouchableOpacity>

      {/* Switch User */}
      <TouchableOpacity style={styles.switchUserButton} onPress={handleSwitchUser}>
        <Text style={styles.switchUserText}>Login with another user</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAF3E0" },
  topShape: { position: "absolute", top: -30, left: 0, right: -650, height: 250 },
  sideShape: { position: "absolute", top: -30, left: -300, right: -300, height: 250 },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 40, color: "#4B2E05", top: 85 },
  dotsContainer: { flexDirection: "row", marginBottom: 40, top: 70 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#6B4F3B", margin: 10, justifyContent: "center", alignItems: "center" },
  filledDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#6B4F3B" },
  keypad: { marginTop: 20, top: 45 },
  keypadRow: { flexDirection: "row", justifyContent: "center" },
  key: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#e2dac6ff", justifyContent: "center", alignItems: "center", margin: 10 },
  keyText: { fontSize: 24, fontWeight: "bold", color: "#4B2E05" },
  loginButton: { marginTop: 30, backgroundColor: "#6B4F3B", paddingHorizontal: 40, paddingVertical: 12, borderRadius: 12, top: 30, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  loginText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  switchUserButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, top: 20 },
  switchUserText: { fontSize: 16, color: "#6B4F3B", textDecorationLine: "underline", fontWeight: "bold" },
});
