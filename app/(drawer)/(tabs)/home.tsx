import { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Image, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase/initiliaze";
import Ionicons from "@expo/vector-icons/Ionicons";
import CustomHeader from "@/components/CustomHeader";
import { useNavigation } from "@react-navigation/native";


function HomeScreen() {
  const [welcomeMessage, setWelcomeMessage] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [mentorVotes, setMentorVotes] = useState<{ [id: number]: { up: number; down: number } }>({});
  const [userVotes, setUserVotes] = useState<{ [id: number]: 1 | -1 | 0 }>({});
  const [currentMenteeId, setCurrentMenteeId] = useState<number | null>(null);
  const navigation = useNavigation();

  useEffect(() => {
    initializeUser();
    fetchMentors();
  }, []);

  // Initialize Supabase user
  async function initializeUser() {
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
  }

  // Fetch verified mentors and initialize votes
  async function fetchMentors() {
    try {
      const { data: mentorsData, error: mentorError } = await supabase
        .from("users")
        .select("mentorid, name, bio, location")
          .eq("user_type", "Mentor");

      if (mentorError || !mentorsData) return;
      setMentors(mentorsData);

      const votes: any = {};
      mentorsData.forEach((mentor) => {
        votes[mentor.mentorid] = {
          up: mentor.upvotes || 0,
          down: mentor.downvotes || 0,
        };
      });
      setMentorVotes(votes);

      if (currentMenteeId) {
        const { data: userVoteData } = await supabase
          .from("mentor_votes")
          .select("*")
          .eq("userid", currentMenteeId);

        const userVoteState: any = {};
        mentorsData.forEach((mentor) => {
          const voteRecord = userVoteData?.find((v: any) => v.mentorid === mentor.mentorid);
          userVoteState[mentor.mentorid] = voteRecord?.vote || 0;
        });
        setUserVotes(userVoteState);
      }
    } catch (error) {
      console.log(error);
    }
  }

  // Handle vote
  const handleVote = async (mentorId: number, vote: 1 | -1) => {
    if (!currentMenteeId) return;

    const prevVote = userVotes[mentorId] || 0;
    let newVote: 1 | -1 | 0 = prevVote === vote ? 0 : vote; // toggle if same pressed

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

      const upvotes = votes.filter((v) => v.vote === 1).length;
      const downvotes = votes.filter((v) => v.vote === -1).length;

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
      setMentorVotes({
        ...mentorVotes,
        [mentorId]: { up: upvotes, down: downvotes },
      });
      setUserVotes({ ...userVotes, [mentorId]: newVote });
    } catch (err) {
      console.log("handleVote crashed:", err);
    }
  };

  return (
    <View className="flex-1 bg-stone-50">
      {/* Top-right blob */}
      <View
          style={{
            position: 'absolute',
            width: 350,
            height: 280,
            backgroundColor: '#F8DD2E',
            borderTopLeftRadius: 150,
            borderTopRightRadius: 50,
            borderBottomLeftRadius: 50,
            borderBottomRightRadius: 120,
            top: -60,
            right: -80,
            zIndex: 0,
            opacity: 0.3,
            transform: [{ rotate: '30deg' }],
          }}
      />

      {/* Bottom-left blob*/}
      <View
          style={{
            position: 'absolute',
            width: 320,
            height: 260,
            backgroundColor: '#4FCBE9', // deep sky blue
            borderTopLeftRadius: 100,
            borderTopRightRadius: 150,
            borderBottomLeftRadius: 150,
            borderBottomRightRadius: 50,
            bottom: -50,
            left: -70,
            zIndex: 0,
            opacity: 0.3,
            transform: [{ rotate: '-25deg' }],
          }}
      />

      <ScrollView
        key={`home-scroll-${currentMenteeId || 'guest'}`}
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
              className=
                  "flex-row items-center bg-white rounded-full px-5 h-16 border border-gray-400"
              onPress={() => navigation.getParent()?.navigate("findmentors")}
          >
            <Ionicons name="search-outline" size={24} color="black" />

            <Text
                className="flex-1 ml-2 font-Text text-lg font-normal text-gray-600">
              "Search for a mentor..."
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-lg font-extrabold font-Menu ml-7 mb-4">Verified Mentors</Text>

        {mentors.map((mentor) => (
          <View key={mentor.mentorid} className="bg-white rounded-xl mb-4 mx-7 border p-3">
            <View className="flex-row">
              {mentor.photo_url ? (
                  <Image
                      source={{ uri: mentor.photo_url }}
                      className="h-14 w-14 rounded-full mr-4 border-stone-400"
                  />
              ) : (
                  <View className="h-14 w-14 rounded-full bg-gray-300 mr-4 items-center justify-center">
                    <Ionicons name="person" size={30} color="white"/>
                  </View>
              )}
              <View className="flex-1">
                <Text className="font-Menu font-bold text-black text-lg">
                  {mentor.name || "Unknown User"}
                </Text>

                {/* Display bio or placeholder */}
                <Text className="font-Text mt-1 text-gray-700 pl-1.5">
                  {mentor.bio && mentor.bio.trim() !== "" ? mentor.bio : "No Bio Added"}
                </Text>

                {/* Location if available */}
                {mentor.location && (
                    <Text className="font-Text mt-1 text-gray-700 pl-1.5">
                      Location: {mentor.location}
                    </Text>
                )}
              </View>
            </View>

            <View className="flex-row mt-2 items-center justify-end mr-4">
              <TouchableOpacity onPress={() => handleVote(mentor.mentorid, 1)}>
                <Ionicons
                  name="thumbs-up"
                  size={24}
                  color={userVotes[mentor.mentorid] === 1 ? "green" : "gray"}
                />
              </TouchableOpacity>
              <Text className="ml-2">{mentorVotes[mentor.mentorid]?.up || 0}</Text>

              <TouchableOpacity onPress={() => handleVote(mentor.mentorid, -1)} className="ml-4">
                <Ionicons
                  name="thumbs-down"
                  size={24}
                  color={userVotes[mentor.mentorid] === -1 ? "red" : "gray"}
                />
              </TouchableOpacity>
              <Text className="ml-2">{mentorVotes[mentor.mentorid]?.down || 0}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default HomeScreen;
