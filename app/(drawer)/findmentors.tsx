import { View, Text, TextInput, Image, FlatList, ActivityIndicator } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import CustomHeader from "@/components/CustomHeader";
import React, { useState, useEffect } from "react";
import { fetchMentors } from "@/components/fetchMentorsAPI";
import { useRouter } from "expo-router";
import SearchBar from "@/components/SearchBar";

const FindMentors = () => {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [mentors, setMentors] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Runs every time the search changes
    useEffect(() => {
        const loadMentors = async () => {
            setLoading(true);
            try {
                if (query.trim()) {
                    // If search query is not empty, fetch filtered results
                    const results = await fetchMentors(query);
                    setMentors(results || []);
                } else {
                    // Otherwise fetch all mentors
                    const results = await fetchMentors();
                    setMentors(results || []);
                }
            } catch (err) {
                // If something goes wrong, log error and reset list
                console.error("Error fetching mentors:", err);
                setMentors([]);
            } finally {
                setLoading(false);
            }
        };

        loadMentors();
    }, [query]);

    return (
        <View className="flex-1 bg-stone-100 pt-10">

            <CustomHeader />


            <FlatList
                data={mentors} // array of mentors to render
                keyExtractor={(item, index) =>
                    item?.name ? item.name.toString() : index.toString()
                }


                renderItem={({ item }) => (
                    <View className="flex-row items-center px-4 py-3 border-b border-gray-200">
                        {/* Fetches their profile picture (or placeholder if missing) */}
                        {item.photoURL ? (
                            <Image
                                source={{ uri: item.photoURL }}
                                className="h-12 w-12 rounded-full mr-3"
                            />
                        ) : (
                            <View className="h-12 w-12 rounded-full bg-gray-300 mr-3 items-center justify-center">
                                <Ionicons name="person" size={20} color="white" />
                            </View>
                        )}

                        {/* Mentor details */}
                        <View className="flex-1">
                            <Text className="font-semibold text-gray-900">{item.name}</Text>
                            <Text className="text-gray-600 text-sm">
                                {item.bio || "No bio available"}
                            </Text>
                        </View>
                    </View>
                )}

                // if theres no matches it shows an empty list
                ListEmptyComponent={
                    !loading && (
                        <Text className="text-center text-gray-500 mt-6">
                            No mentors found
                        </Text>
                    )
                }

                ListHeaderComponent={
                    <>
                        {/* Search bar for typing queries */}
                        <View>
                            <SearchBar
                                value={query}
                                onChangeText={(text:string) => setQuery(text)}
                                placeholder="Search for a mentor..."
                                placeholderTextColor="#9CA3AF"

                            />
                        </View>

                        {loading && (
                            <ActivityIndicator size="small" className="my-2"/>
                        )}

                        {!loading && query.trim().length > 0 && (
                            <Text className="text-base text-gray-800 pl-4 pb-1">
                                Search mentors for "{query}"
                            </Text>
                        )}
                    </>
                }
            />
        </View>
    );
};

export default FindMentors;
