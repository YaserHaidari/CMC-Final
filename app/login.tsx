import { useEffect, useState } from "react";
import { getCurrentUser, getPIN } from './storage';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    ActivityIndicator,
} from "react-native";
import loginUser from '@/lib/firebase/loginUser';
import { useRouter } from "expo-router";
import { isPinEnabled, saveCurrentUser, saveRememberedUser, getRememberedUser } from "./storage";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function LoginScreen() {
    const [email, setEmail] = useState<string>('');
    const [pwd, setPwd] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function redirectIfPinEnabled() {
            const userId = await getCurrentUser();
            if (!userId) return;

            const rememberedUser = await getRememberedUser(userId);
            if (rememberedUser) router.replace("/pin");
        }
        redirectIfPinEnabled();
    }, []);

    const sanitizeUserId = (email: string) =>
        email.replace(/[^a-zA-Z0-9._-]/g, "_");

    async function handleForm() {
        if (!email || !pwd) {
            setMessage("Please enter both email and password.");
            return;
        }
        setIsLoading(true);
        setMessage("");

        const result = await loginUser(email, pwd);
        setIsLoading(false);

        if (result === true) {
            const userId = sanitizeUserId(email);
            await saveCurrentUser(userId);

            const enabled = await isPinEnabled(userId);
            if (enabled) {
                await saveRememberedUser(userId, email, pwd);
                router.replace("/pin");
            } else {
                router.replace("/home");
            }
        } else {
            setMessage(result as string);
        }
    }

    function navigateToRegister() {
        if (isLoading) return;
        router.replace("/register");
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
                    {/* Main Card Container */}
                    <View className="w-full max-w-md mx-auto">

                        {/* Header */}
                        <View className="items-center mb-6">
                            <View
                                className="w-20 h-20 bg-[#6B4F3B] rounded-full items-center justify-center mb-4 shadow-md"
                            >
                                <Text className="text-white text-4xl font-bold">☕</Text>
                            </View>
                            <Text className="text-4xl font-bold text-[#4B2E05] mb-2">
                                Welcome Back
                            </Text>
                            <Text className="text-base text-[#7B5E42] text-center">
                                Sign in to continue your coffee journey
                            </Text>
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
                            {/* Email Input */}
                            <View className="mb-5">
                                <Text className="text-xs font-bold text-[#4B2E05] mb-2 ml-1 uppercase tracking-wide">
                                    Email Address
                                </Text>
                                <View className="flex-row items-center bg-[#FAEBD7] rounded-2xl border border-[#DDB892] overflow-hidden px-3">
                                    <MaterialIcons name="email" size={22} color="#6B4F3B" />
                                    <TextInput
                                        className="flex-1 px-2 py-4 text-base text-[#4B2E05]"
                                        placeholder="john@example.com"
                                        placeholderTextColor="#9C7B5E"
                                        onChangeText={setEmail}
                                        value={email}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>

                            {/* Password Input */}
                            <View className="mb-6">
                                <Text className="text-xs font-bold text-[#4B2E05] mb-2 ml-1 uppercase tracking-wide">
                                    Password
                                </Text>
                                <View className="flex-row items-center bg-[#FAEBD7] rounded-2xl border border-[#DDB892] overflow-hidden px-3">
                                    <Ionicons name="lock-closed-outline" size={22} color="#6B4F3B" />
                                    <TextInput
                                        className="flex-1 px-2 py-4 text-base text-[#4B2E05]"
                                        placeholder="••••••••"
                                        placeholderTextColor="#9C7B5E"
                                        onChangeText={setPwd}
                                        value={pwd}
                                        secureTextEntry
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>

                            {/* Message */}
                            {message && (
                                <View className="mb-5 p-4 bg-[#FDE2E2] rounded-2xl border-l-4 border-[#E06C75]">
                                    <Text className="text-sm text-[#E06C75] font-medium leading-5">
                                        {message}
                                    </Text>
                                </View>
                            )}

                            {/* Login Button */}
                            <TouchableOpacity
                                onPress={handleForm}
                                disabled={isLoading}
                                className={`rounded-2xl py-4 items-center justify-center mb-4 ${isLoading ? "opacity-60" : ""}`}
                                style={{
                                    backgroundColor: "#6B4F3B",
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 4,
                                    elevation: 4,
                                }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <View className="flex-row items-center">
                                        <Ionicons name="log-in-outline" size={20} color="white" style={{ marginRight: 8 }} />
                                        <Text className="text-lg font-bold text-white">Sign In</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Bottom Links */}
                        <View className="flex-row justify-center items-center pt-4">
                            <Text className="text-base text-[#7B5E42]">
                                Don't have an account?
                            </Text>
                            <TouchableOpacity onPress={navigateToRegister} disabled={isLoading}>
                                <Text className="text-base font-bold text-[#6B4F3B] ml-2">
                                    Register
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Privacy Note */}
                        <Text className="text-xs text-[#7B5E42] text-center mt-8 px-6 leading-5">
                            By signing in, you agree to our Terms & Conditions
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}
