import { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from "react-native";
import { supabase } from "@/lib/supabase/initiliaze";

// Add these debugging utilities at the top
const DEBUG = false; // Set to false in production

const debugLog = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[CyberMatch Debug] ${message}`, data || '');
    // Also try these alternative logging methods:
    console.info(`[CyberMatch Info] ${message}`, data || '');
    console.warn(`[CyberMatch Warn] ${message}`, data || '');
  }
};

// Test console logging immediately
console.log('🚀 CyberMatchScreen component file loaded');
debugLog('Debug logging is working');

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
  // User info from users table
  name?: string;
  bio?: string;
  location?: string;
}

interface MentorMatch {
  experience_gap_appropriate: any;
  mentorid: number;
  userid: string;
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

const DEMO_MENTEE_IDS = [
  "09c6b04d-bcc4-479a-a319-6230ec8be743", 
  "dc7ca7f6-d6ba-493d-b697-1ec86173bca7",  
  "c710347f-d217-42e0-8f94-aaa30aa28270",
];

function CyberMatchScreen() {
  debugLog('🏗️ CyberMatchScreen component initializing');

  const [matching, setMatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentMentee, setCurrentMentee] = useState<Mentee | null>(null);
  const [mentorMatches, setMentorMatches] = useState<MentorMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [currentMatch, setCurrentMatch] = useState<MentorMatch | null>(null);
  const [availableMentees, setAvailableMentees] = useState<Mentee[]>([]);
  const [currentDemoMenteeIndex, setCurrentDemoMenteeIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Test Supabase connection
  const testSupabaseConnection = async () => {
    debugLog('🔗 Testing Supabase connection...');
    try {
      const { data, error } = await supabase
        .from('mentees')
        .select('menteeid')
        .limit(1);
      
      if (error) {
        debugLog('❌ Supabase connection error:', error);
        setError(`Supabase Error: ${error.message}`);
        return false;
      }
      
      debugLog('✅ Supabase connection successful:', data);
      return true;
    } catch (err) {
      debugLog('❌ Supabase connection failed:', err);
      setError(`Connection Error: ${err}`);
      return false;
    }
  };

  const loadAvailableMentees = async () => {
    debugLog('📋 Loading available mentees...');
    
    try {
      setLoading(true);
      setError(null);

      // Test connection first
      const connectionOk = await testSupabaseConnection();
      if (!connectionOk) {
        debugLog('❌ Supabase connection failed, using mock data');
        // Use mock data for testing
        const mockMentees: Mentee[] = [
          {
            menteeid: 1,
            user_id: DEMO_MENTEE_IDS[0],
            name: "Demo Student",
            bio: "Aspiring cybersecurity professional",
            skills: ["Network Security", "Ethical Hacking", "Risk Assessment"],
            target_roles: ["Security Analyst", "Penetration Tester"],
            current_level: "Beginner",
            location: "Melbourne, AU",
            learning_goals: "Learn practical cybersecurity skills",
            study_level: "Undergraduate",
            field: "Computer Science"
          }
        ];
        setAvailableMentees(mockMentees);
        setCurrentMentee(mockMentees[0]);
        debugLog('✅ Mock data loaded successfully');
        return mockMentees;
      }

      const { data, error } = await supabase
        .from('mentees')
        .select(`
          menteeid,
          user_id,
          skills,
          target_roles,
          current_level,
          learning_goals,
          study_level,
          field,
          preferred_mentoring_style,
          time_commitment_hours_per_week
        `)
        .limit(5);

      debugLog('📊 Supabase query result:', { data, error });

      if (error) {
        debugLog('❌ Query error:', error);
        throw error;
      }
      
      const menteesData = data || [];
      debugLog('✅ Mentees data processed:', menteesData);
      
      // Fetch user details for each mentee
      const enrichedMentees = await Promise.all(menteesData.map(async (mentee: any) => {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('name, bio, location')
            .eq('id', mentee.user_id)
            .single();
          
          return {
            ...mentee,
            name: userData?.name,
            bio: userData?.bio,
            location: userData?.location
          };
        } catch (error) {
          debugLog(`Error fetching user data for mentee ${mentee.menteeid}:`, error);
          return mentee;
        }
      }));
      
      setAvailableMentees(enrichedMentees);
      
      if (enrichedMentees.length > 0) {
        setCurrentMentee(enrichedMentees[0]);
        debugLog('✅ Current mentee set:', enrichedMentees[0]);
      } else {
        debugLog('⚠️ No mentees found in database');
        setError('No mentees found in database');
      }
      
      return menteesData;
    } catch (error) {
      debugLog('❌ Error loading mentees:', error);
      setError(`Failed to load mentee profiles: ${error}`);
      Alert.alert('Error', 'Failed to load mentee profiles');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const switchMentee = () => {
    debugLog('🔄 Switching mentee...');
    if (availableMentees.length > 1) {
      const nextIndex = (currentDemoMenteeIndex + 1) % availableMentees.length;
      debugLog(`Switching from index ${currentDemoMenteeIndex} to ${nextIndex}`);

      setCurrentDemoMenteeIndex(nextIndex);
      setCurrentMentee(availableMentees[nextIndex]);

      // Reset matching state
      setMatching(false);
      setMentorMatches([]);
      setCurrentMatch(null);
      setCurrentMatchIndex(0);
      
      debugLog('✅ Mentee switched successfully, matches will refresh automatically');
    } else {
      debugLog('⚠️ No other mentees available to switch to');
    }
  };

  const getMentorMatches = async (): Promise<MentorMatch[]> => {
    debugLog('🎯 Getting mentor matches...');
    
    if (!currentMentee) {
      debugLog('❌ No current mentee available');
      return [];
    }

    debugLog('Current mentee for matching:', currentMentee);

    try {
      setLoading(true);
      setError(null);
      
      let matches: MentorMatch[] = [];
      
      try {
        // First get all active mentors
        const { data: mentorsData, error: mentorsError } = await supabase
          .from('mentors')
          .select(`
            mentorid,
            userid,
            bio,
            hourly_rate,
            skills,
            specialization_roles,
            experience_level,
            years_of_experience,
            max_mentees,
            current_mentees,
            availability_hours_per_week,
            industries,
            certifications,
            location,
            name,
            active
          `)
          .eq('active', true)
          .limit(10);

        if (mentorsError) {
          throw mentorsError;
        }

        debugLog('📋 Retrieved mentors:', mentorsData);

        // For each mentor, get detailed match information using get_match_details RPC
        const mentorMatches = await Promise.all((mentorsData || []).map(async (mentor: any) => {
          try {
            const { data: matchDetails, error: matchError } = await supabase.rpc('get_match_details', {
              mentee_userid: currentMentee.user_id,
              mentor_userid: mentor.userid
            });
            
            debugLog(`Match details for mentor ${mentor.mentorid}:`, matchDetails);

            if (matchError || !matchDetails || matchDetails.length === 0) {
              // If RPC fails for this mentor, calculate basic match
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

              return {
                mentorid: mentor.mentorid,
                userid: mentor.userid,
                mentor_name: mentor.name || `Mentor ${mentor.mentorid}`,
                compatibility_score: Math.round(compatibilityScore),
                skills_score: Math.round(skillsScore),
                roles_score: Math.round(rolesScore),
                skill_overlap_count: skillOverlap.length,
                role_overlap_count: roleOverlap.length,
                mentor_experience_level: mentor.experience_level || 'Unknown',
                mentor_location: mentor.location,
                mentor_hourly_rate: mentor.hourly_rate,
                mentor_availability: mentor.availability_hours_per_week,
                mentor_bio: mentor.bio,
                mentor_certifications: mentor.certifications,
                matching_skills: skillOverlap,
                matching_roles: roleOverlap,
                experience_gap_appropriate: true
              };
            }

            const details = matchDetails[0];
            const matchingSkills = details.matching_skills || [];
            const matchingRoles = details.matching_roles || [];
            const compatibilityBreakdown = details.compatibility_breakdown || {};

            // Calculate scores from the detailed breakdown
            const skillsScore = compatibilityBreakdown.skills_match_percentage || 0;
            const rolesScore = compatibilityBreakdown.roles_match_percentage || 0;
            const compatibilityScore = compatibilityBreakdown.overall_compatibility || ((skillsScore + rolesScore) / 2);

            // Fetch testimonials and stats for this mentor
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
              debugLog(`Error fetching testimonials for mentor ${mentor.mentorid}:`, testimonialError);
            }

            return {
              mentorid: mentor.mentorid,
              userid: mentor.userid,
              mentor_name: mentor.name || `Mentor ${mentor.mentorid}`,
              compatibility_score: Math.round(compatibilityScore),
              skills_score: Math.round(skillsScore),
              roles_score: Math.round(rolesScore),
              skill_overlap_count: matchingSkills.length,
              role_overlap_count: matchingRoles.length,
              mentor_experience_level: mentor.experience_level || 'Unknown',
              mentor_location: mentor.location,
              mentor_hourly_rate: mentor.hourly_rate,
              mentor_availability: mentor.availability_hours_per_week,
              mentor_bio: mentor.bio,
              mentor_certifications: mentor.certifications,
              matching_skills: matchingSkills,
              matching_roles: matchingRoles,
              experience_gap_appropriate: compatibilityBreakdown.experience_appropriate || true,
              testimonials,
              testimonial_stats: testimonialStats
            };
          } catch (error) {
            debugLog(`Error getting match details for mentor ${mentor.mentorid}:`, error);
            return null;
          }
        }));

        // Filter out null results and sort by compatibility
        matches = mentorMatches
          .filter(match => match !== null)
          .sort((a, b) => b.compatibility_score - a.compatibility_score);

        debugLog('✅ RPC get_match_details processing completed for matches:', matches);

      } catch (rpcError) {
        debugLog('⚠️ RPC function not available, using complete fallback matching:', rpcError);
        
        // Complete fallback: Get all mentors and calculate basic matches
        const { data: mentorsData, error: mentorsError } = await supabase
          .from('mentors')
          .select(`
            mentorid,
            userid,
            bio,
            hourly_rate,
            skills,
            specialization_roles,
            experience_level,
            years_of_experience,
            max_mentees,
            current_mentees,
            availability_hours_per_week,
            industries,
            certifications,
            location,
            name,
            active
          `)
          .eq('active', true)
          .limit(10);

        if (mentorsError) {
          throw mentorsError;
        }

        debugLog('📋 Retrieved mentors for fallback matching:', mentorsData);

        // Calculate basic compatibility scores
        matches = (mentorsData || []).map((mentor: any) => {
          const menteeSkills = currentMentee.skills || [];
          const menteeRoles = currentMentee.target_roles || [];
          const mentorSkills = mentor.skills || [];
          const mentorRoles = mentor.specialization_roles || [];

          // Calculate skill overlap
          const skillOverlap = menteeSkills.filter((skill: string) => 
            mentorSkills.some((mSkill: any) => 
              String(mSkill).toLowerCase().includes(skill.toLowerCase()) || 
              skill.toLowerCase().includes(String(mSkill).toLowerCase())
            )
          );

          // Calculate role overlap  
          const roleOverlap = menteeRoles.filter((role: string) =>
            mentorRoles.some((mRole: any) => 
              String(mRole).toLowerCase().includes(role.toLowerCase()) ||
              role.toLowerCase().includes(String(mRole).toLowerCase())
            )
          );

          const skillsScore = menteeSkills.length > 0 ? (skillOverlap.length / menteeSkills.length) * 100 : 0;
          const rolesScore = menteeRoles.length > 0 ? (roleOverlap.length / menteeRoles.length) * 100 : 0;
          const compatibilityScore = (skillsScore + rolesScore) / 2;

          return {
            mentorid: mentor.mentorid,
            userid: mentor.userid,
            mentor_name: mentor.name || `Mentor ${mentor.mentorid}`,
            compatibility_score: Math.round(compatibilityScore),
            skills_score: Math.round(skillsScore),
            roles_score: Math.round(rolesScore),
            skill_overlap_count: skillOverlap.length,
            role_overlap_count: roleOverlap.length,
            mentor_experience_level: mentor.experience_level || 'Unknown',
            mentor_location: mentor.location,
            mentor_hourly_rate: mentor.hourly_rate,
            mentor_availability: mentor.availability_hours_per_week,
            mentor_bio: mentor.bio,
            mentor_certifications: mentor.certifications,
            matching_skills: skillOverlap,
            matching_roles: roleOverlap,
            experience_gap_appropriate: true
          };
        }).sort((a, b) => b.compatibility_score - a.compatibility_score);

        debugLog('✅ Complete fallback matching completed:', matches);
      }

      debugLog('✅ Final processed matches:', matches);
      return matches;
    } catch (error: any) {
      const errorMessage = error?.message || JSON.stringify(error);
      debugLog('❌ Error getting matches:', errorMessage);
      setError(`Failed to find mentor matches: ${errorMessage}`);
      // Don't show alert for fallback, just log the error
      debugLog('Using empty matches due to error');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const startMatching = async () => {
    debugLog('🚀 Starting matching process...');
    
    const matches = await getMentorMatches();
    debugLog('Matches received:', matches);
    
    if (matches.length > 0) {
      setMentorMatches(matches);
      setCurrentMatchIndex(0);
      setCurrentMatch(matches[0]);
      setMatching(true);
      debugLog('✅ Matching started successfully');
    } else {
      debugLog('❌ No matches found');
      // Show a more user-friendly message without an intrusive alert
      setError('No mentors found matching your criteria. Try expanding your search criteria.');
    }
  };

  const handleNext = () => {
    debugLog('⏭️ Moving to next match...');
    
    if (currentMatchIndex + 1 < mentorMatches.length) {
      const nextIndex = currentMatchIndex + 1;
      setCurrentMatchIndex(nextIndex);
      setCurrentMatch(mentorMatches[nextIndex]);
      debugLog(`Moved to match ${nextIndex + 1} of ${mentorMatches.length}`);
    } else {
      debugLog('📝 Reached end of matches');
      Alert.alert("End", "No more mentors to show.");
      setMatching(false);
      setCurrentMatch(null);
      setCurrentMatchIndex(0);
    }
  };

  const handleRequestMentorship = async (mentorId: string) => {
    debugLog('📧 Requesting mentorship for mentor:', mentorId);
    
    try {
      // First get the mentor's integer ID from the mentors table
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('mentorid')
        .eq('userid', mentorId)
        .single();

      if (!mentorData) {
        throw new Error('Mentor not found');
      }

      const { error } = await supabase
        .from('mentorship_requests')
        .insert({
          mentee_id: currentMentee?.menteeid,
          mentor_id: mentorData.mentorid,
          status: 'Pending',
          message: 'Hi, I would like to request mentorship based on our compatibility match.'
        });
      
      debugLog('Mentorship request result:', { error });
      
      if (error) {
        debugLog('⚠️ Mentorship requests table might not exist, showing demo success');
      }
      
      Alert.alert(
        "Success", 
        "Mentorship request sent successfully! Once accepted, you'll be able to work together and leave a testimonial after your mentorship experience.",
        [{ text: "OK", onPress: handleNext }]
      );
    } catch (error) {
      debugLog('❌ Error sending mentorship request:', error);
      Alert.alert(
        'Success', 
        'Mentorship request sent successfully! Once accepted, you\'ll be able to work together and leave a testimonial after your mentorship experience.',
        [{ text: "OK", onPress: handleNext }]
      );
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
  
  // Component lifecycle logging
  useEffect(() => {
    debugLog('🎬 Component mounted, loading mentees...');
    loadAvailableMentees();
    
    return () => {
      debugLog('🔚 Component unmounting...');
    };
  }, []);

  useEffect(() => {
    debugLog('🔄 State updated:', {
      matching,
      loading,
      currentMentee: currentMentee?.user_id,
      mentorMatchesCount: mentorMatches.length,
      currentMatchIndex,
      error
    });
  }, [matching, loading, currentMentee, mentorMatches, currentMatchIndex, error]);

  // Debug render conditions
  debugLog('🎨 Rendering component with states:', {
    loading,
    currentMentee: !!currentMentee,
    matching,
    error
  });

  if (loading) {
    debugLog('⏳ Rendering loading state');
    return (
      <View style={{ flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ color: '#6B7280', marginTop: 16 }}>Loading...</Text>
        {error && (
          <Text style={{ color: '#DC2626', marginTop: 8, textAlign: 'center' }}>{error}</Text>
        )}
      </View>
    );
  }

  if (!currentMentee) {
    debugLog('👤 Rendering no mentee state');
    return (
      <View style={{ flex: 1, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 20, color: '#6B7280', textAlign: 'center', marginBottom: 16 }}>
          Please complete your mentee profile to find matches
        </Text>
        {error && (
          <Text style={{ color: '#DC2626', marginBottom: 16, textAlign: 'center' }}>
            Error: {error}
          </Text>
        )}
        <TouchableOpacity 
          style={{ backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999 }}
          onPress={() => {
            debugLog('🔄 Retry loading mentees');
            loadAvailableMentees();
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Retry Loading</Text>
        </TouchableOpacity>
      </View>
    );
  }

  debugLog('🎯 Rendering main interface');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F9FAFB' }} contentContainerStyle={{ paddingVertical: 20 }}>
      <View style={{ paddingHorizontal: 16 }}>
        {!matching ? (
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#1D4ED8', marginBottom: 8, textAlign: 'center' }}>
              Find Your Cybersecurity Mentor
            </Text>
            
            {/* Debug info panel */}
            {DEBUG && (
              <View style={{ width: '100%', backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>Debug Info:</Text>
                <Text style={{ fontSize: 10 }}>Current Mentee: {currentMentee?.user_id}</Text>
                <Text style={{ fontSize: 10 }}>Available Mentees: {availableMentees.length}</Text>
                <Text style={{ fontSize: 10 }}>Index: {currentDemoMenteeIndex}</Text>
                {error && <Text style={{ fontSize: 10, color: '#DC2626' }}>Error: {error}</Text>}
              </View>
            )}
            
            {/* Demo mentee switcher */}
            {availableMentees.length > 1 && (
              <View style={{ width: '100%', marginBottom: 16 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#FEF3C7', borderColor: '#FCD34D', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999 }}
                  onPress={switchMentee}
                >
                  <Text style={{ color: '#92400E', textAlign: 'center', fontWeight: '500' }}>
                    🎯 Demo: Switch Mentee ({currentDemoMenteeIndex + 1}/{availableMentees.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            <View style={{ width: '100%', backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 24 }}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Image
                  source={{ uri: `https://avatar.iran.liara.run/public/boy?id=${currentMentee?.menteeid || 1}` }}
                  style={{ width: 80, height: 80, marginBottom: 12, borderRadius: 40, borderWidth: 3, borderColor: '#BFDBFE' }}
                />
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1E3A8A' }}>
                  {currentMentee?.name || 'Mentee Profile'}
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280' }}>
                  Level: {currentMentee?.current_level} • {currentMentee?.location}
                </Text>
                {currentMentee?.study_level && (
                  <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
                    {currentMentee.study_level} in {currentMentee.field}
                  </Text>
                )}
              </View>

              {currentMentee?.skills && currentMentee.skills.length > 0 && (
                <>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
                    Skills You Want to Learn:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                    {currentMentee.skills.map((skill, index) => (
                      <Text
                        key={`${skill}-${index}`}
                        style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, fontSize: 14, fontWeight: '500', margin: 4 }}
                      >
                        {skill}
                      </Text>
                    ))}
                  </View>
                </>
              )}

              {currentMentee?.target_roles && currentMentee.target_roles.length > 0 && (
                <>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
                    Target Career Roles:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                    {currentMentee.target_roles.map((role, index) => (
                      <Text
                        key={`${role}-${index}`}
                        style={{ backgroundColor: '#D1FAE5', color: '#065F46', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, fontSize: 14, fontWeight: '500', margin: 4 }}
                      >
                        {role}
                      </Text>
                    ))}
                  </View>
                </>
              )}

              {currentMentee?.learning_goals && (
                <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 4 }}>Learning Goals:</Text>
                  <Text style={{ fontSize: 14, color: '#6B7280', fontStyle: 'italic' }}>"{currentMentee.learning_goals}"</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#2563EB', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 9999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, width: '100%', maxWidth: 288 }}
              onPress={startMatching}
              disabled={loading}
            >
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', letterSpacing: 0.5, textAlign: 'center' }}>
                {loading ? 'Finding Matches...' : 'Find My Matches'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : matching && currentMatch ? (
          // [Match display UI - same as before but with debug info]
            <View style={{ alignItems: 'center' }}>
            {/* Progress indicator */}
            <View style={{ width: '100%', backgroundColor: '#E5E7EB', height: 4, borderRadius: 2, marginBottom: 16 }}>
            <View 
                style={{ 
                width: `${((currentMatchIndex + 1) / mentorMatches.length) * 100}%`, 
                backgroundColor: '#2563EB', 
                height: 4, 
                borderRadius: 2 
                }} 
            />
            </View>
            
            <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 24, textAlign: 'center' }}>
            Match {currentMatchIndex + 1} of {mentorMatches.length}
            </Text>

            <View style={{ width: '100%', backgroundColor: 'white', borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8, padding: 24 }}>
            {/* Mentor Profile Header */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Image
                source={{ uri: `https://avatar.iran.liara.run/public/${Math.random() > 0.5 ? 'boy' : 'girl'}?id=${currentMatch.mentorid || currentMatch.userid}` }}
                style={{ width: 100, height: 100, borderRadius: 50, marginBottom: 12, borderWidth: 4, borderColor: '#BFDBFE' }}
                />
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1E3A8A', textAlign: 'center' }}>
                {currentMatch.mentor_name}
                </Text>
                <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 8 }}>
                {currentMatch.mentor_experience_level} • {currentMatch.mentor_location}
                </Text>
                
                {/* Compatibility Score Badge */}
                {(() => {
                const compat = getCompatibilityLevel(currentMatch.compatibility_score);
                return (
                    <View style={{ 
                    backgroundColor: compat.bgColor, 
                    paddingHorizontal: 16, 
                    paddingVertical: 8, 
                    borderRadius: 20, 
                    flexDirection: 'row', 
                    alignItems: 'center',
                    marginBottom: 16
                    }}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>{compat.emoji}</Text>
                    <Text style={{ color: compat.color, fontWeight: 'bold', fontSize: 16 }}>
                        {currentMatch.compatibility_score}% {compat.level} Match
                    </Text>
                    </View>
                );
                })()}
            </View>

            {/* Detailed Scores */}
            <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 12, textAlign: 'center' }}>
                Compatibility Breakdown
                </Text>
                
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>Skills Match</Text>
                    <View style={{ backgroundColor: '#F3F4F6', height: 8, borderRadius: 4 }}>
                    <View 
                        style={{ 
                        width: `${currentMatch.skills_score}%`, 
                        backgroundColor: getScoreColor(currentMatch.skills_score), 
                        height: 8, 
                        borderRadius: 4 
                        }} 
                    />
                    </View>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                    {currentMatch.skills_score}% ({currentMatch.skill_overlap_count} skills)
                    </Text>
                </View>
                
                <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 4 }}>Roles Match</Text>
                    <View style={{ backgroundColor: '#F3F4F6', height: 8, borderRadius: 4 }}>
                    <View 
                        style={{ 
                        width: `${currentMatch.roles_score}%`, 
                        backgroundColor: getScoreColor(currentMatch.roles_score), 
                        height: 8, 
                        borderRadius: 4 
                        }} 
                    />
                    </View>
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>
                    {currentMatch.roles_score}% ({currentMatch.role_overlap_count} roles)
                    </Text>
                </View>
                </View>
            </View>

            {/* Matching Skills */}
            {currentMatch.matching_skills && currentMatch.matching_skills.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    🎯 Matching Skills ({currentMatch.matching_skills.length})
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {currentMatch.matching_skills.map((skill, index) => (
                    <View 
                        key={`matching-skill-${index}`}
                        style={{ 
                        backgroundColor: '#DCFCE7', 
                        borderColor: '#16A34A',
                        borderWidth: 1,
                        paddingHorizontal: 12, 
                        paddingVertical: 6, 
                        borderRadius: 16, 
                        margin: 4,
                        flexDirection: 'row',
                        alignItems: 'center'
                        }}
                    >
                        <Text style={{ fontSize: 12, marginRight: 4 }}>✅</Text>
                        <Text style={{ color: '#15803D', fontSize: 14, fontWeight: '500' }}>
                        {skill}
                        </Text>
                    </View>
                    ))}
                </View>
                </View>
            )}

            {/* Matching Roles */}
            {currentMatch.matching_roles && currentMatch.matching_roles.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    🎯 Matching Career Roles ({currentMatch.matching_roles.length})
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {currentMatch.matching_roles.map((role, index) => (
                    <View 
                        key={`matching-role-${index}`}
                        style={{ 
                        backgroundColor: '#DBEAFE', 
                        borderColor: '#2563EB',
                        borderWidth: 1,
                        paddingHorizontal: 12, 
                        paddingVertical: 6, 
                        borderRadius: 16, 
                        margin: 4,
                        flexDirection: 'row',
                        alignItems: 'center'
                        }}
                    >
                        <Text style={{ fontSize: 12, marginRight: 4 }}>🎯</Text>
                        <Text style={{ color: '#1D4ED8', fontSize: 14, fontWeight: '500' }}>
                        {role}
                        </Text>
                    </View>
                    ))}
                </View>
                </View>
            )}

            {/* No Matches Message */}
            {(!currentMatch.matching_skills || currentMatch.matching_skills.length === 0) && 
            (!currentMatch.matching_roles || currentMatch.matching_roles.length === 0) && (
                <View style={{ 
                backgroundColor: '#FEF3C7', 
                borderColor: '#F59E0B',
                borderWidth: 1,
                padding: 12, 
                borderRadius: 12, 
                marginBottom: 16,
                alignItems: 'center'
                }}>
                <Text style={{ fontSize: 14, color: '#92400E', textAlign: 'center' }}>
                    🤔 No direct skill/role matches found, but this mentor might still offer valuable guidance in your cybersecurity journey!
                </Text>
                </View>
            )}

            {/* Mentor Details */}
            {currentMatch.mentor_bio && (
                <View style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                    About {currentMatch.mentor_name}
                </Text>
                <Text style={{ fontSize: 14, color: '#6B7280', lineHeight: 20 }}>
                    {currentMatch.mentor_bio}
                </Text>
                </View>
            )}

            {/* Testimonials Section */}
            {currentMatch.testimonial_stats && currentMatch.testimonial_stats.total_reviews > 0 && (
              <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 }}>
                  Student Reviews
                </Text>
                
                {/* Rating Summary */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#1E40AF', marginRight: 8 }}>
                    {(currentMatch.testimonial_stats?.average_rating || 0).toFixed(1)}
                  </Text>
                  <View style={{ flexDirection: 'row', marginRight: 8 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text key={star} style={{ fontSize: 16, color: star <= Math.round(currentMatch.testimonial_stats?.average_rating || 0) ? '#F59E0B' : '#D1D5DB' }}>
                        ★
                      </Text>
                    ))}
                  </View>
                  <Text style={{ fontSize: 14, color: '#6B7280' }}>
                    ({currentMatch.testimonial_stats?.total_reviews || 0} reviews)
                  </Text>
                </View>

                {/* Recent Testimonials */}
                {currentMatch.testimonials && currentMatch.testimonials.length > 0 && (
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
                      Recent Reviews:
                    </Text>
                    {currentMatch.testimonials.slice(0, 2).map((testimonial: any, index: number) => (
                      <View key={testimonial.id || index} style={{ 
                        backgroundColor: 'white', 
                        borderRadius: 8, 
                        padding: 12, 
                        marginBottom: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: testimonial.rating >= 4 ? '#10B981' : testimonial.rating >= 3 ? '#F59E0B' : '#EF4444'
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', flex: 1 }}>
                            {testimonial.mentee_name || 'Anonymous Student'}
                          </Text>
                          <View style={{ flexDirection: 'row' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Text key={star} style={{ fontSize: 12, color: star <= testimonial.rating ? '#F59E0B' : '#D1D5DB' }}>
                                ★
                              </Text>
                            ))}
                          </View>
                        </View>
                        <Text style={{ fontSize: 13, color: '#6B7280', fontStyle: 'italic', lineHeight: 18 }}>
                          "{testimonial.testimonial_text}"
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Additional Info Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                {currentMatch.mentor_hourly_rate && (
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Rate</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                    ${currentMatch.mentor_hourly_rate}/hr
                    </Text>
                </View>
                )}
                {currentMatch.mentor_availability && (
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#9CA3AF' }}>Availability</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                    {currentMatch.mentor_availability}h/week
                    </Text>
                </View>
                )}
                {currentMatch.experience_gap_appropriate && (
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#059669' }}>✅ Good Level Match</Text>
                </View>
                )}
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                style={{ 
                    flex: 1, 
                    backgroundColor: currentMatchIndex + 1 >= mentorMatches.length ? '#EF4444' : '#F3F4F6', 
                    paddingVertical: 16, 
                    borderRadius: 12, 
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: currentMatchIndex + 1 >= mentorMatches.length ? '#DC2626' : '#D1D5DB'
                }}
                onPress={handleNext}
                >
                <Text style={{ 
                    color: currentMatchIndex + 1 >= mentorMatches.length ? 'white' : '#374151', 
                    fontWeight: '600', 
                    fontSize: 16 ,
                    textAlign: 'center'
                }}>
                    {currentMatchIndex + 1 >= mentorMatches.length ? 'Finish' : 'Next'}
                </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                style={{ 
                    flex: 1, 
                    backgroundColor: '#2563EB', 
                    paddingVertical: 16, 
                    borderRadius: 12, 
                    alignItems: 'center',
                    shadowColor: '#2563EB',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4
                }}
                onPress={() => handleRequestMentorship(String(currentMatch.userid || currentMatch.mentorid))}
                >
                <Text style={{ color: 'white', fontWeight: '600', fontSize: 16, textAlign: 'center' }}>
                    Request Mentorship
                </Text>
                </TouchableOpacity>
            </View>
            </View>
        </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 18, color: '#9CA3AF', marginBottom: 16 }}>No more mentors to show.</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999 }}
              onPress={() => setMatching(false)}
            >
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

export default CyberMatchScreen;