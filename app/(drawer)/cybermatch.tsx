import { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase/initiliaze";
import { router } from "expo-router";

interface Mentee {
  menteeid: number;
  user_id: string;
  skills: string[];
  target_roles: string[];
  current_level: string;
  learning_goals?: string;
  study_level?: string;
  field?: string;
  preferred_mentoring_style?: string;
  time_commitment_hours_per_week?: number;
  name?: string;
  bio?: string;
  location?: string;
}

interface MentorMatch {
  experience_gap_appropriate: any;
  mentorid: number;
  user_id: string;
  mentor_name: string;
  compatibility_score: number;
  skills_score: number;
  roles_score: number;
  skill_overlap_count: number;
  role_overlap_count: number;
  mentor_experience_level: string;
  mentor_location?: string;
  mentor_hourly_rate?: number;
  mentor_availability?: number;
  mentor_bio?: string;
  mentor_certifications?: string[];
  matching_skills?: string[];
  matching_roles?: string[];
  testimonials?: any[];
  testimonial_stats?: {
    total_reviews: number;
    average_rating: number;
    rating_distribution: number[];
  };
}

function CyberMatchScreen() {
  const [matching, setMatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentMentee, setCurrentMentee] = useState<Mentee | null>(null);
  const [mentorMatches, setMentorMatches] = useState<MentorMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [currentMatch, setCurrentMatch] = useState<MentorMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const getCurrentUser = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        setError('Please log in to access mentor matching');
        return null;
      }
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, user_type, name, bio, location, auth_user_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError || !userData) {
        setError('User profile not found');
        return null;
      }

      setCurrentUser(userData);
      setIsAuthenticated(true);
      return userData;
    } catch (error) {
      setError('Authentication error');
      return null;
    }
  };

  const getCurrentMenteeProfile = async (userData: any) => {
    try {
      const { data: menteeData, error: menteeError } = await supabase
        .from('mentees')
        .select('menteeid, user_id, skills, target_roles, current_level, learning_goals, study_level, field, preferred_mentoring_style, time_commitment_hours_per_week')
        .eq('user_id', userData.auth_user_id)
        .single();

      if (menteeError || !menteeData) {
        const basicMentee = {
          menteeid: 0,
          user_id: userData.auth_user_id,
          skills: [],
          target_roles: [],
          current_level: 'Beginner',
          name: userData.name,
          bio: userData.bio,
          location: userData.location
        };
        setCurrentMentee(basicMentee);
        return basicMentee;
      }

      const enrichedMentee = {
        ...menteeData,
        name: userData.name,
        bio: userData.bio,
        location: userData.location
      };

      setCurrentMentee(enrichedMentee);
      return enrichedMentee;
    } catch (error) {
      setError('Failed to load mentee profile');
      return null;
    }
  };

  const loadCurrentUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = await getCurrentUser();
      if (!userData) return;

      const menteeProfile = await getCurrentMenteeProfile(userData);
      if (!menteeProfile) return;

    } catch (error) {
      setError(`Failed to load user profile: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getMentorMatches = async (): Promise<MentorMatch[]> => {
    if (!currentMentee) return [];
    
    try {
      setLoading(true);
      setError(null);
      
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('mentors')
        .select('mentorid, user_id, hourly_rate, skills, specialization_roles, experience_level, years_of_experience, max_mentees, current_mentees, availability_hours_per_week, industries, certifications, bio, active')
        .eq('active', true)
        .limit(5);

      if (mentorsError) throw mentorsError;
      if (!mentorsData || mentorsData.length === 0) return [];

      const mentorMatches = await Promise.all(mentorsData.map(async (mentor: any) => {
        let mentorUserData: any = {};
        try {
          const { data: userData, error: userFetchError } = await supabase
            .from('users')
            .select('name, location')
            .eq('auth_user_id', mentor.user_id)
            .single();

          if (userFetchError) {
            console.error('Error fetching user name for mentor:', userFetchError);
          }
          
          mentorUserData = userData || {};
        } catch (userError) {
          console.error('Error fetching user data:', userError);
        }

        const menteeSkills = currentMentee.skills || [];
        const menteeRoles = currentMentee.target_roles || [];
        const mentorSkills = mentor.skills || [];
        const mentorRoles = mentor.specialization_roles || [];

        const skillOverlap = menteeSkills.filter((skill: string) => 
          mentorSkills.some((mSkill: any) => 
            String(mSkill).toLowerCase().includes(skill.toLowerCase()) || 
            skill.toLowerCase().includes(String(mSkill).toLowerCase())
          )
        );

        const roleOverlap = menteeRoles.filter((role: string) =>
          mentorRoles.some((mRole: any) => 
            String(mRole).toLowerCase().includes(role.toLowerCase()) ||
            role.toLowerCase().includes(String(mRole).toLowerCase())
          )
        );

        const skillsScore = menteeSkills.length > 0 ? (skillOverlap.length / menteeSkills.length) * 100 : 0;
        const rolesScore = menteeRoles.length > 0 ? (roleOverlap.length / menteeRoles.length) * 100 : 0;
        const compatibilityScore = (skillsScore + rolesScore) / 2;

        let testimonials: any[] = [];
        let testimonialStats: any = null;
        
        try {
          const [testimonialsResult, statsResult] = await Promise.all([
            supabase.rpc('get_mentor_testimonials', {
              mentor_id_param: mentor.mentorid,
              limit_param: 3,
              offset_param: 0
            }),
            supabase.rpc('get_mentor_testimonial_stats', {
              mentor_id_param: mentor.mentorid
            })
          ]);
          
          if (!testimonialsResult.error && testimonialsResult.data) {
            testimonials = testimonialsResult.data;
          }
          
          if (!statsResult.error && statsResult.data && statsResult.data.length > 0) {
            const stats = statsResult.data[0];
            testimonialStats = {
              total_reviews: stats.total_reviews || 0,
              average_rating: parseFloat(stats.average_rating || 0),
              rating_distribution: [
                stats.rating_1 || 0,
                stats.rating_2 || 0,
                stats.rating_3 || 0,
                stats.rating_4 || 0,
                stats.rating_5 || 0
              ]
            };
          }
        } catch (testimonialError) {
          console.error('Error fetching testimonials:', testimonialError);
        }

        return {
          mentorid: mentor.mentorid,
          user_id: mentor.user_id,
          mentor_name: mentorUserData.name || `Mentor ${mentor.mentorid}`,
          compatibility_score: Math.round(compatibilityScore),
          skills_score: Math.round(skillsScore),
          roles_score: Math.round(rolesScore),
          skill_overlap_count: skillOverlap.length,
          role_overlap_count: roleOverlap.length,
          mentor_experience_level: mentor.experience_level || 'Unknown',
          mentor_location: mentorUserData.location,
          mentor_hourly_rate: mentor.hourly_rate,
          mentor_availability: mentor.availability_hours_per_week,
          mentor_bio: mentor.bio,
          mentor_certifications: mentor.certifications,
          matching_skills: skillOverlap,
          matching_roles: roleOverlap,
          experience_gap_appropriate: true,
          testimonials,
          testimonial_stats: testimonialStats
        };
      }));

      const matches = mentorMatches.filter(match => match !== null)
        .sort((a, b) => b.compatibility_score - a.compatibility_score);
      
      return matches;
    } catch (error: any) {
      setError(`Failed to find mentor matches: ${error?.message || 'Unknown error'}`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const checkExistingMentorshipRequests = async () => {
    if (!currentMentee) return null;

    try {
      const { data: existingRequests, error } = await supabase
        .from('mentorship_requests')
        .select('id, status, created_at, mentor_id, mentee_id, message')
        .eq('mentee_id', currentMentee.menteeid)
        .in('status', ['Pending', 'Accepted', 'pending', 'accepted'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking existing requests:', error);
        return [];
      }

      return existingRequests || [];
    } catch (error) {
      console.error('Error in checkExistingMentorshipRequests:', error);
      return null;
    }
  };

  const startMatching = async () => {
    const existingRequests = await checkExistingMentorshipRequests();
    
    if (existingRequests && existingRequests.length > 0) {
      const pendingRequests = existingRequests.filter(req => 
        req.status === 'Pending' || req.status === 'pending'
      );
      const acceptedRequests = existingRequests.filter(req => 
        req.status === 'Accepted' || req.status === 'accepted'
      );

      let alertMessage = '';
      let alertTitle = '';

      if (acceptedRequests.length > 0) {
        alertTitle = 'Active Mentorship Found';
        alertMessage = `You already have ${acceptedRequests.length} accepted mentorship${acceptedRequests.length > 1 ? 's' : ''}. Consider completing your current mentorship before seeking new mentors.`;
      } else if (pendingRequests.length > 0) {
        alertTitle = 'Pending Requests Found';
        alertMessage = `You have ${pendingRequests.length} pending mentorship request${pendingRequests.length > 1 ? 's' : ''} waiting for approval. You can continue to find additional mentors if needed.`;
      }

      if (alertMessage) {
        Alert.alert(
          alertTitle,
          alertMessage,
          [
            {
              text: 'Check Notifications',
              onPress: () => console.log('Navigate to notifications')
            },
            {
              text: acceptedRequests.length > 0 ? 'Cancel' : 'Continue Anyway',
              style: acceptedRequests.length > 0 ? 'cancel' : 'default',
              onPress: () => {
                if (acceptedRequests.length === 0) {
                  proceedWithMatching();
                }
              }
            }
          ]
        );
        return;
      }
    }
    
    proceedWithMatching();
  };

  const proceedWithMatching = async () => {
    const matches = await getMentorMatches();
    
    if (matches.length > 0) {
      setMentorMatches(matches);
      setCurrentMatchIndex(0);
      setCurrentMatch(matches[0]);
      setMatching(true);
    } else {
      setError('No mentors found. Please ensure there are active mentors in the database.');
    }
  };

  const handleNext = () => {
    if (currentMatchIndex + 1 < mentorMatches.length) {
      const nextIndex = currentMatchIndex + 1;
      setCurrentMatchIndex(nextIndex);
      setCurrentMatch(mentorMatches[nextIndex]);
    } else {
      Alert.alert("End", "No more mentors to show.");
      setMatching(false);
      setCurrentMatch(null);
      setCurrentMatchIndex(0);
    }
  };

  const handlePrev = () => {
    // If we're already at the first match, inform the user
    if (currentMatchIndex <= 0) {
      Alert.alert("Start", "You're viewing the first mentor.");
      return;
    }

    const prevIndex = currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    // Update the displayed match to the previous one
    setCurrentMatch(mentorMatches[prevIndex] || null);
  };

  const handleRequestMentorship = async (mentorUserId: string) => {
    if (!isAuthenticated || !currentUser) {
      Alert.alert('Error', 'Please log in to send mentorship requests');
      return;
    }
    
    try {
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('mentorid')
        .eq('user_id', mentorUserId)
        .single();

      if (!mentorData) {
        throw new Error('Mentor not found');
      }

      const { error } = await supabase
        .from('mentorship_requests')
        .insert({
          mentee_id: currentMentee.menteeid,
          mentor_id: mentorData.mentorid,
          user_id: currentUser.auth_user_id,
          status: 'Pending',
          message: 'Hi, I would like to request mentorship based on our compatibility match.'
        });
      
      if (error) {
        console.error('Mentorship request error:', error);
        Alert.alert('Error', `Failed to send mentorship request: ${error.message}`);
        return;
      }
      
      Alert.alert(
        "Success", 
        "Mentorship request sent successfully! Once accepted, you'll be able to work together and leave a testimonial after your mentorship experience.",
        [{ text: "OK", onPress: handleNext }]
      );
    } catch (error) {
      console.error('Error sending mentorship request:', error);
      Alert.alert('Error', 'Failed to send mentorship request. Please try again.');
    }
  };

  const getCompatibilityLevel = (score: number) => {
    if (score >= 80) return { level: "Excellent", color: "#059669", bgColor: "#D1FAE5", emoji: "🎯" };
    if (score >= 60) return { level: "Good", color: "#D97706", bgColor: "#FEF3C7", emoji: "👍" };
    if (score >= 40) return { level: "Fair", color: "#DC2626", bgColor: "#FEE2E2", emoji: "⚠️" };
    return { level: "Limited", color: "#6B7280", bgColor: "#F3F4F6", emoji: "🤔" };
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "#059669";
    if (score >= 60) return "#D97706"; 
    return "#DC2626";
  };

  useEffect(() => {
    loadCurrentUserProfile();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ 
          backgroundColor: '#FFFFFF', 
          padding: 40, 
          borderRadius: 24, 
          alignItems: 'center',
          shadowColor: '#3B82F6',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 24,
          elevation: 8,
          borderWidth: 1,
          borderColor: '#E2E8F0'
        }}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={{ color: '#64748B', marginTop: 20, fontSize: 16 }}>Finding your perfect match...</Text>
        </View>
        {error && (
          <Text style={{ color: '#DC2626', marginTop: 16, textAlign: 'center', paddingHorizontal: 20 }}>{error}</Text>
        )}
      </View>
    );
  }

  if (!currentMentee) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{
          backgroundColor: '#FFFFFF',
          padding: 40,
          borderRadius: 24,
          alignItems: 'center',
          width: '100%',
          maxWidth: 400,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 4
        }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 12 }}>
            Welcome to CyberMatch
          </Text>
          <Text style={{ fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 24 }}>
            Find Your Perfect Cybersecurity Mentor
          </Text>
          {error && (
            <Text style={{ color: '#DC2626', marginBottom: 24, textAlign: 'center' }}>
              {error}
            </Text>
          )}
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#3B82F6', 
              paddingHorizontal: 32, 
              paddingVertical: 16, 
              borderRadius: 12,
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6
            }}
            onPress={loadCurrentUserProfile}
          >
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8FAFC' }} contentContainerStyle={{ paddingVertical: 24 }}>
      <View style={{ paddingTop: 40, paddingHorizontal: 20 }}>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            alignSelf: 'flex-start',
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 15 }}>
            Back to Home
          </Text>
        </TouchableOpacity>
        {!matching ? (
          <View style={{ alignItems: 'center' }}>
            <View style={{ 
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              borderRadius: 16,
              padding: 8,
              marginBottom: 16,
              borderWidth: 2,
              borderColor: '#3B82F6'
            }}>
              <Text style={{ fontSize: 40, fontWeight: 'bold', color: '#3B82F6', textAlign: 'center', letterSpacing: 2 }}>
                CYBERMATCH
              </Text>
            </View>
            
            <View style={{ 
              width: '100%', 
              backgroundColor: '#FFFFFF', 
              borderRadius: 24, 
              padding: 28,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 20,
              elevation: 4,
              marginBottom: 32
            }}>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{
                  position: 'relative',
                  marginBottom: 16
                }}>
                  <Image
                    source={{ uri: `https://avatar.iran.liara.run/public/boy?id=${currentMentee?.menteeid || 1}` }}
                    style={{ 
                      width: 100, 
                      height: 100, 
                      borderRadius: 50,
                      borderWidth: 4,
                      borderColor: '#3B82F6'
                    }}
                  />
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: '#10B981',
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 3,
                    borderColor: '#FFFFFF'
                  }} />
                </View>
                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 }}>
                  {currentMentee?.name || 'Mentee Profile'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ 
                    backgroundColor: '#3B82F6', 
                    paddingHorizontal: 12, 
                    paddingVertical: 4, 
                    borderRadius: 12 
                  }}>
                    <Text style={{ fontSize: 13, color: 'white', fontWeight: '600' }}>
                      {currentMentee?.current_level}
                    </Text>
                  </View>
                  {currentMentee?.location && (
                    <Text style={{ fontSize: 14, color: '#64748B' }}>
                      📍 {currentMentee.location}
                    </Text>
                  )}
                </View>
                {currentMentee?.study_level && (
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                    {currentMentee.study_level} in {currentMentee.field}
                  </Text>
                )}
              </View>

              {currentMentee?.skills && currentMentee.skills.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 12 }}>
                    🎯 Skills to Master
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {currentMentee.skills.map((skill, index) => (
                      <View
                        key={`${skill}-${index}`}
                        style={{ 
                          backgroundColor: '#EFF6FF', 
                          borderColor: '#3B82F6',
                          borderWidth: 1,
                          paddingHorizontal: 14, 
                          paddingVertical: 8, 
                          borderRadius: 20
                        }}
                      >
                        <Text style={{ color: '#2563EB', fontSize: 14, fontWeight: '500' }}>
                          {skill}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {currentMentee?.target_roles && currentMentee.target_roles.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 12 }}>
                    💼 Target Roles
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {currentMentee.target_roles.map((role, index) => (
                      <View
                        key={`${role}-${index}`}
                        style={{ 
                          backgroundColor: '#ECFDF5', 
                          borderColor: '#10B981',
                          borderWidth: 1,
                          paddingHorizontal: 14, 
                          paddingVertical: 8, 
                          borderRadius: 20
                        }}
                      >
                        <Text style={{ color: '#059669', fontSize: 14, fontWeight: '500' }}>
                          {role}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {currentMentee?.learning_goals && (
                <View style={{ 
                  backgroundColor: '#F0F9FF', 
                  borderRadius: 12, 
                  padding: 16,
                  borderLeftWidth: 3,
                  borderLeftColor: '#3B82F6'
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 6 }}>
                    🎓 Learning Goals
                  </Text>
                  <Text style={{ fontSize: 14, color: '#475569', fontStyle: 'italic', lineHeight: 20 }}>
                    "{currentMentee.learning_goals}"
                  </Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={{ 
                backgroundColor: '#3B82F6',
                paddingHorizontal: 48,
                paddingVertical: 18,
                borderRadius: 16,
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 6,
                width: '100%',
                maxWidth: 320
              }}
              onPress={startMatching}
              disabled={loading}
            >
              <Text style={{ 
                color: 'white', 
                fontSize: 18, 
                fontWeight: 'bold', 
                textAlign: 'center',
                letterSpacing: 0.5
              }}>
                {loading ? 'Finding Matches...' : '🚀 Find My Matches'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : matching && currentMatch ? (
          <View style={{ alignItems: 'center' }}>
            <View style={{ 
              width: '100%', 
              backgroundColor: '#E0F2FE', 
              height: 6, 
              borderRadius: 3, 
              marginBottom: 12,
              overflow: 'hidden'
            }}>
              <View 
                style={{ 
                  width: `${((currentMatchIndex + 1) / mentorMatches.length) * 100}%`, 
                  backgroundColor: '#3B82F6', 
                  height: 6, 
                  borderRadius: 3
                }} 
              />
            </View>
            
            <Text style={{ fontSize: 16, color: '#64748B', marginBottom: 24, textAlign: 'center' }}>
              Match {currentMatchIndex + 1} of {mentorMatches.length}
            </Text>

            <View style={{ 
              width: '100%', 
              backgroundColor: '#FFFFFF', 
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 6,
              padding: 28,
              marginBottom: 20
            }}>
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{ position: 'relative', marginBottom: 16 }}>
                  <Image
                    source={{ uri: `https://avatar.iran.liara.run/public/${Math.random() > 0.5 ? 'boy' : 'girl'}?id=${currentMatch.mentorid}` }}
                    style={{ 
                      width: 120, 
                      height: 120, 
                      borderRadius: 60,
                      borderWidth: 4,
                      borderColor: '#3B82F6'
                    }}
                  />
                </View>
                <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#1E293B', textAlign: 'center', marginBottom: 6 }}>
                  {currentMatch.mentor_name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <View style={{ 
                    backgroundColor: '#FFF7ED',
                    borderWidth: 1,
                    borderColor: '#F97316',
                    paddingHorizontal: 12, 
                    paddingVertical: 4, 
                    borderRadius: 12 
                  }}>
                    <Text style={{ fontSize: 13, color: '#EA580C', fontWeight: '600' }}>
                      {currentMatch.mentor_experience_level}
                    </Text>
                  </View>
                  {currentMatch.mentor_location && (
                    <Text style={{ fontSize: 14, color: '#64748B' }}>
                      📍 {currentMatch.mentor_location}
                    </Text>
                  )}
                </View>
                
                {(() => {
                  const compat = getCompatibilityLevel(currentMatch.compatibility_score);
                  return (
                    <View style={{ 
                      backgroundColor: compat.bgColor,
                      borderWidth: 2,
                      borderColor: compat.color,
                      paddingHorizontal: 20, 
                      paddingVertical: 12, 
                      borderRadius: 24, 
                      flexDirection: 'row', 
                      alignItems: 'center'
                    }}>
                      <Text style={{ fontSize: 28, marginRight: 10 }}>{compat.emoji}</Text>
                      <Text style={{ color: compat.color, fontWeight: 'bold', fontSize: 18 }}>
                        {currentMatch.compatibility_score}% {compat.level} Match
                      </Text>
                    </View>
                  );
                })()}
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 16, textAlign: 'center' }}>
                  📊 Compatibility Breakdown
                </Text>
                
                <View style={{ gap: 12 }}>
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '500' }}>Skills Match</Text>
                      <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: 'bold' }}>
                        {currentMatch.skills_score}%
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#E2E8F0', height: 10, borderRadius: 5, overflow: 'hidden' }}>
                      <View 
                        style={{ 
                          width: `${currentMatch.skills_score}%`, 
                          backgroundColor: getScoreColor(currentMatch.skills_score),
                          height: 10,
                          borderRadius: 5
                        }} 
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                      {currentMatch.skill_overlap_count} matching skills
                    </Text>
                  </View>
                  
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 14, color: '#64748B', fontWeight: '500' }}>Roles Match</Text>
                      <Text style={{ fontSize: 14, color: '#1E293B', fontWeight: 'bold' }}>
                        {currentMatch.roles_score}%
                      </Text>
                    </View>
                    <View style={{ backgroundColor: '#E2E8F0', height: 10, borderRadius: 5, overflow: 'hidden' }}>
                      <View 
                        style={{ 
                          width: `${currentMatch.roles_score}%`, 
                          backgroundColor: getScoreColor(currentMatch.roles_score),
                          height: 10,
                          borderRadius: 5
                        }} 
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                      {currentMatch.role_overlap_count} matching roles
                    </Text>
                  </View>
                </View>
              </View>

              {currentMatch.matching_skills && currentMatch.matching_skills.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 12 }}>
                    🎯 Matching Skills ({currentMatch.matching_skills.length})
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {currentMatch.matching_skills.map((skill, index) => (
                      <View 
                        key={`matching-skill-${index}`}
                        style={{ 
                          backgroundColor: '#ECFDF5',
                          borderColor: '#10B981',
                          borderWidth: 1,
                          paddingHorizontal: 12, 
                          paddingVertical: 6, 
                          borderRadius: 16,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ fontSize: 12, marginRight: 6 }}>✅</Text>
                        <Text style={{ color: '#059669', fontSize: 14, fontWeight: '500' }}>
                          {skill}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {currentMatch.matching_roles && currentMatch.matching_roles.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 12 }}>
                    💼 Matching Career Roles ({currentMatch.matching_roles.length})
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {currentMatch.matching_roles.map((role, index) => (
                      <View 
                        key={`matching-role-${index}`}
                        style={{ 
                          backgroundColor: '#EFF6FF',
                          borderColor: '#3B82F6',
                          borderWidth: 1,
                          paddingHorizontal: 12, 
                          paddingVertical: 6, 
                          borderRadius: 16,
                          flexDirection: 'row',
                          alignItems: 'center'
                        }}
                      >
                        <Text style={{ fontSize: 12, marginRight: 6 }}>🎯</Text>
                        <Text style={{ color: '#2563EB', fontSize: 14, fontWeight: '500' }}>
                          {role}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {(!currentMatch.matching_skills || currentMatch.matching_skills.length === 0) && 
               (!currentMatch.matching_roles || currentMatch.matching_roles.length === 0) && (
                <View style={{ 
                  backgroundColor: '#FFF7ED',
                  borderColor: '#F97316',
                  borderWidth: 1,
                  padding: 16, 
                  borderRadius: 12, 
                  marginBottom: 20,
                  alignItems: 'center'
                }}>
                  <Text style={{ fontSize: 14, color: '#EA580C', textAlign: 'center', lineHeight: 20 }}>
                    🤔 No direct skill/role matches found, but this mentor might still offer valuable guidance in your cybersecurity journey!
                  </Text>
                </View>
              )}

              {currentMatch.mentor_bio && (
                <View style={{ 
                  backgroundColor: '#F8FAFC', 
                  borderRadius: 12, 
                  padding: 16, 
                  marginBottom: 20,
                  borderLeftWidth: 3,
                  borderLeftColor: '#3B82F6'
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 10 }}>
                    📖 About {currentMatch.mentor_name}
                  </Text>
                  <Text style={{ fontSize: 14, color: '#475569', lineHeight: 22 }}>
                    {currentMatch.mentor_bio}
                  </Text>
                </View>
              )}

              {currentMatch.testimonial_stats && currentMatch.testimonial_stats.total_reviews > 0 && (
                <View style={{ 
                  backgroundColor: '#FAF5FF', 
                  borderRadius: 12, 
                  padding: 18, 
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#C084FC'
                }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 14 }}>
                    ⭐ Student Testimonials
                  </Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#9333EA', marginRight: 12 }}>
                      {(currentMatch.testimonial_stats?.average_rating || 0).toFixed(1)}
                    </Text>
                    <View>
                      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Text key={star} style={{ fontSize: 18, color: star <= Math.round(currentMatch.testimonial_stats?.average_rating || 0) ? '#FBBF24' : '#D1D5DB' }}>
                            ★
                          </Text>
                        ))}
                      </View>
                      <Text style={{ fontSize: 13, color: '#64748B' }}>
                        Based on {currentMatch.testimonial_stats?.total_reviews || 0} testimonials
                      </Text>
                    </View>
                  </View>

                  {currentMatch.testimonials && currentMatch.testimonials.length > 0 && (
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 10 }}>
                        Recent Feedback:
                      </Text>
                      {currentMatch.testimonials.slice(0, 2).map((testimonial: any, index: number) => (
                        <View key={testimonial.id || index} style={{ 
                          backgroundColor: '#FFFFFF',
                          borderRadius: 10, 
                          padding: 14, 
                          marginBottom: 10,
                          borderLeftWidth: 3,
                          borderLeftColor: testimonial.rating >= 4 ? '#10B981' : testimonial.rating >= 3 ? '#F59E0B' : '#EF4444'
                        }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1E293B' }}>
                              {testimonial.mentee_name || 'Anonymous Student'}
                            </Text>
                            <View style={{ flexDirection: 'row' }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Text key={star} style={{ fontSize: 12, color: star <= testimonial.rating ? '#FBBF24' : '#D1D5DB' }}>
                                  ★
                                </Text>
                              ))}
                            </View>
                          </View>
                          <Text style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', lineHeight: 20 }}>
                            "{testimonial.testimonial_text}"
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'space-around', 
                marginBottom: 24,
                backgroundColor: '#F8FAFC',
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#E2E8F0'
              }}>
                {currentMatch.mentor_hourly_rate && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Rate</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#10B981' }}>
                      ${currentMatch.mentor_hourly_rate}/hr
                    </Text>
                  </View>
                )}
                {currentMatch.mentor_availability && (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Availability</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#3B82F6' }}>
                      {currentMatch.mentor_availability}h/wk
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={{ 
                    backgroundColor: '#3B82F6',
                    paddingVertical: 18,
                    borderRadius: 14,
                    alignItems: 'center',
                    shadowColor: '#3B82F6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4
                  }}
                  onPress={() => handleRequestMentorship(currentMatch.user_id)}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 17 }}>
                    ✉️ Request Mentorship
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ 
                      flex: 1,
                      backgroundColor: '#FFF7ED',
                      borderWidth: 2,
                      borderColor: '#F97316',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center'
                    }}
                    onPress={() =>
                      router.push({
                        pathname: '/testimonials',
                        params: { 
                          mentorId: currentMatch.user_id,
                          mentorName: currentMatch.mentor_name 
                        }
                      })
                    }
                  >
                    <Text style={{ color: '#EA580C', fontWeight: '600', fontSize: 15 }}>
                      📝 Testimonials
                    </Text>
                  </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{ 
                      flex: 1,
                      backgroundColor: currentMatchIndex <= 0 ? '#F1F5F9' : '#FFFFFF',
                      borderWidth: 2,
                      borderColor: currentMatchIndex <= 0 ? '#E2E8F0' : '#94A3B8',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center',
                      opacity: currentMatchIndex <= 0 ? 0.6 : 1
                    }}
                    onPress={handlePrev}
                    disabled={currentMatchIndex <= 0}
                  >
                    <Text style={{ 
                      color: currentMatchIndex <= 0 ? '#94A3B8' : '#64748B',
                      fontWeight: '600',
                      fontSize: 15
                    }}>
                      ⬅️ Previous
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ 
                      flex: 1,
                      backgroundColor: currentMatchIndex + 1 >= mentorMatches.length ? '#FEE2E2' : '#F1F5F9',
                      borderWidth: 2,
                      borderColor: currentMatchIndex + 1 >= mentorMatches.length ? '#DC2626' : '#94A3B8',
                      paddingVertical: 14,
                      borderRadius: 12,
                      alignItems: 'center'
                    }}
                    onPress={handleNext}
                  >
                    <Text style={{ 
                      color: currentMatchIndex + 1 >= mentorMatches.length ? '#DC2626' : '#64748B',
                      fontWeight: '600',
                      fontSize: 15
                    }}>
                      {currentMatchIndex + 1 >= mentorMatches.length ? '🏁 Finish' : '➡️ Next'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Text style={{ fontSize: 20, color: '#64748B', marginBottom: 24, textAlign: 'center' }}>
              🎉 You've viewed all available mentors
            </Text>
            <TouchableOpacity
              style={{ 
                backgroundColor: '#3B82F6',
                paddingHorizontal: 32,
                paddingVertical: 16,
                borderRadius: 12,
                shadowColor: '#3B82F6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 4
              }}
              onPress={() => setMatching(false)}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                Back to Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

export default CyberMatchScreen;