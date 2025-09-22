import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { supabase } from "@/lib/supabase/initiliaze";
import { router } from "expo-router";

type Friend = {
  id: number;
  name: string;
  email: string;
  role: "mentor" | "mentee";
  adminId: number | null;
};

export default function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);
  const [blockedIds, setBlockedIds] = useState<number[]>([]);

  // 1️⃣ Get logged-in user's email and adminId
  useEffect(() => {
    async function fetchCurrentAdmin() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserEmail(user.email ?? null);

        // Try to get admin by email
        let { data: adminRecord, error } = await supabase
          .from("admin")
          .select("adminid")
          .eq("email", user.email)
          .maybeSingle();

        if (error) throw error;

        // Fallback to mentor_id or Menteeid if email not found
        if (!adminRecord) {
          const { data, error: fallbackError } = await supabase
            .from("admin")
            .select("adminid")
            .or(`mentor_id.eq.${user.id},Menteeid.eq.${user.id}`)
            .maybeSingle();

          if (fallbackError) throw fallbackError;
          adminRecord = data;
        }

        setCurrentAdminId(adminRecord?.adminid ?? null);
        console.log("Current Admin ID:", adminRecord?.adminid);
      } catch (err: any) {
        console.error("Error fetching admin:", err);
        Alert.alert("Error", "Failed to fetch current admin.");
        setCurrentAdminId(null);
      }
    }

    fetchCurrentAdmin();
  }, []);

  // 2️⃣ Fetch blocked users
  useEffect(() => {
    if (!currentAdminId) return;

    async function fetchBlocked() {
      try {
        const { data: blocksData, error } = await supabase
          .from("blocks")
          .select("blockedid")
          .eq("blockerid", currentAdminId);

        if (error) throw error;

        setBlockedIds(blocksData?.map((b: any) => b.blockedid) || []);
      } catch (err: any) {
        console.error("Error fetching blocked users:", err);
      }
    }

    fetchBlocked();
  }, [currentAdminId]);

  // 3️⃣ Fetch mentors + mentees
  useEffect(() => {
    async function fetchFriends() {
      if (!currentUserEmail) return;

      try {
        const allFriends: Friend[] = [];

        // --- Fetch mentees ---
        const { data: menteesData, error: menteesError } = await supabase
          .from("mentees")
          .select("menteeid, name, email");
        if (menteesError) throw menteesError;

        for (let m of menteesData || []) {
          if (m.email === currentUserEmail) continue;

          // Resolve adminId
          const { data: adminRecord } = await supabase
            .from("admin")
            .select("adminid")
            .eq("Menteeid", m.menteeid)
            .limit(1);

          allFriends.push({
            id: m.menteeid,
            name: m.name ?? "Unknown Mentee",
            email: m.email ?? "",
            role: "mentee",
            adminId: adminRecord?.[0]?.adminid ?? null,
          });
        }

        // --- Fetch mentors ---
        const { data: mentorsData, error: mentorsError } = await supabase
          .from("mentors")
          .select("mentorid, name, email");
        if (mentorsError) throw mentorsError;

        for (let m of mentorsData || []) {
          if (m.email === currentUserEmail) continue;

          // Resolve adminId
          const { data: adminRecord } = await supabase
            .from("admin")
            .select("adminid")
            .eq("mentor_id", m.mentorid)
            .limit(1);

          allFriends.push({
            id: m.mentorid,
            name: m.name ?? "Unknown Mentor",
            email: m.email ?? "",
            role: "mentor",
            adminId: adminRecord?.[0]?.adminid ?? null,
          });
        }

        setFriends(allFriends);
      } catch (err: any) {
        console.error("Error fetching friends:", err);
        Alert.alert("Error", "Failed to fetch friends.");
      }
    }

    fetchFriends();
  }, [currentUserEmail]);

  // 4️⃣ Handle block/unblock
  async function toggleBlock(friend: Friend) {
    if (!currentAdminId) {
      Alert.alert("Error", "Current admin not found.");
      return;
    }

    if (!friend.adminId) {
      Alert.alert("Error", "Could not find adminId for this friend.");
      return;
    }

    try {
      const isBlocked = blockedIds.includes(friend.adminId);

      if (isBlocked) {
        // Unblock
        await supabase
          .from("blocks")
          .delete()
          .match({ blockerid: currentAdminId, blockedid: friend.adminId });
        setBlockedIds((prev) => prev.filter((id) => id !== friend.adminId));
      } else {
        // Block
        await supabase.from("blocks").insert([
          {
            blockerid: currentAdminId,
            blockedid: friend.adminId,
            blockedat: new Date().toISOString(),
          },
        ]);
        if (friend.adminId !== null) {
          if (friend.adminId !== null) {
            setBlockedIds((prev) => friend.adminId !== null ? [...prev, friend.adminId] : prev);
          }
        }
      }
    } catch (err: any) {
      console.error("Block error:", err);
      Alert.alert("Error", "Failed to update block status: " + err.message);
    }
  }

  // 5️⃣ Show block/unblock menu dynamically
  function showBlockMenu(friend: Friend) {
    if (!friend.adminId) return;
    const isBlocked = blockedIds.includes(friend.adminId);
    Alert.alert(friend.name, isBlocked ? "Unblock this user?" : "Block this user?", [
      { text: "Cancel", style: "cancel" },
      { text: isBlocked ? "Unblock" : "Block", onPress: () => toggleBlock(friend) },
    ]);
  }

  // 6️⃣ Handle chat tap
  function handleChat(friend: Friend) {
    if (!friend.adminId) return;
    if (blockedIds.includes(friend.adminId)) {
      Alert.alert("Blocked", "You cannot chat with this friend until you unblock them.");
      return;
    }
    router.push({ pathname: "/chat", params: { userId: friend.id, userName: friend.name } });
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Friends</Text>
      {friends.length === 0 ? (
        <Text style={styles.emptyText}>No friends found.</Text>
      ) : (
        friends.map((friend) => (
          <View key={`${friend.role}_${friend.id}`} style={styles.card}>
            <TouchableOpacity
              style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
              onPress={() => handleChat(friend)}
            >
              <Text style={styles.avatar}>{friend.name[0]?.toUpperCase()}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{friend.name}</Text>
                <Text style={styles.email}>{friend.email}</Text>
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
});
