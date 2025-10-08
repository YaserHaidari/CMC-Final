import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/initiliaze";
import { useRouter } from "expo-router";
import { Picker } from "@react-native-picker/picker";

interface MentorProfile {
    hourly_rate: number | null;
    skills: string[];
    specialization_roles: string[];
    experience_level: string;
    years_of_experience: number;
    teaching_style: string[];
    max_mentees: number;
    availability_hours_per_week: number | null;
    industries: string[];
    certifications: string[];
}

export default function MentorDetails() {
    const [mentorProfile, setMentorProfile] = useState<MentorProfile>({
        hourly_rate: null,
        skills: [],
        specialization_roles: [],
        experience_level: "Mid-level",
        years_of_experience: 0,
        teaching_style: [],
        max_mentees: 5,
        availability_hours_per_week: null,
        industries: [],
        certifications: [],
    });
    const [loading, setLoading] = useState(true);
    const [showExperiencePicker, setShowExperiencePicker] = useState(false);

    const experienceLevels = ["Mid-level", "Senior", "Expert", "Principal", "Executive"];
    const router = useRouter();

    // Fetch mentor profile using auth.user.id (UUID)
    useEffect(() => {
        async function fetchMentorProfile() {
            try {
                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (!session?.user) {
                    Alert.alert("Error", "No logged-in user found.");
                    router.push("/login");
                    return;
                }

                const userId = session.user.id; // UUID from Supabase Auth

                const { data, error } = await supabase
                    .from("mentors")
                    .select("*")
                    .eq("user_id", userId)
                    .single();

                if (error) throw error;
                if (data) setMentorProfile(data);
            } catch (err: any) {
                console.error("Error fetching mentor profile:", err.message);
                Alert.alert("Error", "Failed to load mentor profile.");
            } finally {
                setLoading(false);
            }
        }
        fetchMentorProfile();
    }, []);

    const handleUpdate = async () => {
        try {
            setLoading(true);
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session?.user) return;

            const userId = session.user.id; // UUID
            const { error } = await supabase
                .from("mentors")
                .update(mentorProfile)
                .eq("user_id", userId);

            if (error) throw error;
            Alert.alert("Success", "Mentor profile updated!");
        } catch (err: any) {
            console.error("Error updating mentor profile:", err.message);
            Alert.alert("Error", "Failed to update profile.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 24 }}>
                <Text style={styles.sectionTitle}>Mentor Settings</Text>

                <Text style={styles.label}>Hourly Rate ($)</Text>
                <TextInput
                    value={mentorProfile.hourly_rate?.toString() || ""}
                    onChangeText={(text) => setMentorProfile(prev => ({ ...prev, hourly_rate: text ? parseInt(text) : null }))}
                    style={styles.input}
                    placeholder="e.g. 50"
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Years of Experience</Text>
                <TextInput
                    value={mentorProfile.years_of_experience.toString()}
                    onChangeText={(text) => setMentorProfile(prev => ({ ...prev, years_of_experience: parseInt(text) || 0 }))}
                    style={styles.input}
                    placeholder="e.g. 5"
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Experience Level</Text>
                <TouchableOpacity
                    style={styles.pickerContainer}
                    onPress={() => setShowExperiencePicker(!showExperiencePicker)}
                >
                    <Text style={styles.pickerText}>{mentorProfile.experience_level}</Text>
                </TouchableOpacity>

                {showExperiencePicker && (
                    <Picker
                        selectedValue={mentorProfile.experience_level}
                        onValueChange={(value) => {
                            setMentorProfile(prev => ({ ...prev, experience_level: value }));
                            setShowExperiencePicker(false);
                        }}
                    >
                        {experienceLevels.map(level => (
                            <Picker.Item key={level} label={level} value={level} />
                        ))}
                    </Picker>
                )}

                <Text style={styles.label}>Maximum Mentees</Text>
                <TextInput
                    value={mentorProfile.max_mentees.toString()}
                    onChangeText={(text) => setMentorProfile(prev => ({ ...prev, max_mentees: parseInt(text) || 5 }))}
                    style={styles.input}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Availability (hours/week)</Text>
                <TextInput
                    value={mentorProfile.availability_hours_per_week?.toString() || ""}
                    onChangeText={(text) => setMentorProfile(prev => ({ ...prev, availability_hours_per_week: text ? parseInt(text) : null }))}
                    style={styles.input}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Skills (comma-separated)</Text>
                <TextInput
                    value={mentorProfile.skills.join(", ")}
                    onChangeText={(text) => setMentorProfile(prev => ({ ...prev, skills: text.split(",").map(s => s.trim()) }))}
                    style={[styles.input, styles.multilineInput]}
                    multiline
                />

                <Text style={styles.label}>Specialization Roles (comma-separated)</Text>
                <TextInput
                    value={mentorProfile.specialization_roles.join(", ")}
                    onChangeText={(text) => setMentorProfile(prev => ({ ...prev, specialization_roles: text.split(",").map(s => s.trim()) }))}
                    style={[styles.input, styles.multilineInput]}
                    multiline
                />

                <Text style={styles.label}>Industries (comma-separated)</Text>
                <TextInput
                    value={mentorProfile.industries.join(", ")}
                    onChangeText={(text) => setMentorProfile(prev => ({ ...prev, industries: text.split(",").map(s => s.trim()) }))}
                    style={[styles.input, styles.multilineInput]}
                    multiline
                />

                <Text style={styles.label}>Teaching Style (comma-separated)</Text>
                <TextInput
                    value={mentorProfile.teaching_style.join(", ")}
                    onChangeText={(text) => setMentorProfile(prev => ({ ...prev, teaching_style: text.split(",").map(s => s.trim()) }))}
                    style={[styles.input, styles.multilineInput]}
                    multiline
                />

                <Text style={styles.label}>Certifications (comma-separated)</Text>
                <TextInput
                    value={mentorProfile.certifications.join(", ")}
                    onChangeText={(text) => setMentorProfile(prev => ({ ...prev, certifications: text.split(",").map(s => s.trim()) }))}
                    style={[styles.input, styles.multilineInput]}
                    multiline
                />

                <TouchableOpacity onPress={handleUpdate} style={[styles.button, styles.updateButton]}>
                    <Text style={styles.updateButtonText}>Update Profile</Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAF3E0" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FAF3E0" },
    sectionTitle: { fontSize: 22, fontWeight: "600", marginBottom: 16, color: "#111827" },
    label: { fontSize: 16, fontWeight: "500", marginBottom: 8, color: "#374151" },
    input: { backgroundColor: "#faf8efff", borderRadius: 12, paddingHorizontal: 16, height: 48, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: "#40301eff", color: "#111827" },
    multilineInput: { height: 80, textAlignVertical: "top", paddingTop: 12 },
    button: { padding: 16, borderRadius: 12, alignItems: "center", marginVertical: 16 },
    updateButton: { backgroundColor: "#4f3b2bff" },
    updateButtonText: { color: "white", fontSize: 18, fontWeight: "600" },
    pickerContainer: { backgroundColor: "#faf8efff", borderRadius: 12, paddingHorizontal: 16, height: 48, justifyContent: "center", marginBottom: 16, borderWidth: 1, borderColor: "#40301eff" },
    pickerText: { fontSize: 16, color: "black" },
});
