// import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Alert } from "react-native";
// import React, { useState, useEffect } from 'react';
// import { supabase } from "@/lib/supabase/initiliaze";
// import { useRouter } from "expo-router";
// import SegmentedControl from "@react-native-segmented-control/segmented-control";
// import * as ImagePicker from "expo-image-picker";
// import AWS from "aws-sdk";
// import Constants from "expo-constants";

// interface User {
//     id: number;
//     created_at: string;
//     user_type: string;
//     photoURL: string;
//     email: string;
//     name: string;
//     bio: string;
//     Location: string;
//     DOB: string;
// }

// export default function UpdateProfile() {
//     const [newDetail, setNewDetail] = useState({ Name: "", Bio: "", Role: "", DOB: "", Email: "", Location: "" });
//     const [user, setUser] = useState<User | null>(null);
//     const [session, setSession] = useState<any>(null);
//     const [loading, setLoading] = useState(true);
//     const [uploading, setUploading] = useState(false);
//     const [imgUri, setImgUri] = useState<string | null>(null);
//     const router = useRouter();

//     // AWS S3 config
//     const s3 = new AWS.S3({
//         accessKeyId: Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID ?? "",
//         secretAccessKey: Constants.expoConfig?.extra?.AWS_SECRET_ACCESS_KEY ?? "",
//         region: Constants.expoConfig?.extra?.AWS_REGION ?? "",
//     });
//     const S3_BUCKET = Constants.expoConfig?.extra?.AWS_S3_BUCKET_NAME ?? "your-s3-bucket-name";

//     // Fetch session and user data
//     useEffect(() => {
//         async function fetchSession() {
//             const currentSession = await supabase.auth.getSession();
//             setSession(currentSession.data.session);
//         }
//         fetchSession();

//         const { data: authListener } = supabase.auth.onAuthStateChange(
//             (_event, session) => setSession(session)
//         );
//         return () => {
//             authListener.subscription.unsubscribe();
//         };
//     }, []);

//     // Fetch user data
//     useEffect(() => {
//         async function fetchUser() {
//             if (session && session.user) {
//                 setLoading(true);
//                 const { error, data } = await supabase.from("users").select("*").eq("email", session.user.email).single();
//                 if (!error) {
//                     setUser(data);
//                     setNewDetail({
//                         Name: data.name || "",
//                         Bio: data.bio || "",
//                         Role: data.user_type || "",
//                         DOB: data.DOB || "",
//                         Email: data.email || "",
//                         Location: data.Location || ""
//                     });
//                 }
//                 setLoading(false);
//             }
//         }
//         fetchUser();
//     }, [session]);

//     // Pick image
//     async function pickImage() {
//         try {
//             const image = await ImagePicker.launchImageLibraryAsync({
//                 mediaTypes: ImagePicker.MediaTypeOptions.Images,
//                 allowsEditing: true,
//                 aspect: [1, 1],
//                 quality: 0.8,
//             });

//             if (!image.canceled) {
//                 setImgUri(image.assets[0].uri);
//             }
//         } catch (error) {
//             Alert.alert("Error", "Failed to pick an image.");
//         }
//     }

//     // Upload image to S3 and update Supabase
//     async function uploadImage(uri: string): Promise<string | null> {
//         if (!S3_BUCKET || S3_BUCKET === "your-s3-bucket-name") {
//             Alert.alert("Error", "AWS S3 bucket is not configured.");
//             return null;
//         }
//         setUploading(true);
//         try {
//             const response = await fetch(uri);
//             const blob = await response.blob();
//             const fileName = `profile-images/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

//             const params = {
//                 Bucket: S3_BUCKET,
//                 Key: fileName,
//                 Body: blob,
//                 ContentType: blob.type,
//                 ACL: 'public-read',
//             };

//             const data = await s3.upload(params).promise();
//             return data.Location as string;
//         } catch (error) {
//             Alert.alert("Error", "Image upload failed.");
//             return null;
//         } finally {
//             setUploading(false);
//         }
//     }

//     // Handle avatar press
//     async function handleAvatarPress() {
//     try {
//         const image = await ImagePicker.launchImageLibraryAsync({
//             mediaTypes: ImagePicker.MediaTypeOptions.Images,
//             allowsEditing: true,
//             aspect: [1, 1],
//             quality: 0.8,
//         });

//         if (!image.canceled && image.assets && image.assets[0].uri) {
//             setImgUri(image.assets[0].uri); // for UI preview
//             setUploading(true);
//             const imageUrl = await uploadImage(image.assets[0].uri);
//             if (imageUrl && user) {
//                 const { error } = await supabase
//                     .from("users")
//                     .update({ photoURL: imageUrl })
//                     .eq("email", user.email);

//                 if (!error) {
//                     setUser(prev => prev ? { ...prev, photoURL: imageUrl } : prev);
//                     Alert.alert("Success", "Profile photo updated!");
//                 } else {
//                     Alert.alert("Error", "Failed to update profile photo.");
//                 }
//             }
//             setUploading(false);
//         }
//     } catch (error) {
//         setUploading(false);
//         Alert.alert("Error", "Failed to pick or upload image.");
//     }
// }

//     // Handle update
//     const handleSubmit = async (email: string) => {
//         const updatedFields: any = {};
//         if (newDetail.Name) updatedFields.name = newDetail.Name;
//         if (newDetail.Bio) updatedFields.bio = newDetail.Bio;
//         if (newDetail.Role) updatedFields.user_type = newDetail.Role;
//         if (newDetail.DOB) updatedFields.DOB = newDetail.DOB;
//         if (newDetail.Email) updatedFields.email = newDetail.Email;
//         if (newDetail.Location) updatedFields.Location = newDetail.Location;

//         if (Object.keys(updatedFields).length > 0) {
//             const { error } = await supabase
//                 .from("users")
//                 .update(updatedFields)
//                 .eq("email", email);

//             if (!error) {
//                 setTimeout(() => {
//                     router.canGoBack() ? router.back() : router.push("/profile");
//                 }, 1000);
//             }
//         }
//     };

//     // Handle delete
//     const deleteUser = async (email: string) => {
//         const { error } = await supabase.from("users").delete().eq("email", email);
//         if (!error) {
//             router.push("/login");
//         }
//     };

//     // Handle cancel
//     const handleCancel = () => {
//         router.canGoBack() ? router.back() : router.push("/profile");
//     };

//     if (loading) {
//         return (
//             <View className="flex-1 justify-center items-center bg-white">
//                 <ActivityIndicator size="large" />
//             </View>
//         );
//     }

//     return (
//         <KeyboardAvoidingView
//             behavior={Platform.OS === "ios" ? "padding" : "height"}
//             keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
//             className="flex-1 bg-white"
//         >
//             <ScrollView 
//                 contentContainerStyle={{ flexGrow: 1 }} 
//                 keyboardShouldPersistTaps="handled" 
//                 className="bg-white"
//             >
//                 <View className="w-full p-6 items-center">
//                     <TouchableOpacity onPress={handleAvatarPress} disabled={uploading}>
//                         <Image
//                             style={styles.profileAvatar}
//                             className="rounded-full border-2 border-gray-200"
//                             source={{ uri: imgUri || user?.photoURL || 'https://avatar.iran.liara.run/public/41' }}
//                         />
//                         {uploading && (
//                             <ActivityIndicator
//                                 style={{ position: "absolute", top: 40, left: 40 }}
//                                 size="large"
//                                 color="#3b82f6"
//                             />
//                         )}
//                     </TouchableOpacity>
//                 </View>

//                 {user && (
//                     <View className="px-6 w-full">
//                         <Text className="text-base font-medium text-gray-700 mb-1">Name</Text>
//                         <TextInput
//                             value={newDetail.Name}
//                             onChangeText={text => setNewDetail(prev => ({ ...prev, Name: text }))}
//                             className="bg-gray-100 rounded-lg px-4 h-12 text-base mb-4 border border-gray-300"
//                             placeholderTextColor="#6b7280"
//                         />

//                         <Text className="text-base font-medium text-gray-700 mb-1">Role</Text>
//                         <SegmentedControl
//                             values={["Student", "Tutor"]}
//                             selectedIndex={newDetail.Role === "Tutor" ? 1 : 0}
//                             onChange={event => {
//                                 const value = event.nativeEvent.selectedSegmentIndex === 1 ? "Tutor" : "Student";
//                                 setNewDetail(prev => ({ ...prev, Role: value }));
//                             }}
//                             className="mb-4"
//                             tintColor="#3b82f6"
//                         />

//                         <Text className="text-base font-medium text-gray-700 mb-1">Bio</Text>
//                         <TextInput
//                             value={newDetail.Bio}
//                             onChangeText={text => setNewDetail(prev => ({ ...prev, Bio: text }))}
//                             className="bg-gray-100 rounded-lg px-4 h-12 text-base mb-4 border border-gray-300"
//                             placeholderTextColor="#6b7280"
//                             multiline
//                         />

//                         <Text className="text-base font-medium text-gray-700 mb-1">Date of Birth</Text>
//                         <TextInput
//                             value={newDetail.DOB}
//                             onChangeText={text => setNewDetail(prev => ({ ...prev, DOB: text }))}
//                             className="bg-gray-100 rounded-lg px-4 h-12 text-base mb-4 border border-gray-300"
//                             placeholderTextColor="#6b7280"
//                             placeholder="YYYY-MM-DD"
//                         />

//                         <Text className="text-base font-medium text-gray-700 mb-1">Email</Text>
//                         <TextInput
//                             value={newDetail.Email}
//                             onChangeText={text => setNewDetail(prev => ({ ...prev, Email: text }))}
//                             className="bg-gray-100 rounded-lg px-4 h-12 text-base mb-4 border border-gray-300"
//                             placeholderTextColor="#6b7280"
//                             keyboardType="email-address"
//                         />

//                         <Text className="text-base font-medium text-gray-700 mb-1">Location</Text>
//                         <TextInput
//                             value={newDetail.Location}
//                             onChangeText={text => setNewDetail(prev => ({ ...prev, Location: text }))}
//                             className="bg-gray-100 rounded-lg px-4 h-12 text-base mb-4 border border-gray-300"
//                             placeholderTextColor="#6b7280"
//                         />

//                         <View className="flex-row justify-between mb-4">
//                             <TouchableOpacity
//                                 onPress={handleCancel}
//                                 className="flex-1 mr-2 justify-center items-center bg-gray-300 rounded-lg h-12"
//                             >
//                                 <Text className="text-lg font-medium text-gray-800">
//                                     Cancel
//                                 </Text>
//                             </TouchableOpacity>

//                             <TouchableOpacity
//                                 onPress={() => handleSubmit(user.email)}
//                                 className="flex-1 ml-2 justify-center items-center bg-blue-500 rounded-lg h-12"
//                             >
//                                 <Text className="text-lg font-medium text-white">
//                                     Update
//                                 </Text>
//                             </TouchableOpacity>
//                         </View>

//                         <TouchableOpacity
//                             onPress={() => deleteUser(user.email)}
//                             className="w-full justify-center items-center bg-red-600 rounded-lg h-12 mb-8"
//                         >
//                             <Text className="text-lg font-medium text-white">
//                                 Delete Account
//                             </Text>
//                         </TouchableOpacity>
//                     </View>
//                 )}
//             </ScrollView>
//         </KeyboardAvoidingView>
//     );
// }

// const styles = StyleSheet.create({
//     profileAvatar: {
//         width: 120,
//         height: 120,
//         marginBottom: 20,
//     },
// });

import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Alert } from "react-native";
import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase/initiliaze";
import { useRouter } from "expo-router";
import SegmentedControl from "@react-native-segmented-control/segmented-control";
import * as ImagePicker from "expo-image-picker";
import AWS from "aws-sdk";
import Constants from "expo-constants";

// --- PIN helpers (adjust import path as needed) ---
import { savePIN, getPIN, deletePIN } from '@/lib/storage';

interface User {
    id: number;
    created_at: string;
    user_type: string;
    photoURL: string;
    email: string;
    name: string;
    bio: string;
    Location: string;
    DOB: string;
}

export default function UpdateProfile() {
    const [newDetail, setNewDetail] = useState({ Name: "", Bio: "", Role: "", DOB: "", Email: "", Location: "" });
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [imgUri, setImgUri] = useState<string | null>(null);
    const router = useRouter();

    // PIN state
    const [pin, setPin] = useState("");
    const [currentPin, setCurrentPin] = useState("");

    // AWS S3 config
    const s3 = new AWS.S3({
        accessKeyId: Constants.expoConfig?.extra?.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: Constants.expoConfig?.extra?.AWS_SECRET_ACCESS_KEY ?? "",
        region: Constants.expoConfig?.extra?.AWS_REGION ?? "",
    });
    const S3_BUCKET = Constants.expoConfig?.extra?.AWS_S3_BUCKET_NAME ?? "your-s3-bucket-name";

    // Fetch session and user data
    useEffect(() => {
        async function fetchSession() {
            const currentSession = await supabase.auth.getSession();
            setSession(currentSession.data.session);
        }
        fetchSession();

        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => setSession(session)
        );
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // Fetch user data
    useEffect(() => {
        async function fetchUser() {
            if (session && session.user) {
                setLoading(true);
                const { error, data } = await supabase.from("users").select("*").eq("email", session.user.email).single();
                if (!error) {
                    setUser(data);
                    setNewDetail({
                        Name: data.name || "",
                        Bio: data.bio || "",
                        Role: data.user_type || "",
                        DOB: data.DOB || "",
                        Email: data.email || "",
                        Location: data.Location || ""
                    });
                }
                setLoading(false);
            }
        }
        fetchUser();
    }, [session]);

    // Fetch PIN on mount
    useEffect(() => {
        async function fetchPin() {
            const storedPin = await getPIN();
            if (storedPin) setCurrentPin(storedPin);
        }
        fetchPin();
    }, []);

    // Pick image
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
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick an image.");
        }
    }

    // Upload image to S3 and update Supabase
    async function uploadImage(uri: string): Promise<string | null> {
        if (!S3_BUCKET || S3_BUCKET === "your-s3-bucket-name") {
            Alert.alert("Error", "AWS S3 bucket is not configured.");
            return null;
        }
        setUploading(true);
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const fileName = `profile-images/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

            const params = {
                Bucket: S3_BUCKET,
                Key: fileName,
                Body: blob,
                ContentType: blob.type,
                ACL: 'public-read',
            };

            const data = await s3.upload(params).promise();
            return data.Location as string;
        } catch (error) {
            Alert.alert("Error", "Image upload failed.");
            return null;
        } finally {
            setUploading(false);
        }
    }

    // Handle avatar press
    async function handleAvatarPress() {
        try {
            const image = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!image.canceled && image.assets && image.assets[0].uri) {
                setImgUri(image.assets[0].uri); // for UI preview
                setUploading(true);
                const imageUrl = await uploadImage(image.assets[0].uri);
                if (imageUrl && user) {
                    const { error } = await supabase
                        .from("users")
                        .update({ photoURL: imageUrl })
                        .eq("email", user.email);

                    if (!error) {
                        setUser(prev => prev ? { ...prev, photoURL: imageUrl } : prev);
                        Alert.alert("Success", "Profile photo updated!");
                    } else {
                        Alert.alert("Error", "Failed to update profile photo.");
                    }
                }
                setUploading(false);
            }
        } catch (error) {
            setUploading(false);
            Alert.alert("Error", "Failed to pick or upload image.");
        }
    }

    // Handle update
    const handleSubmit = async (email: string) => {
        const updatedFields: any = {};
        if (newDetail.Name) updatedFields.name = newDetail.Name;
        if (newDetail.Bio) updatedFields.bio = newDetail.Bio;
        if (newDetail.Role) updatedFields.user_type = newDetail.Role;
        if (newDetail.DOB) updatedFields.DOB = newDetail.DOB;
        if (newDetail.Email) updatedFields.email = newDetail.Email;
        if (newDetail.Location) updatedFields.Location = newDetail.Location;

        if (Object.keys(updatedFields).length > 0) {
            const { error } = await supabase
                .from("users")
                .update(updatedFields)
                .eq("email", email);

            if (!error) {
                setTimeout(() => {
                    router.canGoBack() ? router.back() : router.push("/profile");
                }, 1000);
            }
        }
    };

    // Handle delete
    const deleteUser = async (email: string) => {
        const { error } = await supabase.from("users").delete().eq("email", email);
        if (!error) {
            router.push("/login");
        }
    };

    // Handle cancel
    const handleCancel = () => {
        router.canGoBack() ? router.back() : router.push("/profile");
    };

    // Handle PIN set/change
    const handleSetPin = () => {
        if (pin.length < 4) {
            Alert.alert("PIN too short", "Use at least 4 digits");
            return;
        }
        savePIN(pin);
        setCurrentPin(pin);
        setPin("");
        Alert.alert("Success", "Your PIN has been set/changed");
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-white">
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
            className="flex-1 bg-white"
        >
            <ScrollView 
                contentContainerStyle={{ flexGrow: 1 }} 
                keyboardShouldPersistTaps="handled" 
                className="bg-white"
            >
                <View className="w-full p-6 items-center">
                    <TouchableOpacity onPress={handleAvatarPress} disabled={uploading}>
                        <Image
                            style={styles.profileAvatar}
                            className="rounded-full border-2 border-gray-200"
                            source={{ uri: imgUri || user?.photoURL || 'https://avatar.iran.liara.run/public/41' }}
                        />
                        {uploading && (
                            <ActivityIndicator
                                style={{ position: "absolute", top: 40, left: 40 }}
                                size="large"
                                color="#3b82f6"
                            />
                        )}
                    </TouchableOpacity>
                </View>

                {user && (
                    <View className="px-6 w-full">
                        <Text className="text-base font-medium text-gray-700 mb-1">Name</Text>
                        <TextInput
                            value={newDetail.Name}
                            onChangeText={text => setNewDetail(prev => ({ ...prev, Name: text }))}
                            className="bg-gray-100 rounded-lg px-4 h-12 text-base mb-4 border border-gray-300"
                            placeholderTextColor="#6b7280"
                        />

                        <Text className="text-base font-medium text-gray-700 mb-1">Role</Text>
                        <SegmentedControl
                            values={["Student", "Tutor"]}
                            selectedIndex={newDetail.Role === "Tutor" ? 1 : 0}
                            onChange={event => {
                                const value = event.nativeEvent.selectedSegmentIndex === 1 ? "Tutor" : "Student";
                                setNewDetail(prev => ({ ...prev, Role: value }));
                            }}
                            className="mb-4"
                            tintColor="#3b82f6"
                        />

                        <Text className="text-base font-medium text-gray-700 mb-1">Bio</Text>
                        <TextInput
                            value={newDetail.Bio}
                            onChangeText={text => setNewDetail(prev => ({ ...prev, Bio: text }))}
                            className="bg-gray-100 rounded-lg px-4 h-12 text-base mb-4 border border-gray-300"
                            placeholderTextColor="#6b7280"
                            multiline
                        />

                        <Text className="text-base font-medium text-gray-700 mb-1">Date of Birth</Text>
                        <TextInput
                            value={newDetail.DOB}
                            onChangeText={text => setNewDetail(prev => ({ ...prev, DOB: text }))}
                            className="bg-gray-100 rounded-lg px-4 h-12 text-base mb-4 border border-gray-300"
                            placeholderTextColor="#6b7280"
                            placeholder="YYYY-MM-DD"
                        />

                        <Text className="text-base font-medium text-gray-700 mb-1">Email</Text>
                        <TextInput
                            value={newDetail.Email}
                            onChangeText={text => setNewDetail(prev => ({ ...prev, Email: text }))}
                            className="bg-gray-100 rounded-lg px-4 h-12 text-base mb-4 border border-gray-300"
                            placeholderTextColor="#6b7280"
                            keyboardType="email-address"
                        />

                        <Text className="text-base font-medium text-gray-700 mb-1">Location</Text>
                        <TextInput
                            value={newDetail.Location}
                            onChangeText={text => setNewDetail(prev => ({ ...prev, Location: text }))}
                            className="bg-gray-100 rounded-lg px-4 h-12 text-base mb-4 border border-gray-300"
                            placeholderTextColor="#6b7280"
                        />

                        <View className="flex-row justify-between mb-4">
                            <TouchableOpacity
                                onPress={handleCancel}
                                className="flex-1 mr-2 justify-center items-center bg-gray-300 rounded-lg h-12"
                            >
                                <Text className="text-lg font-medium text-gray-800">
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => handleSubmit(user.email)}
                                className="flex-1 ml-2 justify-center items-center bg-blue-500 rounded-lg h-12"
                            >
                                <Text className="text-lg font-medium text-white">
                                    Update
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => deleteUser(user.email)}
                            className="w-full justify-center items-center bg-red-600 rounded-lg h-12 mb-8"
                        >
                            <Text className="text-lg font-medium text-white">
                                Delete Account
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- PIN Section --- */}
                <View className="flex-1 bg-white p-6">
                    <Text className="text-xl mb-4">Security Settings</Text>
                    <TextInput
                        className="border p-4 mb-4 text-center text-xl text-black"
                        keyboardType="number-pad"
                        secureTextEntry
                        placeholder="Enter new PIN"
                        placeholderTextColor="black"
                        value={pin}
                        onChangeText={setPin}
                        maxLength={6}
                    />
                    <TouchableOpacity
                        className="bg-primary p-4 rounded"
                        onPress={handleSetPin}
                    >
                        <Text className="text-white text-center">
                            {currentPin ? "Change PIN" : "Set PIN"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    profileAvatar: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
});