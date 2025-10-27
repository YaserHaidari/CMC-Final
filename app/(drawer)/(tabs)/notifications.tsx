import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Button,
  Alert,
  StyleSheet,
  ImageBackground,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { supabase } from "@/lib/supabase/initiliaze";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

interface UserInfo {
  id?: number;
  name?: string;
  auth_user_id?: string;
  email?: string;
}

interface ChatNotification {
  id: string;
  message: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  read?: boolean;
  sender?: UserInfo;
}

interface MentorshipRequest {
  id: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined' | string;
  message?: string;
  mentee_id?: number | null;
  mentor_id?: number | null;
  mentee?: UserInfo[];
  mentor?: UserInfo[];
  user_id?: string | null;
  responded_at?: string | null;
  response_message?: string | null;
}

type UnifiedNotification = {
  id: string;
  type: "chat" | "mentorship";
  message: string;
  senderName?: string;
  created_at: string;
  read?: boolean;
  status?: string;
  raw?: ChatNotification | MentorshipRequest;
  avatarId?: number | undefined | null;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);

  // selection + dropdown states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigation: any = useNavigation();

  useEffect(() => {
    fetchCurrentUserAndNotifications();
  }, []);

  // Fetch current user (auth) and load notifications
  async function fetchCurrentUserAndNotifications() {
    setIsLoading(true);
    try {
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) {
        Alert.alert("Error", "You are not logged in.");
        setIsLoading(false);
        return;
      }

      // Try to find user by email first
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, auth_user_id, user_type, email')
        .eq('email', user.email)
        .single();

      let finalUser = userData;
      if (userError || !userData) {
        // fallback to auth_user_id
        const fallback = await supabase
          .from('users')
          .select('id, name, auth_user_id, user_type, email')
          .eq('auth_user_id', user.id)
          .single();

        if (fallback.error || !fallback.data) {
          Alert.alert("Error", "Could not load your user info.");
          setIsLoading(false);
          return;
        }
        finalUser = fallback.data;
      }

      setCurrentUserData(finalUser);
      setRole(finalUser?.user_type || null);

      await loadAllNotifications(finalUser);
    } catch (e) {
      console.error("fetchCurrentUserAndNotifications error:", e);
      Alert.alert("Error", "Unexpected error occurred.");
      setIsLoading(false);
    }
  }

  // Load both chat notifications and mentorship requests and unify them
  async function loadAllNotifications(userData: any) {
    try {
      setIsLoading(true);

      const [chatNotifs, mentorshipNotifs] = await Promise.all([
        fetchChatNotifications(userData.auth_user_id),
        fetchMentorshipRequestsForUser(userData)
      ]);

      const chatUnified: UnifiedNotification[] = (chatNotifs || []).map((c: ChatNotification) => ({
        id: c.id,
        type: "chat",
        message: c.message || "",
        senderName: c.sender?.name || "Unknown Sender",
        created_at: c.created_at,
        read: !!c.read,
        raw: c,
        avatarId: undefined,
      }));

      const mentorshipUnified: UnifiedNotification[] = (mentorshipNotifs || []).map((m: MentorshipRequest) => {
        const isMentorView = role && role.toLowerCase() === "mentor";
        const senderName = isMentorView
          ? m.mentee?.[0]?.name || 'Unknown Student'
          : m.mentor?.[0]?.name || 'Unknown Mentor';

        return {
          id: m.id,
          type: "mentorship",
          message: m.message || (isMentorView ? 'New mentorship request' : 'Mentor accepted request'),
          senderName,
          created_at: m.created_at,
          status: m.status,
          raw: m,
          avatarId: isMentorView ? m.mentee_id : m.mentor_id,
        };
      });

      const all = [...chatUnified, ...mentorshipUnified];
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotifications(all);
    } catch (e) {
      console.error("loadAllNotifications error:", e);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }

  // fetch chat notifications directed to current user (by auth id)
  async function fetchChatNotifications(authUserId: string) {
    try {
      if (!authUserId) return [];
      const { data, error } = await supabase
        .from('chat_notifications')
        .select('id, message, sender_id, receiver_id, created_at, read')
        .eq('receiver_id', authUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("fetchChatNotifications error:", error);
        return [];
      }
      if (!data || data.length === 0) return [];

      const senderAuthIds = Array.from(new Set(data.map((d: any) => d.sender_id).filter(Boolean)));
      let usersMap: Record<string, UserInfo> = {};

      if (senderAuthIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('name, email, auth_user_id')
          .in('auth_user_id', senderAuthIds);

        (usersData || []).forEach((u: any) => {
          if (u && u.auth_user_id) usersMap[u.auth_user_id] = { name: u.name, email: u.email, auth_user_id: u.auth_user_id };
        });
      }

      return (data as any[]).map(n => ({ ...n, sender: usersMap[n.sender_id] || undefined }));
    } catch (e) {
      console.error('fetchChatNotifications exception:', e);
      return [];
    }
  }

  // fetch mentorship requests for the current user (handles mentor view and mentee view)
  async function fetchMentorshipRequestsForUser(userData: any) {
    try {
      if (!userData) return [];

      const isMentor = (userData.user_type || '').toLowerCase() === 'mentor';

      if (isMentor) {
        // first try to find mentors table row by auth_user_id
        const { data: mentorRow, error: mentorRowError } = await supabase
          .from('mentors')
          .select('mentorid, user_id')
          .eq('user_id', userData.auth_user_id)
          .single();

        let rows;
        if (mentorRowError || !mentorRow) {
          // fallback: maybe mentor_id equals users.id
          const fallback = await supabase
            .from('mentorship_requests')
            .select('id, created_at, status, message, mentee_id, mentor_id, user_id, responded_at, response_message')
            .eq('mentor_id', userData.id)
            .order('created_at', { ascending: false });

          if (fallback.error) return [];
          rows = fallback.data || [];
        } else {
          const mentorId = mentorRow.mentorid;
          const { data, error } = await supabase
            .from('mentorship_requests')
            .select('id, created_at, status, message, mentee_id, mentor_id, user_id, responded_at, response_message')
            .eq('mentor_id', mentorId)
            .order('created_at', { ascending: false });

          if (error) return [];
          rows = data || [];
        }

        return await enrichMentorshipRows(rows);
      } else {
        // mentee view
        const { data: menteeRow } = await supabase
          .from('mentees')
          .select('menteeid, user_id')
          .eq('user_id', userData.auth_user_id)
          .single();

        const menteeId = menteeRow?.menteeid;
        const { data, error } = await supabase
          .from('mentorship_requests')
          .select('id, created_at, status, message, mentee_id, mentor_id, user_id, responded_at, response_message')
          .eq('mentee_id', menteeId)
          .order('created_at', { ascending: false });

        if (error) return [];
        return await enrichMentorshipRows(data || []);
      }
    } catch (e) {
      console.error('fetchMentorshipRequestsForUser exception:', e);
      return [];
    }
  }

  // Enrich mentorship rows with user names/emails from mentees/mentors
  async function enrichMentorshipRows(rows: any[]) {
    try {
      if (!rows || rows.length === 0) return [];
      const menteeIds = Array.from(new Set(rows.map(r => r.mentee_id).filter(Boolean)));
      const mentorIds = Array.from(new Set(rows.map(r => r.mentor_id).filter(Boolean)));

      let menteeAuthMap: Record<number, string> = {};
      if (menteeIds.length > 0) {
        const { data: menteesRows } = await supabase
          .from('mentees')
          .select('menteeid, user_id')
          .in('menteeid', menteeIds);

        (menteesRows || []).forEach((m: any) => { if (m?.menteeid) menteeAuthMap[m.menteeid] = m.user_id; });
      }

      let mentorAuthMap: Record<number, string> = {};
      if (mentorIds.length > 0) {
        const { data: mentorsRows } = await supabase
          .from('mentors')
          .select('mentorid, user_id')
          .in('mentorid', mentorIds);

        (mentorsRows || []).forEach((m: any) => { if (m?.mentorid) mentorAuthMap[m.mentorid] = m.user_id; });
      }

      const authIds = Array.from(new Set([...Object.values(menteeAuthMap), ...Object.values(mentorAuthMap)].filter(Boolean)));
      let usersByAuth: Record<string, UserInfo> = {};
      if (authIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('auth_user_id, name, email')
          .in('auth_user_id', authIds);

        (usersData || []).forEach((u: any) => { if (u?.auth_user_id) usersByAuth[u.auth_user_id] = { name: u.name, email: u.email, auth_user_id: u.auth_user_id }; });
      }

      return rows.map(r => {
        const menteeUser = menteeAuthMap[r.mentee_id] ? usersByAuth[menteeAuthMap[r.mentee_id]] : undefined;
        const mentorUser = mentorAuthMap[r.mentor_id] ? usersByAuth[mentorAuthMap[r.mentor_id]] : undefined;
        return {
          ...r,
          mentee: menteeUser ? [{ name: menteeUser.name, email: menteeUser.email, auth_user_id: menteeUser.auth_user_id }] : [],
          mentor: mentorUser ? [{ name: mentorUser.name, email: mentorUser.email, auth_user_id: mentorUser.auth_user_id }] : []
        } as MentorshipRequest;
      });
    } catch (e) {
      console.error('enrichMentorshipRows error:', e);
      return rows;
    }
  }

  // Delete single notification (chat or mentorship)
  const handleDeleteNotification = async (item: UnifiedNotification) => {
    try {
      if (item.type === 'chat') {
        await supabase.from('chat_notifications').delete().eq('id', item.id);
      } else {
        // For mentorship, per your instruction: deleting via swipe should remove the request record.
        // However you earlier said accepted/declined should stay — this only applies to accepting/declining.
        await supabase.from('mentorship_requests').delete().eq('id', item.id);
      }
      setNotifications(prev => prev.filter(p => p.id !== item.id));
      // also remove from selection if present
      setSelectedIds(prev => {
        const s = new Set(prev);
        s.delete(item.id);
        return s;
      });
    } catch (e) {
      console.error('delete error:', e);
      Alert.alert("Error", "Could not delete notification.");
    }
  };

  // Mark a chat notification as read (single)
  const markAsRead = async (item: UnifiedNotification) => {
    if (item.type !== 'chat') return;
    try {
      await supabase.from('chat_notifications').update({ read: true }).eq('id', item.id);
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
      setSelectedIds(prev => {
        const s = new Set(prev);
        s.delete(item.id);
        return s;
      });
    } catch (e) {
      console.error('markAsRead error:', e);
    }
  };

  // mark multiple chat notifications as read
  const markMultipleAsRead = async (ids: string[]) => {
    try {
      const chatIds = ids.filter(id => {
        const it = notifications.find(n => n.id === id);
        return it?.type === 'chat';
      });
      if (chatIds.length > 0) {
        await supabase.from('chat_notifications').update({ read: true }).in('id', chatIds);
      }
      // reflect locally
      setNotifications(prev => prev.map(n => ids.includes(n.id) && n.type === 'chat' ? { ...n, read: true } : n));
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (e) {
      console.error('markMultipleAsRead error:', e);
    }
  };

  // delete multiple notifications
  const deleteMultiple = async (ids: string[]) => {
    try {
      const chatIds = ids.filter(id => {
        const it = notifications.find(n => n.id === id);
        return it?.type === 'chat';
      });
      const mentorshipIds = ids.filter(id => {
        const it = notifications.find(n => n.id === id);
        return it?.type === 'mentorship';
      });

      if (chatIds.length > 0) {
        await supabase.from('chat_notifications').delete().in('id', chatIds);
      }
      if (mentorshipIds.length > 0) {
        await supabase.from('mentorship_requests').delete().in('id', mentorshipIds);
      }
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      setSelectedIds(new Set());
      setSelectAll(false);
    } catch (e) {
      console.error('deleteMultiple error:', e);
      Alert.alert("Error", "Could not delete selected notifications.");
    }
  };

  // When mentor accepts/declines request - update status but KEEP the request (per your instruction)
  async function handleRequestAction(requestId: string, newStatus: 'accepted' | 'declined') {
    try {
      const lowercaseStatus = newStatus === 'accepted' ? 'Accepted' : 'Declined';
      const { data: updateData, error } = await supabase
        .from('mentorship_requests')
        .update({
          status: lowercaseStatus,
          responded_at: new Date().toISOString(),
          response_message: newStatus === 'accepted' ? 'Mentorship request has been accepted!' : 'Mentorship request has been declined.'
        })
        .eq('id', requestId)
        .select('*');

      if (error) {
        console.error('handleRequestAction update error:', error);
        Alert.alert("Error", "Could not update request status.");
        return;
      }

      if (updateData && updateData.length > 0) {
        // update local list (find the mentorship unified notification and update status)
        setNotifications(prev =>
          prev.map(n => {
            if (n.type === 'mentorship' && n.id === requestId) {
              return { ...n, status: updateData[0].status, message: updateData[0].message || n.message, raw: { ...n.raw, ...updateData[0] } };
            }
            return n;
          })
        );
      }
    } catch (e) {
      console.error('handleRequestAction exception:', e);
      Alert.alert("Error", "Unexpected error while responding to request.");
    }
  }

  // Open chat screen for chat notifications
  const openChat = (item: UnifiedNotification) => {
    if (item.type !== 'chat') {
      // option: open mentorship details if needed
      return;
    }
    try {
      const senderAuthId = (item.raw as ChatNotification)?.sender_id || (item.raw as any)?.sender?.auth_user_id;
      // navigate to chat screen; adjust param names if your chat screen expects different keys
      navigation?.navigate?.('chat', { recipientAuthId: senderAuthId, recipientName: item.senderName });
      // mark as read when opening
      markAsRead(item);
    } catch (e) {
      console.warn("openChat navigation failed", e);
      markAsRead(item);
    }
  };

  // toggle selection for multi-select
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  const toggleSelectAll = () => {
    if (!selectAll) {
      const allIds = filteredNotifications.map(n => n.id);
      setSelectedIds(new Set(allIds));
      setSelectAll(true);
    } else {
      setSelectedIds(new Set());
      setSelectAll(false);
    }
  };

  // avatar util: mentorship uses iran.liara avatar, chats use ui-avatars fallback
  const avatarFor = (name?: string) => {
    const useName = name || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(useName)}&background=E6EEF8&color=2B6CB0&rounded=true`;
  };

  const mentorshipAvatarForId = (id?: number | null) => {
    return `https://avatar.iran.liara.run/public/boy?id=${id || Math.floor(Math.random() * 10000)}`;
  };

  // Filtering notifications by search (search sender name or message)
  const filteredNotifications = notifications.filter(n => {
    const searchLower = searchText.toLowerCase();
    const name = (n.senderName || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    return name.includes(searchLower) || msg.includes(searchLower);
  });

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('@/assets/images/notificationsPage.png')}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.83)' }}>
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          ListHeaderComponent={
            <>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  {role && role.toLowerCase() === "mentor" ? " Notifications" : " Notifications"}
                </Text>
                <Text style={styles.headerSubtitle}>
                  All your chat & mentorship notifications
                </Text>
              </View>

              {/* Search + controls */}
              <View style={styles.searchContainer}>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or message..."
                    value={searchText}
                    onChangeText={setSearchText}
                  />

                  <TouchableOpacity
                    style={styles.selectAllBox}
                    onPress={toggleSelectAll}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {selectAll ? (
                      <Ionicons name="checkbox" size={22} color="#2563EB" />
                    ) : (
                      <Ionicons name="square-outline" size={22} color="#6B7280" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowDropdown(prev => !prev)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="chevron-down" size={22} color="#374151" />
                  </TouchableOpacity>
                </View>

                {showDropdown && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        const ids = Array.from(selectedIds);
                        if (ids.length === 0) {
                          Alert.alert("No selection", "Please select notifications to mark as read.");
                          return;
                        }
                        markMultipleAsRead(ids);
                        setShowDropdown(false);
                      }}
                    >
                      <Text>Mark selected as read</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        const ids = Array.from(selectedIds);
                        if (ids.length === 0) {
                          Alert.alert("No selection", "Please select notifications to delete.");
                          return;
                        }
                        deleteMultiple(ids);
                        setShowDropdown(false);
                      }}
                    >
                      <Text>Delete selected</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.dropdownItem} onPress={() => setShowDropdown(false)}>
                      <Text style={{ color: '#6B7280' }}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          }
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            // Use the existing isUnread variable

            // If item is mentorship -> render mentorship-style card (keeps your original design)
            if (item.type === 'mentorship') {
              const req = item.raw as MentorshipRequest;
              const menteeName = req?.mentee?.[0]?.name || (role && role.toLowerCase() === "mentor" ? 'Unknown Student' : undefined);
              const mentorName = req?.mentor?.[0]?.name || (role && role.toLowerCase() !== "mentor" ? 'Unknown Mentor' : undefined);
              const displayName = role && role.toLowerCase() === "mentor" ? menteeName : mentorName;
              const displayEmail = role && role.toLowerCase() === "mentor" ? req?.mentee?.[0]?.email || 'No email provided' : req?.mentor?.[0]?.email || 'No email provided';

              return (
                <Swipeable
                  overshootRight={false}
                  renderRightActions={() => (
                    <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteNotification(item)}>
                      <Ionicons name="trash" size={28} color="white" />
                    </TouchableOpacity>
                  )}
                >
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.requestCard, isSelected ? styles.cardSelected : null]}
                    onLongPress={() => toggleSelect(item.id)}
                    onPress={() => {
                      if (selectedIds.size > 0) {
                        toggleSelect(item.id);
                        return;
                      }
                      // tapping mentorship could open details - for now toggle read-like (no read field)
                    }}
                  >
                    {/* Status Badge */}
                    <View style={[
                      styles.statusBadgeTopRight,
                      (item.status === 'pending' || (item.status || '').toLowerCase() === 'pending') && styles.pendingBadge,
                      (item.status === 'accepted' || (item.status || '').toLowerCase() === 'accepted') && styles.acceptedBadge,
                      (item.status === 'declined' || (item.status || '').toLowerCase() === 'declined') && styles.declinedBadge,
                    ]}>
                      <Text style={styles.statusTextTopRight}>
                        {item.status ? `${item.status.toString().toUpperCase()}` : 'PENDING'}
                      </Text>
                    </View>

                    {/* User Info */}
                    <View style={styles.userSection}>
                      <View style={styles.avatarContainer}>
                        <Image
                          source={{ uri: mentorshipAvatarForId(item.avatarId) }}
                          style={styles.avatarLarge}
                        />
                        <View style={[
                          styles.roleIndicator,
                          role && role.toLowerCase() === "mentor" ? styles.studentIndicator : styles.mentorIndicator
                        ]}>
                          <Text style={styles.roleText}>
                            {role && role.toLowerCase() === "mentor" ? "S" : "M"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                          {displayName || (role && role.toLowerCase() === "mentor" ? 'Unknown Student' : 'Unknown Mentor')}
                        </Text>
                        <Text style={styles.userEmail}>
                          {displayEmail}
                        </Text>
                        <Text style={styles.requestDate}>
                          {role && role.toLowerCase() === "mentor" ? "📅 Requested" : "📅 Accepted"} on{' '}
                          {new Date(item.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>

                    {/* Message Section */}
                    {(req.message && role && role.toLowerCase() === "mentor") && (
                      <View style={styles.messageSection}>
                        <Text style={styles.messageLabel}>💬 Message:</Text>
                        <View style={styles.messageContainer}>
                          <Text style={styles.messageText}>"{req.message}"</Text>
                        </View>
                      </View>
                    )}

                    {/* Action Buttons (mentor view only & pending) */}
                    {role && role.toLowerCase() === "mentor" && ((item.status || '').toLowerCase() === 'pending') && (
                      <View style={styles.actionButtons}>
                        <View style={styles.buttonContainer}>
                          <Button
                            title="❌ Decline"
                            onPress={() => handleRequestAction(item.id, 'declined')}
                            color="#EF4444"
                          />
                        </View>
                        <View style={styles.buttonContainer}>
                          <Button
                            title="✅ Accept"
                            onPress={() => handleRequestAction(item.id, 'accepted')}
                            color="#10B981"
                          />
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                </Swipeable>
              );
            }

            // Otherwise it's a chat notification - render chat-style card
            const isUnread = item.type === 'chat' ? !item.read : false;

            return (
              <Swipeable
                overshootRight={false}
                renderRightActions={() => (
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteNotification(item)}>
                    <Ionicons name="trash" size={28} color="white" />
                  </TouchableOpacity>
                )}
              >
                <TouchableOpacity
                  style={[
                    styles.notificationCard,
                    isSelected ? styles.cardSelected : null,
                  ]}
                  onPress={() => {
                    if (selectedIds.size > 0) {
                      toggleSelect(item.id);
                      return;
                    }
                    openChat(item);
                  }}
                  onLongPress={() => toggleSelect(item.id)}
                >
                  <View style={styles.leftColumn}>
                    <Image source={{ uri: avatarFor(item.senderName) }} style={styles.avatar} />
                    {isUnread && !isSelected && <View style={styles.unreadDot} />}
                  </View>

                  <View style={styles.contentColumn}>
                    <View style={styles.rowTop}>
                      <Text style={styles.userName}>{item.senderName || "Unknown"}</Text>
                    </View>

                    <Text style={styles.userEmail} numberOfLines={2}>{item.message}</Text>

                    <View style={styles.rowBottom}>
                      <View style={{ flex: 1 }} />
                      <Text style={styles.requestDate}>{new Date(item.created_at).toLocaleString()}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Swipeable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptyDescription}>
                You'll see notifications here when someone messages you or mentorship events occur.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      </View>
    </ImageBackground>
  );
}

// Combined styles 
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 40,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E293B',
    fontFamily: 'OpenSans-Bold',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'OpenSans-Regular',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 0.5,
    borderColor: '#40301ef',
  },
  selectAllBox: {
    marginLeft: 8,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownButton: {
    marginLeft: 8,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    marginTop: 10,
    backgroundColor: 'white',
    marginHorizontal: 0,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f3f4f6',
  },

  /* ===== Mentorship card styles (kept intact) ===== */
  requestCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#40301ef',
  },
  statusBadgeTopRight: {
    position: 'absolute',
    top: -8,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 1,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  acceptedBadge: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  declinedBadge: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  statusTextTopRight: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#374151',
    fontFamily: 'OpenSans-Bold',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#E2E8F0',
  },
  roleIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  studentIndicator: {
    backgroundColor: '#3B82F6',
  },
  mentorIndicator: {
    backgroundColor: '#8B5CF6',
  },
  roleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'OpenSans-Bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 4,
    fontFamily: 'OpenSans-Bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
    fontFamily: 'OpenSans-Regular',
  },
  requestDate: {
    fontSize: 13,
    color: '#94A3B8',
    fontFamily: 'OpenSans-Regular',
  },
  messageSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'OpenSans-Bold',
  },
  messageContainer: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
    fontStyle: 'italic',
    fontFamily: 'OpenSans-Italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  buttonContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },

  /* ===== Chat notification card styles ===== */
  notificationCard: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 15,
    borderWidth: 0.5,
    borderColor: '#c9d2deff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  cardSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginVertical: 6,
    borderRadius: 12,
  },
  leftColumn: {
    width: 56,
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#2563EB',
    position: 'absolute',
    left: 40,
    top: 4,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  contentColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 6,
  },

  /* ===== Shared/utility styles ===== */
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF3E0',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});
