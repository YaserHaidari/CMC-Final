import { View, Text, Image } from "react-native";
import { Mentee } from "../services/menteeService";

// A card component to display mentee profile information
export default function MenteeProfileCard({ mentee }: { mentee: Mentee }) {
    return (
        <View style={{ backgroundColor: "white", borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
                <Image
                    source={{ uri: `https://avatar.iran.liara.run/public/boy?id=${mentee.menteeid || 1}` }}
                    style={{ width: 80, height: 80, borderRadius: 40 }}
                />
                <Text style={{ fontSize: 18, fontWeight: "600" }}>
                    {mentee.bio ? "Profile Loaded" : "Mentee Profile"}
                </Text>
                <Text>{mentee.current_level} • {mentee.location}</Text>
                {mentee.study_level && (
                <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                    {mentee.study_level} in {mentee.field}
                </Text>
                )}
            </View>
        
        {mentee.skills?.length > 0 && (
            <>
            <Text style={{ fontWeight: "600", marginBottom: 8 }}>Skills:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {mentee.skills.map((skill, i) => (
                <Text key={i} style={{ backgroundColor: "#DBEAFE", padding: 6, margin: 4, borderRadius: 8 }}>
                    {skill}
                </Text>
                ))}
            </View>
            </>
        )}

        {mentee.target_roles?.length > 0 && (
            <>
            <Text style={{ fontWeight: "600", marginTop: 12, marginBottom: 8 }}>Target Roles:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {mentee.target_roles.map((role, i) => (
                <Text key={i} style={{ backgroundColor: "#D1FAE5", padding: 6, margin: 4, borderRadius: 8 }}>
                    {role}
                </Text>
                ))}
            </View>
            </>
        )}

        {mentee.learning_goals && (
            <View style={{ backgroundColor: "#F9FAFB", borderRadius: 8, padding: 12, marginTop: 12 }}>
            <Text style={{ fontWeight: "600" }}>Learning Goals:</Text>
            <Text style={{ color: "#6B7280", fontStyle: "italic" }}>"{mentee.learning_goals}"</Text>
            </View>
        )}
        </View>
    );
}