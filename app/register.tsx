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
    if (app) {
      console.log("Firebase initialized (if still used for other parts)");
    }
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

      if (!image.canceled) {
        setImgUri(image.assets[0].uri);
        setMessage("Image selected successfully!");
      }
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

      setMessage(
        "Registration successful! A verification email has been sent. Please check your inbox (and spam folder)."
      );
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

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email,
    });

    if (error) {
      console.error("Error resending verification email:", error);
      setMessage(`Failed to resend email: ${error}`);
    } else {
      setMessage(
        "Verification email resent successfully! Please check your inbox."
      );
    }
    setIsProcessing(false);
  }

  function navigaToLogin() {
    router.replace("/login");
  }

  return (
    <View className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ 
            flexGrow: 1,
            paddingVertical: 40,
            paddingHorizontal: 24
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Main Card Container */}
          <View className="w-full max-w-md mx-auto">
            
            {/* Header Section */}
            <View className="items-center mb-6">
              {/* Logo/Icon Circle */}
              <View className="w-20 h-20 bg-primary rounded-full items-center justify-center mb-4 shadow-md">
                <Text className="text-white text-4xl font-bold">🎓</Text>
              </View>
              
              <Text className="text-4xl font-bold font-Title text-gray-800 mb-2">
                Join Us Today
              </Text>
              <Text className="text-base text-gray-600 font-Menu">
                Create your account to get started
              </Text>
            </View>

            {/* White Card */}
            <View 
              className="bg-white rounded-3xl p-8 mb-6"
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
                <Text className="text-sm font-bold font-Menu text-gray-700 mb-3 text-center">
                  I AM A
                </Text>
                <SegmentedControl
                  backgroundColor="#F3F4F6"
                  style={{ height: 48, borderRadius: 24 }}
                  tintColor="#16519F"
                  values={["🎓 Student", "👨‍🏫 Mentor"]}
                  selectedIndex={userType}
                  onChange={(event) =>
                    setUsertype(event.nativeEvent.selectedSegmentIndex)
                  }
                  enabled={!isProcessing && !isWaitingForVerification}
                  fontStyle={{ color: "#6B7280", fontWeight: '600', fontSize: 14 }}
                  activeFontStyle={{ color: "white", fontWeight: '700', fontSize: 14 }}
                />
              </View>

              {/* Name Input */}
              <View className="mb-5">
                <Text className="text-xs font-bold font-Menu text-gray-600 mb-2 ml-1 uppercase tracking-wide">
                  Full Name
                </Text>
                <View className="bg-gray-50 rounded-2xl border-2 border-gray-100 overflow-hidden">
                  <TextInput
                    className="px-4 py-4 text-base font-Text text-gray-800"
                    placeholder="John Doe"
                    placeholderTextColor="#9CA3AF"
                    onChangeText={setName}
                    editable={!isProcessing && !isWaitingForVerification}
                  />
                </View>
              </View>

              {/* Email Input */}
              <View className="mb-5">
                <Text className="text-xs font-bold font-Menu text-gray-600 mb-2 ml-1 uppercase tracking-wide">
                  Email Address
                </Text>
                <View className="bg-gray-50 rounded-2xl border-2 border-gray-100 overflow-hidden">
                  <TextInput
                    className="px-4 py-4 text-base font-Text text-gray-800"
                    placeholder="john@example.com"
                    placeholderTextColor="#9CA3AF"
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isProcessing && !isWaitingForVerification}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mb-6">
                <Text className="text-xs font-bold font-Menu text-gray-600 mb-2 ml-1 uppercase tracking-wide">
                  Password
                </Text>
                <View className="bg-gray-50 rounded-2xl border-2 border-gray-100 overflow-hidden">
                  <TextInput
                    className="px-4 py-4 text-base font-Text text-gray-800"
                    placeholder="••••••••"
                    placeholderTextColor="#9CA3AF"
                    onChangeText={setPwd}
                    secureTextEntry={true}
                    editable={!isProcessing && !isWaitingForVerification}
                  />
                </View>
                <Text className="text-xs text-gray-500 mt-2 ml-1 font-Menu">
                  Minimum 6 characters
                </Text>
              </View>

              {/* Message Display */}
              {message ? (
                <View className="mb-5 p-4 bg-blue-50 rounded-2xl border-l-4 border-blue-500">
                  <Text className="text-sm text-blue-700 font-medium font-Menu leading-5">
                    {message}
                  </Text>
                </View>
              ) : null}

              {/* Action Buttons */}
              {!isWaitingForVerification ? (
                <TouchableOpacity
                  onPress={handleForm}
                  disabled={isProcessing || isUploading}
                  className={`bg-primary rounded-2xl py-4 items-center justify-center ${
                    isProcessing || isUploading ? "opacity-60" : ""
                  }`}
                  style={{
                    shadowColor: "#16519F",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 4,
                  }}
                >
                  {isProcessing && !isUploading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-lg font-bold font-Menu text-white">
                      Create Account
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View className="space-y-3">
                  <TouchableOpacity
                    onPress={redirectTologin}
                    disabled={isProcessing}
                    className={`bg-green-500 rounded-2xl py-4 items-center justify-center ${
                      isProcessing ? "opacity-60" : ""
                    }`}
                    style={{
                      shadowColor: "#10B981",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 3,
                      elevation: 3,
                    }}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                        <View className="flex-row items-center mb-4">
                        <Text className="text-lg font-bold font-Menu text-white mr-2">
                          ✓ Email Verified
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={resendVerificationEmail}
                    disabled={isProcessing}
                    className={`bg-white border-2 border-blue-500 rounded-2xl py-4 items-center justify-center ${
                      isProcessing ? "opacity-60" : ""
                    }`}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#3B82F6" size="small" />
                    ) : (
                      <Text className="text-base font-bold font-Menu text-blue-500">
                        📧 Resend Email
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Bottom Links */}
            <View className="flex-row justify-center items-center pt-4">
              <Text className="text-base text-gray-600 font-Menu">
                Already have an account?
              </Text>
              <TouchableOpacity onPress={navigaToLogin} disabled={isProcessing}>
                <Text className="text-base font-bold font-Menu text-primary ml-2">
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>

            {/* Privacy Note */}
            <Text className="text-xs text-gray-500 text-center mt-8 font-Menu px-6 leading-5">
              By creating an account, you agree to our Terms & Conditions
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}