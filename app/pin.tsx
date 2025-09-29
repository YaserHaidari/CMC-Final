import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function PinLoginScreen() {
  const [pin, setPin] = useState("");
  const router = useRouter();
  const PIN_LENGTH = 4;

  const handlePress = (num: string) => {
    if (pin.length < PIN_LENGTH) setPin(pin + num);
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = () => {
    if (pin.length === PIN_LENGTH) {
      // validate pin here
      router.replace("/home"); // or redirect as needed
    }
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
      <Text style={styles.title}>Enter PIN</Text>
      {renderDots()}
      <View style={styles.keypad}>{renderKeypad()}</View>
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f5f5f5" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 40 },
  dotsContainer: { flexDirection: "row", marginBottom: 40 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: "#333", margin: 10, justifyContent: "center", alignItems: "center" },
  filledDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#333" },
  keypad: { marginTop: 20 },
  keypadRow: { flexDirection: "row", justifyContent: "center" },
  key: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", margin: 10 },
  keyText: { fontSize: 24, fontWeight: "bold" },
  loginButton: { marginTop: 30, backgroundColor: "#007bff", paddingHorizontal: 40, paddingVertical: 12, borderRadius: 8 },
  loginText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
