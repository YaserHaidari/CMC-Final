import { View, Text, Image, FlatList, ActivityIndicator, TouchableOpacity, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import CustomHeader from "@/components/CustomHeader";
import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/initiliaze";
import { useRouter } from "expo-router";
import SearchBar from "@/components/SearchBar";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HISTORY_KEY = "MENTOR_SEARCH_HISTORY";

const FindMentors = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load history from AsyncStorage on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem(HISTORY_KEY);
        if (storedHistory) setSearchHistory(JSON.parse(storedHistory));
      } catch (err) {
        console.error("Error loading search history:", err);
      }
    };
    loadHistory();
  }, []);

  // Save history to AsyncStorage
  const saveHistory = async (history: string[]) => {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (err) {
      console.error("Error saving search history:", err);
    }
  };

  // Add a search term to history
  const addToHistory = (searchText: string) => {
    const text = searchText.trim();
    if (!text) return;

    setSearchHistory((prev) => {
      const newHistory = prev.includes(text) ? prev : [text, ...prev].slice(0, 10); // max 10
      saveHistory(newHistory);
      return newHistory;
    });
  };

  const clearHistory = async () => {
    setSearchHistory([]);
    await AsyncStorage.removeItem(HISTORY_KEY);
  };

  useEffect(() => {
    const loadMentors = async () => {
      if (!query.trim()) {
        setMentors([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("mentors")
          .select("mentorid, bio, user:user_id(id, name, photoURL)")
          .ilike("user.name", `%${query}%`)
          .not("mentorid", "is", null);

        if (error) throw error;

        const filtered = (data || []).filter(
          (m) =>
            m.user?.name?.toLowerCase().includes(query.toLowerCase()) ||
            m.bio?.toLowerCase().includes(query.toLowerCase())
        );

        setMentors(filtered);

        // Add first matching mentor name to history
        if (filtered.length > 0) {
          addToHistory(filtered[0].user?.name || query);
        }
      } catch (err) {
        console.error("Error fetching mentors:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMentors();
  }, [query]);

  return (
    <View className="flex-1 bg-[#FAF3E0] pt-1">
      <CustomHeader />

      <FlatList
        data={mentors}
        keyExtractor={(item, index) =>
          item?.mentorid ? item.mentorid.toString() : index.toString()
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/mentorProfile",
                params: { mentorId: String(item.mentorid) },
              })
            }
            className="flex-row items-center bg-white rounded-xl shadow-sm px-4 py-3 mb-3 mx-4"
          >
            {item.user?.photoURL ? (
              <Image
                source={{ uri: item.user.photoURL }}
                className="h-12 w-12 rounded-full mr-3"
              />
            ) : (
              <View className="h-12 w-12 rounded-full bg-gray-300 mr-3 items-center justify-center">
                <Ionicons name="person-circle-outline" size={28} color="white" />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-gray-900 font-semibold text-base">
                {item.user?.name?.trim() || "Mentor"}
              </Text>
              <Text className="text-gray-600 text-sm mt-1">
                {item.bio || "No bio available"}
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <>
            {/* Search Bar */}
            <SearchBar
              value={query}
              onChangeText={(text) => setQuery(text)}
              placeholder="Search for a mentor..."
              placeholderTextColor="#9CA3AF"
            />

            {/* Recent Searches */}
            {searchHistory.length > 0 && !query && (
              <View className="mx-4 mt-4 mb-2">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-lg font-semibold text-gray-700">Recent Searches</Text>
                  <TouchableOpacity onPress={clearHistory}>
                    <Text className="text-blue-500 font-medium">Clear</Text>
                  </TouchableOpacity>
                </View>

                {searchHistory.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setQuery(item)}
                    className="flex-row items-center bg-white rounded-xl px-4 py-3 mb-3 shadow-sm"
                  >
                    <View className="h-12 w-12 rounded-full bg-gray-200 mr-3 items-center justify-center shadow">
                      <Ionicons name="person-circle-outline" size={28} color="#6B7280" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold text-base">{item}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {loading && <ActivityIndicator size="small" className="my-2" />}
          </>
        }
        ListEmptyComponent={
          !loading && query.trim().length > 0 && (
            <Text className="text-center text-gray-500 mt-6 text-base">
              No mentors found for "{query}"
            </Text>
          )
        }
      />
    </View>
  );
};

export default FindMentors;
