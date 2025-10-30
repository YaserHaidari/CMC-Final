import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase/initiliaze";
import Ionicons from "@expo/vector-icons/Ionicons";
import CustomHeader from "@/components/CustomHeader";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";

interface Mentee {
  id: string;
  name: string;
  bio: string;
  interests?: string;
  profile_picture?: string;
  skills: string[];
  current_level?: string;
}

function HomeScreen() {
  const [welcomeMessage, setWelcomeMessage] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [mentorVotes, setMentorVotes] = useState<{ [id: number]: { up: number; down: number } }>({});
  const [userVotes, setUserVotes] = useState<{ [id: number]: 1 | -1 | 0 }>({});
  const [currentMenteeId, setCurrentMenteeId] = useState<number | null>(null);
  const [mentees, setMentees] = useState<Mentee[]>([]);
  const [isMentor, setIsMentor] = useState(false);
  const [mentorId, setMentorId] = useState<string | null>(null);
  const [loadingMentees, setLoadingMentees] = useState(true);

  const navigation = useNavigation();

  useEffect(() => {
    initializeUser();
    fetchMentors();
  }, []);

  async function initializeUser() {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;

    const userCredentials = { email: user.email, id: user.id };
    await AsyncStorage.setItem("USERCREDENTIALS", JSON.stringify(userCredentials));

    if (user.user_metadata?.avatar_url) {
      setPhotoUrl(user.user_metadata.avatar_url);
    }

    const { data: mentorData } = await supabase
      .from("mentors")
      .select("mentorid")
      .eq("user_id", user.id)
      .single();

    if (mentorData) {
      setIsMentor(true);
      setMentorId(mentorData.mentorid.toString());
      await AsyncStorage.setItem("mentor_id", mentorData.mentorid.toString());
      fetchMenteesForMentor(mentorData.mentorid.toString());
    } else {
      setIsMentor(false);
      const { data: menteeData, error: menteeError } = await supabase
        .from("mentees")
        .select("menteeid, user_id")
        .eq("user_id", user.id)
        .single();

      if (!menteeError && menteeData) {
        setCurrentMenteeId(menteeData.menteeid);
        const { data: userData } = await supabase
          .from("users")
          .select("name")
          .eq("auth_user_id", menteeData.user_id)
          .single();

        const userName = userData?.name || "User";
        setWelcomeMessage(userName);
      }
    }
  }

  const fetchMenteesForMentor = async (currentMentorId: string) => {
    try {
      setLoadingMentees(true);
      const { data: acceptedRequests } = await supabase
        .from("mentorship_requests")
        .select("mentee_id")
        .eq("mentor_id", currentMentorId)
        .eq("status", "accepted");

      if (!acceptedRequests || acceptedRequests.length === 0) {
        setMentees([]);
        return;
      }

      const menteeIds = acceptedRequests.map((r) => r.mentee_id);

      const { data: menteeData } = await supabase
        .from("mentees")
        .select("menteeid, user_id, skills, current_level")
        .in("menteeid", menteeIds);

      const userIds = menteeData.map((m) => m.user_id);
      const { data: userProfiles } = await supabase
        .from("users")
        .select("auth_user_id, name, bio, photoURL")
        .in("auth_user_id", userIds);

      const mergedMentees = menteeData.map((m) => {
        const user = userProfiles.find((u) => u.auth_user_id === m.user_id);
        return {
          id: m.menteeid.toString(),
          name: user?.name || "Unknown",
          bio: user?.bio || "No bio",
          skills: m.skills || [],
          profile_picture: user?.photoURL || "",
          current_level: m.current_level || "N/A",
        };
      });

      setMentees(mergedMentees);
    } catch (error) {
      console.error("Error fetching mentees:", error);
    } finally {
      setLoadingMentees(false);
    }
  };

  const fetchMentors = async () => {
    try {
      const { data: mentorsData } = await supabase
        .from("mentors")
        .select("*")
        .eq("verified", true)
        .eq("active", true);

      if (!mentorsData) return;

      const mentorIds = mentorsData.map((m) => m.user_id);
      const { data: usersData } = await supabase
        .from("users")
        .select("auth_user_id, name, photoURL, location, bio")
        .in("auth_user_id", mentorIds);

      const mergedMentors = mentorsData.map((m) => ({
        ...m,
        user: usersData.find((u) => u.auth_user_id === m.user_id),
      }));

      setMentors(mergedMentors);

      const votes: any = {};
      mergedMentors.forEach((mentor) => {
        votes[mentor.mentorid] = {
          up: mentor.upvotes || 0,
          down: mentor.downvotes || 0,
        };
      });
      setMentorVotes(votes);

      if (currentMenteeId) {
        const { data: userVoteData } = await supabase
          .from("mentor_votes")
          .select("mentorid, vote")
          .eq("userid", currentMenteeId);

        const userVoteState: any = {};
        mergedMentors.forEach((mentor) => {
          const voteRecord = userVoteData?.find((v: any) => v.mentorid === mentor.mentorid);
          userVoteState[mentor.mentorid] = voteRecord?.vote || 0;
        });
        setUserVotes(userVoteState);
      }
    } catch (error: any) {
      console.error("Error fetching mentors:", error.message);
    }
  };

  const handleVote = async (mentorId: number, vote: 1 | -1) => {
    if (!currentMenteeId) return;
    const prevVote = userVotes[mentorId] || 0;
    const newVote: 1 | -1 | 0 = prevVote === vote ? 0 : vote;

    try {
      if (newVote === 0) {
        await supabase.from("mentor_votes").delete().eq("mentorid", mentorId).eq("userid", currentMenteeId);
      } else {
        await supabase
          .from("mentor_votes")
          .upsert({ mentorid: mentorId, userid: currentMenteeId, vote: newVote }, { onConflict: "mentorid,userid" });
      }

      const { data: votes } = await supabase.from("mentor_votes").select("vote").eq("mentorid", mentorId);
      const upvotes = votes.filter((v) => v.vote === 1).length;
      const downvotes = votes.filter((v) => v.vote === -1).length;

      await supabase.from("mentors").update({ upvotes, downvotes }).eq("mentorid", mentorId);

      setMentorVotes({ ...mentorVotes, [mentorId]: { up: upvotes, down: downvotes } });
      setUserVotes({ ...userVotes, [mentorId]: newVote });
    } catch (err) {
      console.log("handleVote crashed:", err);
    }
  };

  const mentorProfile = (mentorId: number) => {
    router.push(`/mentorProfile?mentorId=${mentorId}`);
  };

  const menteeProfile = (menteeId: string) => {
    router.push(`/menteeProfile?menteeId=${menteeId}`);
  };

  return (
    <View className="flex-1 bg-stone-50">
      {/* background blobs */}
      <View
        style={{
          position: "absolute",
          width: 350,
          height: 280,
          backgroundColor: "#e5c97bff",
          borderRadius: 150,
          top: -60,
          right: -80,
          opacity: 0.3,
          transform: [{ rotate: "30deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 320,
          height: 260,
          backgroundColor: "#40301eff",
          borderRadius: 150,
          bottom: -50,
          left: -70,
          opacity: 0.3,
          transform: [{ rotate: "-25deg" }],
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} className="pt-5">
        <CustomHeader />
        <Text className="text-4xl font-bold text-center pt-5 text-black">Coffee Meets Careers</Text>

        <View className="mt-4 mx-8 mb-5">
          <TouchableOpacity
            className="flex-row items-center bg-white rounded-full px-5 h-16 border border-gray-400"
            onPress={() => navigation.getParent()?.navigate("findmentors")}
          >
            <Ionicons name="search-outline" size={24} color="black" />
            <Text className="flex-1 ml-2 text-lg text-gray-600">Search for a mentor...</Text>
          </TouchableOpacity>
        </View>

        {isMentor ? (
          <View className="px-4 mt-6">
            <Text className="text-2xl font-bold mb-4 text-gray-800">Your Current Mentees</Text>
            {loadingMentees ? (
              <ActivityIndicator size="large" color="#007AFF" />
            ) : mentees.length === 0 ? (
              <Text className="text-gray-500">You don’t have any accepted mentees yet.</Text>
            ) : (
              mentees.map((mentee) => (
                <TouchableOpacity
                  key={mentee.id}
                  onPress={() => menteeProfile(mentee.id)}
                  className="rounded-3xl shadow-lg mb-5 mx-4 overflow-hidden"
                  style={{
                    backgroundColor: "#fdf6f0",
                    borderWidth: 1,
                    borderColor: "#e0c8b0",
                  }}
                >
                  <View className="flex-row items-center p-4" style={{ backgroundColor: "#d4a373" }}>
                    <Image
                      source={{
                        uri:
                          mentee.profile_picture ||
                          "https://cdn-icons-png.flaticon.com/512/149/149071.png",
                      }}
                      className="w-16 h-16 rounded-full border-2 border-white mr-4"
                    />
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-white">{mentee.name}</Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="star" size={16} color="#ffe599" />
                        <Text className="text-sm text-white ml-1">Level: {mentee.current_level}</Text>
                      </View>
                    </View>
                  </View>

                  <View className="p-4 bg-[#fdf6f0]">
                    <Text className="text-sm text-gray-700 mb-2">{mentee.bio}</Text>
                    <View className="flex-row flex-wrap mt-1">
                      {mentee.skills.length > 0 ? (
                        mentee.skills.map((skill, idx) => (
                          <View
                            key={idx}
                            className="flex-row items-center bg-[#e0c8b0] rounded-full px-3 py-1 mr-2 mb-2"
                          >
                            <Ionicons name="cog-outline" size={14} color="#6f4e37" />
                            <Text className="ml-1 text-xs text-[#6f4e37]">{skill}</Text>
                          </View>
                        ))
                      ) : (
                        <Text className="text-xs text-gray-500">No skills added</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <>
            <Text className="text-lg font-extrabold ml-7 mb-4">Verified Mentors</Text>
            {mentors.map((mentor) => (
              <TouchableOpacity
                key={mentor.mentorid}
                onPress={() => mentorProfile(mentor.mentorid)}
                className="rounded-3xl mb-6 mx-5 overflow-hidden shadow-xl"
                style={{
                  backgroundColor: "#f3ece5",
                  borderWidth: 1,
                  borderColor: "#d1b89f",
                }}
              >
                <View
                  className="flex-row p-4 items-center"
                  style={{
                    backgroundColor: "#937e63ff",
                    borderBottomLeftRadius: 25,
                    borderBottomRightRadius: 25,
                  }}
                >
                  {mentor.user?.photoURL ? (
                    <Image
                      source={{ uri: mentor.user.photoURL }}
                      className="w-16 h-16 rounded-full border-2 border-white mr-4"
                    />
                  ) : (
                    <View className="w-16 h-16 rounded-full bg-gray-400 mr-4 items-center justify-center border-2 border-white">
                      <Ionicons name="person" size={30} color="white" />
                    </View>
                  )}

                  <View className="flex-1">
                    <Text className="text-lg font-bold text-white">
                      {mentor.user?.name || "Unknown User"}
                    </Text>
                    {mentor.user?.location && (
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="location-outline" size={16} color="#ffe599" />
                        <Text className="text-sm text-white ml-1">{mentor.user.location}</Text>
                      </View>
                    )}
                    <View className="flex-row items-start mt-2">
                      <Ionicons name="information-circle-outline" size={16} color="#fff" />
                      <Text className="text-sm text-white ml-2 italic">
                        {mentor.user?.bio?.trim() || "No Bio Added"}
                      </Text>
                    </View>
                    <View className="flex-row mt-2 items-center">
                      <Ionicons name="checkmark-done-circle" size={16} color="#ffd700" />
                      <Text className="text-xs text-white ml-1">Verified Mentor</Text>
                    </View>
                  </View>
                </View>

                {/* bottom votes section */}
                <View className="flex-row items-center justify-end p-4 space-x-4">
                  <View className="flex-row items-center space-x-2">
                    <TouchableOpacity
                      className="h-10 w-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor:
                          userVotes[mentor.mentorid] === 1 ? "#d1fae5" : "#f3f4f6",
                      }}
                      onPress={() => handleVote(mentor.mentorid, 1)}
                    >
                      <Ionicons
                        name="cafe-outline"
                        size={20}
                        color={
                          userVotes[mentor.mentorid] === 1 ? "green" : "gray"
                        }
                      />
                    </TouchableOpacity>
                    <Text className="text-base">
                      {mentorVotes[mentor.mentorid]?.up || 0}
                    </Text>
                  </View>

                  <View className="flex-row items-center space-x-2 ml-6">
                    <TouchableOpacity
                      className="h-10 w-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor:
                          userVotes[mentor.mentorid] === -1
                            ? "#fee2e2"
                            : "#f3f4f6",
                      }}
                      onPress={() => handleVote(mentor.mentorid, -1)}
                    >
                      <Ionicons
                        name="cafe"
                        size={20}
                        color={
                          userVotes[mentor.mentorid] === -1 ? "red" : "gray"
                        }
                      />
                    </TouchableOpacity>
                    <Text className="text-base">
                      {mentorVotes[mentor.mentorid]?.down || 0}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default HomeScreen;
