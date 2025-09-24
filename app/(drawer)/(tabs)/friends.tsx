import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { supabase } from "@/lib/supabase/initiliaze";
import { router } from "expo-router";

type Friend = {
  id: number;
  name: string;
  email: string;
  user_type: string;
  auth_id: string;
  status: string;
};

export default function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentAuthId, setCurrentAuthId] = useState<string | null>(null);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  // 1️⃣ Get logged-in user's info
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserEmail(user.email ?? null);
        setCurrentAuthId(user.id);
        console.log("Current Auth ID:", user.id);
      } catch (err: any) {
        console.error("Error fetching user:", err);
        Alert.alert("Error", "Failed to fetch current user.");
        setCurrentAuthId(null);
      }
    }

    fetchCurrentUser();
  }, []);

  // 2️⃣ Fetch blocked users (if blocks table exists and uses auth IDs)
  useEffect(() => {
    if (!currentAuthId) return;

    async function fetchBlocked() {
      try {
        const { data: blocksData, error } = await supabase
          .from("blocks")
          .select("blocked_auth_id")
          .eq("blocker_auth_id", currentAuthId);

        if (error) {
          console.log("Blocks table might not exist or have different schema:", error.message);
          setBlockedIds([]);
          return;
        }

        setBlockedIds(blocksData?.map((b: any) => b.blocked_auth_id) || []);
      } catch (err: any) {
        console.error("Error fetching blocked users:", err);
        setBlockedIds([]);
      }
    }

    fetchBlocked();
  }, [currentAuthId]);

  // 3️⃣ Fetch users with approved mentorship requests
  useEffect(() => {
    async function fetchFriends() {
      if (!currentUserEmail || !currentAuthId) return;

      try {
        // Get current user's ID to determine if they're a mentor or mentee
        const { data: currentUserData, error: currentUserError } = await supabase
          .from("users")
          .select("id, user_type")
          .eq("email", currentUserEmail)
          .single();

        if (currentUserError || !currentUserData) {
          throw new Error("Could not find current user");
        }

        let approvedFriends: Friend[] = [];

        if (currentUserData.user_type === "Mentor") {
          // If current user is a mentor, show mentees with approved requests
          // First get mentor's mentorid using auth_user_id
          const { data: mentorData, error: mentorLookupError } = await supabase
            .from("mentors")
            .select("mentorid")
            .eq("user_id", currentAuthId)
            .single();

          if (mentorLookupError || !mentorData) {
            console.log("Could not find mentor profile:", mentorLookupError);
            setFriends([]);
            return;
          }

          // Get accepted mentorship requests for this mentor
          const { data: requestsData, error: requestsError } = await supabase
            .from("mentorship_requests")
            .select("mentee_id, status")
            .eq("mentor_id", mentorData.mentorid)
            .eq("status", "Accepted");

          if (requestsError || !requestsData || requestsData.length === 0) {
            console.log("No accepted mentorship requests found:", requestsError);
            setFriends([]);
            return;
          }

          // Get mentee details and their user info
          const menteePromises = requestsData.map(async (req) => {
            try {
              // Get mentee data
              const { data: menteeData, error: menteeError } = await supabase
                .from("mentees")
                .select("user_id")
                .eq("menteeid", req.mentee_id)
                .single();

              if (menteeError || !menteeData) return null;

              // Get user data using auth_user_id
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id, name, email, user_type, auth_user_id")
                .eq("auth_user_id", menteeData.user_id)
                .single();

              if (userError || !userData) return null;

              return {
                id: userData.id,
                name: userData.name ?? "Unknown User",
                email: userData.email ?? "",
                user_type: userData.user_type ?? "Student",
                auth_id: userData.auth_user_id,
                status: req.status
              };
            } catch (error) {
              console.error("Error fetching mentee data:", error);
              return null;
            }
          });

          const menteeResults = await Promise.all(menteePromises);
          approvedFriends = menteeResults.filter(result => result !== null) as Friend[];
        } else {
          // If current user is a mentee, show mentors with approved requests
          // First get mentee's menteeid using auth_user_id
          const { data: menteeData, error: menteeLookupError } = await supabase
            .from("mentees")
            .select("menteeid")
            .eq("user_id", currentAuthId)
            .single();

          if (menteeLookupError || !menteeData) {
            console.log("Could not find mentee profile:", menteeLookupError);
            setFriends([]);
            return;
          }

          // Get accepted mentorship requests for this mentee
          const { data: requestsData, error: requestsError } = await supabase
            .from("mentorship_requests")
            .select("mentor_id, status")
            .eq("mentee_id", menteeData.menteeid)
            .eq("status", "Accepted");

          if (requestsError || !requestsData || requestsData.length === 0) {
            console.log("No accepted mentorship requests found:", requestsError);
            setFriends([]);
            return;
          }

          // Get mentor details and their user info
          const mentorPromises = requestsData.map(async (req) => {
            try {
              // Get mentor data
              const { data: mentorData, error: mentorError } = await supabase
                .from("mentors")
                .select("user_id")
                .eq("mentorid", req.mentor_id)
                .single();

              if (mentorError || !mentorData) return null;

              // Get user data using auth_user_id
              const { data: userData, error: userError } = await supabase
                .from("users")
                .select("id, name, email, user_type, auth_user_id")
                .eq("auth_user_id", mentorData.user_id)
                .single();

              if (userError || !userData) return null;

              return {
                id: userData.id,
                name: userData.name ?? "Unknown User",
                email: userData.email ?? "",
                user_type: userData.user_type ?? "Mentor",
                auth_id: userData.auth_user_id,
                status: req.status
              };
            } catch (error) {
              console.error("Error fetching mentor data:", error);
              return null;
            }
          });

          const mentorResults = await Promise.all(mentorPromises);
          approvedFriends = mentorResults.filter(result => result !== null) as Friend[];
        }

        setFriends(approvedFriends);
      } catch (err: any) {
        console.error("Error fetching approved mentorship connections:", err);
        Alert.alert("Error", "Failed to fetch your mentorship connections.");
      }
    }

    fetchFriends();
  }, [currentUserEmail, currentAuthId]);

  // 4️⃣ Handle block/unblock
  async function toggleBlock(friend: Friend) {
    if (!currentAuthId) {
      Alert.alert("Error", "Current user not found.");
      return;
    }

    try {
      const isBlocked = blockedIds.includes(friend.auth_id);

      if (isBlocked) {
        // Unblock
        await supabase
          .from("blocks")
          .delete()
          .match({ blocker_auth_id: currentAuthId, blocked_auth_id: friend.auth_id });
        setBlockedIds((prev) => prev.filter((id) => id !== friend.auth_id));
        Alert.alert("Success", `${friend.name} has been unblocked.`);
      } else {
        // Block
        await supabase.from("blocks").insert([
          {
            blocker_auth_id: currentAuthId,
            blocked_auth_id: friend.auth_id,
            blocked_at: new Date().toISOString(),
          },
        ]);
        setBlockedIds((prev) => [...prev, friend.auth_id]);
        Alert.alert("Success", `${friend.name} has been blocked.`);
      }
    } catch (err: any) {
      console.error("Block error:", err);
      Alert.alert("Info", "Block/unblock functionality is not fully configured yet.");
    }
  }

  // 5️⃣ Show block/unblock menu dynamically
  function showBlockMenu(friend: Friend) {
    const isBlocked = blockedIds.includes(friend.auth_id);
    Alert.alert(friend.name, isBlocked ? "Unblock this user?" : "Block this user?", [
      { text: "Cancel", style: "cancel" },
      { text: isBlocked ? "Unblock" : "Block", onPress: () => toggleBlock(friend) },
    ]);
  }

  // 6️⃣ Handle chat tap
  function handleChat(friend: Friend) {
    if (blockedIds.includes(friend.auth_id)) {
      Alert.alert("Blocked", "You cannot chat with this friend until you unblock them.");
      return;
    }
    router.push({ pathname: "/chat", params: { userId: friend.id, userName: friend.name } });
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>My Connections</Text>
      {friends.length === 0 ? (
        <Text style={styles.emptyText}>No approved mentorship connections yet.</Text>
      ) : (
        friends.map((friend) => (
          <View key={`${friend.user_type}_${friend.id}`} style={styles.card}>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
              onPress={() => handleChat(friend)}
            >
              <Text style={styles.avatar}>{friend.name[0]?.toUpperCase()}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{friend.name}</Text>
                <Text style={styles.email}>{friend.email}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={styles.userType}>{friend.user_type}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>✓ {friend.status}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => showBlockMenu(friend)} style={{ padding: 8 }}>
              <Text style={{ fontSize: 20 }}>⋮</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", paddingTop: 32, paddingHorizontal: 16 },
  header: { fontSize: 26, fontWeight: "bold", marginBottom: 18, color: "#222", letterSpacing: 0.5 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 40, fontSize: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563eb",
    color: "#fff",
    fontWeight: "bold",
    fontSize: 20,
    textAlign: "center",
    textAlignVertical: "center",
    marginRight: 16,
    overflow: "hidden",
    lineHeight: 44,
  },
  name: { fontSize: 17, fontWeight: "600", color: "#222" },
  email: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  userType: { fontSize: 11, color: "#9ca3af", marginTop: 1, fontWeight: "500", marginRight: 8 },
  statusBadge: {
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    color: "#166534",
    fontWeight: "600",
  },
});
