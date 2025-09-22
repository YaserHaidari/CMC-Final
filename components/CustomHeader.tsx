// components/CustomHeader.tsx
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';

export default function CustomHeader({ title = "Home", showDrawerToggle = true }: { title?: string; showDrawerToggle?: boolean }) {
    const navigation = useNavigation();

    const handleDrawerToggle = () => {
        try {
            navigation.dispatch(DrawerActions.toggleDrawer());
        } catch (error) {
            console.warn('Drawer navigation not available');
        }
    };

    return (
        <View className="h-16 px-4 bg-white flex-row items-center">
            {showDrawerToggle ? (
                <TouchableOpacity 
                    className="flex-row items-center"
                    onPress={handleDrawerToggle}
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