import { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Button, Alert, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase/initiliaze";

interface MentorshipRequest {
  id: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined';
  student_id: string;
  tutor_id: string;
}

function NotificationsScreen() {
  const [requests, setRequests] = useState<MentorshipRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentSupabaseUserAndRequests();
  }, []);

  async function fetchCurrentSupabaseUserAndRequests() {
    setIsLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session?.user?.email) {
      Alert.alert("Error", "You are not logged in.");
      setIsLoading(false);
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, user_type")
        .eq("email", session.user.email)
        .single();

      console.log("Fetched userData:", userData);

      if (userError || !userData?.id) {
        Alert.alert("Error", "Could not verify your user profile.");
        setIsLoading(false);
        return;
      }

      setRole(userData.user_type);

      // Fix: make user_type check case-insensitive
      if (userData.user_type.toLowerCase() === "tutor") {
        fetchMentorshipRequestsForTutor(userData.id);
      } else {
        fetchAcceptedMentorsForStudent(userData.id);
      }
    } catch (e: any) {
      Alert.alert("Error", "An unexpected error occurred while fetching your profile.");
      setIsLoading(false);
    }
  }

  // For tutors: show all mentorship requests where you are the tutor
  async function fetchMentorshipRequestsForTutor(tutorSupabaseId: string) {
    try {
      const { data, error } = await supabase
        .from('request_mentorship')
        .select(`
          id,
          created_at,
          status,
          student_id,
          tutor_id
        `)
        .eq('tutor_id', tutorSupabaseId)
        .order('created_at', { ascending: false });

      console.log("Fetched requests:", data);

      if (error) {
        Alert.alert("Error", `Could not load mentorship requests: ${error.message}`);
        setRequests([]);
      } else if (data) {
        setRequests(data as MentorshipRequest[]);
      } else {
        setRequests([]);
      }
    } catch (e: any) {
      Alert.alert("Error", "An unexpected error occurred while fetching requests.");
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }

  // For students: show all accepted mentors
  async function fetchAcceptedMentorsForStudent(studentSupabaseId: string) {
    try {
      const { data, error } = await supabase
        .from('request_mentorship')
        .select(`
          id,
          created_at,
          status,
          student_id,
          tutor_id
        `)
        .eq('student_id', studentSupabaseId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) {
        Alert.alert("Error", `Could not load accepted mentors: ${error.message}`);
        setRequests([]);
      } else if (data) {
        setRequests(data as MentorshipRequest[]);
      } else {
        setRequests([]);
      }
    } catch (e: any) {
      Alert.alert("Error", "An unexpected error occurred while fetching mentors.");
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestAction(requestId: string, newStatus: 'accepted' | 'declined') {
    try {
      const { data: updateData, error } = await supabase
        .from('request_mentorship')
        .update({ status: newStatus })
        .eq('id', requestId)
        .select();

      if (error) {
        Alert.alert('Error', `Could not ${newStatus === 'accepted' ? 'accept' : 'decline'} the request. Details: ${error.message}`);
      } else if (updateData && updateData.length > 0) {
        Alert.alert('Success', `Request ${newStatus}.`);
        setRequests(prevRequests =>
          prevRequests.map(req =>
            req.id === requestId ? { ...req, status: newStatus } : req
          )
        );
      } else {
        Alert.alert('Notice', `Request status may not have updated. Please refresh.`);
      }
    } catch (e: any) {
      Alert.alert('Error', `An unexpected error occurred.`);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-100">
      <Text style={{ fontFamily: "OpenSans-Regular" }} className="text-2xl font-bold ml-4 mt-6 mb-4">
        {role && role.toLowerCase() === "tutor" ? "Mentorship Requests" : "Your Accepted Mentors"}
      </Text>
      {requests.length === 0 ? (
        <Text style={{ fontFamily: "OpenSans-Regular" }} className="text-center text-gray-500 mt-5">
          {role && role.toLowerCase() === "tutor"
            ? "No mentorship requests found."
            : "No accepted mentors found."}
        </Text>
      ) : (
        requests.map((request) => (
          <View key={request.id} className="bg-white shadow-md rounded-lg mx-4 mb-4 p-4 border border-gray-200">
            <View className="flex-row items-center">
              <Image
                source={require('../../assets/images/icon.png')}
                style={styles.avatar}
                className="rounded-full"
              />
              <View className="ml-4 flex-1">
                <Text style={{ fontFamily: "OpenSans-Bold" }} className="text-base">
                  {role && role.toLowerCase() === "tutor"
                    ? `Student ID: ${request.student_id}`
                    : `Mentor ID: ${request.tutor_id}`}
                </Text>
                <Text style={{ fontFamily: "OpenSans-Regular" }} className="text-sm text-gray-600 mt-1">
                  {role && role.toLowerCase() === "tutor"
                    ? `Requested on: ${new Date(request.created_at).toLocaleDateString()}`
                    : `Accepted on: ${new Date(request.created_at).toLocaleDateString()}`}
                </Text>
                <Text
                  style={{ fontFamily: "OpenSans-Bold" }}
                  className={`text-sm mt-1 ${
                    request.status === 'pending' ? 'text-yellow-600' :
                    request.status === 'accepted' ? 'text-green-600' :
                    'text-red-600'
                  }`}
                >
                  Status: {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </Text>
              </View>
            </View>
            {role && role.toLowerCase() === "tutor" && request.status === 'pending' && (
              <View className="flex-row justify-end mt-3 gap-x-3">
                <Button
                  title="Decline"
                  onPress={() => handleRequestAction(request.id, 'declined')}
                  color="red"
                />
                <Button
                  title="Accept"
                  onPress={() => handleRequestAction(request.id, 'accepted')}
                  color="green"
                />
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  avatar: {
    width: 60,
    height: 60,
  },
});

export default NotificationsScreen;