import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/initiliaze";
import { useRouter, useFocusEffect } from "expo-router";
import AntDesign from '@expo/vector-icons/AntDesign';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface User {
  id: number;
  created_at: string;
  user_type: string;
  photoURL: string;
  email: string;
  name: string;
  bio: string;
  Location: string;
  DOB: string;
  skills?: string[];
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch session and user data
  useEffect(() => {
    const fetchSessionAndUser = async () => {
      setLoading(true);
      const currentSession = await supabase.auth.getSession();
      setSession(currentSession.data.session);

      if (currentSession.data.session?.user) {
        const authUser = currentSession.data.session.user;
        const userEmail = authUser.email;

        // Fetch user data from users table
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", userEmail)
          .limit(1);

        if (!error && data && data.length > 0) {
          const userData = data[0];

          // Fetch skills from mentees table
          const { data: menteeData } = await supabase
            .from("mentees")
            .select("skills")
            .eq("user_id", authUser.id)
            .single();

          // Parse skills correctly
          let menteeSkills: string[] = [];
          if (menteeData?.skills) {
            menteeSkills = Array.isArray(menteeData.skills)
              ? menteeData.skills
              : menteeData.skills.replace(/[{}]/g, '').split(',').map((s: string) => s.trim());
          }

          console.log("Fetched mentee skills:", menteeSkills); // ✅ See skills in console

          setUser({
            id: userData.id,
            created_at: userData.created_at,
            user_type: userData.user_type,
            photoURL: userData.photoURL || "",
            email: userData.email,
            name: userData.name,
            bio: userData.bio || "",
            Location: userData.location || "",
            DOB: userData.DOB || "",
            skills: menteeSkills,
          });
        } else {
          setUser({
            id: 0,
            created_at: new Date().toISOString(),
            user_type: "Student",
            photoURL: "",
            email: userEmail || "No email",
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || "User",
            bio: "Profile not set up yet",
            Location: "Not specified",
            DOB: "",
            skills: [],
          });
        }
      }

      setLoading(false);
    };

    fetchSessionAndUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Refresh profile when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshProfile = async () => {
        if (session?.user?.email) {
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", session.user.email)
            .limit(1);

          if (!error && data && data.length > 0) {
            const userData = data[0];
            const { data: menteeData } = await supabase
              .from("mentees")
              .select("skills")
              .eq("user_id", session.user.id)
              .single();

            let menteeSkills: string[] = [];
            if (menteeData?.skills) {
              menteeSkills = Array.isArray(menteeData.skills)
                ? menteeData.skills
                : menteeData.skills.replace(/[{}]/g, '').split(',').map((s: string) => s.trim());
            }

            setUser({
              id: userData.id,
              created_at: userData.created_at,
              user_type: userData.user_type,
              photoURL: userData.photoURL || "",
              email: userData.email,
              name: userData.name,
              bio: userData.bio || "",
              Location: userData.location || "",
              DOB: userData.DOB || "",
              skills: menteeSkills,
            });
          }
        }
      };
      refreshProfile();
    }, [session])
  );

  const logoutFunction = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handlePress = (itemName: string) => {
    if (itemName === "Edit Profile") {
      router.push("/updateProfile");
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className='pt-4 pb-8'>
        {loading ? (
          <>
            <ActivityIndicator className="mt-8" />
            <Text className="text-center mt-4 text-gray-600">Loading profile...</Text>
          </>
        ) : user ? (
          <>
            <View className="items-center mt-6 mb-2">
              {user.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  className="w-24 h-24 rounded-full mb-2"
                />
              ) : (
                <View className="w-24 h-24 rounded-full bg-gray-300 mb-2 items-center justify-center">
                  <Ionicons name="person" size={48} color="white" />
                </View>
              )}
              <Text className="text-2xl font-bold">{user.name}</Text>
              <Text className="text-base text-gray-600">{user.email}</Text>
              <Text className="text-base text-gray-600">{user.user_type}</Text>
            </View>

            <Text className='text-xl font-bold mt-6 ml-6 md:ml-8'>Profile Details</Text>
            <View className='items-center mt-2'>
              <TouchableOpacity
                onPress={() => handlePress("Edit Profile")}
                className='flex-row items-center mt-2 p-4 bg-gray-50 border border-gray-200 w-11/12 md:w-5/6 rounded-t-lg active:bg-gray-200'
              >
                <AntDesign name='edit' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>Edit Profile</Text>
                <AntDesign name='right' size={20} className='ml-auto' color="gray" />
              </TouchableOpacity>

              {/* Email */}
              <View className='flex-row items-center p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6'>
                <AntDesign name='mail' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>{user.email}</Text>
              </View>

              {/* User Type */}
              <View className='flex-row items-center p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6'>
                <MaterialIcons name='person' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>{user.user_type}</Text>
              </View>

              {/* Bio */}
              <View className='flex-row items-center p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6'>
                <Ionicons name='information-circle-outline' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>{user.bio || "No bio"}</Text>
              </View>

              {/* Skills: Only visible for mentees */}
              {user.user_type.toLowerCase() === "mentee" && (
                <View
                  className='flex-row items-start p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6'
                  style={{ paddingRight: 16 }}
                >
                  <AntDesign name='star' size={24} className='mr-4 mt-1' color="black" />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', flexShrink: 1 }}>
                    {user.skills && user.skills.length > 0 ? (
                      user.skills.map((skill, index) => (
                        <Text
                          key={index}
                          style={{
                            marginRight: 24,
                            marginBottom: 8,
                            fontSize: 14,
                            color: '#1f2937',
                          }}
                        >
                          {skill}
                        </Text>
                      ))
                    ) : (
                      <Text style={{ color: '#6b7280' }}>No skills added</Text>
                    )}
                  </View>
                </View>
              )}

              {/* DOB */}
              <View className='flex-row items-center p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6'>
                <AntDesign name='calendar' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>{user.DOB || "Date of Birth"}</Text>
              </View>

              {/* Location */}
              <View className='flex-row items-center p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6 rounded-b-lg'>
                <Ionicons name='location-outline' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>{user.Location || "Location"}</Text>
              </View>
            </View>

            {/* Sign Out */}
            <View className='items-center mt-8'>
              <TouchableOpacity
                onPress={logoutFunction}
                className='flex-row items-center justify-center mt-4 p-4 bg-red-500 w-11/12 md:w-5/6 rounded-lg active:bg-red-600'
              >
                <MaterialIcons name='logout' size={24} className='mr-2' color="white" />
                <Text className='text-lg text-white font-semibold'>
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View className="items-center mt-8">
            <Text className="text-center text-red-500 mb-4">Could not load profile.</Text>
            <Text className="text-center text-gray-600 mb-4">
              {session ? 'Logged in but no profile found' : 'No active session'}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                setLoading(true);
                setUser(null);
                const currentSession = await supabase.auth.getSession();
                setSession(currentSession.data.session);
                setLoading(false);
              }}
              className="bg-blue-500 px-4 py-2 rounded"
            >
              <Text className="text-white">Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
