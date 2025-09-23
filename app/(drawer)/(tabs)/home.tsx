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
  }, []);

  useEffect(() => {
    if (currentMenteeId) {
      fetchMentors();
    }
  }, [currentMenteeId]);

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

    // Get mentee row using user_id (not email)
    const { data: menteeData, error: menteeError } = await supabase
      .from("mentees")
      .select("menteeid, name")
      .eq("user_id", user.id)
      .single();

    console.log('Mentee lookup:', { userId: user.id, menteeData, menteeError });

    if (!menteeError && menteeData) {
      setCurrentMenteeId(menteeData.menteeid);
      setWelcomeMessage(menteeData.name);
      console.log('Current mentee ID set:', menteeData.menteeid);
    } else {
      console.log("User is not registered as a mentee:", menteeError?.message);
      // Fallback: try looking up by email if user_id fails
      const { data: menteeDataFallback, error: menteeErrorFallback } = await supabase
        .from("mentees")
        .select("menteeid, name")
        .eq("email", user.email)
        .single();
      
      if (!menteeErrorFallback && menteeDataFallback) {
        setCurrentMenteeId(menteeDataFallback.menteeid);
        setWelcomeMessage(menteeDataFallback.name);
        console.log('Current mentee ID set via email fallback:', menteeDataFallback.menteeid);
      }
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

      // Always fetch user votes when we have mentors data
      if (currentMenteeId && mentorsData.length > 0) {
        const { data: userVoteData, error: voteError } = await supabase
          .from("mentor_votes")
          .select("*")
          .eq("userid", currentMenteeId);

        if (voteError) {
          console.log("Error fetching user votes:", voteError.message);
        }

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
    console.log('handleVote called with:', { mentorId, vote, currentMenteeId });
    
    if (!currentMenteeId) {
      console.log('No current mentee ID, cannot vote');
      return;
    }

    const prevVote = userVotes[mentorId] || 0;
    let newVote: 1 | -1 | 0 = prevVote === vote ? 0 : vote; // toggle if same pressed
    
    console.log('Vote calculation:', { prevVote, newVote });

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
        console.log('Attempting to upsert vote:', { mentorid: Number(mentorId), userid: currentMenteeId, vote: newVote });
        
        const { data: upsertData, error: upsertErr } = await supabase
          .from("mentor_votes")
          .upsert(
            { mentorid: Number(mentorId), userid: currentMenteeId, vote: newVote },
            { onConflict: "mentorid,userid" }
          )
          .select();
          
        if (upsertErr) {
          console.log("Upsert error:", upsertErr.message, upsertErr);
          return;
        }
        
        console.log('Upsert successful:', upsertData);
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

      const upvotes = votes?.filter((v) => v.vote === 1).length || 0;
      const downvotes = votes?.filter((v) => v.vote === -1).length || 0;
      
      console.log('Vote counts:', { upvotes, downvotes, totalVotes: votes?.length });

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
