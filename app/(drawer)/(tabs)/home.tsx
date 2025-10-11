import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase/initiliaze";
import Ionicons from "@expo/vector-icons/Ionicons";
import CustomHeader from "@/components/CustomHeader";
import { useNavigation } from "@react-navigation/native";
import { ThumbsUp, ThumbsDown } from "lucide-react-native";

// ...existing code...

export default function HomeScreen() {
  const [welcomeMessage, setWelcomeMessage] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [mentorVotes, setMentorVotes] = useState<{ [id: number]: { up: number; down: number } }>({});
  const [userVotes, setUserVotes] = useState<{ [id: number]: 1 | -1 | 0 }>({});
  const [currentMenteeId, setCurrentMenteeId] = useState<number | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    initializeUser();
  }, []);

  // fetch mentors whenever we know currentMenteeId (so votes can be fetched)
  useEffect(() => {
    fetchMentors();
  }, [currentMenteeId]);

  // Initialize Supabase user
  async function initializeUser() {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) return;

      // Save credentials locally
      const userCredentials = { email: user.email, id: user.id };
      await AsyncStorage.setItem("USERCREDENTIALS", JSON.stringify(userCredentials));

      if (user.user_metadata?.avatar_url) {
        setPhotoUrl(user.user_metadata.avatar_url);
      }

      // Get mentee row using auth_user_id and get name from users table separately
      const { data: menteeData, error: menteeError } = await supabase
        .from("mentees")
        .select("menteeid, user_id")
        .eq("user_id", user.id)
        .single();

      if (!menteeError && menteeData) {
        setCurrentMenteeId(menteeData.menteeid);

        // Get user name from users table
        const { data: userData } = await supabase
          .from("users")
          .select("name")
          .eq("auth_user_id", menteeData.user_id)
          .single();

        const userName = userData?.name || "User";
        setWelcomeMessage(userName);
      } else {
        console.log("User is not registered as a mentee:", menteeError?.message);
      }
    } catch (err: any) {
      console.error("initializeUser error:", err?.message || err);
    }
  }

  const fetchMentors = async () => {
    try {
      // Step 1: Get all verified & active mentors from mentors table
      const { data: mentorsData, error: mentorError } = await supabase
        .from("mentors")
        .select("*")
        .eq("verified", true)
        .eq("active", true);

      if (mentorError) throw mentorError;
      if (!mentorsData) return;

      // Step 2: Collect user_ids from mentors
      const mentorIds = mentorsData.map((m: any) => m.user_id);

      // Step 3: Fetch corresponding user details
      const { data: usersData, error: userError } = await supabase
        .from("users")
        .select("auth_user_id, name, photoURL, location, bio")
        .in("auth_user_id", mentorIds);

      if (userError) throw userError;

      // Step 4: Merge mentor info with user info
      const mergedMentors = mentorsData.map((m: any) => ({
        ...m,
        user: usersData?.find((u: any) => u.auth_user_id === m.user_id) || null,
      }));

      // Step 5: Save to state
      setMentors(mergedMentors);

      // Step 6: Prepare votes map
      const votes: any = {};
      mergedMentors.forEach((mentor: any) => {
        votes[mentor.mentorid] = {
          up: mentor.upvotes || 0,
          down: mentor.downvotes || 0,
        };
      });
      setMentorVotes(votes);

      // Step 7: Fetch the current user's votes (if we have a mentee id)
      if (currentMenteeId) {
        const { data: userVoteData, error: voteError } = await supabase
          .from("mentor_votes")
          .select("mentorid, vote")
          .eq("userid", currentMenteeId);

        if (voteError) throw voteError;

        const userVoteState: any = {};
        mergedMentors.forEach((mentor: any) => {
          const voteRecord = userVoteData?.find((v: any) => v.mentorid === mentor.mentorid);
          userVoteState[mentor.mentorid] = voteRecord?.vote || 0;
        });
        setUserVotes(userVoteState);
      } else {
        // reset userVotes if no mentee
        setUserVotes({});
      }
    } catch (error: any) {
      console.error("Error fetching mentors:", error?.message || error);
    }
  };

  // Handle vote
  const handleVote = async (mentorId: number, vote: 1 | -1) => {
    if (!currentMenteeId) return;

    const prevVote = userVotes[mentorId] || 0;
    const newVote: 1 | -1 | 0 = prevVote === vote ? 0 : vote; // toggle if same pressed

    try {
      if (newVote === 0) {
        const { error: delErr } = await supabase
          .from("mentor_votes")
          .delete()
          .eq("mentorid", Number(mentorId))
          .eq("userid", currentMenteeId);
        if (delErr) {
          console.log("Delete error:", delErr.message);
          return;
        }
      } else {
        const { error: upsertErr } = await supabase
          .from("mentor_votes")
          .upsert(
            { mentorid: Number(mentorId), userid: currentMenteeId, vote: newVote },
            { onConflict: "mentorid,userid" }
          );
        if (upsertErr) {
          console.log("Upsert error:", upsertErr.message);
          return;
        }
      }

      // Count votes from mentor_votes table
      const { data: votes, error: countErr } = await supabase
        .from("mentor_votes")
        .select("vote")
        .eq("mentorid", Number(mentorId));

      if (countErr) {
        console.log("Count error:", countErr.message);
        return;
      }

      const upvotes = (votes || []).filter((v: any) => v.vote === 1).length;
      const downvotes = (votes || []).filter((v: any) => v.vote === -1).length;

      // Update mentor row
      const { error: updateErr } = await supabase
        .from("mentors")
        .update({ upvotes, downvotes })
        .eq("mentorid", Number(mentorId));

      if (updateErr) {
        console.log("Mentors update error:", updateErr.message);
        return;
      }

      // Update local state
      setMentorVotes((prev) => ({
        ...prev,
        [mentorId]: { up: upvotes, down: downvotes },
      }));
      setUserVotes((prev) => ({ ...prev, [mentorId]: newVote }));
    } catch (err) {
      console.log("handleVote crashed:", err);
    }
  };

  const mentorProfile = (mentorId: number) => {
    // update to the actual route name/path you use for mentor profile
    // example: navigation.navigate('mentorProfile', { mentorId });
    // if using expo-router, adjust accordingly.
    // Using try/catch to avoid runtime crash if route missing.
    try {
      // @ts-ignore
      navigation.navigate("mentorProfile", { mentorId });
    } catch (e) {
      console.warn("navigate to mentorProfile failed:", e);
    }
  };

  return (
    <View className="flex-1 bg-stone-50">
      {/* Top-right blob */}
      <View
        style={{
          position: "absolute",
          width: 350,
          height: 280,
          backgroundColor: "#e5c97bff",
          borderTopLeftRadius: 150,
          borderTopRightRadius: 50,
          borderBottomLeftRadius: 50,
          borderBottomRightRadius: 120,
          top: -60,
          right: -80,
          zIndex: 0,
          opacity: 0.3,
          transform: [{ rotate: "30deg" }],
        }}
      />

      {/* Bottom-left blob */}
      <View
        style={{
          position: "absolute",
          width: 320,
          height: 260,
          backgroundColor: "#40301eff",
          borderTopLeftRadius: 100,
          borderTopRightRadius: 150,
          borderBottomLeftRadius: 150,
          borderBottomRightRadius: 50,
          bottom: -50,
          left: -70,
          zIndex: 0,
          opacity: 0.3,
          transform: [{ rotate: "-25deg" }],
        }}
      />

      <ScrollView
        key={`home-scroll-${currentMenteeId || "guest"}`}
        className="flex-1 pt-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ minHeight: "100%", paddingBottom: 10 }}
      >
        <CustomHeader />
        <Text className="text-4xl font-bold font-Title text-black text-center pt-5">
          Coffee Meets Careers
        </Text>

        <View className="mt-4 mx-8 mb-5">
          <TouchableOpacity
            className="flex-row items-center bg-white rounded-full px-5 h-16 border border-gray-400"
            onPress={() => navigation.getParent?.().navigate?.("findmentors")}
          >
            <Ionicons name="search-outline" size={24} color="black" />

            <Text className="flex-1 ml-2 font-Text text-lg font-normal text-gray-600">
              Search for a mentor...
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-lg font-extrabold font-Menu ml-7 mb-4">Verified Mentors</Text>

        {mentors.map((mentor: any) => (
          <TouchableOpacity
            key={mentor.mentorid}
            onPress={() => mentorProfile(mentor.mentorid)}
            className="bg-[#e1e2d5ff] rounded-xl mb-4 mx-7 border p-3 overflow-hidden"
          >
            <View className="relative">
              <Image
                source={require("@/assets/images/07-02-02-02.webp")}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "120%",
                  top: 0,
                  left: 10,
                  right: 4,
                  bottom: 0,
                  opacity: 0.1,
                  resizeMode: "contain",
                }}
              />
              <View className="flex-row">
                {mentor.user?.photoURL ? (
                  <Image
                    source={{ uri: mentor.user.photoURL }}
                    className="h-14 w-14 rounded-full mr-4 border-stone-400"
                  />
                ) : (
                  <View className="h-14 w-14 rounded-full bg-gray-300 mr-4 items-center justify-center">
                    <Ionicons name="person" size={30} color="white" />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="font-Menu font-bold text-black text-lg">
                    {mentor.user?.name || "Unknown User"}
                  </Text>

                  {/* Display bio or placeholder */}
                  <View className="bg-[#ecefe1ff] rounded-lg px-3 py-2 mt-1 border border-gray-300">
                    <Text className="font-Text mt-0 text-gray-700 pl-0 italic">
                      {mentor.user?.bio && mentor.user?.bio.trim() !== ""
                        ? `"${mentor.user?.bio}"`
                        : `"No Bio Added"`}
                    </Text>
                  </View>

                  {/* Location if available */}
                  {mentor.user?.location && (
                    <Text className="font-Text mt-1 text-gray-700 pl-1.5">
                      Location: {mentor.user.location}
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row mt-2 items-center justify-end mr-4 space-x-4">
                {/* Upvote Button */}
                <TouchableOpacity
                  className="h-10 w-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: userVotes[mentor.mentorid] === 1 ? "#d1fae5" : "#f3f4f6",
                  }}
                  onPress={() => handleVote(mentor.mentorid, 1)}
                >
                  <ThumbsUp size={22} color={userVotes[mentor.mentorid] === 1 ? "green" : "gray"} />
                </TouchableOpacity>
                <Text className="ml-1 font-Text text-base">{mentorVotes[mentor.mentorid]?.up || 0}</Text>

                {/* Downvote Button */}
                <TouchableOpacity
                  className="h-10 w-10 rounded-full items-center justify-center ml-4"
                  style={{
                    backgroundColor: userVotes[mentor.mentorid] === -1 ? "#fee2e2" : "#f3f4f6",
                  }}
                  onPress={() => handleVote(mentor.mentorid, -1)}
                >
                  <ThumbsDown size={22} color={userVotes[mentor.mentorid] === -1 ? "red" : "gray"} />
                </TouchableOpacity>
                <Text className="ml-1 font-Text text-base">{mentorVotes[mentor.mentorid]?.down || 0}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ...existing code...