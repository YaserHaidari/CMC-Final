import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { TestimonialCard } from '../components/TestimonialCard';
import {
  testimonialService,
  Testimonial,
  TestimonialStats
} from '../lib/testimonialService';

const RatingBar = ({ rating, count, total }: { rating: number; count: number; total: number }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <View className="flex-row items-center space-x-3 mb-2">
      <Text className="text-sm text-gray-600 w-6">{rating}</Text>
      <View className="flex-1 bg-gray-200 rounded-full h-3">
        <View
          className="bg-yellow-500 rounded-full h-3"
          style={{ width: `${percentage}%` }}
        />
      </View>
      <Text className="text-sm text-gray-600 w-8 text-right">{count}</Text>
    </View>
  );
};

const StarRating = ({ rating }: { rating: number }) => (
  <View className="flex-row items-center space-x-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <Text
        key={star}
        className={`text-2xl ${
          star <= Math.floor(rating) ? 'text-yellow-500' : 'text-gray-300'
        }`}
      >
        ★
      </Text>
    ))}
  </View>
);

export default function TestimonialsScreen() {
  const { mentorId, mentorName } = useLocalSearchParams<{
    mentorId: string;   // this is the UUID now
    mentorName?: string;
  }>();
  
  const [stats, setStats] = useState<TestimonialStats | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [canWrite, setCanWrite] = useState(false);

  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (mentorId) {
      loadInitialData();
      checkCanWriteTestimonial();
    }
  }, [mentorId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await loadTestimonialData(true);
    } finally {
      setLoading(false);
    }
  };

  const loadTestimonialData = async (reset = false) => {
    try {
      const offset = reset ? 0 : testimonials.length;

      const [statsData, testimonialsData] = await Promise.all([
        testimonialService.getMentorStats(mentorId), // ✅ no parseInt
        testimonialService.getMentorTestimonials(
          mentorId,
          ITEMS_PER_PAGE,
          offset
        )
      ]);

      setStats(statsData);
      setTestimonials(reset ? testimonialsData : [...testimonials, ...testimonialsData]);
      setHasMore(testimonialsData.length === ITEMS_PER_PAGE);
    } catch (error) {
      console.error('Error loading testimonial data:', error);
    }
  };

  const checkCanWriteTestimonial = async () => {
    const isEligible = await testimonialService.isCurrentUserMentee();
    if (isEligible) {
      const menteeId = await testimonialService.getCurrentMenteeId();
      if (menteeId) {
        const canWriteReview = await testimonialService.canWriteTestimonial(
          mentorId,  // ✅ UUID not int
          menteeId
        );
        setCanWrite(canWriteReview);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTestimonialData(true);
    await checkCanWriteTestimonial();
    setRefreshing(false);
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadTestimonialData(false);
    setLoadingMore(false);
  };

  const handleWriteTestimonial = () => {
    router.push({
      pathname: '/writeTestimonial',
      params: { mentorId } // ✅ keep UUID
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading reviews...</Text>
      </View>
    );
  }

  if (!stats || stats.total_reviews === 0) {
    return (
      <ScrollView 
        className="flex-1 bg-gray-50"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View className="p-4">
          <View className="bg-white rounded-xl p-8 items-center shadow-sm border border-gray-100">
            <Text className="text-6xl mb-4">📝</Text>
            <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
              No Reviews Yet
            </Text>
            <Text className="text-gray-600 text-center mb-6 leading-relaxed">
              {mentorName ? `${mentorName} hasn't` : "This mentor hasn't"} received any reviews yet. 
              Be the first to share your experience!
            </Text>
            {canWrite && (
              <TouchableOpacity
                onPress={handleWriteTestimonial}
                className="bg-blue-600 rounded-xl py-4 px-8"
              >
                <Text className="text-white font-semibold text-lg">
                  Write First Review
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-gray-50"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="p-4">
        {/* Header Card */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                {mentorName ? `${mentorName}'s Reviews` : 'Reviews'}
              </Text>
              <View className="flex-row items-center space-x-4">
                <StarRating rating={stats.average_rating} />
                <View>
                  <Text className="text-3xl font-bold text-gray-900">
                    {stats.average_rating.toFixed(1)}
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
            {canWrite && (
              <TouchableOpacity
                onPress={handleWriteTestimonial}
                className="bg-blue-600 rounded-lg py-3 px-4"
              >
                <Text className="text-white font-semibold">Write Review</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Rating Distribution */}
          <View className="border-t border-gray-100 pt-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Rating Distribution
            </Text>
            <RatingBar rating={5} count={stats.rating_5} total={stats.total_reviews} />
            <RatingBar rating={4} count={stats.rating_4} total={stats.total_reviews} />
            <RatingBar rating={3} count={stats.rating_3} total={stats.total_reviews} />
            <RatingBar rating={2} count={stats.rating_2} total={stats.total_reviews} />
            <RatingBar rating={1} count={stats.rating_1} total={stats.total_reviews} />
          </View>
        </View>

        {/* Testimonials List */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4 px-1">
            All Reviews ({stats.total_reviews})
          </Text>
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </View>

        {/* Load More */}
        {hasMore && (
          <TouchableOpacity
            onPress={handleLoadMore}
            disabled={loadingMore}
            className="bg-white border border-gray-300 rounded-xl py-4 items-center mb-6"
          >
            {loadingMore ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#6B7280" />
                <Text className="text-gray-600 font-medium ml-2">Loading more...</Text>
              </View>
            ) : (
              <Text className="text-gray-700 font-medium">Load More Reviews</Text>
            )}
          </TouchableOpacity>
        )}
        {!hasMore && testimonials.length > 0 && (
          <View className="items-center py-4">
            <Text className="text-gray-500 text-sm">You've seen all reviews</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}