import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { testimonialService } from '../lib/testimonialService';

const StarRatingInput = ({
  rating,
  onRatingChange
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
}) => {
  return (
    <View className="flex-row items-center space-x-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
          <Text
            className={`text-3xl ${
              star <= rating ? 'text-yellow-500' : 'text-gray-300'
            }`}
          >
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function WriteTestimonialScreen() {
  const { mentorId } = useLocalSearchParams<{ mentorId: string }>();
  const [rating, setRating] = useState(0);
  const [testimonialText, setTestimonialText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);
  const [existingTestimonial, setExistingTestimonial] = useState<any>(null);

  const maxLength = 500;
  const minLength = 10;
  const charactersRemaining = maxLength - testimonialText.length;
  const isTextValid = testimonialText.length >= minLength && testimonialText.length <= maxLength;
  const isRatingValid = rating >= 1 && rating <= 5;
  const isFormValid = isTextValid && isRatingValid;

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      if (!mentorId) {
        Alert.alert('Error', 'Invalid mentor ID');
        router.back();
        return;
      }

      const isEligible = await testimonialService.isCurrentUserMentee();
      if (!isEligible) {
        Alert.alert(
          'Not Authorized',
          'Only students can write testimonials for mentors.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      const menteeId = await testimonialService.getCurrentMenteeId();
      if (!menteeId) {
        Alert.alert('Error', 'Could not find your student profile');
        router.back();
        return;
      }

      // Check if testimonial already exists
      const existing = await testimonialService.getExistingTestimonial(
        parseInt(mentorId),
        menteeId
      );

      if (existing) {
        setExistingTestimonial(existing);
        if (!existing.is_approved) {
          // Allow editing if not approved yet
          setRating(existing.rating);
          setTestimonialText(existing.testimonial_text);
          setCanSubmit(true);
        } else {
          Alert.alert(
            'Review Already Submitted',
            'You have already submitted a review for this mentor.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }
      } else {
        setCanSubmit(true);
      }
    } catch (error) {
      console.error('Error checking eligibility:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid || !canSubmit) return;

    try {
      setIsSubmitting(true);

      const menteeId = await testimonialService.getCurrentMenteeId();
      if (!menteeId) {
        throw new Error('Could not find your student profile');
      }

      if (existingTestimonial && !existingTestimonial.is_approved) {
        // Update existing testimonial
        const success = await testimonialService.updateTestimonial(
          existingTestimonial.id,
          {
            testimonial_text: testimonialText,
            rating: rating
          }
        );

        if (success) {
          Alert.alert(
            'Review Updated!',
            'Your review has been updated and is pending approval.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        } else {
          throw new Error('Failed to update review');
        }
      } else {
        // Create new testimonial
        await testimonialService.createTestimonial({
          mentor_id: parseInt(mentorId!),
          mentee_id: menteeId,
          testimonial_text: testimonialText,
          rating: rating
        });

        Alert.alert(
          'Review Submitted!',
          'Thank you for your review. It will be visible after approval.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error: any) {
      console.error('Error submitting testimonial:', error);
      
      let errorMessage = 'An error occurred while submitting your review.';
      
      if (error.message?.includes('duplicate')) {
        errorMessage = 'You have already submitted a review for this mentor.';
      } else if (error.message?.includes('foreign key')) {
        errorMessage = 'Invalid mentor or student information.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-gray-600 mt-4">Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4">
        {/* Header */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            {existingTestimonial ? 'Edit Your Review' : 'Write a Review'}
          </Text>
          <Text className="text-gray-600">
            Share your experience to help other students find great mentors.
          </Text>
        </View>

        {/* Rating Section */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            How would you rate this mentor?
          </Text>
          <View className="items-center mb-4">
            <StarRatingInput rating={rating} onRatingChange={setRating} />
            <Text className="text-gray-600 mt-2">
              {rating === 0 && 'Tap a star to rate'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </Text>
          </View>
          {!isRatingValid && rating > 0 && (
            <Text className="text-red-500 text-sm mt-2">
              Please select a rating between 1 and 5 stars.
            </Text>
          )}
        </View>

        {/* Review Text Section */}
        <View className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Tell us about your experience
          </Text>
          <View className="border border-gray-300 rounded-lg p-4 mb-2">
            <TextInput
              value={testimonialText}
              onChangeText={setTestimonialText}
              placeholder="Share details about your mentoring experience. What did you learn? How did this mentor help you achieve your goals?"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="text-base text-gray-900 min-h-[120px]"
              maxLength={maxLength}
            />
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-sm text-gray-500">
              Minimum {minLength} characters required
            </Text>
            <Text className={`text-sm ${
              charactersRemaining < 50 ? 'text-red-500' : 'text-gray-500'
            }`}>
              {charactersRemaining} characters remaining
            </Text>
          </View>
          {testimonialText.length > 0 && !isTextValid && (
            <Text className="text-red-500 text-sm mt-2">
              {testimonialText.length < minLength 
                ? `Please write at least ${minLength} characters.`
                : 'Your review is too long. Please shorten it.'
              }
            </Text>
          )}
        </View>

        {/* Guidelines */}
        <View className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
          <Text className="text-blue-900 font-semibold mb-2">Review Guidelines</Text>
          <Text className="text-blue-800 text-sm leading-relaxed">
            • Be honest and specific about your experience{'\n'}
            • Focus on the mentor's teaching style and helpfulness{'\n'}
            • Keep it constructive and professional{'\n'}
            • Your review will be visible after approval
          </Text>
        </View>

        {/* Submit Button */}
        <View className="pb-8">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className={`rounded-xl py-4 px-6 items-center ${
              isFormValid && !isSubmitting
                ? 'bg-blue-600'
                : 'bg-gray-300'
            }`}
          >
            {isSubmitting ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-semibold ml-2">
                  {existingTestimonial ? 'Updating...' : 'Submitting...'}
                </Text>
              </View>
            ) : (
              <Text className={`font-semibold text-lg ${
                isFormValid ? 'text-white' : 'text-gray-500'
              }`}>
                {existingTestimonial ? 'Update Review' : 'Submit Review'}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 py-3 items-center"
          >
            <Text className="text-gray-600 font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}