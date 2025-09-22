import * as SecureStore from "expo-secure-store";

export async function savePIN(pin: string) {
  await SecureStore.setItemAsync("userPIN", pin);
}

export async function getPIN() {
  return await SecureStore.getItemAsync("userPIN");
}

export async function deletePIN() {
  await SecureStore.deleteItemAsync("userPIN");
}
