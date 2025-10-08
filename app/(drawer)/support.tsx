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
import AntDesign from "@expo/vector-icons/build/AntDesign";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Support() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I reset my password?",
      a: "Go to Settings → Account → Reset Password. If you don't receive an email, check spam or contact support.",
    },
    {
      q: "How do I become a mentor?",
      a: "Complete your profile and apply from the Mentor section. Our team will review and notify you by email.",
    },
    {
      q: "Where can I view billing details?",
      a: "Billing details are available in Settings → Billing. For invoices, contact yhaidari99@gmail.com.",
    },
    {
      q: "How do I change my account email?",
      a: "Go to Settings → Account → Email and follow the verification steps. Updating the email will require re-verification.",
    },
    {
      q: "How do I delete my account?",
      a: "To delete your account, go to Settings → Account → Delete Account. This action is irreversible; contact support if unsure.",
    },
    {
      q: "How do I report abuse or a policy violation?",
      a: "Use the 'Report' link on the offending profile or message, or contact support with the URL and a short description.",
    },
    {
      q: "What payment methods are accepted?",
      a: "We accept major credit/debit cards and selected regional payment gateways. Billing options appear in Settings → Billing.",
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
        <Text style={styles.title}>Support</Text>
        <Text style={styles.subtitle}>
          Browse FAQs or contact support directly. Links are inline and
          full-width sections are used for clarity.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently asked questions</Text>
          {faqs.map((f, i) => (
            <View key={i} style={styles.faqItem}>
              <TouchableOpacity
                onPress={() => setOpenFaq(openFaq === i ? null : i)}
                style={styles.faqHeader}
              >
                <Text style={styles.faqQuestion}>{f.q}</Text>
                <AntDesign
                  name={openFaq === i ? "down" : "right"}
                  size={16}
                  color="#374151"
                />
              </TouchableOpacity>
              {openFaq === i && <Text style={styles.faqAnswer}>{f.a}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactRow}>
            <AntDesign
              name="mail"
              size={16}
              color="#2563eb"
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
    backgroundColor: "#ffffff",
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  subtitle: {
    color: "#475569",
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 20,
  },
  section: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2ff",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  faqItem: { marginBottom: 8 },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  faqQuestion: { color: "#0f172a", fontWeight: "600", flex: 1 },
  faqAnswer: { color: "#475569", paddingTop: 8, lineHeight: 18 },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  contactLink: {
    color: "#2563eb",
    textDecorationLine: "underline",
    fontWeight: "600",
    fontSize: 15,
  },
  hintText: {
    color: "#64748b",
    marginTop: 12,
    fontSize: 13,
  },
});
