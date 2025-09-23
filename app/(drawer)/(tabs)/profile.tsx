import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/initiliaze";
import { useRouter } from "expo-router";
import AntDesign from '@expo/vector-icons/AntDesign';
import Fontisto from '@expo/vector-icons/Fontisto';
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
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch session and user data
  useEffect(() => {
    async function fetchSessionAndUser() {
      setLoading(true);
      const currentSession = await supabase.auth.getSession();
      setSession(currentSession.data.session);

      if (currentSession.data.session?.user) {
        const authUser = currentSession.data.session.user;
        const userEmail = authUser.email;
        const userId = authUser.id;
        
        console.log('Auth User Info:', { userId, userEmail });
        
        // Try to find user by email first
        let { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", userEmail)
          .limit(1);

        console.log('User fetch by email result:', { data, error: error?.message, dataLength: data?.length });
        
        // If no user found by email, try to find all users to debug
        if (!data || data.length === 0) {
          console.log('No user found by email, checking all users...');
          const { data: allUsers, error: allError } = await supabase
            .from("users")
            .select("id, email, name")
            .limit(5);
          console.log('Sample users in database:', allUsers, 'Error:', allError?.message);
        }
        
        if (!error && data && data.length > 0) {
          const userData = data[0]; // Take the first user if multiple exist
          console.log('Setting user data:', userData);
          // Map the database fields to your User interface
          setUser({
            id: userData.id,
            created_at: userData.created_at,
            user_type: userData.user_type,
            photoURL: userData.photoURL || "",
            email: userData.email,
            name: userData.name,
            bio: userData.bio || "",
            Location: userData.location || "", // Note: interface uses uppercase L
            DOB: userData.DOB || ""
          });
        } else {
          console.log('User not found in users table, creating fallback profile');
          // Create a fallback user profile using auth data
          setUser({
            id: 0, // Temporary ID
            created_at: new Date().toISOString(),
            user_type: "Student", // Default type
            photoURL: "",
            email: userEmail || "No email",
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || "User",
            bio: "Profile not set up yet",
            Location: "Not specified",
            DOB: ""
          });
        }
      }
      setLoading(false);
    }

    fetchSessionAndUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          const userEmail = session.user.email;
          
          // Fetch from users table using email
          supabase
            .from("users")
            .select("*")
            .eq("email", userEmail)
            .limit(1)
            .then(({ data, error }) => {
              if (!error && data && data.length > 0) {
                const userData = data[0];
                setUser({
                  id: userData.id,
                  created_at: userData.created_at,
                  user_type: userData.user_type,
                  photoURL: userData.photoURL || "",
                  email: userData.email,
                  name: userData.name,
                  bio: userData.bio || "",
                  Location: userData.location || "",
                  DOB: userData.DOB || ""
                });
              }
            });
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Logout and navigation
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
        {/* Debug info - remove in production */}
        <View className="bg-blue-50 p-2 m-4 rounded">
          <Text className="text-xs text-blue-800">
            Debug: Loading={loading.toString()}, User={user ? 'Found' : 'Not Found'}, Session={session ? 'Yes' : 'No'}
          </Text>
        </View>
        
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

            <Text className='text-xl font-bold mt-6 ml-6 md:ml-8'>
              Profile Details
            </Text>
            <View className='items-center mt-2'>
              <TouchableOpacity
                onPress={() => handlePress("Edit Profile")}
                className='flex-row items-center mt-2 p-4 bg-gray-50 border border-gray-200 w-11/12 md:w-5/6 rounded-t-lg active:bg-gray-200'
              >
                <AntDesign name='edit' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>
                  Edit Profile
                </Text>
                <AntDesign name='right' size={20} className='ml-auto' color="gray" />
              </TouchableOpacity>
              <View className='flex-row items-center p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6 active:bg-gray-200'>
                <Fontisto name='email' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>
                  {user.email}
                </Text>
              </View>
              <View className='flex-row items-center p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6 active:bg-gray-200'>
                <MaterialIcons name='person' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>
                  {user.user_type}
                </Text>
              </View>
              <View className='flex-row items-center p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6 active:bg-gray-200'>
                <Ionicons name='information-circle-outline' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>
                  {user.bio || "No bio"}
                </Text>
              </View>
              <View className='flex-row items-center p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6 active:bg-gray-200'>
                <Fontisto name='date' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>
                  {user.DOB || "Date of Birth"}
                </Text>
              </View>
              <View className='flex-row items-center p-4 bg-gray-50 border-x border-b border-gray-200 w-11/12 md:w-5/6 rounded-b-lg active:bg-gray-200'>
                <Ionicons name='location-outline' size={24} className='ml-2' color="black" />
                <Text className='text-lg ml-4 flex-1'>
                  {user.Location || "Location"}
                </Text>
              </View>
            </View>

            <View className='items-center mt-8'>
              <TouchableOpacity
                onPress={logoutFunction}
                className='flex-row items-center justify-center mt-4 p-4 bg-red-500 w-11/12 md:w-5/6 rounded-lg active:bg-red-600'
              >
                <MaterialIcons name='logout' size={24} className='mr-2' color="white" />
                <Text className='text-lg text-white font-semibold'>
                  Sign Out
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
              onPress={() => {
                setLoading(true);
                setUser(null);
                // Retry loading by calling the fetch function again
                const retry = async () => {
                  const currentSession = await supabase.auth.getSession();
                  setSession(currentSession.data.session);
                  if (currentSession.data.session?.user) {
                    const userEmail = currentSession.data.session.user.email;
                    const { data } = await supabase
                      .from("users")
                      .select("*")
                      .eq("email", userEmail)
                      .limit(1);
                    
                    if (data && data.length > 0) {
                      setUser({
                        id: data[0].id,
                        created_at: data[0].created_at,
                        user_type: data[0].user_type,
                        photoURL: data[0].photoURL || "",
                        email: data[0].email,
                        name: data[0].name,
                        bio: data[0].bio || "",
                        Location: data[0].location || "",
                        DOB: data[0].DOB || ""
                      });
                    }
                  }
                  setLoading(false);
                };
                retry();
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