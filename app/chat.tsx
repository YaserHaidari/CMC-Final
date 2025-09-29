import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { supabase } from "@/lib/supabase/initiliaze";

type Message = {
  id: number;
  senderId: string; // UUID
  senderName: string;
  text: string;
  timestamp: string;
};

type Props = {
  userId: string; // UUID of the other user
  userName: string;
};

export default function Chat({ userId, userName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    async function fetchCurrentUserId() {
      const { data: sessionData } = await supabase.auth.getSession();
      const authId = sessionData?.session?.user?.id;
      if (!authId) return;
      setCurrentUserId(authId);
    }
    fetchCurrentUserId();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`chat-${currentUserId}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `or(senderid.eq.${currentUserId}, senderid.eq.${userId})`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    fetchMessages();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  async function fetchMessages() {
    if (!currentUserId) return;

    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(senderid.eq.${currentUserId}, receiverid.eq.${userId}),
         and(senderid.eq.${userId}, receiverid.eq.${currentUserId})`
      )
      .order("timestamp", { ascending: true });

    if (data) setMessages(data as Message[]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }

  //  Check mutual block before sending
  async function sendMessage() {
    if (!input.trim() || !currentUserId) return;

    // Check block both directions using UUIDs
    const { data: blockData, error: blockError } = await supabase
      .from("blocks")
      .select("blockid")
      .or(
        `and(blocker_user_id.eq.${currentUserId},blocked_user_id.eq.${userId}),
         and(blocker_user_id.eq.${userId},blocked_user_id.eq.${currentUserId})`
      )
      .limit(1);

    if (blockError) {
      console.error("Block check error:", blockError.message);
      Alert.alert("Error", "Could not verify block status.");
      return;
    }

    if (blockData && blockData.length > 0) {
      Alert.alert("Blocked", "You cannot send messages to this user right now.");
      return;
    }

    // Send message if not blocked
    await supabase.from("messages").insert([
      {
        senderid: currentUserId,
        receiverid: userId,
        sendername: "You",
        text: input,
        timestamp: new Date().toISOString(),
      },
    ]);

    setInput("");
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9f9f9" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => {
          const isMe = item.senderId === currentUserId;
          return (
            <View
              style={{
                alignSelf: isMe ? "flex-end" : "flex-start",
                backgroundColor: isMe ? "#2563eb" : "#e5e7eb",
                borderRadius: 16,
                marginVertical: 4,
                padding: 10,
                maxWidth: "75%",
              }}
            >
              <Text style={{ color: isMe ? "#fff" : "#111", fontWeight: "bold" }}>
                {item.senderName}
              </Text>
              <Text style={{ color: isMe ? "#fff" : "#111" }}>{item.text}</Text>
              <Text
                style={{
                  color: isMe ? "#dbeafe" : "#6b7280",
                  fontSize: 10,
                  marginTop: 2,
                  alignSelf: "flex-end",
                }}
              >
                {new Date(item.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        }}
        contentContainerStyle={{ padding: 8 }}
      />
      <View style={{ flexDirection: "row", backgroundColor: "#fff", padding: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: 14,
            fontSize: 16,
            backgroundColor: "#f1f1f1",
            borderRadius: 10,
          }}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={{
            backgroundColor: "#2563eb",
            paddingHorizontal: 20,
            justifyContent: "center",
            marginLeft: 8,
            borderRadius: 10,
          }}
          disabled={!input.trim()}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
