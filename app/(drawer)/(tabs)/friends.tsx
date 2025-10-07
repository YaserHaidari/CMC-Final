import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
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

// Dropdown component (frontend-only behavior)
function FriendOptions({
  friend,
  isOpen,
  onToggle,
  onBlock,
  onTestimonial,
}: {
  friend: Friend;
  isOpen: boolean;
  onToggle: () => void;
  onBlock: (f: Friend) => void;
  onTestimonial: (f: Friend) => void;
}) {
  return (
    <View className="relative items-center">
      {/* Options button */}
      <TouchableOpacity
        onPress={onToggle}
        className="p-2"
        accessibilityLabel={`options-${friend.auth_id}`}
      >
        <Text className="text-xl">⋮</Text>
      </TouchableOpacity>

      {/* Dropdown menu */}
      {isOpen && (
        <View
          className="absolute right-0 top-12 w-44 bg-white rounded-lg shadow-lg z-50"
          style={{ elevation: 10 }} // ensure Android shadow
        >
          <TouchableOpacity
            className="px-4 py-3 border-b border-gray-100"
            onPress={() => {
              onToggle(); // close menu first (UI)
              onBlock(friend); // call your existing block logic
            }}
            accessibilityLabel={`block-${friend.auth_id}`}
          >
            <Text className="text-sm text-gray-800">Block / Unblock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="px-4 py-3"
            onPress={() => {
              onToggle(); // close menu
              onTestimonial(friend);
            }}
            accessibilityLabel={`testimonial-${friend.auth_id}`}
          >
            <Text className="text-sm text-gray-800">Write Testimonial</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function Friends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [currentAuthId, setCurrentAuthId] = useState<string | null>(null);
  const [blockedByMe, setBlockedByMe] = useState<string[]>([]);
  const [blockedMe, setBlockedMe] = useState<string[]>([]);

  // UI: which friend's menu is open (auth_id) — frontend only
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const toggleMenu = (authId: string) =>
    setOpenMenuFor((prev) => (prev === authId ? null : authId));

  // Fetch logged-in user
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserEmail(user.email ?? null);
        setCurrentAuthId(user.id);
      } catch (err: any) {
        console.error("Error fetching user:", err);
        Alert.alert("Error", "Failed to fetch current user.");
        setCurrentAuthId(null);
      }
    }
    fetchCurrentUser();
  }, []);

  // Fetch blocked users
  useEffect(() => {
    if (!currentAuthId) return;

    async function fetchBlocked() {
      try {
        const { data: blocksData, error } = await supabase
          .from("blocks")
          .select("blocker_user_id, blocked_user_id")
          .or(
            `blocker_user_id.eq.${currentAuthId},blocked_user_id.eq.${currentAuthId}`
          );

        if (error) {
          setBlockedByMe([]);
          setBlockedMe([]);
          return;
        }

        const byMe: string[] = [];
        const meBlockedBy: string[] = [];

        blocksData?.forEach((b: any) => {
          if (b.blocker_user_id === currentAuthId) byMe.push(b.blocked_user_id);
          if (b.blocked_user_id === currentAuthId)
            meBlockedBy.push(b.blocker_user_id);
        });

        setBlockedByMe(byMe);
        setBlockedMe(meBlockedBy);
      } catch (err: any) {
        console.error("Error fetching blocked users:", err);
        setBlockedByMe([]);
        setBlockedMe([]);
      }
    }

    fetchBlocked();
  }, [currentAuthId]);

  // Fetch mentorship connections
  useEffect(() => {
    async function fetchFriends() {
      if (!currentUserEmail || !currentAuthId) return;

      try {
        const { data: currentUserData, error: currentUserError } =
          await supabase
            .from("users")
            .select("id, user_type")
            .eq("email", currentUserEmail)
            .single();

        if (currentUserError || !currentUserData) {
          throw new Error("Could not find current user");
        }

        let approvedFriends: Friend[] = [];

        if (currentUserData.user_type === "Mentor") {
          const { data: mentorData } = await supabase
            .from("mentors")
            .select("mentorid")
            .eq("user_id", currentAuthId)
            .single();

          if (!mentorData) {
            setFriends([]);
            return;
          }

          const { data: requestsData } = await supabase
            .from("mentorship_requests")
            .select("mentee_id, status")
            .eq("mentor_id", mentorData.mentorid)
            .eq("status", "accepted");

          if (!requestsData || requestsData.length === 0) {
            setFriends([]);
            return;
          }

          const menteePromises = requestsData.map(async (req) => {
            try {
              const { data: menteeData } = await supabase
                .from("mentees")
                .select("user_id")
                .eq("menteeid", req.mentee_id)
                .single();
              if (!menteeData) return null;

              const { data: userData } = await supabase
                .from("users")
                .select("id, name, email, user_type, auth_user_id")
                .eq("auth_user_id", menteeData.user_id)
                .single();
              if (!userData) return null;

              return {
                id: userData.id,
                name: userData.name ?? "Unknown User",
                email: userData.email ?? "",
                user_type: userData.user_type ?? "Student",
                auth_id: userData.auth_user_id,
                status: req.status,
              };
            } catch {
              return null;
            }
          });

          const menteeResults = await Promise.all(menteePromises);
          approvedFriends = menteeResults.filter(Boolean) as Friend[];
        } else {
          const { data: menteeData } = await supabase
            .from("mentees")
            .select("menteeid")
            .eq("user_id", currentAuthId)
            .single();

          if (!menteeData) {
            setFriends([]);
            return;
          }

          const { data: requestsData } = await supabase
            .from("mentorship_requests")
            .select("mentor_id, status")
            .eq("mentee_id", menteeData.menteeid)
            .eq("status", "accepted");

          if (!requestsData || requestsData.length === 0) {
            setFriends([]);
            return;
          }

          const mentorPromises = requestsData.map(async (req) => {
            try {
              const { data: mentorData } = await supabase
                .from("mentors")
                .select("user_id")
                .eq("mentorid", req.mentor_id)
                .single();
              if (!mentorData) return null;

              const { data: userData } = await supabase
                .from("users")
                .select("id, name, email, user_type, auth_user_id")
                .eq("auth_user_id", mentorData.user_id)
                .single();
              if (!userData) return null;

              return {
                id: userData.id,
                name: userData.name ?? "Unknown User",
                email: userData.email ?? "",
                user_type: userData.user_type ?? "Mentor",
                auth_id: userData.auth_user_id,
                status: req.status,
              };
            } catch {
              return null;
            }
          });

          const mentorResults = await Promise.all(mentorPromises);
          approvedFriends = mentorResults.filter(Boolean) as Friend[];
        }

        setFriends(approvedFriends);
      } catch (err: any) {
        console.error("Error fetching approved mentorship connections:", err);
        Alert.alert("Error", "Failed to fetch your mentorship connections.");
      }
    }

    fetchFriends();
  }, [currentUserEmail, currentAuthId]);

  // toggleBlock (unchanged logic)
  async function toggleBlock(friend: Friend) {
    if (!currentAuthId) return;

    const isBlockedByMe = blockedByMe.includes(friend.auth_id);

    if (isBlockedByMe) {
      // Only allow unblock if current user is the blocker
      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("blocker_user_id", currentAuthId)
        .eq("blocked_user_id", friend.auth_id);

      if (error) {
        console.error("Unblock error:", error.message);
        Alert.alert("Error", "Failed to unblock the user.");
        return;
      }

      setBlockedByMe((prev) => prev.filter((id) => id !== friend.auth_id));
      Alert.alert("Success", `${friend.name} has been unblocked.`);
    } else {
      const { error } = await supabase.from("blocks").insert([
        {
          blocker_user_id: currentAuthId,
          blocked_user_id: friend.auth_id,
          blocked_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error("Insert block error:", error.message);
        Alert.alert("Error", "Failed to block the user.");
        return;
      }

      setBlockedByMe((prev) => [...prev, friend.auth_id]);
      Alert.alert("Success", `${friend.name} has been blocked.`);
    }
  }

  // handleChat (unchanged)
  function handleChat(friend: Friend) {
    if (blockedByMe.includes(friend.auth_id)) {
      Alert.alert(
        "Chat Disabled",
        "You have blocked this user. Unblock to chat."
      );
      return;
    }

    if (blockedMe.includes(friend.auth_id)) {
      Alert.alert("Chat Disabled", "You cannot chat with this user.");
      return;
    }

    router.push({
      pathname: "/chat",
      params: {
        recipientId: friend.auth_id, // Use auth_id (UUID) instead of id (number)
        recipientName: friend.name, // Use recipientName instead of userName
      },
    });
  }

  return (
    <ScrollView className="flex-1 bg-gray-100 pt-8 px-4">
      <Text className="text-2xl font-bold mb-5 text-gray-900 tracking-tight">
        My Connections
      </Text>

      {friends.length === 0 ? (
        <Text className="text-center text-gray-500 mt-10 text-base">
          No approved mentorship connections yet.
        </Text>
      ) : (
        friends.map((friend) => (
          <View
            key={`${friend.user_type}_${friend.id}`}
            className="flex-row items-center bg-white rounded-xl p-4 mb-3 shadow"
          >
            <TouchableOpacity
              className="flex-1 flex-row items-center"
              onPress={() => handleChat(friend)}
            >
              <Text className="w-11 h-11 rounded-full bg-blue-600 text-white font-bold text-lg text-center leading-[44px] mr-4">
                {friend.name[0]?.toUpperCase()}
              </Text>
              <View className="flex-1">
                <Text className="text-base font-semibold text-gray-900">
                  {friend.name}
                </Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {friend.email}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Text className="text-[11px] text-gray-400 font-medium mr-2">
                    {friend.user_type}
                  </Text>
                  <View className="bg-green-100 rounded-full px-2 py-0.5">
                    <Text className="text-[10px] text-green-700 font-semibold">
                      ✓ {friend.status}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <FriendOptions
              friend={friend}
              isOpen={openMenuFor === friend.auth_id}
              onToggle={() => toggleMenu(friend.auth_id)}
              onBlock={(f) => toggleBlock(f)}
              onTestimonial={(f) =>
                router.push({
                  pathname: "/writeTestimonial",
                  params: { mentorId: f.auth_id, mentorName: f.name },
                })
              }
            />
          </View>
        ))
      )}
    </ScrollView>
  );
}
