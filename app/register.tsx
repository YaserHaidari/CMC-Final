import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { app } from "@/lib/firebase/firebase_initialize";
import createUser from "@/lib/firebase/createUser";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import Constants from "expo-constants";
import AWS from "aws-sdk";
import { supabase } from "@/lib/supabase/initiliaze";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [pwd, setPwd] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userType, setUsertype] = useState(0);
  const [isWaitingForVerification, setIsWaitingForVerification] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (app) console.log("Firebase initialized (if still used for other parts)");
  }, []);

  const s3 = new AWS.S3({
    accessKeyId: Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: Constants.expoConfig?.extra?.AWS_SECRET_ACCESS_KEY ?? "",
    region: Constants.expoConfig?.extra?.AWS_REGION ?? "",
  });

  async function pickImage() {
    try {
      const image = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!image.canceled) setImgUri(image.assets[0].uri);
      setMessage("Image selected successfully!");
    } catch (error) {
      console.error("Error picking image:", error);
      setMessage("Failed to pick an image.");
    }
  }

  async function uploadImage(uri: string): Promise<string | null> {
    setIsUploading(true);
    setMessage("Uploading image...");
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `profile-images/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const params = {
        Bucket: Constants.expoConfig?.extra?.AWS_S3_BUCKET_NAME ?? "ap-southeast-2",
        Key: fileName,
        Body: blob,
        ContentType: blob.type,
        ACL: 'public-read',
      };
      const data = await s3.upload(params).promise();
      setMessage("Image uploaded successfully!");
      setIsUploading(false);
      return data.Location;
    } catch (error) {
      console.error("Error uploading image to S3:", error);
      setMessage("Image upload failed.");
      setIsUploading(false);
      return null;
    }
  }

  async function handleForm() {
    if (!name || !email || !pwd) {
      setMessage("Please fill all fields");
      return;
    }
    if (isProcessing) return;

    setIsProcessing(true);
    setMessage("");

    try {
      let imageUrl = null;
      if (imgUri) {
        imageUrl = await uploadImage(imgUri);
        if (!imageUrl) {
          setMessage("Image upload failed. Please try again.");
          setIsProcessing(false);
          return;
        }
      }

      const errorMsg = await createUser(email, pwd, name, imageUrl, userType);
      if (errorMsg !== "successful") {
        console.error("Error creating user:", errorMsg);
        if (errorMsg.includes("auth/email-already-in-use") || errorMsg.includes("User already registered")) {
          setMessage("This email is already in use. Please use a different email or log in.");
        } else if (errorMsg.includes("auth/invalid-email")) {
          setMessage("The email address is not valid. Please enter a valid email.");
        } else if (errorMsg.includes("auth/weak-password")) {
          setMessage("The password is too weak. Please use a stronger password (at least 6 characters).");
        } else if (errorMsg.includes("auth/network-request-failed")) {
          setMessage("Network error. Please check your internet connection and try again.");
        } else if (errorMsg.includes("Password should be at least 6 characters")) {
          setMessage("Password should be at least 6 characters.");
        } else {
          setMessage(`Registration failed: ${errorMsg}`);
        }
        setIsProcessing(false);
        return;
      }

      setMessage("Registration successful! A verification email has been sent. Please check your inbox (and spam folder).");
      setIsWaitingForVerification(true);
    } catch (error: any) {
      console.error("Registration error:", error);
      setMessage(`Registration failed: ${error.message || "Please try again."}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function redirectTologin() {
    router.replace("/login");
  }

  async function resendVerificationEmail() {
    if (!email) {
      setMessage("Please enter your email address first.");
      return;
    }
    if (isProcessing) return;

    setIsProcessing(true);
    setMessage("Sending verification email...");

    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) setMessage(`Failed to resend email: ${error}`);
    else setMessage("Verification email resent successfully! Please check your inbox.");
    setIsProcessing(false);
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#FAF3E0' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingVertical: 40, paddingHorizontal: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="w-full max-w-md mx-auto">
            {/* Header */}
            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-[#6B4F3B] rounded-full items-center justify-center mb-4 shadow-md">
                <Text className="text-white text-4xl font-bold">☕</Text>
              </View>
              <Text className="text-4xl font-bold text-[#4B2E05] mb-2">Join Us Today</Text>
              <Text className="text-base text-[#7B5E42] text-center">Create your coffee account</Text>
            </View>

            {/* White Card */}
            <View
              className="bg-[#FFF8F0] rounded-3xl p-8 mb-6"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              {/* User Type Toggle */}
              <View className="mb-6">
                <Text className="text-sm font-bold text-[#4B2E05] mb-3 text-center">I AM A</Text>
                <SegmentedControl
                  backgroundColor="#FAEBD7"
                  style={{ height: 48, borderRadius: 24 }}
                  tintColor="#6B4F3B"
                  values={["🎓 Student", "👨‍🏫 Mentor"]}
                  selectedIndex={userType}
                  onChange={(event) => setUsertype(event.nativeEvent.selectedSegmentIndex)}
                  enabled={!isProcessing && !isWaitingForVerification}
                  fontStyle={{ color: "#7B5E42", fontWeight: '600', fontSize: 14 }}
                  activeFontStyle={{ color: "white", fontWeight: '700', fontSize: 14 }}
                />
              </View>

              {/* Name Input */}
              <View className="mb-5">
                <Text className="text-xs font-bold text-[#4B2E05] mb-2 ml-1 uppercase tracking-wide">Full Name</Text>
                <View className="flex-row items-center bg-[#FAEBD7] rounded-2xl border border-[#DDB892] overflow-hidden px-3">
                  <Ionicons name="person-outline" size={22} color="#6B4F3B" />
                  <TextInput
                    className="flex-1 px-2 py-4 text-base text-[#4B2E05]"
                    placeholder="John Doe"
                    placeholderTextColor="#9C7B5E"
                    onChangeText={setName}
                    editable={!isProcessing && !isWaitingForVerification}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View className="mb-5">
                <Text className="text-xs font-bold text-[#4B2E05] mb-2 ml-1 uppercase tracking-wide">Email Address</Text>
                <View className="flex-row items-center bg-[#FAEBD7] rounded-2xl border border-[#DDB892] overflow-hidden px-3">
                  <MaterialIcons name="email" size={22} color="#6B4F3B" />
                  <TextInput
                    className="flex-1 px-2 py-4 text-base text-[#4B2E05]"
                    placeholder="john@example.com"
                    placeholderTextColor="#9C7B5E"
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isProcessing && !isWaitingForVerification}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-xs font-bold text-[#4B2E05] mb-2 ml-1 uppercase tracking-wide">Password</Text>
                <View className="flex-row items-center bg-[#FAEBD7] rounded-2xl border border-[#DDB892] overflow-hidden px-3">
                  <Ionicons name="lock-closed-outline" size={22} color="#6B4F3B" />
                  <TextInput
                    className="flex-1 px-2 py-4 text-base text-[#4B2E05]"
                    placeholder="••••••••"
                    placeholderTextColor="#9C7B5E"
                    onChangeText={setPwd}
                    secureTextEntry
                    editable={!isProcessing && !isWaitingForVerification}
                  />
                </View>
                <Text className="text-xs text-[#7B5E42] mt-2 ml-1">Minimum 6 characters</Text>
              </View>

              {/* Message Display */}
              {message ? (
                <View className="mb-5 p-4 bg-[#FBEFE6] rounded-2xl border-l-4 border-[#E6A66B]">
                  <Text className="text-sm text-[#6B4F3B] font-medium leading-5">{message}</Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              {!isWaitingForVerification ? (
                <TouchableOpacity
                  onPress={handleForm}
                  disabled={isProcessing || isUploading}
                  className={`rounded-2xl py-4 items-center justify-center ${isProcessing || isUploading ? "opacity-60" : ""}`}
                  style={{
                    backgroundColor: "#6B4F3B",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  {isProcessing && !isUploading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="person-add-outline" size={20} color="white" style={{ marginRight: 8 }} />
                      <Text className="text-lg font-bold text-white">Create Account</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : (
                <View className="space-y-3">
                  <TouchableOpacity
                    onPress={redirectTologin}
                    disabled={isProcessing}
                    className={`bg-[#6B4F3B] rounded-2xl py-4 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
                  >
                    {isProcessing ? <ActivityIndicator color="white" size="small" /> : <Text className="text-lg font-bold text-white">✓ Email Verified</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={resendVerificationEmail}
                    disabled={isProcessing}
                    className={`bg-white border-2 border-[#6B4F3B] rounded-2xl py-4 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
                  >
                    {isProcessing ? <ActivityIndicator color="#6B4F3B" size="small" /> : <Text className="text-base font-bold text-[#6B4F3B]">📧 Resend Email</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Bottom Links */}
            <View className="flex-row justify-center items-center pt-4">
              <Text className="text-base text-[#7B5E42]">Already have an account?</Text>
              <TouchableOpacity onPress={redirectTologin} disabled={isProcessing}>
                <Text className="text-base font-bold text-[#6B4F3B] ml-2">Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Privacy Note */}
            <Text className="text-xs text-[#7B5E42] text-center mt-8 px-6 leading-5">
              By creating an account, you agree to our Terms & Conditions
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
