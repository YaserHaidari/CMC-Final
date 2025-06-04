import { useState } from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";

// Dummy cybersecurity traits
const CYBER_TRAITS = [
  "Incident Response",
  "Python (Programming Language)",
  "Risk Management",
  "Penetration Testing",
  "Cloud Security",
  "Linux",
  "Security Controls",
  "Digital Forensics",
  "Firewall",
  "Data Analysis",
  "Vulnerability Management",
  "Operating Systems",
  "JavaScript (Programming Language)",
  "Amazon Web Services",
  "Identity And Access Management",
  "Network Engineering",
];

// Dummy current student user
const currentStudent = {
  id: "student123",
  name: "Alex Johnson",
  user_type: "student",
  traits: [
    "Python (Programming Language)",
    "Incident Response",
    "Linux",
    "Cloud Security",
    "Penetration Testing",
  ],
  photoURL: null,
};

// Dummy tutors data (varying number of traits)
const dummyTutors = [
  {
    id: "tutor1",
    name: "Dr. Emily Carter",
    user_type: "tutor",
    traits: ["Incident Response", "Risk Management", "Cloud Security", "Firewall"],
    photoURL: "https://avatar.iran.liara.run/public/98",
  },
  {
    id: "tutor2",
    name: "Michael Lee",
    user_type: "tutor",
    traits: [
      "Penetration Testing",
      "Linux",
      "Security Controls",
      "Operating Systems",
      "Python (Programming Language)",
    ],
    photoURL: "https://avatar.iran.liara.run/public/2",
  },
  {
    id: "tutor3",
    name: "Sarah Kim",
    user_type: "tutor",
    traits: ["Python (Programming Language)", "Cloud Security", "Risk Management"],
    photoURL: "https://avatar.iran.liara.run/public/73",
  },
  {
    id: "tutor4",
    name: "Priya Singh",
    user_type: "tutor",
    traits: ["Digital Forensics", "Incident Response"],
    photoURL: "https://avatar.iran.liara.run/public/96",
  },
  {
    id: "tutor5",
    name: "James Smith",
    user_type: "tutor",
    traits: ["Amazon Web Services", "Identity And Access Management", "Linux"],
    photoURL: "https://avatar.iran.liara.run/public/14",
  },
  {
    id: "tutor6",
    name: "Linda Zhao",
    user_type: "tutor",
    traits: [
      "Network Engineering",
      "Cloud Security",
      "Penetration Testing",
      "Data Analysis",
    ],
    photoURL: "https://avatar.iran.liara.run/public/91",
  },
  {
    id: "tutor7",
    name: "Carlos Martinez",
    user_type: "tutor",
    traits: ["JavaScript (Programming Language)", "Python (Programming Language)"],
    photoURL: "https://avatar.iran.liara.run/public/19",
  },
];

interface Tutor {
  id: string;
  name: string;
  photoURL?: string | null;
  user_type: string;
  traits: string[];
}

function CyberMatchScreen() {
  const [matching, setMatching] = useState(false);
  const [currentTutor, setCurrentTutor] = useState<Tutor | null>(null);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);

  function getRecommendedTutors() {
    // Tutors with at least one matching trait come first, sorted by number of matches
    const withMatch = [...dummyTutors]
      .map((tutor) => ({
        ...tutor,
        matchCount: tutor.traits.filter((trait) => currentStudent.traits.includes(trait)).length,
      }))
      .sort((a, b) => b.matchCount - a.matchCount);

    return withMatch;
  }

  function startMatching() {
    setMatching(true);
    setMatchIndex(0);
    const recommended = getRecommendedTutors();
    setTutors(recommended);
    setCurrentTutor(recommended[0]);
  }

  function handleNext() {
    if (matchIndex + 1 < tutors.length) {
      setMatchIndex(matchIndex + 1);
      setCurrentTutor(tutors[matchIndex + 1]);
    } else {
      Alert.alert("End", "No more tutors to show.");
      setMatching(false);
      setCurrentTutor(null);
    }
  }

  function handleRequestMentorship(tutorId: string) {
    Alert.alert("Success", "Mentorship request sent successfully!");
    handleNext();
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-4">
      {!matching ? (
        <View className="items-center">
          <Text className="text-3xl font-bold text-blue-700 mb-2 text-center">
            Find Your Mentor Match
          </Text>
          <Image
            source={{ uri: "https://avatar.iran.liara.run/public/" }}
            className="w-32 h-32 mb-4 rounded-full border-4 border-blue-200"
          />
          <Text className="text-base text-gray-700 mb-4 text-center">
            Student:{" "}
            <Text className="font-semibold text-blue-900">{currentStudent.name}</Text>
          </Text>
          <Text className="text-base text-gray-700 mb-2 text-center">
            Your Cybersecurity Interests:
          </Text>
          <View className="flex-row flex-wrap justify-center mb-6">
            {currentStudent.traits.map((trait) => (
              <Text
                key={trait}
                className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-base font-semibold m-1"
              >
                {trait}
              </Text>
            ))}
          </View>
          <TouchableOpacity
            className="bg-blue-600 px-8 py-4 rounded-full shadow-lg active:bg-blue-700"
            onPress={startMatching}
          >
            <Text className="text-white text-lg font-semibold tracking-wide">
              Start Matching
            </Text>
          </TouchableOpacity>
        </View>
      ) : currentTutor ? (
        <View className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 items-center">
          <Image
            source={
              currentTutor.photoURL
                ? { uri: currentTutor.photoURL }
                : { uri: "https://avatar.iran.liara.run/public/0" }
            }
            className="w-28 h-28 rounded-full border-4 border-blue-200 mb-4"
          />
          <Text className="text-2xl font-bold text-blue-800 mb-1">
            {currentTutor.name}
          </Text>
          <Text className="text-base text-blue-500 mb-2 capitalize">
            {currentTutor.user_type}
          </Text>
          <Text className="text-base text-gray-700 mb-2">Expertise:</Text>
          <View className="flex-row flex-wrap justify-center mb-6">
            {currentTutor.traits.map((trait) => (
              <Text
                key={trait}
                className={`px-4 py-2 rounded-full text-base font-semibold m-1 ${
                  currentStudent.traits.includes(trait)
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {trait}
              </Text>
            ))}
          </View>
          <View className="flex-row w-full justify-between mt-2">
            <TouchableOpacity
              className="flex-1 bg-blue-100 py-3 rounded-full mr-2 items-center"
              onPress={handleNext}
            >
              <Text className="text-blue-700 font-semibold text-base">Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-blue-600 py-3 rounded-full ml-2 items-center"
              onPress={() => handleRequestMentorship(currentTutor.id)}
            >
              <Text className="text-white font-semibold text-base">
                Request Mentorship
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text className="text-lg text-gray-400 mt-10">No more tutors to show.</Text>
      )}
    </View>
  );
}

export default CyberMatchScreen;