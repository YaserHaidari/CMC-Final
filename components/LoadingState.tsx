import { View, ActivityIndicator, Text } from "react-native";

// A simple loading state component with an optional message prop
export default function LoadingState({ message }: { message?: string }) {
    return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={{ marginTop: 12, color: "#6B7280" }}>{message || "Loading..."}</Text>
        </View>
    );
}