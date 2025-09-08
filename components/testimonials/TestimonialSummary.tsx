import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { TestimonialCard } from './TestimonialCard';
import {
  testimonialService,
  Testimonial,
  TestimonialStats
} from '@/services/testimonialService';

interface TestimonialsSummaryProps {
  mentorId: number;
  showWriteButton?: boolean;
  compact?: boolean;
}

const RatingBar = ({ rating, count, total }: { rating: number; count: number; total: number }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <View className="flex-row items-center space-x-2 mb-1">
      <Text className="text-sm text-gray-600 w-6">{rating}</Text>
      <View className="flex-1 bg-gray-200 rounded-full h-2">
        <View
          className="bg-yellow-500 rounded-full h-2"
          style={{ width: `${percentage}%` }}
        />
      </View>
      <Text className="text-sm text-gray-600 w-8">{count}</Text>
    </View>
  );
};

const StarRating = ({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) => {
  const textSize = size === 'lg' ? 'text-2xl' : 'text-base';
  
  return (
    <View className="flex-row items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          className={`${textSize} ${
            star <= Math.floor(rating) ? 'text-yellow-500' : 'text-gray-300'
          }`}
        >
          ★
        </Text>
      ))}
    </View>
  );
};

export const TestimonialsSummary: React.FC<TestimonialsSummaryProps> = ({
  mentorId,
  showWriteButton = false,
  compact = false
}) => {
  const [stats, setStats] = useState<TestimonialStats | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [canWrite, setCanWrite] = useState(false);

  useEffect(() => {
    loadTestimonialData();
    if (showWriteButton) {
      checkCanWriteTestimonial();
    }
  }, [mentorId]);

  const loadTestimonialData = async () => {
    try {
      setLoading(true);
      const [statsData, testimonialsData] = await Promise.all([
        testimonialService.getMentorStats(mentorId),
        testimonialService.getMentorTestimonials(mentorId, showMore ? 20 : 5)
      ]);

      setStats(statsData);
      setTestimonials(testimonialsData);
    } catch (error) {
      console.error('Error loading testimonial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCanWriteTestimonial = async () => {
    const isEligible = await testimonialService.isCurrentUserMentee();
    if (isEligible) {
      const menteeId = await testimonialService.getCurrentMenteeId();
      if (menteeId) {
        const canWriteReview = await testimonialService.canWriteTestimonial(mentorId, menteeId);
        setCanWrite(canWriteReview);
      }
    }
  };

  const handleWriteTestimonial = () => {
    router.push({
      pathname: '/writetestimonial',
      params: { mentorId: mentorId.toString() }
    });
  };

  const handleShowMore = () => {
    setShowMore(true);
    loadTestimonialData();
  };

  if (loading) {
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!stats || stats.total_reviews === 0) {
    return (
      <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <Text className="text-gray-600 text-center mb-4">No reviews yet</Text>
        {canWrite && showWriteButton && (
          <TouchableOpacity
            onPress={handleWriteTestimonial}
            className="bg-blue-600 rounded-lg py-3 px-6 items-center"
          >
            <Text className="text-white font-semibold">Write First Review</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (compact) {
    return (
      <View className="flex-row items-center space-x-3">
        <StarRating rating={stats.average_rating} />
        <Text className="text-gray-700 font-medium">
          {stats.average_rating.toFixed(1)} ({stats.total_reviews} reviews)
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <View>
          <Text className="text-2xl font-bold text-gray-900 mb-1">Reviews</Text>
          <View className="flex-row items-center space-x-3">
            <StarRating rating={stats.average_rating} size="lg" />
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                {stats.average_rating.toFixed(1)}
              </Text>
              <Text className="text-gray-600 text-sm">
                {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>
        
        {canWrite && showWriteButton && (
          <TouchableOpacity
            onPress={handleWriteTestimonial}
            className="bg-blue-600 rounded-lg py-2 px-4"
          >
            <Text className="text-white font-semibold">Write Review</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Rating Distribution */}
      <View className="mb-6">
        <RatingBar
          rating={5}
          count={stats.rating_5}
          total={stats.total_reviews}
        />
        <RatingBar
          rating={4}
          count={stats.rating_4}
          total={stats.total_reviews}
        />
        <RatingBar
          rating={3}
          count={stats.rating_3}
          total={stats.total_reviews}
        />
        <RatingBar
          rating={2}
          count={stats.rating_2}
          total={stats.total_reviews}
        />
        <RatingBar
          rating={1}
          count={stats.rating_1}
          total={stats.total_reviews}
        />
      </View>

      {/* Recent Testimonials */}
      <View>
        {testimonials.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
        
        {!showMore && testimonials.length >= 5 && (
          <TouchableOpacity
            onPress={handleShowMore}
            className="border border-gray-300 rounded-lg py-3 items-center mt-2"
          >
            <Text className="text-gray-700 font-medium">Show More Reviews</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};