import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { getPIN, getCurrentUser } from "./storage";
import Svg, { Path } from "react-native-svg";
export default function PinLoginScreen() {
  const [pin, setPin] = useState("");
  const [savedPin, setSavedPin] = useState("");
  const router = useRouter();
  const PIN_LENGTH = 4;

  // update saved PIN for current user
  useEffect(() => {
    async function fetchPin() {
      const userId = await getCurrentUser();
      if (!userId) return;

      const pinStored = await getPIN(userId);
      if (pinStored) setSavedPin(pinStored);
    }
    fetchPin();
  }, []);

  const handlePress = (num: string) => {
    if (pin.length < PIN_LENGTH) setPin(pin + num);
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = () => {
    if (pin.length === PIN_LENGTH) {
      if (pin === savedPin) {
        // Correct PIN, go to home
        router.replace("/home");
      } else {
        // Incorrect PIN
        Alert.alert("Incorrect PIN", "The PIN you entered is incorrect.");
        setPin(""); // reset input
      }
    }
  };

  // Redirect to login page
  const handleSwitchUser = () => {
    router.replace("/login");
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < PIN_LENGTH; i++) {
      dots.push(
        <View key={i} style={styles.dot}>
          {i < pin.length && <View style={styles.filledDot} />}
        </View>
      );
    }
    return <View style={styles.dotsContainer}>{dots}</View>;
  };

  const renderKeypad = () => {
    const keys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["", "0", "del"],
    ];

    return keys.map((row, rowIndex) => (
      <View key={rowIndex} style={styles.keypadRow}>
        {row.map((key) => (
          <TouchableOpacity
            key={key}
            style={styles.key}
            onPress={() => {
              if (key === "del") handleDelete();
              else if (key) handlePress(key);
            }}
          >
            <Text style={styles.keyText}>{key === "del" ? "⌫" : key}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Svg style={styles.topShape} viewBox="0 0 1430 320">
        <Path
          fill="#9ADAD9"
          d="M0,64L80,106.7C160,149,320,235,480,229.3C640,224,800,128,960,122.7C1120,117,1280,203,1360,245.3L1440,288L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"
        />
      </Svg>
      <Text style={styles.title}>Enter PIN</Text>
      {renderDots()}
      <View style={styles.keypad}>{renderKeypad()}</View>
      <TouchableOpacity style={[styles.loginButton, { backgroundColor: "#00C4CC" }]} onPress={handleLogin}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>

      {/* go back to login page */}
      <TouchableOpacity style={styles.switchUserButton} onPress={handleSwitchUser}>
        <Text style={[styles.switchUserText, { color: "black", fontWeight: "bold" }]}>Login with another user</Text>
      </TouchableOpacity>
      {/* bottom shape */}
      <Svg style={styles.bottomShape} viewBox="0 0 1440 320">
        <Path
          fill="#00C4CC"
          d="M0,288L80,272C160,256,320,224,480,192C640,160,800,128,960,138.7C1120,149,1280,203,1360,229.3L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 0, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  topShape: { position: "absolute", top: -100, left: 100,right: -750, height: 250 },
  bottomShape: { position: "absolute", bottom: -200, left: -350, right: 0, height: 200 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 40,top: 85 },
  dotsContainer: { flexDirection: "row", marginBottom: 40,top: 70 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#333", margin: 10, justifyContent: "center", alignItems: "center" },
  filledDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#333" },
  keypad: { marginTop: 20, top: 45 },
  keypadRow: { flexDirection: "row", justifyContent: "center" },
  key: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", margin: 10 },
  keyText: { fontSize: 24, fontWeight: "bold" },
  loginButton: { marginTop: 30, backgroundColor: "#007bff", paddingHorizontal: 40, paddingVertical: 12, borderRadius: 8, top: 30 },
  loginText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  switchUserButton: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, top: 20 },
  switchUserText: { fontSize: 16, color: "#007bff", textDecorationLine: "underline" },
});
