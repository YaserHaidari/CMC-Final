import { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, Button, Alert, StyleSheet, TextInput, ImageBackground } from "react-native";
import { supabase } from "@/lib/supabase/initiliaze";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";

interface UserInfo {
  name: string;
  email: string;
}

interface MentorshipRequest {
  id: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined';
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
  const [searchText, setSearchText] = useState("");

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

      if (userError || !userData?.user_type) {
        Alert.alert("Error", "Could not verify your user profile.");
        setIsLoading(false);
        return;
      }

      setRole(userData.user_type);

      if (userData.user_type.toLowerCase() === "mentor") {
        let { data: mentorData, error: mentorError } = await supabase
          .from("mentors")
          .select("mentorid, user_id")
          .eq("user_id", session.user.id)
          .single();

        if (mentorError || !mentorData) {
          Alert.alert("Error", `Could not find your mentor profile.`);
          setIsLoading(false);
          return;
        }

        fetchMentorshipRequestsForTutor(mentorData.mentorid);
      } else {
        let { data: menteeData, error: menteeError } = await supabase
          .from("mentees")
          .select("menteeid, user_id")
          .eq("user_id", session.user.id)
          .single();

        if (menteeError || !menteeData) {
          Alert.alert("Error", `Could not find your mentee profile.`);
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

  async function fetchMentorshipRequestsForTutor(mentorId: number) {
    try {
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select(`id, created_at, status, message, mentee_id, mentor_id`)
        .eq('mentor_id', mentorId)
        .order('created_at', { ascending: false });

      if (error) {
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

      const combinedData = await Promise.all(data.map(async (req) => {
        try {
          const { data: menteeData } = await supabase
            .from('mentees')
            .select('user_id')
            .eq('menteeid', req.mentee_id)
            .single();

          if (menteeData?.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('name, email')
              .eq('auth_user_id', menteeData.user_id)
              .single();

            return {
              ...req,
              status: req.status.toLowerCase(),
              mentee: userData ? [{ name: userData.name, email: userData.email }] : []
            };
          }
        } catch (error) {}

        return { ...req, status: req.status.toLowerCase(), mentee: [] };
      }));

      const uniqueRequests = combinedData.reduce((acc, current) => {
        const existingRequest = acc.find(req => req.mentee_id === current.mentee_id);
        if (!existingRequest) {
          acc.push(current);
        } else {
          const currentDate = new Date(current.created_at);
          const existingDate = new Date(existingRequest.created_at);
          if (currentDate > existingDate) {
            const index = acc.findIndex(req => req.mentee_id === current.mentee_id);
            acc[index] = current;
          }
        }
        return acc;
      }, [] as MentorshipRequest[]);

      setRequests(uniqueRequests);
    } catch (e) {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAcceptedMentorsForStudent(menteeId: number) {
    try {
      const { data, error } = await supabase
        .from('mentorship_requests')
        .select(`id, created_at, status, message, mentee_id, mentor_id`)
        .eq('mentee_id', menteeId)
        .ilike('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error || !data) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      const combinedData = await Promise.all(data.map(async (req) => {
        try {
          const { data: mentorData } = await supabase
            .from('mentors')
            .select('user_id')
            .eq('mentorid', req.mentor_id)
            .single();

          if (mentorData?.user_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('name, email')
              .eq('auth_user_id', mentorData.user_id)
              .single();

            return { ...req, status: req.status.toLowerCase(), mentor: userData ? [{ name: userData.name, email: userData.email }] : [] };
          }
        } catch (error) {}

        return { ...req, status: req.status.toLowerCase(), mentor: [] };
      }));

      setRequests(combinedData as MentorshipRequest[]);
    } catch (e) {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestAction(requestId: string, newStatus: 'accepted' | 'declined') {
    try {
      const lowercaseStatus = newStatus;
      const { data: updateData, error } = await supabase
        .from('mentorship_requests')
        .update({ 
          status: lowercaseStatus,
          responded_at: new Date().toISOString(),
          response_message: newStatus === 'accepted' 
            ? 'Mentorship request has been accepted!' 
            : 'Mentorship request has been declined.'
        })
        .eq('id', requestId)
        .select('*');

      if (updateData && updateData.length > 0) {
        setRequests(prevRequests =>
          prevRequests.map(req =>
            req.id === requestId ? { ...req, status: updateData[0].status.toLowerCase() as 'pending' | 'accepted' | 'declined' } : req
          )
        );

        setTimeout(() => {
          fetchCurrentSupabaseUserAndRequests();
        }, 1000);
      }
    } catch (e) {}
  }

  async function handleDeleteRequest(requestId: string) {
    try {
      await supabase
        .from('mentorship_requests')
        .delete()
        .eq('id', requestId);

      setRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      Alert.alert("Error", "Could not delete request.");
    }
  }

  const renderRightActions = (requestId: string) => {
    return (
      <View
        style={{
          backgroundColor: "#EF4444",
          justifyContent: "center",
          alignItems: "center",
          width: 70,
          borderRadius: 16,
          marginVertical: 8,
          marginRight: 16,
        }}
      >
        <Ionicons
          name="trash"
          size={24}
          color="white"
          onPress={() => handleDeleteRequest(requestId)}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <Text>Loading notifications...</Text>
      </View>
    );
  }

  const filteredRequests = requests.filter(req => {
    const searchLower = searchText.toLowerCase();
    const name = role && role.toLowerCase() === "mentor"
      ? req.mentee?.[0]?.name || ''
      : req.mentor?.[0]?.name || '';
    const email = role && role.toLowerCase() === "mentor"
      ? req.mentee?.[0]?.email || ''
      : req.mentor?.[0]?.email || '';
    return name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower);
  });

  return (
    <ImageBackground
      source={require('@/assets/images/notificationsPage.png')} // Your background image
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.83)' }}>
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

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name ..."
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {filteredRequests.length === 0 ? (
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
            filteredRequests.map((request) => (
              <Swipeable
                key={request.id}
                renderRightActions={() => renderRightActions(request.id)}
              >
                <View style={styles.requestCard}>
                  {/* Status Badge */}
                  <View style={[
                    styles.statusBadge,
                    request.status === 'pending' && styles.pendingBadge,
                    request.status === 'accepted' && styles.acceptedBadge,
                    request.status === 'declined' && styles.declinedBadge,
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
                  {request.message && role && role.toLowerCase() === "mentor" && (
                    <View style={styles.messageSection}>
                      <Text style={styles.messageLabel}>💬 Message:</Text>
                      <View style={styles.messageContainer}>
                        <Text style={styles.messageText}>"{request.message}"</Text>
                      </View>
                    </View>
                  )}

                  {/* Action Buttons */}
                  {role && role.toLowerCase() === "mentor" && request.status === 'pending' && (
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
              </Swipeable>
            ))
          )}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    backgroundColor: 'transparent', // changed from solid color to transparent for background image
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: '##40301ef',
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
    borderColor: '#40301ef',
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
    backgroundColor: '#FAF3E0',
  },
});

export default NotificationsScreen;
