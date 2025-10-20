import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/initiliaze";
import Ionicons from "@expo/vector-icons/Ionicons";
import FontAwesome from "@expo/vector-icons/FontAwesome";

// Star rating component
const StarRating: React.FC<{ rating: number; size?: "sm" | "md" | "lg" }> = ({
  rating,
  size = "md",
}) => {
  const iconSize = size === "lg" ? 22 : size === "sm" ? 14 : 18;
  const filledCount = Math.round(rating);
  return (
    <View className="flex-row">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < filledCount;
        return (
          <FontAwesome
            key={i}
            name={filled ? "star" : "star-o"}
            size={iconSize}
            color={filled ? "#facc15" : "#d1d5db"}
            style={{ marginRight: 2 }}
          />
        );
      })}
    </View>
  );
};

// Rating bar for distribution
const RatingBar: React.FC<{ rating: number; count: number; total: number }> = ({
  rating,
  count,
  total,
}) => {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View className="flex-row items-center mb-2">
      <Text className="w-8 text-sm text-gray-700">{rating}</Text>
      <View className="flex-1 h-3 bg-gray-200 rounded-md mx-3 overflow-hidden">
        <View
          style={{ width: `${percent}%`, height: "100%", backgroundColor: "#facc15" }}
        />
      </View>
      <Text className="w-8 text-sm text-gray-600 text-right">{count}</Text>
    </View>
  );
};

// Testimonial card
const TestimonialCard: React.FC<{ testimonial: any }> = ({ testimonial }) => (
  <View className="bg-white rounded-lg p-3 mb-3 shadow-sm border border-gray-100">
    <View className="flex-row items-center mb-2">
      {testimonial.authorAvatar ? (
        <Image
          source={{ uri: testimonial.authorAvatar }}
          className="w-10 h-10 rounded-full mr-3"
        />
      ) : (
        <View className="w-10 h-10 rounded-full bg-gray-300 mr-3 items-center justify-center">
          <Ionicons name="person" size={18} color="white" />
        </View>
      )}
      <View>
        <Text className="font-semibold text-gray-800">
          {testimonial.authorName || "Anonymous"}
        </Text>
        <Text className="text-gray-500 text-sm">{testimonial.date || ""}</Text>
      </View>
    </View>
    <Text className="text-gray-700 italic">{testimonial.text}</Text>
  </View>
);

export default function MentorDetails() {
  const route = useRoute();
  const { mentorId } = route.params as { mentorId: number };
  const [mentor, setMentor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mentorId) {
      fetchMentorDetails(mentorId);
    }
  }, [mentorId]);

  async function fetchMentorDetails(mentorId: number) {
    setLoading(true); // start loading
    try {
      // Step 1: Fetch mentor + their testimonials
      const { data, error } = await supabase
        .from("mentors")
        .select(`
        *,
        user:user_id(*),
        testimonials(*)
      `)
        .eq("mentorid", mentorId)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Mentor not found");

      let finalData = data;

      // Step 2: Fetch mentee info if there are testimonials
      if (data?.testimonials?.length) {
        const menteeIds = data.testimonials.map((t: any) => t.mentee_id);

        const { data: mentees, error: menteesError } = await supabase
          .from("mentees")
          .select(`menteeid, user:user_id(name, email, "photoURL")`)
          .in("menteeid", menteeIds);

        if (menteesError) throw menteesError;

        // Step 3: Merge mentee user info
        const testimonialsWithMentees = data.testimonials.map((t: any) => {
          const mentee = mentees?.find((m: any) => m.menteeid === t.mentee_id);

          // handle case where user might be an array
          const userInfo = Array.isArray(mentee?.user)
            ? mentee?.user[0]
            : mentee?.user;

          return {
            ...t,
            authorName: userInfo?.name || "Anonymous",
            authorAvatar: userInfo?.photoURL || null,
            date: new Date(t.created_at).toLocaleDateString(),
            text: t.testimonial_text,
            rating: t.rating || 0,
          };
        });

        //  Compute average rating + counts
        const totalReviews = testimonialsWithMentees.length;
        type Testimonial = {
          rating: number;
          testimonial_text?: string;
          authorName?: string;
          authorAvatar?: string | null;
          date?: string;
          mentee_id?: number;
        };
        const ratingCounts = [1, 2, 3, 4, 5].reduce<Record<number, number>>(
          (acc, star) => {
            acc[star] = testimonialsWithMentees.filter(
              (t: Testimonial) => t.rating === star
            ).length;
            return acc;
          },
          {}
        );

        const averageRating =
          totalReviews > 0
            ? testimonialsWithMentees.reduce(
              (sum: number, t: Testimonial) => sum + (t.rating || 0),
              0
            ) / totalReviews
            : 0;


        finalData = {
          ...data,
          testimonials: testimonialsWithMentees,
          total_reviews: totalReviews,
          average_rating: averageRating,
          rating_1: ratingCounts[1],
          rating_2: ratingCounts[2],
          rating_3: ratingCounts[3],
          rating_4: ratingCounts[4],
          rating_5: ratingCounts[5],
        };
      }

      setMentor(finalData);
    } catch (error: any) {
      console.error("❌ Error fetching mentor details:", error.message || error);
    } finally {
      setLoading(false); // stop loading even if error
    }
  }


  if (loading)
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-2 text-gray-600">Loading mentor details...</Text>
      </View>
    );

  if (!mentor)
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-gray-600">Mentor not found</Text>
      </View>
    );

  const averageRating = mentor.average_rating ?? 0;

  const totalReviews = mentor.total_reviews || 32;

  return (
    <ScrollView className="flex-1 bg-[#FAF3E0] p-5">
      {/* --- Mentor Card Header --- */}
      <View className="bg-white rounded-3xl shadow-lg p-5 mb-6">
        <View className="items-center">
          {mentor.user?.photoURL ? (
            <Image
              source={{ uri: mentor.user.photoURL }}
              className="w-32 h-32 rounded-full mb-3"
            />
          ) : (
            <View className="w-32 h-32 rounded-full bg-gray-300 mb-3 items-center justify-center">
              <Ionicons name="person" size={50} color="white" />
            </View>
          )}

          {mentor.verified && (
            <Image
              source={require("@/assets/images/verified-badge.webp")}
              style={{
                width: 28,
                height: 28,
                position: "absolute",
                top: 90,
                right: 120,
              }}
            />
          )}

          <Text className="text-2xl font-bold text-gray-900">
            {mentor.user?.name || "Unknown Mentor"}
          </Text>
          {mentor.user?.location && (
            <Text className="text-gray-600 text-sm mt-1">
              {mentor.user.location}
            </Text>
          )}
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-around mt-5">
          <View className="items-center">
            <FontAwesome name="star" size={20} color="#facc15" />
            <Text className="font-bold text-gray-800 mt-1">
              {averageRating.toFixed(1)}
            </Text>
            <Text className="text-gray-500 text-sm">Rating</Text>
          </View>
          <View className="items-center">
            <Ionicons name="briefcase-outline" size={20} color="#3B82F6" />
            <Text className="font-bold text-gray-800 mt-1">
              {mentor.years_of_experience ?? "N/A"}
            </Text>
            <Text className="text-gray-500 text-sm">Years</Text>
          </View>
          <View className="items-center">
            <Ionicons name="school-outline" size={20} color="#10B981" />
            <Text className="font-bold text-gray-800 mt-1">
              {mentor.total_sessions ?? "25"}
            </Text>
            <Text className="text-gray-500 text-sm">Sessions</Text>
          </View>
        </View>
      </View>

      {/* --- About --- */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">About</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentor.bio || mentor.user?.bio || "No bio available"}
        </Text>
      </View>

      {/* --- Skills --- */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Skills</Text>
        {mentor.skills?.length ? (
          <View className="flex-row flex-wrap">
            {mentor.skills.map((skill: string, idx: number) => (
              <View
                key={idx}
                className="bg-[#3B82F6] px-3 py-1 rounded-full mr-2 mb-2"
              >
                <Text className="text-white text-sm">{skill}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-gray-700 italic">Not specified</Text>
        )}
      </View>

      {/* --- Specialisations --- */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Specialisations</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentor.specialization_roles?.join(", ") || "Not specified"}
        </Text>
      </View>

      {/* --- Experience --- */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-4">
        <Text className="font-bold text-lg mb-2">Experience</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentor.experience_level || "Not specified"} •{" "}
          {mentor.years_of_experience ?? "N/A"} years
        </Text>
      </View>

      {/* --- Certifications --- */}
      <View className="bg-[#bfd5e4ff] rounded-2xl p-4 shadow mb-6">
        <Text className="font-bold text-lg mb-2">Certifications</Text>
        <Text className="text-gray-700 italic pl-2">
          {mentor.certifications?.join(", ") || "None listed"}
        </Text>
      </View>

      {/* --- Testimonials --- */}
      <View className="bg-white rounded-3xl p-5 shadow mb-10 border border-gray-100">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="font-bold text-xl text-gray-900">Reviews</Text>
          {/* Inline rating display */}
          <View className="flex-row items-center space-x-1">
            <FontAwesome name="star" size={16} color="#facc15" />
            <Text className="text-gray-800 font-semibold">
              {mentor.average_rating ? mentor.average_rating.toFixed(1) : "0.0"}
            </Text>
            <Text className="text-gray-600">
              ({mentor.total_reviews ?? 0}{" "}review{mentor.total_reviews !== 1 ? "s" : ""})
            </Text>
          </View>

        </View>

        {/* Reviews Section */}
        <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">


          <View className="mb-4">
            <RatingBar rating={5} count={mentor.rating_5 ?? 0} total={mentor.total_reviews ?? 0} />
            <RatingBar rating={4} count={mentor.rating_4 ?? 0} total={mentor.total_reviews ?? 0} />
            <RatingBar rating={3} count={mentor.rating_3 ?? 0} total={mentor.total_reviews ?? 0} />
            <RatingBar rating={2} count={mentor.rating_2 ?? 0} total={mentor.total_reviews ?? 0} />
            <RatingBar rating={1} count={mentor.rating_1 ?? 0} total={mentor.total_reviews ?? 0} />

          </View>

          {mentor.testimonials?.map((testimonial: any) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}

          {mentor.hasMoreTestimonials && (
            <TouchableOpacity className="border border-gray-300 rounded-lg py-3 items-center mt-2">
              <Text className="text-gray-700 font-medium">Show More Reviews</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
