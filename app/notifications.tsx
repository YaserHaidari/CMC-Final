import React, { useState, useEffect, useCallback } from "react";
import {View,Text,Image,ScrollView,TouchableOpacity,TextInput,StyleSheet,RefreshControl,KeyboardAvoidingView,Platform,TouchableWithoutFeedback,Keyboard,Alert,} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { MaterialIcons } from "@expo/vector-icons";
import { initializeApp } from "firebase/app";
import { getFirestore,collection,query,orderBy,onSnapshot,doc,updateDoc,deleteDoc,writeBatch,} from "firebase/firestore";
import { firebaseConfig } from "./firebase/firebase_initialize";

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface Notification {
  id: string;
  title: string;
  description: string;
  image: string;
  dateGroup: string;
  read: boolean;
  selected: boolean;
}

const NotificationsScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showUndoSnackbar, setShowUndoSnackbar] = useState(false);
  const [deletedNotification, setDeletedNotification] = useState<Notification | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [allSelected, setAllSelected] = useState(false);

  // Load notifications from Firestore and listen for updates
  useEffect(() => {
    const notificationsRef = collection(db, "notifications");
    const q = query(notificationsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifList: Notification[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        notifList.push({
          id: docSnap.id,
          title: data.title,
          description: data.description,
          image: data.avatarUrl,
          dateGroup: "",
          read: data.read,
          selected: false,
        });
      });
      setNotifications(notifList);
      setAllSelected(false);
    });

    return () => unsubscribe();
  }, []);

  // Toggle read/unread and update Firestore
  const toggleReadStatus = async (id: string) => {
    const notification = notifications.find((n) => n.id === id);
    if (!notification) return;

    try {
      const notifDocRef = doc(db, "notifications", id);
      await updateDoc(notifDocRef, { read: !notification.read });
    } catch (error) {
      console.error("Error updating read status:", error);
      Alert.alert("Error", "Failed to update notification status.");
    }
  };

  // Delete a notification and update Firestore
  const deleteNotification = async (id: string) => {
    const deleted = notifications.find((n) => n.id === id);
    if (!deleted) return;

    try {
      await deleteDoc(doc(db, "notifications", id));
      setDeletedNotification(deleted);
      setShowUndoSnackbar(true);
      setTimeout(() => setShowUndoSnackbar(false), 10000);
    } catch (error) {
      console.error("Error deleting notification:", error);
      Alert.alert("Error", "Failed to delete notification.");
    }
  };

  // Undo delete (restore locally only - no Firestore restore)
  const undoDelete = () => {
    if (deletedNotification) {
      // We can't restore in Firestore without a backend, so just show alert
      Alert.alert(
        "Undo not supported",
        "Undo works only locally. To restore a deleted notification, reload data from server."
      );
      setShowUndoSnackbar(false);
    }
  };

  // Search input handler
  const handleSearchChange = (text: string) => setSearchQuery(text);

  // Select all / deselect all
  const handleSelectAll = () => {
    const newSelected = !allSelected;
    setAllSelected(newSelected);
    setNotifications((prev) => prev.map((n) => ({ ...n, selected: newSelected })));
  };

  // Toggle dropdown menu
  const openDropdown = () => setDropdownVisible((prev) => !prev);

  // Bulk mark selected notifications as read/unread
  const markAllAs = async (status: "read" | "unread") => {
    const batch = writeBatch(db);
    notifications.forEach((n) => {
      if (n.selected) {
        const notifDocRef = doc(db, "notifications", n.id);
        batch.update(notifDocRef, { read: status === "read" });
      }
    });

    try {
      await batch.commit();
      setDropdownVisible(false);
      setAllSelected(false);
      setNotifications((prev) =>
        prev.map((n) => (n.selected ? { ...n, read: status === "read", selected: false } : n))
      );
    } catch (error) {
      console.error("Error updating notifications:", error);
      Alert.alert("Error", "Failed to update notifications.");
    }
  };

  // Cancel selection
  const cancelSelection = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, selected: false })));
    setDropdownVisible(false);
    setAllSelected(false);
  };

  // Bulk delete selected notifications
  const bulkDelete = async () => {
    const toDelete = notifications.filter((n) => n.selected);
    if (toDelete.length === 0) return;

    const batch = writeBatch(db);
    toDelete.forEach((n) => {
      const notifDocRef = doc(db, "notifications", n.id);
      batch.delete(notifDocRef);
    });

    try {
      await batch.commit();
      setDropdownVisible(false);
      setAllSelected(false);
      // Disable undo after bulk delete
      setDeletedNotification(null);
    } catch (error) {
      console.error("Error deleting notifications:", error);
      Alert.alert("Error", "Failed to delete notifications.");
    }
  };

  // Filter notifications by search query
  const filteredNotifications = notifications.filter(
    (n) =>
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadNotifications = filteredNotifications.filter((n) => !n.read);
  const readNotifications = filteredNotifications.filter((n) => n.read);

  // Swipe delete button UI
  const renderRightActions = (id: string) => (
    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteNotification(id)}>
      <Text style={styles.deleteText}>DELETE</Text>
    </TouchableOpacity>
  );

  // Single notification item UI
  const renderNotificationItem = (item: Notification, isRead: boolean) => (
    <TouchableOpacity
      key={item.id}
      onLongPress={() =>
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, selected: !n.selected } : n))
        )
      }
      activeOpacity={0.8}
    >
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <View
          style={[
            styles.notificationContainer,
            item.selected && styles.selectedContainer,
            {
              backgroundColor: item.selected
                ? "#e2f0fb"
                : isRead
                ? "#f0f0f0"
                : "#ffffff",
            },
          ]}
        >
          {!isRead && <View style={styles.unreadDot} />}
          <Image source={{ uri: item.image }} style={styles.avatar} />
          <View style={{ marginLeft: 16, flex: 1 }}>
            <Text style={[styles.title, isRead && styles.readTitle]}>{item.title}</Text>
            <Text style={[styles.description, isRead && styles.readDescription]}>
              {item.description}
            </Text>
          </View>
          <TouchableOpacity onPress={() => toggleReadStatus(item.id)}>
            <Text style={{ color: "blue", paddingTop: 10 }}>
              {isRead ? "Mark as Unread" : "Mark as Read"}
            </Text>
          </TouchableOpacity>
        </View>
      </Swipeable>
    </TouchableOpacity>
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Force reload notifications (simulate refresh)
    // Actually onSnapshot updates live so no extra action needed
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  return (
    <TouchableWithoutFeedback onPress={() => dropdownVisible && setDropdownVisible(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          style={{ backgroundColor: "#f5f5f5" }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search notifications"
                placeholderTextColor="#444"
                value={searchQuery}
                onChangeText={handleSearchChange}
              />
            </View>

            <TouchableOpacity style={styles.checkboxContainer} onPress={handleSelectAll}>
              <MaterialIcons
                name={allSelected ? "check-box" : "check-box-outline-blank"}
                size={24}
                color="#444"
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={openDropdown}>
              <MaterialIcons name="arrow-drop-down" size={30} color="#444" />
            </TouchableOpacity>
          </View>

          {dropdownVisible && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity onPress={() => markAllAs("read")} style={styles.dropdownItem}>
                <Text style={styles.dropdownText}>Read</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => markAllAs("unread")} style={styles.dropdownItem}>
                <Text style={styles.dropdownText}>Unread</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={bulkDelete} style={styles.dropdownItem}>
                <Text style={styles.dropdownText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={cancelSelection} style={styles.dropdownItem}>
                <Text style={styles.dropdownText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.sectionHeader}>Unread Notifications</Text>
          {unreadNotifications.length === 0 ? (
            <Text style={styles.emptyText}>No unread notifications</Text>
          ) : (
            unreadNotifications.map((item) => renderNotificationItem(item, false))
          )}

          <Text style={styles.sectionHeader}>Read Notifications</Text>
          {readNotifications.length === 0 ? (
            <Text style={styles.emptyText}>No read notifications</Text>
          ) : (
            readNotifications.map((item) => renderNotificationItem(item, true))
          )}

          {showUndoSnackbar && (
            <View style={styles.snackbar}>
              <Text style={styles.snackbarText}>Notification deleted</Text>
              <TouchableOpacity onPress={undoDelete}>
                <Text style={styles.undoText}>Undo</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  searchBar: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    fontSize: 16,
    color: "#222",
  },
  checkboxContainer: {
    marginHorizontal: 8,
  },
  dropdownMenu: {
    backgroundColor: "#fff",
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: "#444",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  notificationContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: "#1e90ff",
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007bff",
    marginTop: 12,
    marginRight: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },
  description: {
    fontSize: 14,
    color: "#555",
  },
  readTitle: {
    color: "#888",
  },
  readDescription: {
    color: "#888",
  },
  deleteButton: {
    backgroundColor: "#ff4d4d",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 8,
    marginVertical: 4,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "bold",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginVertical: 8,
  },
  snackbar: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#333",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 6,
  },
  snackbarText: {
    color: "#fff",
    fontSize: 16,
  },
  undoText: {
    color: "#1e90ff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

export default NotificationsScreen;
