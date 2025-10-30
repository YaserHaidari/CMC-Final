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
StyleSheet,
ImageBackground
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/initiliaze';
import { ChatMessage, sendMessage, listenToMessages } from '@/lib/firebase/chatutilities';
import moment from 'moment';

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

useEffect(() => {
const getCurrentUser = async () => {
try {
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
Alert.alert('Error', 'Please log in to access chat');
router.back();
return;
}

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

const unsubscribe = listenToMessages(currentUserData.auth_user_id, recipientId, (newMessages) => {
  setMessages(newMessages);
  setLoading(false);
  setTimeout(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, 100);
});

return () => {
  unsubscribe();
};


}, [currentUserData, recipientId]);

const createChatNotification = async (senderId: string, senderName: string, receiverId: string, messageText: string) => {
try {
await supabase.from('chat_notifications').insert([{
sender_id: senderId,
receiver_id: receiverId,
message: messageText
}]);
} catch (err) {
console.error('Failed to insert chat notification', err);
}
};

const handleSendMessage = async () => {
if (!newMessage.trim() || sending || !currentUserData) return;

const messageText = newMessage.trim();
setNewMessage('');
setSending(true);

try {
  await sendMessage(
    currentUserData.auth_user_id,
    currentUserData.name || 'Anonymous',
    recipientId,
    messageText
  );

  await createChatNotification(
    currentUserData.auth_user_id,
    currentUserData.name || 'Anonymous',
    recipientId,
    messageText
  );

  setTimeout(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, 100);
} catch (error) {
  console.error('Error sending message:', error);
  Alert.alert('Error', 'Failed to send message. Please try again.');
  setNewMessage(messageText);
} finally {
  setSending(false);
}


};

// ✅ Added new missing function from the second code
const handleRecipientNamePress = async () => {
try {
const { data: mentorData, error: mentorError } = await supabase
.from('mentors')
.select('mentorid')
.eq('user_id', recipientId)
.maybeSingle();
if (mentorError) console.error('Error fetching mentor:', mentorError);
if (mentorData) {
router.push({ pathname: '/mentorProfile', params: { mentorId: mentorData.mentorid } });
return;
}
const { data: menteeData, error: menteeError } = await supabase
.from('mentees')
.select('menteeid')
.eq('user_id', recipientId)
.maybeSingle();
if (menteeError) console.error('Error fetching mentee:', menteeError);
if (menteeData) {
router.push({ pathname: '/menteeProfile', params: { menteeId: menteeData.menteeid } });
return;
}
Alert.alert('Error', 'User profile not found');
} catch (err) {
console.error('Error navigating to profile:', err);
Alert.alert('Error', 'Failed to open user profile');
}
};

const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
const isCurrentUser = item.senderId === currentUserData?.auth_user_id;
const showSenderName = index === 0 || messages[index - 1].senderId !== item.senderId;

// ✅ Added date separator
let showDateSeparator = false;
if (index === 0) {
  showDateSeparator = true;
} else {
  const prevDate = moment(messages[index - 1].timestamp).format('YYYY-MM-DD');
  const currDate = moment(item.timestamp).format('YYYY-MM-DD');
  if (prevDate !== currDate) showDateSeparator = true;
}

return (
  <>
    {showDateSeparator && (
      <View style={styles.dateSeparator}>
        <Text style={styles.dateText}>
          {moment(item.timestamp).format('MMM D, YYYY')}
        </Text>
      </View>
    )}
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
          backgroundColor: isCurrentUser ? '#8B5E3C' : '#FFEEDB',
          borderTopLeftRadius: isCurrentUser ? 18 : 4,
          borderTopRightRadius: isCurrentUser ? 4 : 18,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 1 },
          shadowRadius: 3,
        }
      ]}>
        <Text style={[
          styles.messageText,
          { color: isCurrentUser ? '#FFF5E6' : '#4B2E2E' }
        ]}>
          {item.text}
        </Text>
        
        <Text style={[
          styles.messageTime,
          { color: isCurrentUser ? 'rgba(255,245,230,0.7)' : '#7B4F36' }
        ]}>
          {moment(item.timestamp).format('h:mm A')}
        </Text>
      </View>
    </View>
  </>
);


};

if (!currentUserData) {
return (
<SafeAreaView style={styles.container}>
<View style={styles.centerContainer}>
<ActivityIndicator size="large" color="#8B5E3C" />
<Text style={styles.loadingText}>Loading user information...</Text>
</View>
</SafeAreaView>
);
}

return (
<SafeAreaView style={styles.container}>
<ImageBackground
source={require('@/assets/images/coffee-doodle.png')}
style={styles.background}
imageStyle={{ opacity: 0.05, resizeMode: 'cover' }}
/>

  <View style={styles.header}>
    <TouchableOpacity
      onPress={() => router.back()}
      style={styles.backButton}
    >
      <Ionicons name="arrow-back" size={24} color="#4B2E2E" />
    </TouchableOpacity>
    
    <View style={styles.headerContent}>
      <TouchableOpacity onPress={handleRecipientNamePress}>
        <Text style={styles.headerTitle}>
          {recipientName || 'Chat'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.headerSubtitle}>
        {messages.length > 0 ? 'Active' : 'Start conversation'}
      </Text>
    </View>
  </View>

  <KeyboardAvoidingView 
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
  >
    {loading ? (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B5E3C" />
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
            <Ionicons name="chatbubbles-outline" size={64} color="#A77C59" />
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

    <View style={styles.inputContainer}>
      <TextInput
        style={[styles.textInput, { color: '#4B2E2E' }]}
        value={newMessage}
        onChangeText={setNewMessage}
        placeholder="Type a message..."
        multiline
        placeholderTextColor="#7B4F36"
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
            backgroundColor: (!newMessage.trim() || sending) ? '#D9CFC1' : '#8B5E3C'
          }
        ]}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#FFF5E6" />
        ) : (
          <Ionicons name="send" size={20} color="#FFF5E6" />
        )}
      </TouchableOpacity>
    </View>
  </KeyboardAvoidingView>
</SafeAreaView>


);
}

const styles = StyleSheet.create({
container: { flex: 1, backgroundColor: '#FFF5EE' },
background: { flex: 1, width: '100%', height: '98%', top: 40, position: 'absolute' },
centerContainer: { flex: 0.8, justifyContent: 'center', alignItems: 'center' },
header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 10, top: -60, paddingVertical: 70, borderBottomWidth: 1, textAlign: 'center', borderBottomColor: '#E2D6C3', backgroundColor: '#FFF8F0', minHeight: 0 },
backButton: { padding: 8, marginRight: 8, borderRadius: 20 },
headerContent: { flex: 1 },
headerTitle: { fontSize: 18, fontWeight: '600', color: '#4B2E2E' },
headerSubtitle: { fontSize: 14, color: '#A67C52' },
messagesList: { flex: 1 },
messagesContent: { paddingVertical: 8 },
messageContainer: { marginVertical: 4, marginHorizontal: 16 },
senderName: { fontSize: 12, color: '#7B4F36', marginBottom: 2, marginLeft: 8 },
messageBubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxWidth: '80%', minWidth: 60 },
messageText: { fontSize: 16, lineHeight: 22 },
messageTime: { fontSize: 11, marginTop: 4, textAlign: 'right' },
dateSeparator: { alignSelf: 'center', backgroundColor: '#E2D6C3', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginVertical: 10 },
dateText: { fontSize: 12, color: '#4B2E2E' },
emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, minHeight: 300 },
emptyTitle: { fontSize: 18, color: '#7B4F36', textAlign: 'center', marginTop: 16, fontWeight: '500' },
emptySubtitle: { fontSize: 14, color: '#A77C59', textAlign: 'center', marginTop: 8, lineHeight: 20 },
inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 50, paddingTop: 10, bottom: -35, backgroundColor: '#FFF8F0', borderTopWidth: 1, borderTopColor: '#E2D6C3' },
textInput: { flex: 1, borderWidth: 1, borderColor: '#D9CFC1', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, marginRight: 8, maxHeight: 100, fontSize: 16, backgroundColor: '#FFF5EE' },
sendButton: { borderRadius: 24, padding: 12, justifyContent: 'center', alignItems: 'center', minWidth: 48, minHeight: 48 },
loadingText: { marginTop: 16, color: '#7B4F36' },
});