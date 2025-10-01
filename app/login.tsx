import { useState } from "react";
import { getPIN } from '@/lib/storage';
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

export default function LoginScreen() {
    const [email, setEmail] = useState<string>('');
    const [pwd, setPwd] = useState<string>('');
    const [message, setMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    async function handleForm() {
        if (!email || !pwd) {
            setMessage("Please enter both email and password.");
            return;
        }
        setIsLoading(true);
        setMessage('');

        const result = await loginUser(email, pwd);
        console.log("Login result:", result);
        setIsLoading(false);

        if (result === true) {
            const pin = await getPIN();
            if (pin) {
                router.replace("/pin");
            } else {
                router.replace("/(tabs)/home");
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
                                <Text className="text-white text-4xl font-bold">☕</Text>
                            </View>

                            <Text className="text-4xl font-bold font-Title text-gray-800 mb-2">
                                Welcome Back
                            </Text>
                            <Text className="text-base text-gray-600 font-Menu">
                                Sign in to continue your journey
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
                                        value={email}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        editable={!isLoading}
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
                                        value={pwd}
                                        secureTextEntry={true}
                                        editable={!isLoading}
                                    />
                                </View>
                            </View>

                            {/* Message Display */}
                            {message ? (
                                <View className="mb-5 p-4 bg-red-50 rounded-2xl border-l-4 border-red-500">
                                    <Text className="text-sm text-red-700 font-medium font-Menu leading-5">
                                        {message}
                                    </Text>
                                </View>
                            ) : null}

                            {/* Login Button */}
                            <TouchableOpacity
                                onPress={handleForm}
                                disabled={isLoading}
                                className={`bg-primary rounded-2xl py-4 items-center justify-center mb-4 ${isLoading ? "opacity-60" : ""
                                    }`}
                                style={{
                                    shadowColor: "#16519F",
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 4,
                                    elevation: 4,
                                }}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text className="text-lg font-bold font-Menu text-white">
                                        Sign In
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* PIN Login Option */}
                            <TouchableOpacity
                                onPress={() => router.replace("/pin")}
                                disabled={isLoading}
                                className={`bg-white border-2 border-primary rounded-2xl py-4 items-center justify-center ${isLoading ? "opacity-60" : ""
                                    }`}
                            >
                                <View className="flex-row items-center">
                                    <Text className="text-base font-bold font-Menu text-primary mr-2">
                                        🔐 Login with PIN
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Bottom Links */}
                        <View className="flex-row justify-center items-center pt-4">
                            <Text className="text-base text-gray-600 font-Menu">
                                Don't have an account?
                            </Text>
                            <TouchableOpacity onPress={navigateToRegister} disabled={isLoading}>
                                <Text className="text-base font-bold font-Menu text-primary ml-2">
                                    Register
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Privacy Note */}
                        <Text className="text-xs text-gray-500 text-center mt-8 font-Menu px-6 leading-5">
                            By signing in, you agree to our Terms & Conditions
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}