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
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", currentSession.data.session.user.email)
          .single();
        if (!error) setUser(data);
      }
      setLoading(false);
    }

    fetchSessionAndUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          supabase
            .from("users")
            .select("*")
            .eq("email", session.user.email)
            .single()
            .then(({ data, error }) => {
              if (!error) setUser(data);
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
        {loading ? (
          <ActivityIndicator className="mt-8" />
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
          <Text className="text-center text-red-500 mt-8">Could not load profile.</Text>
        )}
      </View>
    </ScrollView>
  );
}