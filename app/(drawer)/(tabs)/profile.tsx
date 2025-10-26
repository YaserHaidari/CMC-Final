import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/initiliaze";
import { useRouter, useFocusEffect } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import AntDesign from "@expo/vector-icons/AntDesign";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", userEmail)
          .limit(1);

        if (!error && data && data.length > 0) {
          const userData = data[0];

          const { data: menteeData } = await supabase
            .from("mentees")
            .select("skills")
            .eq("user_id", authUser.id)
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

  // Refresh on focus
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

  // 🎨 Coffee-themed color palette
  const colors = {
    background: "#F5E6D3", // latte beige
    card: "#FFF8F0",       // creamy white
    accent: "#C59D5F",     // cappuccino gold
    textDark: "#3E2723",   // espresso brown
    textLight: "#6D4C41",  // mocha brown
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View className="pt-14 pb-8">
        {loading ? (
          <>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text className="text-center mt-4" style={{ color: colors.textLight }}>
              Brewing your profile...
            </Text>
          </>
        ) : user ? (
          <>
            {/* ☕ Profile Header */}
            <View className="items-center mt-6 mb-2">
              {user.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  className="w-28 h-28 rounded-full mb-2"
                />
              ) : (
                <View className="w-28 h-28 rounded-full bg-[#BCAAA4] mb-2 items-center justify-center">
                  <Ionicons name="person" size={54} color="#FFF8F0" />
                </View>
              )}
              <View className="flex-row items-center">
                <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.textDark, marginRight: 8 }}>
                  {user.name}
                </Text>
                {user.user_type === "mentee" ? (
                  <Ionicons name="school-outline" size={22} color={colors.accent} />
                ) : (
                  <Ionicons name="person-outline" size={22} color={colors.accent} />
                )}
              </View>
              <Text style={{ color: colors.textLight, fontStyle: "italic", marginTop: 4 }}>
                {user.email}
              </Text>
            </View>

            {/* ☕ My Details */}
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textDark, marginTop: 24, marginLeft: 20 }}>
              My Details
            </Text>
            <View className="items-center mt-3">
              {[
                {
                  icon: "information-circle-outline",
                  label: user.bio || "No bio",
                },
                ...(user.user_type.toLowerCase() === "mentee"
                  ? [{
                      icon: "star-outline",
                      label: user.skills?.length
                        ? user.skills.join(", ")
                        : "No skills added",
                    }]
                  : []),
                { icon: "calendar-outline", label: user.DOB || "Date of Birth" },
                { icon: "location-outline", label: user.Location || "Location" },
              ].map((item, index) => (
                <View
                  key={index}
                  className="flex-row items-center p-4 w-11/12 rounded-2xl mb-3"
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.accent,
                    shadowColor: "#000",
                    shadowOpacity: 0.1,
                    shadowOffset: { width: 0, height: 2 },
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Ionicons name={item.icon as any} size={24} color={colors.accent} />
                  <Text style={{ fontSize: 16, color: colors.textDark, marginLeft: 12, flex: 1 }}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* ☕ Actions */}
            <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textDark, marginTop: 28, marginLeft: 20 }}>
              Actions
            </Text>

            <TouchableOpacity
              onPress={() => handlePress("Edit Profile")}
              className="flex-row items-center m-4 p-5 w-11/12 rounded-2xl"
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.accent,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <AntDesign name="setting" size={24} color={colors.accent} />
              <Text style={{ fontSize: 16, color: colors.textDark, marginLeft: 12, flex: 1, fontWeight: "600" }}>
                Edit Profile
              </Text>
              <AntDesign name="right" size={20} color={colors.textLight} />
            </TouchableOpacity>

            <View className="items-center mt-5">
              <TouchableOpacity
                onPress={logoutFunction}
                className="flex-row items-center justify-center mt-1 p-4 w-11/12 rounded-2xl"
                style={{
                  backgroundColor: "#6B4F3B",
                  shadowColor: "#000",
                  shadowOpacity: 0.2,
                  shadowOffset: { width: 0, height: 3 },
                  shadowRadius: 5,
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="logout" size={24} color="#FFF8F0" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 16, color: "#FFF8F0", fontWeight: "600" }}>
                  Log Out
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View className="items-center mt-8">
            <Text style={{ color: "red", marginBottom: 4 }}>Could not load profile.</Text>
            <Text style={{ color: colors.textLight, marginBottom: 10 }}>
              {session ? "Logged in but no profile found" : "No active session"}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                setLoading(true);
                setUser(null);
                const currentSession = await supabase.auth.getSession();
                setSession(currentSession.data.session);
                setLoading(false);
              }}
              className="px-4 py-2 rounded"
              style={{ backgroundColor: colors.accent }}
            >
              <Text style={{ color: "#FFF8F0" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
