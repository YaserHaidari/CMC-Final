import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import Fontisto from '@expo/vector-icons/Fontisto';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { savePIN, getPIN, deletePIN } from '@/lib/storage';
import { useState, useEffect } from "react";


function SettingsScreen() {
    const [pin, setPin] = useState("");
    const [currentPin, setCurrentPin] = useState("");

    useEffect(() => {
        async function fetchPin() {
            const storedPin = await getPIN();
            if (storedPin) setCurrentPin(storedPin);
        }
        fetchPin();
    }, []);

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

    return (
        <View className="flex-1 bg-white">
            <ScrollView>
                <Text className="text-3xl font-bold font-Title text-black text-center pb-4">
                    Settings
                </Text>
                <View className="flex-row items-center self-center bg-white rounded-full w-5/6 px-5 h-16 border border-gray-400">
                    <Ionicons name='search' size={20} className='ml-2' color="black" />
                    <TextInput
                        placeholder='Search'
                        className='text-lg ml-2'
                    />
                </View>

                <Text className='text-xl font-bold mt-4 ml-8'>
                    Account Details
                </Text>
                <TouchableOpacity className='flex-row self-center items-center mt-4 p-4 border border-stone-400 w-5/6 rounded-t-lg'>
                    <Fontisto name='email' size={30} className='ml-2' color="black" />
                    <Text className='text-lg ml-4'>
                        Email Address
                    </Text>
                    <AntDesign name='right' size={20} className='ml-auto' color="black" />
                </TouchableOpacity>
                <TouchableOpacity className='flex-row self-center items-center p-4 border-x border-stone-400 w-5/6'>
                    <MaterialIcons name='password' size={30} className='ml-2' color="black" />
                    <Text className='text-lg ml-4'>
                        Password
                    </Text>
                    <AntDesign name='right' size={20} className='ml-auto' color="black" />
                </TouchableOpacity>
                <TouchableOpacity className='flex-row self-center items-center p-4 border border-stone-400 w-5/6 rounded-b-lg'>
                    <Fontisto name='date' size={30} className='ml-2' color="black" />
                    <Text className='text-lg ml-4'>
                        Date of Birth
                    </Text>
                    <AntDesign name='right' size={20} className='ml-auto' color="black" />
                </TouchableOpacity>

                <Text className='text-xl font-bold mt-4 ml-8'>
                    Account Privacy
                </Text>
                <TouchableOpacity className='flex-row self-center items-center mt-4 p-4 border border-stone-400 w-5/6 rounded-t-lg'>
                    <Ionicons name='notifications-outline' size={30} className='ml-2' color="black" />
                    <Text className='text-lg ml-4'>
                        Notifications
                    </Text>
                    <AntDesign name='right' size={20} className='ml-auto' color="black" />
                </TouchableOpacity>
                <TouchableOpacity className='flex-row self-center items-center p-4 border-x border-b border-stone-400 w-5/6 rounded-b-lg'>
                    <Ionicons name='location-outline' size={30} className='ml-2' color="black" />
                    <Text className='text-lg ml-4'>
                        Location
                    </Text>
                    <AntDesign name='right' size={20} className='ml-auto' color="black" />
                </TouchableOpacity>
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
        </View>
    );
}

export default SettingsScreen;