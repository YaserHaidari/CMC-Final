import React from 'react';
import { View, Text, Image } from 'react-native';
import { Testimonial } from '../lib/testimonialService';

interface TestimonialCardProps {
  testimonial: Testimonial;
}

const StarRating = ({ rating }: { rating: number }) => {
  return (
    <View className="flex-row items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          className={`text-lg ${
            star <= rating ? 'text-yellow-500' : 'text-gray-300'
          }`}
        >
          ★
        </Text>
      ))}
    </View>
  );
};

export const TestimonialCard: React.FC<TestimonialCardProps> = ({ testimonial }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
      {/* Header with user info and rating */}
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-row items-center flex-1">
          {testimonial.mentee_avatar_url ? (
            <Image
              source={{ uri: testimonial.mentee_avatar_url }}
              className="w-10 h-10 rounded-full mr-3"
            />
          ) : (
            <View className="w-10 h-10 rounded-full bg-gray-300 mr-3 items-center justify-center">
              <Text className="text-gray-600 font-semibold text-sm">
                {testimonial.mentee_name.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="font-semibold text-gray-900 text-base">
              {testimonial.mentee_name}
            </Text>
            <Text className="text-gray-500 text-sm">
              {formatDate(testimonial.created_at)}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <StarRating rating={testimonial.rating} />
          {testimonial.is_featured && (
            <View className="bg-blue-100 px-2 py-1 rounded-full mt-1">
              <Text className="text-blue-700 text-xs font-medium">Featured</Text>
            </View>
          )}
        </View>
      </View>

      {/* Testimonial text */}
      <Text className="text-gray-700 text-base leading-relaxed">
        "{testimonial.testimonial_text}"
      </Text>
    </View>
  );
};