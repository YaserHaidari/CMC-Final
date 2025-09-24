import { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Button, Alert, StyleSheet } from "react-native";
import { supabase } from "@/lib/supabase/initiliaze";

interface UserInfo {
  name: string;
  email: string;
}

interface MentorshipRequest {
  id: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'Pending' | 'Accepted' | 'Declined'; // Support both cases
  mentee_id: number;
  mentor_id: number;
  mentee?: UserInfo[];
  mentor?: UserInfo[];
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
      // Get user data from users table to determine role
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, user_type")
        .eq("email", session.user.email)
        .single();

      console.log("Fetched userData:", userData);

      if (userError || !userData?.user_type) {
        Alert.alert("Error", "Could not verify your user profile.");
        setIsLoading(false);
        return;
      }

      setRole(userData.user_type);

      if (userData.user_type.toLowerCase() === "mentor") {
        // Get mentor ID from mentors table using auth_user_id (UUID)
        console.log("Looking for mentor with auth_user_id:", session.user.id);
        let { data: mentorData, error: mentorError } = await supabase
          .from("mentors")
          .select("mentorid, user_id")
          .eq("user_id", session.user.id)
          .single();

        console.log("Mentor lookup result:", { mentorData, mentorError });

        if (mentorError || !mentorData) {
          // Try to find any mentors to debug
          const { data: allMentors } = await supabase
            .from("mentors")
            .select("mentorid, user_id")
            .limit(5);
          console.log("Available mentors in database:", allMentors);
          
          Alert.alert("Error", `Could not find your mentor profile. Error: ${mentorError?.message || 'No data found'}\n\nTip: Try registering a new mentor account.`);
          setIsLoading(false);
          return;
        }

        fetchMentorshipRequestsForTutor(mentorData.mentorid);
      } else {
        // Get mentee ID from mentees table using auth_user_id (UUID)
        console.log("Looking for mentee with auth_user_id:", session.user.id);
        let { data: menteeData, error: menteeError } = await supabase
          .from("mentees")
          .select("menteeid, user_id")
          .eq("user_id", session.user.id)
          .single();

        console.log("Mentee lookup result:", { menteeData, menteeError });

        if (menteeError || !menteeData) {
          // Try to find any mentees to debug
          const { data: allMentees } = await supabase
            .from("mentees")
            .select("menteeid, user_id")
            .limit(5);
          console.log("Available mentees in database:", allMentees);
          
          Alert.alert("Error", `Could not find your mentee profile. Error: ${menteeError?.message || 'No data found'}\n\nTip: Try registering a new mentee account.`);
          setIsLoading(false);
          return;
        }

        fetchAcceptedMentorsForStudent(menteeData.menteeid);
      }
    } catch (e: any) {
      Alert.alert("Error", "An unexpected error occurred while fetching your profile.");
      setIsLoading(false);
    }
  }

  // For mentors: show all mentorship requests where you are the mentor
  async function fetchMentorshipRequestsForTutor(mentorId: number) {
    try {
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select(`
          id,
          created_at,
          status,
          mentee_id,
          mentor_id
        `)
        .eq('mentor_id', mentorId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching tutor requests:", error);
        Alert.alert("Error", `Could not load mentorship requests: ${error.message}`);
        setRequests([]);
        setIsLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      // Fetch user details for mentees using separate queries
      const combinedData = await Promise.all(data.map(async (req) => {
        try {
          // Get mentee data
          const { data: menteeData } = await supabase
            .from('mentees')
            .select('user_id')
            .eq('menteeid', req.mentee_id)
            .single();

          if (menteeData?.user_id) {
            // Get user data using auth_user_id (UUID)
            const { data: userData } = await supabase
              .from('users')
              .select('name, email')
              .eq('auth_user_id', menteeData.user_id)
              .single();

            return {
              ...req,
              mentee: userData ? [{ name: userData.name, email: userData.email }] : []
            };
          }
        } catch (error) {
          console.error('Error fetching mentee data for request:', req.id, error);
        }

        return {
          ...req,
          mentee: []
        };
      }));

      setRequests(combinedData as MentorshipRequest[]);
      console.log("Fetched tutor requests:", combinedData);
    } catch (e: any) {
      console.error("Unexpected error fetching tutor requests:", e);
      Alert.alert("Error", "An unexpected error occurred while fetching requests.");
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }

  // For mentees: show all accepted mentors
  async function fetchAcceptedMentorsForStudent(menteeId: number) {
    try {
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select(`
          id,
          created_at,
          status,
          mentee_id,
          mentor_id
        `)
        .eq('mentee_id', menteeId)
        .ilike('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching student mentors:", error);
        Alert.alert("Error", "Could not load accepted mentors");
        setRequests([]);
        setIsLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      // Fetch user details for mentors using separate queries
      const combinedData = await Promise.all(data.map(async (req) => {
        try {
          // Get mentor data
          const { data: mentorData } = await supabase
            .from('mentors')
            .select('user_id')
            .eq('mentorid', req.mentor_id)
            .single();

          if (mentorData?.user_id) {
            // Get user data using auth_user_id (UUID)
            const { data: userData } = await supabase
              .from('users')
              .select('name, email')
              .eq('auth_user_id', mentorData.user_id)
              .single();

            return {
              ...req,
              mentor: userData ? [{ name: userData.name, email: userData.email }] : []
            };
          }
        } catch (error) {
          console.error('Error fetching mentor data for request:', req.id, error);
        }

        return {
          ...req,
          mentor: []
        };
      }));

      setRequests(combinedData as MentorshipRequest[]);
      console.log("Fetched student mentors:", combinedData);
    } catch (e: any) {
      console.error("Unexpected error fetching student mentors:", e);
      Alert.alert("Error", "An unexpected error occurred while fetching mentors.");
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestAction(requestId: string, newStatus: 'accepted' | 'declined') {
    try {
      console.log('Updating request:', requestId, 'to status:', newStatus);
      
      // Capitalize first letter to match database format (Pending -> Accepted/Declined)
      const capitalizedStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      
      // First, verify the request exists and get current status
      const { data: currentRequest, error: fetchError } = await supabase
        .from('mentorship_requests')
        .select('id, status, mentor_id')
        .eq('id', requestId)
        .single();

      if (fetchError || !currentRequest) {
        console.error('Request not found:', fetchError);
        Alert.alert('Error', 'Request not found or you do not have permission to update it.');
        return;
      }

      console.log('Current request data:', currentRequest);

      // Update the request
      const { data: updateData, error } = await supabase
        .from('mentorship_requests')
        .update({ 
          status: capitalizedStatus,
          responded_at: new Date().toISOString(),
          response_message: newStatus === 'accepted' 
            ? 'Mentorship request has been accepted!' 
            : 'Mentorship request has been declined.'
        })
        .eq('id', requestId)
        .select('*');

      console.log('Update result:', { updateData, error });

      if (error) {
        console.error('Update error:', error);
        Alert.alert('Error', `Could not ${newStatus} the request. Details: ${error.message}`);
      } else if (updateData && updateData.length > 0) {
        console.log('Update successful:', updateData[0]);
        Alert.alert('Success', `Request ${newStatus} successfully!`);
        
        // Update local state with the actual returned status
        setRequests(prevRequests =>
          prevRequests.map(req =>
            req.id === requestId ? { 
              ...req, 
              status: updateData[0].status.toLowerCase() as 'pending' | 'accepted' | 'declined'
            } : req
          )
        );
        
        // Refresh the requests to get latest data
        setTimeout(() => {
          fetchCurrentSupabaseUserAndRequests();
        }, 1000);
      } else {
        console.log('No data returned from update');
        Alert.alert('Notice', `Request status may not have updated. Please refresh.`);
      }
    } catch (e: any) {
      console.error('Unexpected error in handleRequestAction:', e);
      Alert.alert('Error', `An unexpected error occurred: ${e.message}`);
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
        {role && role.toLowerCase() === "mentor" ? "Mentorship Requests" : "Your Accepted Mentors"}
      </Text>
      {requests.length === 0 ? (
        <Text style={{ fontFamily: "OpenSans-Regular" }} className="text-center text-gray-500 mt-5">
          {role && role.toLowerCase() === "mentor"
            ? "No mentorship requests found."
            : "No accepted mentors found."}
        </Text>
      ) : (
        requests.map((request) => (
          <View key={request.id} className="bg-white shadow-md rounded-lg mx-4 mb-4 p-4 border border-gray-200">
            <View className="flex-row items-center">
              <Image
                source={require('../../../assets/images/icon.png')}
                style={styles.avatar}
                className="rounded-full"
              />
              <View className="ml-4 flex-1">
                <Text style={{ fontFamily: "OpenSans-Bold" }} className="text-base">
                  {role && role.toLowerCase() === "mentor"
                    ? `Student: ${request.mentee?.[0]?.name || 'Unknown Student'}`
                    : `Mentor: ${request.mentor?.[0]?.name || 'Unknown Mentor'}`}
                </Text>
                <Text style={{ fontFamily: "OpenSans-Regular" }} className="text-sm text-gray-600 mt-1">
                  {role && role.toLowerCase() === "mentor"
                    ? `Email: ${request.mentee?.[0]?.email || 'N/A'}`
                    : `Email: ${request.mentor?.[0]?.email || 'N/A'}`}
                </Text>
                <Text style={{ fontFamily: "OpenSans-Regular" }} className="text-sm text-gray-600 mt-1">
                  {role && role.toLowerCase() === "mentor"
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
            {role && role.toLowerCase() === "mentor" && request.status.toLowerCase() === 'pending' && (
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