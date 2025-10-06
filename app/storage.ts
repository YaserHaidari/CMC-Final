import * as SecureStore from "expo-secure-store";

// Save PIN for a specific user
export async function savePIN(pin: string, userId: string) {
  try {
    await SecureStore.setItemAsync(`userPIN_${userId}`, pin);
  } catch (error) {
    console.error("Error saving PIN:", error);
  }
}

// Get PIN for a specific user
export async function getPIN(userId: string) {
  try {
    return await SecureStore.getItemAsync(`userPIN_${userId}`);
  } catch (error) {
    console.error("Error getting PIN:", error);
    return null;
  }
}

// Delete PIN for a specific user
export async function deletePIN(userId: string) {
  try {
    await SecureStore.deleteItemAsync(`userPIN_${userId}`);
  } catch (error) {
    console.error("Error deleting PIN:", error);
  }
}

// Check if PIN login is enabled for a user
export async function isPinEnabled(userId: string) {
  try {
    const val = await SecureStore.getItemAsync(`pinEnabled_${userId}`);
    return val === "true";
  } catch (error) {
    console.error("Error checking PIN enabled:", error);
    return false;
  }
}

// Save toggle state for PIN login
export async function savePINEnabled(enabled: boolean, userId: string) {
  try {
    await SecureStore.setItemAsync(`pinEnabled_${userId}`, enabled ? "true" : "false");
  } catch (error) {
    console.error("Error saving PIN enabled:", error);
  }
}

// Validate PIN for a user
export async function validatePIN(inputPin: string, userId: string) {
  const storedPin = await getPIN(userId);
  return storedPin === inputPin;
}


// Save the currently logged-in user ID
export async function saveCurrentUser(userId: string) {
  try {
    await SecureStore.setItemAsync("currentUserId", userId);
  } catch (error) {
    console.error("Error saving current user:", error);
  }
}

// Get the currently logged-in user ID
export async function getCurrentUser() {
  try {
    return await SecureStore.getItemAsync("currentUserId");
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

// Delete the current user
export async function deleteCurrentUser() {
  try {
    await SecureStore.deleteItemAsync("currentUserId");
  } catch (error) {
    console.error("Error deleting current user:", error);
  }
}

const REMEMBER_USER_KEY = "rememberUser";
const REMEMBERED_USER_DETAILS_KEY = "rememberedUserDetails";

// Save remembered user credentials locally (only if PIN enabled)
export async function saveRememberedUser(userId: string, email: string, password: string) {
  await SecureStore.setItemAsync(
    `rememberedUser_${userId}`,
    JSON.stringify({ email, password })
  );
}

export async function getRememberedUser(userId: string) {
  const user = await SecureStore.getItemAsync(`rememberedUser_${userId}`);
  return user ? JSON.parse(user) : null;
}

export async function deleteRememberedUser(userId: string) {
  await SecureStore.deleteItemAsync(`rememberedUser_${userId}`);
}

