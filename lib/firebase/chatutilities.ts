import { ref, push, onValue, off, query, orderByChild, limitToLast } from 'firebase/database';
import { database, auth } from '../firebase/firebase_initialize';

export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  lastMessageTime?: number;
}

// Generate chat room ID (consistent ordering)
export const generateChatRoomId = (userId1: string, userId2: string): string => {
  return userId1 < userId2 ? `${userId1}_${userId2}` : `${userId2}_${userId1}`;
};

// Get user info from Firebase (much simpler!)
export const getUserInfo = async (authUserId: string) => {
  try {
    console.log('🔍 Getting Firebase user info for:', authUserId);
    
    // If it's the current user, use Firebase Auth
    if (auth.currentUser && auth.currentUser.uid === authUserId) {
      return {
        id: auth.currentUser.uid,
        name: auth.currentUser.displayName || 'Anonymous',
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL
      };
    }
    
    // For other users, we'll store basic info in Firebase Realtime Database when they send messages
    // Or we can create a simple users node in Firebase
    const userRef = ref(database, `users/${authUserId}`);
    
    return new Promise((resolve) => {
      onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData) {
          console.log('✅ User info found in Firebase:', userData);
          resolve(userData);
        } else {
          // If no user data found, create a basic profile
          console.log('⚠️ No user data found, using basic info');
          resolve({
            id: authUserId,
            name: 'Unknown User',
            email: '',
            photoURL: ''
          });
        }
      }, { onlyOnce: true });
    });
  } catch (error) {
    console.error('Error getting Firebase user info:', error);
    return {
      id: authUserId,
      name: 'Unknown User',
      email: '',
      photoURL: ''
    };
  }
};

// Store/update user info in Firebase when they send a message
export const updateUserInfo = async (userId: string, userInfo: any) => {
  try {
    const userRef = ref(database, `users/${userId}`);
    await push(userRef, {
      name: userInfo.name,
      email: userInfo.email,
      photoURL: userInfo.photoURL,
      lastSeen: Date.now()
    });
  } catch (error) {
    console.error('Error updating user info:', error);
  }
};

// Send a message (updated to store user info)
export const sendMessage = async (
  senderId: string,
  senderName: string,
  receiverId: string,
  text: string
): Promise<void> => {
  try {
    const chatRoomId = generateChatRoomId(senderId, receiverId);
    const chatRef = ref(database, `chats/${chatRoomId}`);
    
    const message: ChatMessage = {
      senderId,
      senderName,
      text,
      timestamp: Date.now()
    };

    await push(chatRef, message);
    
    // Store user info for future reference
    if (auth.currentUser) {
      await updateUserInfo(senderId, {
        name: senderName,
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL
      });
    }
    
    console.log('Message sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Listen to messages in a chat room
export const listenToMessages = (
  userId1: string,
  userId2: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const chatRoomId = generateChatRoomId(userId1, userId2);
  const chatRef = ref(database, `chats/${chatRoomId}`);
  const messagesQuery = query(chatRef, orderByChild('timestamp'));

  const unsubscribe = onValue(messagesQuery, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const messages: ChatMessage[] = Object.values(data);
      messages.sort((a, b) => a.timestamp - b.timestamp);
      callback(messages);
    } else {
      callback([]);
    }
  });

  return () => off(chatRef, 'value', unsubscribe);
};

// Get all chat rooms for a user
export const getUserChatRooms = (
  userId: string,
  callback: (chatRooms: { [key: string]: ChatMessage[] }) => void
): (() => void) => {
  const chatsRef = ref(database, 'chats');
  
  const unsubscribe = onValue(chatsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const userChatRooms: { [key: string]: ChatMessage[] } = {};
      
      Object.keys(data).forEach(chatRoomId => {
        const participants = chatRoomId.split('_');
        if (participants.includes(userId)) {
          const messages: ChatMessage[] = Object.values(data[chatRoomId]);
          messages.sort((a, b) => a.timestamp - b.timestamp);
          userChatRooms[chatRoomId] = messages;
        }
      });
      
      callback(userChatRooms);
    } else {
      callback({});
    }
  });

  return () => off(chatsRef, 'value', unsubscribe);
};