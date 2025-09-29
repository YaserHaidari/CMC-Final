import { useEffect, useState } from "react";
import { ScrollView, View, TouchableOpacity, Text, Alert } from "react-native";
import { loadMentees, Mentee } from "../services/menteeService";
import { getMentorMatches, MentorMatch } from "../services/matchService";
import LoadingState from "../components/LoadingState";
import MenteeProfileCard from "../components/MenteeProfileCard";
import MentorMatchCard from "../components/MentorMatchCard";

// Main CyberMatch Screen Component
export default function CyberMatchScreen() {
    const [loading, setLoading] = useState(true);
    const [mentees, setMentees] = useState<Mentee[]>([]);
    const [currentMentee, setCurrentMentee] = useState<Mentee | null>(null);
    const [matches, setMatches] = useState<MentorMatch[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

    // Load mentees on component mount
    useEffect(() => {
        (async () => {
            const data = await loadMentees();
            setMentees(data);
            if (data.length > 0) setCurrentMentee(data[0]);
            setLoading(false);
        })();
    }, []);

    // Function to start matching process
    const startMatching = async () => {
        if (!currentMentee) return;
        setLoading(true);
        const foundMatches = await getMentorMatches(currentMentee.auth_userid);
        setMatches(foundMatches);
        setCurrentMatchIndex(0);
        setLoading(false);

        if (foundMatches.length === 0) {
            Alert.alert("No Matches", "No mentors found matching your criteria.");
        }
    };

    // Handle mentorship request
    const handleRequest = () => {
        Alert.alert("Success", "Mentorship request sent successfully!");
        handleNext();
    };

    // Move to next match or reset
    const handleNext = () => {
        if (currentMatchIndex + 1 < matches.length) {
            setCurrentMatchIndex(currentMatchIndex + 1);
        } else {
            setMatches([]);
        }
    };

    if (loading) return <LoadingState message="Fetching mentees..." />;

    return (
        <ScrollView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View style={{ padding: 16 }}>
            {currentMentee && <MenteeProfileCard mentee={currentMentee} />}

            {matches.length > 0 && matches[currentMatchIndex] ? (
            <MentorMatchCard
                match={matches[currentMatchIndex]}
                onNext={handleNext}
                onRequest={handleRequest}
                isLast={currentMatchIndex + 1 >= matches.length}
            />
            ) : (
            <TouchableOpacity
                style={{ backgroundColor: "#2563EB", padding: 16, borderRadius: 12, alignItems: "center" }}
                onPress={startMatching}
            >
                <Text style={{ color: "white", fontWeight: "600", fontSize: 16 }}>Find My Matches</Text>
            </TouchableOpacity>
            )}
        </View>
        </ScrollView>
    );
}