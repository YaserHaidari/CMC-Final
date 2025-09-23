import { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator, // Added for loading state
} from "react-native";
import { app } from "@/lib/firebase/firebase_initialize"; // Assuming this initializes Firebase for other purposes if still needed
import createUser from "@/lib/firebase/createUser";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import Constants from "expo-constants";
import AWS from "aws-sdk"; // Your AWS S3 upload logic
import { supabase } from "@/lib/supabase/initiliaze"; // Import Supabase client

export default function RegisterScreen() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [pwd, setPwd] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [imgUri, setImgUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false); // For image upload
  const [userType, setUsertype] = useState(0);
  const [isWaitingForVerification, setIsWaitingForVerification] =
    useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // General processing state for buttons

  const router = useRouter();

  useEffect(() => {
    if (app) {
      console.log("Firebase initialized (if still used for other parts)");
    }
  }, []);

  // Configure AWS S3 (Keep your existing S3 logic)
  const s3 = new AWS.S3({
    accessKeyId: Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: Constants.expoConfig?.extra?.AWS_SECRET_ACCESS_KEY ?? "",
    region: Constants.expoConfig?.extra?.AWS_REGION ?? "",
  });

  // Your existing pickImage function
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

  // Your existing uploadImage function (ensure this is defined in your actual code)
  async function uploadImage(uri: string): Promise<string | null> {
    setIsUploading(true);
    setMessage("Uploading image...");
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = `profile-images/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`; // Unique filename

      const params = {
        Bucket: Constants.expoConfig?.extra?.AWS_S3_BUCKET_NAME ?? "ap-southeast-2", // Ensure this is configured
        Key: fileName,
        Body: blob,
        ContentType: blob.type, // e.g., 'image/jpeg'
        ACL: 'public-read', // Or your desired ACL
      };

      const data = await s3.upload(params).promise();
      setMessage("Image uploaded successfully!");
      setIsUploading(false);
      return data.Location; // URL of the uploaded image
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
    if (isProcessing) return; // Prevent multiple submissions

    setIsProcessing(true);
    setMessage(""); // Clear previous messages

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

      // createUser now relies on Supabase for verification email
      const errorMsg = await createUser(email, pwd, name, imageUrl, userType);

      if (errorMsg !== "successful") {
        console.error("Error creating user:", errorMsg);
        // Improved error message handling
        if (errorMsg.includes("auth/email-already-in-use") || errorMsg.includes("User already registered")) {
            setMessage("This email is already in use. Please use a different email or log in.");
        } else if (errorMsg.includes("auth/invalid-email")) {
            setMessage("The email address is not valid. Please enter a valid email.");
        } else if (errorMsg.includes("auth/weak-password")) {
            setMessage("The password is too weak. Please use a stronger password (at least 6 characters).");
        } else if (errorMsg.includes("auth/network-request-failed")) {
            setMessage("Network error. Please check your internet connection and try again.");
        } else if (errorMsg.includes("Password should be at least 6 characters")) { // Supabase specific
            setMessage("Password should be at least 6 characters.");
        }
         else {
            setMessage(`Registration failed: ${errorMsg}`);
        }
        setIsProcessing(false);
        return;
      }

      setMessage(
        "Registration successful! A verification email has been sent. Please check your inbox (and spam folder)."
      );
      setIsWaitingForVerification(true); // Show verification options
    } catch (error: any) {
      console.error("Registration error:", error);
      setMessage(`Registration failed: ${error.message || "Please try again."}`);
    } finally {
      setIsProcessing(false);
    }
  }

  // Redirect user to login page after they've verified their email
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
      type: "signup", // or 'email_change', 'recovery' etc.
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-4xl font-bold font-Title text-black text-center pt-5 pb-8">
          Create New Account
        </Text>
        <View className="flex-row justify-center items-center pb-10">
          <Text className="text-lg font-Menu text-center">
            Already registered?
          </Text>
          <TouchableOpacity onPress={navigaToLogin} disabled={isProcessing}>
            <Text className="text-lg font-semibold font-Menu text-center text-primary pl-1">
              Log in here
            </Text>
          </TouchableOpacity>
        </View>
        <View className="mx-20 mb-5">
          <SegmentedControl
            backgroundColor="#000000"
            style={{ height: 40, borderRadius: 20 }}
            tintColor="#3B82F6"
            values={["Mentee", "Mentor"]}
            selectedIndex={userType}
            onChange={(event) =>
              setUsertype(event.nativeEvent.selectedSegmentIndex)
            }
            enabled={!isProcessing && !isWaitingForVerification}
          />
        </View>
        <Text className="text-base font-bold font-Menu pl-11">Name</Text>
        <View className="flex-row items-center bg-gray-200 mx-10 px-4 rounded-lg h-14 mb-10">
          <TextInput
            className="flex-1 text-base font-Text text-gray-800"
            placeholder="Full Name"
            onChangeText={setName}
            editable={!isProcessing && !isWaitingForVerification}
          />
        </View>
        <Text className="text-base font-bold font-Menu pl-11">Email</Text>
        <View className="flex-row items-center bg-gray-200 mx-10 px-4 rounded-lg h-14 mb-10">
          <TextInput
            className="flex-1 text-base font-Text text-gray-800"
            placeholder="someone@example.com"
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isProcessing && !isWaitingForVerification}
          />
        </View>
        <Text className="text-base font-bold font-Menu pl-11">Password</Text>
        <View className="flex-row items-center bg-gray-200 mx-10 px-4 rounded-lg h-14 mb-10">
          <TextInput
            className="flex-1 text-base font-Text text-gray-800"
            placeholder="Password (min. 6 characters)"
            onChangeText={setPwd}
            secureTextEntry={true}
            editable={!isProcessing && !isWaitingForVerification}
          />
        </View>
        {/* <View className="mb-8">
          <TouchableOpacity
            onPress={pickImage}
            disabled={isUploading || isProcessing || isWaitingForVerification}
            className={`flex-row mx-20 px-4 rounded-lg h-14 items-center justify-center ${
              isUploading || isProcessing || isWaitingForVerification ? "bg-gray-400" : "bg-neutral-700"
            }`}
          >
            <Text className="text-xl font-Menu text-white font-bold">
              {imgUri ? "Change Profile Picture" : "Upload Profile Picture"}
            </Text>
          </TouchableOpacity>
        </View>
        {imgUri && (
          <Image
            source={{ uri: imgUri }}
            className="w-48 h-48 rounded-full self-center my-2"
          />
        )}
        {message ? (
          <Text className="text-center text-red-600 my-4 font-medium text-base mx-4">
            {message}
          </Text>
        ) : null} */}

        <View className="mb-12 mx-10">
          {!isWaitingForVerification ? (
            <TouchableOpacity
              onPress={handleForm}
              disabled={isProcessing || isUploading}
              className={`flex-row bg-primary px-4 rounded-lg h-14 items-center justify-center ${isProcessing || isUploading ? "opacity-50" : ""}`}
            >
              {isProcessing && !isUploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-2xl font-Menu text-white font-medium ">
                  Sign Up
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <View>
              <TouchableOpacity
                onPress={redirectTologin}
                disabled={isProcessing}
                className={`flex-row bg-green-500 px-4 rounded-lg h-14 items-center justify-center mb-4 ${isProcessing ? "opacity-50" : ""}`}
              >
                {isProcessing ? (
                    <ActivityIndicator color="white" />
                ) : (
                <Text className="text-xl font-Menu text-white font-medium ">
                  I've Verified My Email
                </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={resendVerificationEmail}
                disabled={isProcessing}
                className={`flex-row bg-blue-500 px-4 rounded-lg h-14 items-center justify-center ${isProcessing ? "opacity-50" : ""}`}
              >
                 {isProcessing ? (
                    <ActivityIndicator color="white" />
                ) : (
                <Text className="text-xl font-Menu text-white font-medium ">
                  Resend Verification Email
                </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}