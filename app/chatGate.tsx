import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { supabase } from "@/lib/supabase/initiliaze";
import Chat from "./chat";

type RouteParams = {
  userId: string;   // numeric user table ID
  userName: string;
};

export default function ChatGate() {
  const { userId: userIdStr, userName } = useLocalSearchParams() as RouteParams;

  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [currentAuthId, setCurrentAuthId] = useState<string | null>(null);
  const [otherAuthId, setOtherAuthId] = useState<string | null>(null);

  const userId = Number(userIdStr);

  //  Get current logged-in user auth ID
  useEffect(() => {
    async function fetchAuthId() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) throw error || new Error("No active user");
        setCurrentAuthId(user.id);
      } catch (e: any) {
        console.error("Auth fetch error:", e.message);
        setBlocked(true);
      }
    }
    fetchAuthId();
  }, []);

  //  Get other user's auth ID and check mutual block
  useEffect(() => {
    if (!currentAuthId) return;

    async function checkBlock() {
      try {
        // Find auth_user_id for the other user (from users table)
        const { data: otherUser, error: otherError } = await supabase
          .from("users")
          .select("auth_user_id")
          .eq("id", userId)
          .single();

        if (otherError || !otherUser) {
          throw otherError || new Error("Other user not found");
        }

        const otherAuthId = otherUser.auth_user_id;
        setOtherAuthId(otherAuthId);

        const { data, error } = await supabase
          .from("blocks")
          .select("blocker_user_id, blocked_user_id")
          .or(
            `and(blocker_user_id.eq.${currentAuthId},blocked_user_id.eq.${otherAuthId}),
             and(blocker_user_id.eq.${otherAuthId},blocked_user_id.eq.${currentAuthId})`
          )
          .limit(1);

        if (error) throw error;
        setBlocked((data?.length ?? 0) > 0);
      } catch (e: any) {
        console.error("Block check error:", e.message);
        setBlocked(true);
      }
    }

    checkBlock();
  }, [currentAuthId, userId]);

  if (blocked === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Checking access...</Text>
      </View>
    );
  }

  if (blocked) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 12, textAlign: "center" }}>
          Chat disabled. One of you has blocked the other.
        </Text>
      </View>
    );
  }

  return <Chat userId={otherAuthId!} userName={userName} />;
}
