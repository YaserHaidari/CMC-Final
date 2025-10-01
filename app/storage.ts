import * as SecureStore from "expo-secure-store";

// Save PIN for a specific user
export async function savePIN(pin: string, userId: string) {
  await SecureStore.setItemAsync(`userPIN_${userId}`, pin);
}

export async function getPIN(userId: string) {
  return await SecureStore.getItemAsync(`userPIN_${userId}`);
}

export async function deletePIN(userId: string) {
  await SecureStore.deleteItemAsync(`userPIN_${userId}`);
}

// Save toggle state
export async function savePINEnabled(enabled: boolean, userId: string) {
  await SecureStore.setItemAsync(`pinEnabled_${userId}`, enabled ? "true" : "false");
}

export async function isPinEnabled(userId: string) {
  const val = await SecureStore.getItemAsync(`pinEnabled_${userId}`);
  return val === "true";
}

// Save the currently logged in userId (for PIN login redirection)
export async function saveCurrentUser(userId: string) {
  await SecureStore.setItemAsync("currentUserId", userId);
}

export async function getCurrentUser() {
  return await SecureStore.getItemAsync("currentUserId");
}

export async function deleteCurrentUser() {
  await SecureStore.deleteItemAsync("currentUserId");
}
