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
  status: 'pending' | 'accepted' | 'declined' | 'Pending' | 'Accepted' | 'Declined';
  message?: string;
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
          message,
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
          message,
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
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {role && role.toLowerCase() === "mentor" ? "🎓 Mentorship Requests" : "👨‍🏫 Your Mentors"}
        </Text>
        <Text style={styles.headerSubtitle}>
          {role && role.toLowerCase() === "mentor" 
            ? "Students seeking your guidance" 
            : "Your accepted mentorship connections"}
        </Text>
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>
            {role && role.toLowerCase() === "mentor" ? "📬" : "🤝"}
          </Text>
          <Text style={styles.emptyTitle}>
            {role && role.toLowerCase() === "mentor"
              ? "No requests yet"
              : "No mentors yet"}
          </Text>
          <Text style={styles.emptyDescription}>
            {role && role.toLowerCase() === "mentor"
              ? "When students request mentorship, they'll appear here."
              : "When mentors accept your requests, they'll appear here."}
          </Text>
        </View>
      ) : (
        requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              request.status.toLowerCase() === 'pending' && styles.pendingBadge,
              request.status.toLowerCase() === 'accepted' && styles.acceptedBadge,
              request.status.toLowerCase() === 'declined' && styles.declinedBadge,
            ]}>
              <Text style={styles.statusText}>
                {request.status === 'pending' ? '⏳' : 
                 request.status === 'accepted' ? '✅' : '❌'} {request.status.toUpperCase()}
              </Text>
            </View>

            {/* User Info */}
            <View style={styles.userSection}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: `https://avatar.iran.liara.run/public/boy?id=${request.mentee_id || request.mentor_id}` }}
                  style={styles.avatar}
                />
                <View style={[
                  styles.roleIndicator,
                  role && role.toLowerCase() === "mentor" ? styles.studentIndicator : styles.mentorIndicator
                ]}>
                  <Text style={styles.roleText}>
                    {role && role.toLowerCase() === "mentor" ? "S" : "M"}
                  </Text>
                </View>
              </View>
              
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {role && role.toLowerCase() === "mentor"
                    ? request.mentee?.[0]?.name || 'Unknown Student'
                    : request.mentor?.[0]?.name || 'Unknown Mentor'}
                </Text>
                <Text style={styles.userEmail}>
                  {role && role.toLowerCase() === "mentor"
                    ? request.mentee?.[0]?.email || 'No email provided'
                    : request.mentor?.[0]?.email || 'No email provided'}
                </Text>
                <Text style={styles.requestDate}>
                  {role && role.toLowerCase() === "mentor" ? "📅 Requested" : "📅 Accepted"} on{' '}
                  {new Date(request.created_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            </View>

            {/* Message Section */}
            {request.message && (
              <View style={styles.messageSection}>
                <Text style={styles.messageLabel}>💬 Message:</Text>
                <View style={styles.messageContainer}>
                  <Text style={styles.messageText}>"{request.message}"</Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            {role && role.toLowerCase() === "mentor" && request.status.toLowerCase() === 'pending' && (
              <View style={styles.actionButtons}>
                <View style={styles.buttonContainer}>
                  <Button
                    title="❌ Decline"
                    onPress={() => handleRequestAction(request.id, 'declined')}
                    color="#EF4444"
                  />
                </View>
                <View style={styles.buttonContainer}>
                  <Button
                    title="✅ Accept"
                    onPress={() => handleRequestAction(request.id, 'accepted')}
                    color="#10B981"
                  />
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    fontFamily: 'OpenSans-Bold',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'OpenSans-Regular',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'OpenSans-Bold',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'OpenSans-Regular',
  },
  requestCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statusBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  acceptedBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  declinedBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    fontFamily: 'OpenSans-Bold',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#E2E8F0',
  },
  roleIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  studentIndicator: {
    backgroundColor: '#3B82F6',
  },
  mentorIndicator: {
    backgroundColor: '#8B5CF6',
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'OpenSans-Bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: 'OpenSans-Bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
    fontFamily: 'OpenSans-Regular',
  },
  requestDate: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: 'OpenSans-Regular',
  },
  messageSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'OpenSans-Bold',
  },
  messageContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
    fontStyle: 'italic',
    fontFamily: 'OpenSans-Italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  buttonContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

export default NotificationsScreen;