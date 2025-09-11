import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import Fontisto from '@expo/vector-icons/Fontisto';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomHeader from "@/components/CustomHeader";


function SettingsScreen() {
    return (
        <View className=" flex-1 bg-white">
            <ScrollView>
            <CustomHeader />
                <Text className="text-3xl font-bold font-Title text-black text-center pb-4">
                    Settings
                </Text>
            <View className=
                "flex-row items-center self-center bg-white rounded-full w-5/6 px-5 h-16 border border-gray-400">
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
            </ScrollView>
        </View>
    );
}

export default SettingsScreen;