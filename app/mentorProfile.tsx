import { View, Text, ScrollView, Image } from "react-native";
import { useRoute } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/initiliaze";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function MentorDetails() {
  const route = useRoute();
  const { mentorId } = route.params as { mentorId: number };
  const [mentor, setMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mentorId) fetchMentorDetails(mentorId);
  }, [mentorId]);

  const fetchMentorDetails = async (id: number) => {
    try {
      // Fetch mentor info from mentors table n related user info
      const { data, error } = await supabase
        .from("mentors")
        .select(`
          *,
          user:user_id(*)  -- fetch related user info
        `)
        .eq("mentorid", id)
        .single();

      if (error) throw error;
      setMentor(data);
    } catch (err) {
      console.error("Error fetching mentor details:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Text className="p-5">Loading...</Text>;
  if (!mentor) return <Text className="p-5">Mentor not found</Text>;

  return (
    <ScrollView className="flex-1 p-5 bg-[#FAF3E0]">
      {/* Photo n Name */}
      <View className="items-center mb-6">
        {mentor.user?.photoURL ? (
          <Image
            source={{ uri: mentor.user.photoURL }}
            className="w-28 h-28 rounded-full mb-3"
          />
        ) : (
          <View className="w-28 h-28 rounded-full bg-gray-300 mb-3 items-center justify-center">
            <Ionicons name="person" size={30} color="white" />
          </View>
        )}
        {/* Verified Badge */}
        {mentor.verified && (
          <Image
            source={require('@/assets/images/verified-badge.webp')}
            style={{
              width: 24,
              height: 24,
              position: 'absolute',
              top: 75,
              bottom: 0,
              right: 134,
            }}
          />
        )}

        <Text className="text-2xl font-bold">{mentor.user?.name || "Unknown Mentor"}</Text>
        {mentor.user?.location && (
          <Text className="text-gray-600">{mentor.user.location}</Text>
        )}
      </View>

      {/* About */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">About</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentor.bio || mentor.user?.bio || "No bio available"}
        </Text>
      </View>

      {/* Skills */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Skills</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentor.skills?.join(", ") || "Not specified"}
        </Text>
      </View>

      {/* Specialisations */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Specialisations</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentor.specialization_roles?.join(", ") || "Not specified"}
        </Text>
      </View>

      {/* Experience */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Experience</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentor.experience_level || "Not specified"} • {mentor.years_of_experience ?? "N/A"} years
        </Text>
      </View>

      {/* Certifications */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Certifications</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentor.certifications?.join(", ") || "None listed"}
        </Text>
      </View>
    </ScrollView>
  );
}
