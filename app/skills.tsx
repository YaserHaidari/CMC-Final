import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { supabase } from "@/lib/supabase/initiliaze";
import { AntDesign } from "@expo/vector-icons";

const SKILL_OPTIONS = [
  "Network Security",
  "Cloud Security",
  "Penetration Testing",
  "Incident Response",
  "Cryptography",
  "Malware Analysis",
  "Threat Intelligence",
  "Container Security",
  "Application Security",
  "Risk Management",
  "Ethical Hacking",
  "IoT Security",
  "Linux Administration",
  "Secure Software Development",
];

export default function SkillsPage() {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [initialSkills, setInitialSkills] = useState<string[]>([]);
  const [customSkills, setCustomSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Save");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSkills = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from("mentees")
        .select("skills")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.log("Error fetching skills:", error.message);
      } else if (data?.skills) {
        setSelectedSkills(data.skills);
        setInitialSkills(data.skills);

        const customs = data.skills.filter(
          (s: string) => !SKILL_OPTIONS.includes(s)
        );
        setCustomSkills(customs);
      }
    };

    fetchSkills();
  }, []);

  const toggleSkill = (skill: string) => {
    let updatedSkills;
    if (selectedSkills.includes(skill)) {
      updatedSkills = selectedSkills.filter((s) => s !== skill);
    } else {
      updatedSkills = [...selectedSkills, skill];
    }
    setSelectedSkills(updatedSkills);
    setSaveStatus("Save");
  };

  const addCustomSkill = () => {
    const skill = customSkillInput.trim();
    if (!skill) return;
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
      setCustomSkills([...customSkills, skill]);
      setSaveStatus("Save");
    }
    setCustomSkillInput("");
  };

  const removeCustomSkill = (skill: string) => {
    setCustomSkills(customSkills.filter((s) => s !== skill));
    setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    setSaveStatus("Save");
  };

  const saveSkills = async () => {
    if (!userId) {
      Alert.alert("Error", "User not logged in");
      return;
    }
    setIsSaving(true);
    setSaveStatus("Saving...");

    const { error } = await supabase
      .from("mentees")
      .upsert(
        { user_id: userId, skills: selectedSkills },
        { onConflict: "user_id" }
      );

    setIsSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      setSaveStatus("Save");
    } else {
      setInitialSkills([...selectedSkills]);
      setSaveStatus("Saved");
    }
  };

  const hasChanges =
    JSON.stringify(initialSkills.sort()) !==
    JSON.stringify(selectedSkills.sort());

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🛡️ Cybersecurity Skills</Text>
        <Text style={styles.subtitle}>
          Select your skills from the list or add your own
        </Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Custom Skills Section */}
        <Text style={styles.sectionLabel}>➕ Add Custom Skills</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={customSkillInput}
            onChangeText={setCustomSkillInput}
            placeholder="Type your skill..."
            placeholderTextColor="#9ca3af"
          />
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: customSkillInput.trim() ? "#2563eb" : "#cbd5e1" },
            ]}
            disabled={!customSkillInput.trim()}
            onPress={addCustomSkill}
          >
            <AntDesign name="plus" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Skills Section */}
        <Text style={styles.sectionLabel}>📋 Available Skills</Text>
        <View style={styles.skillsContainer}>
          {/* Predefined Skills */}
          {SKILL_OPTIONS.map((skill) => (
            <TouchableOpacity
              key={skill}
              style={[
                styles.skillCard,
                selectedSkills.includes(skill) && styles.skillCardSelected,
              ]}
              onPress={() => toggleSkill(skill)}
            >
              <Text
                style={[
                  styles.skillText,
                  selectedSkills.includes(skill) && styles.skillTextSelected,
                ]}
              >
                {skill}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Custom Skills */}
          {customSkills.map((skill) => (
            <View key={skill} style={styles.customSkillWrapper}>
              <TouchableOpacity
                style={[
                  styles.skillCard,
                  selectedSkills.includes(skill) && styles.skillCardSelected,
                  { width: "100%" }, // ensures custom card fills wrapper width
                ]}
                onPress={() => toggleSkill(skill)}
              >
                <Text
                  style={[
                    styles.skillText,
                    selectedSkills.includes(skill) && styles.skillTextSelected,
                  ]}
                >
                  {skill}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeCustomSkill(skill)}
              >
                <AntDesign name="closecircle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (!hasChanges || isSaving) && styles.disabledButton,
          ]}
          onPress={saveSkills}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>{saveStatus}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    backgroundColor: "#f9fafb",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#6b7280",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    marginBottom: 24,
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 16,
    marginRight: 8,
    color: "#111827",
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  skillCard: {
    backgroundColor: "white",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    marginBottom: 12,
    width: "48%",
    alignItems: "center",
  },
  skillCardSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },
  skillText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "500",
  },
  skillTextSelected: {
    color: "#2563eb",
    fontWeight: "600",
  },
  customSkillWrapper: {
    width: "48%",
    marginBottom: 12,
    position: "relative",
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
  },
  saveButtonContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#cbd5e1" },
  saveButtonText: { color: "white", fontSize: 17, fontWeight: "600" },
});
