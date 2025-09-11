import { mockTestimonialStats, mockTestimonials } from './testimonialMockData';
import { Testimonial, TestimonialStats, CreateTestimonialData } from './testimonialService';

class TestimonialServiceMock {
  async getMentorStats(mentorId: number): Promise<TestimonialStats> {
    // You could create different stats for different mentors
    return mockTestimonialStats;
  }

  async getMentorTestimonials(
    mentorId: number,
    limit: number = 5,
    offset: number = 0
  ): Promise<Testimonial[]> {
    // You could filter testimonials based on mentorId
    return mockTestimonials.slice(offset, offset + limit);
  }

  async canWriteTestimonial(mentorId: number, menteeId: number): Promise<boolean> {
    return true;
  }

  async createTestimonial(testimonialData: CreateTestimonialData): Promise<boolean> {
    return true;
  }

  async getCurrentMenteeId(): Promise<number | null> {
    return 205;
  }

  async isCurrentUserMentee(): Promise<boolean> {
    return true;
  }

  async getExistingTestimonial(mentorId: number, menteeId: number): Promise<any> {
    return null;
  }
}

export const testimonialServiceMock = new TestimonialServiceMock();