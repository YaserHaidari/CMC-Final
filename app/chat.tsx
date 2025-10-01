import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/initiliaze';
import { ChatMessage, sendMessage, listenToMessages } from '@/lib/firebase/chatutilities';

export default function ChatScreen() {
  const { recipientId, recipientName } = useLocalSearchParams<{
    recipientId: string;
    recipientName: string;
  }>();
  
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  // Get current user's Supabase UUID instead of Firebase UID
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Error', 'Please log in to access chat');
          router.back();
          return;
        }

        // Get user data from Supabase
        const { data: userData, error } = await supabase
          .from('users')
          .select('id, name, auth_user_id')
          .eq('email', user.email)
          .single();

        if (error || !userData) {
          console.error('Error fetching current user data:', error);
          Alert.alert('Error', 'Could not load user information');
          router.back();
          return;
        }

        setCurrentUserData(userData);
        console.log('Current user data loaded:', userData);
      } catch (error) {
        console.error('Error in getCurrentUser:', error);
        Alert.alert('Error', 'Could not load user information');
        router.back();
      }
    };

    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUserData || !recipientId) return;

    console.log('Setting up chat between', currentUserData.auth_user_id, 'and', recipientId);
    
    // Listen to messages using Supabase UUIDs
    const unsubscribe = listenToMessages(currentUserData.auth_user_id, recipientId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
      
      // Auto scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUserData, recipientId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !currentUserData) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await sendMessage(
        currentUserData.auth_user_id, // Use Supabase UUID
        currentUserData.name || 'Anonymous',
        recipientId, // This is already a Supabase UUID
        messageText
      );
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setNewMessage(messageText); // Restore message text
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isCurrentUser = item.senderId === currentUserData?.auth_user_id;
    const showSenderName = index === 0 || messages[index - 1].senderId !== item.senderId;
    
    return (
      <View style={[
        styles.messageContainer,
        { alignItems: isCurrentUser ? 'flex-end' : 'flex-start' }
      ]}>
        {showSenderName && !isCurrentUser && (
          <Text style={styles.senderName}>
            {item.senderName}
          </Text>
        )}
        
        <View style={[
          styles.messageBubble,
          {
            backgroundColor: isCurrentUser ? '#2563EB' : '#F3F4F6',
          }
        ]}>
          <Text style={[
            styles.messageText,
            { color: isCurrentUser ? 'white' : '#374151' }
          ]}>
            {item.text}
          </Text>
          
          <Text style={[
            styles.messageTime,
            { color: isCurrentUser ? 'rgba(255,255,255,0.7)' : '#9CA3AF' }
          ]}>
            {new Date(item.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (!currentUserData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading user information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {recipientName || 'Chat'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {messages.length > 0 ? 'Active' : 'Start conversation'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>
                  No messages yet
                </Text>
                <Text style={styles.emptySubtitle}>
                  Start the conversation with {recipientName}!
                </Text>
              </View>
            }
          />
        )}

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            multiline
            textAlignVertical="center"
            blurOnSubmit={false}
            onSubmitEditing={handleSendMessage}
          />
          
          <TouchableOpacity
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            style={[
              styles.sendButton,
              {
                backgroundColor: (!newMessage.trim() || sending) ? '#D1D5DB' : '#2563EB'
              }
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ...existing styles...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#10B981',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 2,
    marginHorizontal: 16,
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    marginLeft: 8,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
    minWidth: 60,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  sendButton: {
    borderRadius: 24,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
  },
});