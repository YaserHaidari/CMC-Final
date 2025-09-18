import { View, Text, Image, TouchableOpacity } from "react-native";
import { MentorMatch } from "../services/matchService";
import { getCompatibilityLevel, getScoreColor } from "../utils/scoring";

// A card component to display mentor match information with actions
export default function MentorMatchCard({
    match,
    onNext,
    onRequest,
    isLast,
}: {
    match: MentorMatch;
    onNext: () => void;
    onRequest: () => void;
    isLast: boolean;
}) {
    const compat = getCompatibilityLevel(match.compatibility_score);

    return (
        <View style={{ backgroundColor: "white", borderRadius: 16, padding: 24, marginBottom: 24 }}>
        <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Image
                source={{ uri: `https://avatar.iran.liara.run/public/${Math.random() > 0.5 ? "boy" : "girl"}?id=${match.mentorid}` }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
            />
            <Text style={{ fontSize: 20, fontWeight: "600" }}>{match.mentor_name}</Text>
            <Text style={{ color: "#6B7280" }}>
                {match.mentor_experience_level} • {match.mentor_location}
            </Text>
        </View>

        <View style={{ alignItems: "center", marginBottom: 12, backgroundColor: compat.bgColor, padding: 8, borderRadius: 12 }}>
            <Text style={{ color: compat.color, fontWeight: "600" }}>
                {match.compatibility_score}% {compat.level} Match {compat.emoji}
            </Text>
        </View>

        {/* Skills & Roles */}
        {match.matching_skills?.length > 0 && (
            <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: "600" }}>Matching Skills:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {match.matching_skills.map((s, i) => (
                <Text key={i} style={{ backgroundColor: "#DCFCE7", padding: 6, margin: 4, borderRadius: 8 }}>
                    {s}
                </Text>
                ))}
            </View>
            </View>
        )}

        {match.matching_roles?.length > 0 && (
            <View style={{ marginBottom: 12 }}>
            <Text style={{ fontWeight: "600" }}>Matching Roles:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {match.matching_roles.map((r, i) => (
                <Text key={i} style={{ backgroundColor: "#DBEAFE", padding: 6, margin: 4, borderRadius: 8 }}>
                    {r}
                </Text>
                ))}
            </View>
            </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
            <TouchableOpacity
            style={{
                flex: 1,
                backgroundColor: isLast ? "#EF4444" : "#E5E7EB",
                padding: 12,
                marginRight: 8,
                borderRadius: 8,
                alignItems: "center",
            }}
            onPress={onNext}
            >
            <Text style={{ color: isLast ? "white" : "#374151", fontWeight: "600" }}>
                {isLast ? "Finish" : "Next"}
            </Text>
            </TouchableOpacity>

            <TouchableOpacity
            style={{ flex: 1, backgroundColor: "#2563EB", padding: 12, borderRadius: 8, alignItems: "center" }}
            onPress={onRequest}
            >
            <Text style={{ color: "white", fontWeight: "600" }}>Request Mentorship</Text>
            </TouchableOpacity>
        </View>
        </View>
    );
}