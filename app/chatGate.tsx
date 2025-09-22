import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRoute } from "@react-navigation/native";
import { supabase } from "@/lib/supabase/initiliaze";
import Chat from "./chat";

type RouteParams = {
  userId: string;
  userName: string;
};

export default function ChatGate() {
  const route = useRoute();
  const { userId: userIdStr, userName } = route.params as RouteParams;

  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);

  const userId = Number(userIdStr);

  useEffect(() => {
    async function fetchAdminId() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const email = sessionData?.session?.user?.email;
        if (!email) throw new Error("No session email");

        const { data: adminData, error } = await supabase
          .from("admin")
          .select("adminid")
          .eq("email", email)
          .single();

        if (error || !adminData) throw error || new Error("No admin found");
        setCurrentAdminId(adminData.adminid);
      } catch (e: any) {
        console.error("Admin fetch error:", e.message);
        setBlocked(true);
      }
    }
    fetchAdminId();
  }, []);

  useEffect(() => {
    if (!currentAdminId) return;

    async function checkBlock() {
      try {
        const { data, error } = await supabase
          .from("blocks")
          .select("blockid")
          .or(
            `and(blockerid.eq.${currentAdminId},blockedid.eq.${userId}),
             and(blockerid.eq.${userId},blockedid.eq.${currentAdminId})`
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
  }, [currentAdminId, userId]);

  if (blocked === null)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Checking access...</Text>
      </View>
    );

  if (blocked)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text style={{ fontSize: 16, marginBottom: 12, textAlign: "center" }}>
          Chat disabled. You are blocked or have blocked this user.
        </Text>
      </View>
    );

  return <Chat userId={userId} userName={userName} />;
}
