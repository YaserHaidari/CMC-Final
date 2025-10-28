import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/initiliaze";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";

// Star rating component (if needed in future)
const StarRating: React.FC<{ rating: number; size?: "sm" | "md" | "lg" }> = ({
  rating,
  size = "md",
}) => {
  const iconSize = size === "lg" ? 22 : size === "sm" ? 14 : 18;
  const filledCount = Math.round(rating);
  return (
    <View className="flex-row">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < filledCount;
        return (
          <FontAwesome
            key={i}
            name={filled ? "star" : "star-o"}
            size={iconSize}
            color={filled ? "#facc15" : "#d1d5db"}
            style={{ marginRight: 2 }}
          />
        );
      })}
    </View>
  );
};

// Mentee Profile Page
export default function MenteeDetails() {
  const route = useRoute();
  const { menteeId } = route.params as { menteeId: number };
  const [mentee, setMentee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (menteeId) fetchMenteeDetails(menteeId);
  }, [menteeId]);

  async function fetchMenteeDetails(menteeId: number) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("mentees")
        .select(`
          *,
          user:user_id(*)
        `)
        .eq("menteeid", menteeId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Mentee not found");

      setMentee(data);
    } catch (error: any) {
      console.error("❌ Error fetching mentee details:", error.message || error);
    } finally {
      setLoading(false);
    }
  }

  if (loading)
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-2 text-gray-600">Loading mentee details...</Text>
      </View>
    );

  if (!mentee)
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-600">Mentee not found</Text>
      </View>
    );

  return (
    <ScrollView className="flex-1 bg-[#FAF3E0] p-5">
      {/* --- Mentee Card Header --- */}
      <View className="bg-white rounded-3xl shadow-lg p-5 mb-6 items-center">
        {mentee.user?.photoURL ? (
          <Image
            source={{ uri: mentee.user.photoURL }}
            className="w-32 h-32 rounded-full mb-3"
          />
        ) : (
          <View className="w-32 h-32 rounded-full bg-gray-300 mb-3 items-center justify-center">
            <Ionicons name="person" size={50} color="white" />
          </View>
        )}
        <Text className="text-2xl font-bold text-gray-900">
          {mentee.user?.name || "Unknown Mentee"}
        </Text>
        {mentee.field && (
          <Text className="text-gray-600 text-sm mt-1">{mentee.field}</Text>
        )}
      </View>

      {/* --- Skills --- */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Skills</Text>
        {mentee.skills?.length ? (
          <View className="flex-row flex-wrap">
            {mentee.skills.map((skill: string, idx: number) => (
              <View
                key={idx}
                className="bg-[#3B82F6] px-3 py-1 rounded-full mr-2 mb-2"
              >
                <Text className="text-white text-sm">{skill}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-gray-700 italic">Not specified</Text>
        )}
      </View>

      {/* --- Target Roles --- */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Target Roles</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentee.target_roles?.join(", ") || "Not specified"}
        </Text>
      </View>

      {/* --- Learning Info --- */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Learning Info</Text>
        <Text className="text-gray-700 italic pl-2">
          Level: {mentee.current_level || "N/A"} • Study: {mentee.study_level || "N/A"}
        </Text>
      </View>

      {/* --- Goals --- */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Learning Goals</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentee.learning_goals || "Not specified"}
        </Text>
      </View>

      {/* --- Time Commitment --- */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-6">
        <Text className="font-bold text-lg mb-2">Time Commitment</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentee.time_commitment_hours_per_week
            ? `${mentee.time_commitment_hours_per_week} hours/week`
            : "Not specified"}
        </Text>
      </View>
    </ScrollView>
  );
}