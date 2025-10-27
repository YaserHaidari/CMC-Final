import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function Support() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I reset my password?",
      a: "At the moment the only way to reset your password is by emailing our team directly so we can send you a link.",
    },
    {
      q: "What is verified mentors?",
      a: "Verified mentors are users whose ID & skillset have been verified by our team.",
    },
    {
      q: "How do I change my account email?",
      a: "Go to Profile → Edit Profile & change your email address and press Update.",
    },
    {
      q: "How do I delete my account?",
      a: "To delete your account, please email us.",
    },
    {
      q: "How do I report abuse or a policy violation?",
      a: "Please email us about any policy violation.",
    },
  ];

  const openEmail = () => {
    const to = "yhaidari99@gmail.com";
    const body = `\n\n---\nApp: CMC\nPlatform: ${Platform.OS}\n`;
    const url = `mailto:${to}?subject=${encodeURIComponent(
      "Support request"
    )}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Unable to open email client.")
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SafeAreaView>
        {/* Title */}
        <Text style={styles.title}>☕ Support</Text>
        <Text style={styles.subtitle}>
          Browse FAQs or contact support directly.
        </Text>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((f, i) => (
            <View key={i} style={styles.faqItem}>
              <TouchableOpacity
                onPress={() => setOpenFaq(openFaq === i ? null : i)}
                style={styles.faqHeader}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons
                    name="help-circle-outline"
                    size={20}
                    color="#6B4F3B"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.faqQuestion}>{f.q}</Text>
                </View>
                <AntDesign
                  name={openFaq === i ? "down" : "right"}
                  size={16}
                  color="#6B4F3B"
                />
              </TouchableOpacity>
              {openFaq === i && <Text style={styles.faqAnswer}>{f.a}</Text>}
            </View>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactRow}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#6B4F3B"
              style={{ marginRight: 8 }}
            />
            <TouchableOpacity onPress={openEmail} accessibilityRole="link">
              <Text style={styles.contactLink}>yhaidari99@gmail.com</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>
            Response time: typically within 24–48 hours.
          </Text>
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    backgroundColor: "#FAF3E0", // Coffee cream background
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#4B2E05", // Dark mocha
    marginBottom: 8,
  },
  subtitle: {
    color: "#6B4F3B", // Warm brown
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 20,
  },
  section: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e6d6b3",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#4B2E05",
    marginBottom: 10,
  },
  faqItem: { marginBottom: 8 },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  faqQuestion: { color: "#4B2E05", fontWeight: "600", flex: 1 },
  faqAnswer: {
    color: "#6B4F3B",
    paddingTop: 8,
    lineHeight: 18,
    backgroundColor: "#fff4e6",
    padding: 8,
    borderRadius: 8,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  contactLink: {
    color: "#6B4F3B",
    textDecorationLine: "underline",
    fontWeight: "600",
    fontSize: 15,
  },
  hintText: {
    color: "#947a5b",
    marginTop: 12,
    fontSize: 13,
  },
});
