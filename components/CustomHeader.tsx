// components/CustomHeader.tsx
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { useRouter } from 'expo-router';

export default function CustomHeader({ title = "Home", showDrawerToggle = true }: { title?: string; showDrawerToggle?: boolean }) {
    const router = useRouter();

    const handleMenuPress = () => {
        // For now, let's navigate to different screens instead of trying to toggle drawer
        // This is a workaround until we can get the drawer toggle working properly
        console.log('Menu pressed - implement navigation to drawer screens');
    };

    return (
        <View className="h-16 px-4 bg-white flex-row items-center">
            {showDrawerToggle ? (
                <TouchableOpacity 
                    className="flex-row items-center"
                    onPress={handleMenuPress}
                >
                    <AntDesign className="mr-2" name="menu-fold" size={21} color="black" />
                    <Text className="text-lg font-semibold font-Menu">Menu</Text>
                </TouchableOpacity>
            ) : (
                <Text className="text-lg font-semibold">{title}</Text>
            )}
        </View>
    );
}