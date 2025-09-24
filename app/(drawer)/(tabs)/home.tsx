import { useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Image, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase/initiliaze";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";

function HomeScreen() {
  const [welcomeMessage, setWelcomeMessage] = useState<string>("");
  const [textMessage, setTextMessage] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [mentors, setMentors] = useState<any[]>([]);
  const [mentorVotes, setMentorVotes] = useState<{ [id: number]: { up: number; down: number } }>({});
  const [userVotes, setUserVotes] = useState<{ [id: number]: 1 | -1 | 0 }>({});
  const [currentMenteeId, setCurrentMenteeId] = useState<number | null>(null);

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
        .from("mentors")
        .select("*")
        .eq("active", true)
        .eq("verified", true);

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
    <View className="flex-1 bg-white">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ minHeight: "100%", paddingBottom: 10 }}
      >
        <Text className="text-4xl font-bold font-Title text-black text-center pt-5">
          Coffee Meets Careers {welcomeMessage}
        </Text>
        {photoUrl && <Image style={{ width: 200, height: 200 }} source={{ uri: photoUrl }} />}

        <View className="flex-1 mt-4 mx-8 mb-5">
          <View className="flex-row items-center bg-white rounded-full px-5 h-16 border border-gray-400">
            <Ionicons name="search-outline" size={24} color="black" />
            <TextInput
              value={textMessage}
              onChangeText={(msg) => setTextMessage(msg)}
              placeholder="Search for a mentor..."
              className="flex-1 ml-1.5 font-Text text-lg font-normal text-gray-800"
            />
            <Feather name="filter" size={24} color="black" />
          </View>
        </View>

        <Text className="text-lg font-extrabold font-Menu ml-7 mb-4">Verified Mentors</Text>

        {mentors.map((mentor) => (
          <View key={mentor.mentorid} className="bg-white rounded-xl mb-4 mx-7 border p-3">
            <View className="flex-row">
              {mentor.photo_url && (
                <Image source={{ uri: mentor.photo_url }} className="h-14 w-14 rounded-full m-2" />
              )}
              <View className="flex-1 bg-stone-200 m-2 rounded-lg p-2">
                <Text className="font-Menu font-semibold text-black">{mentor.name}</Text>
                {mentor.bio && <Text className="text-gray-700">{mentor.bio}</Text>}
                {mentor.skills && <Text className="text-gray-700">Skills: {mentor.skills.join(", ")}</Text>}
                {mentor.specialization_roles && (
                  <Text className="text-gray-700">Role: {mentor.specialization_roles.join(", ")}</Text>
                )}
                {mentor.hourly_rate && <Text className="text-gray-700">Hourly Rate: ${mentor.hourly_rate}</Text>}
                {mentor.experience_level && <Text className="text-gray-700">Experience: {mentor.experience_level}</Text>}
                {mentor.location && <Text className="text-gray-700">Location: {mentor.location}</Text>}
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
