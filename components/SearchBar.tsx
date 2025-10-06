import { View, TextInput } from 'react-native';
import React from 'react';
import Ionicons from "@expo/vector-icons/Ionicons";

interface Props {
    placeholder: string;               // Placeholder text for the input field
    onPress?: () => void;              // Optional handler when the input is pressed
    value: string;                     // Current text inside the search bar
    onChangeText: (text: string) => void; // Handler for text change events
    placeholderTextColor?: string;          // Optional placeholder text color
}

// Build for the searchbar itself
const SearchBar = ({ placeholder, onPress, value, onChangeText, placeholderTextColor }: Props) => {
    return (

        <View className={"flex-1 mt-4 mx-8 mb-5"}>


            <View
                className={
                    "flex-row items-center bg-white rounded-full px-5 h-16 border border-gray-400"
                }
            >

                <Ionicons name="search-outline" size={24} color="black" />


                <TextInput
                    className="flex-1 ml-2 font-Text text-lg font-normal text-gray-800"
                    textAlignVertical="center"
                    onPress={onPress}
                    placeholder={placeholder}
                    value={value}
                    onChangeText={onChangeText}
                    placeholderTextColor={placeholderTextColor}
                />
            </View>
        </View>
    )
}

export default SearchBar;
