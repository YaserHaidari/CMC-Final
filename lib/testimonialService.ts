import { supabase } from "./supabase/initiliaze";

export interface Testimonial {
  id: string;
  testimonial_text: string;
  rating: number;
  created_at: string;
  is_featured: boolean;
  mentee_name: string;
  mentee_avatar_url?: string;
}

export interface TestimonialStats {
  total_reviews: number;
  average_rating: number;
  rating_1: number;
  rating_2: number;
  rating_3: number;
  rating_4: number;
  rating_5: number;
}

export interface CreateTestimonialData {
  mentorUserId: string; // UUID of mentor from users table
  mentee_id: number;
  testimonial_text: string;
  rating: number;
}

class TestimonialService {
  // --- Helper to convert mentor UUID to mentorid PK ---
  private async getMentorIdFromUserId(mentorUserId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from("mentors")
        .select("mentorid")
        .eq("user_id", mentorUserId)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Mentor not found");
      return data.mentorid;
    } catch (err) {
      console.error("Error resolving mentorid from user_id:", err);
      throw err;
    }
  }

  async createTestimonial(testimonialData: CreateTestimonialData): Promise<boolean> {
    try {
      // Convert mentor UUID to mentorid (int)
      const mentorId = await this.getMentorIdFromUserId(testimonialData.mentorUserId);

      const { error } = await supabase
        .from("testimonials")
        .insert({
          mentor_id: mentorId,
          mentee_id: testimonialData.mentee_id,
          testimonial_text: testimonialData.testimonial_text,
          rating: testimonialData.rating,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error creating testimonial:", error);
      throw error;
    }
  }

  async updateTestimonial(
    testimonialId: string,
    updates: Partial<Pick<CreateTestimonialData, 'testimonial_text' | 'rating'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('testimonials')
        .update(updates)
        .eq('id', testimonialId)
        .eq('is_approved', false);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating testimonial:', error);
      return false;
    }
  }

  async getCurrentMenteeId(): Promise<number | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('mentees')
        .select('menteeid')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data?.menteeid || null;
    } catch (error) {
      console.error('Error getting current mentee ID:', error);
      return null;
    }
  }

  async isCurrentUserMentee(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('users')
        .select('user_type')
        .eq('auth_user_id', user.id)
        .single();

      if (error) throw error;
      return data?.user_type === 'Mentee';
    } catch (error) {
      console.error('Error checking user type:', error);
      return false;
    }
  }

  async getExistingTestimonial(mentorUserId: string, menteeId: number): Promise<any> {
    try {
      const mentorId = await this.getMentorIdFromUserId(mentorUserId);

      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('mentor_id', mentorId)
        .eq('mentee_id', menteeId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error getting existing testimonial:', error);
      return null;
    }
  }

  async getUserNameById(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("name")
        .eq("auth_user_id", userId)
        .single();

      if (error) throw error;
      return data?.name || null;
    } catch (err) {
      console.error("Error fetching user name:", err);
      return null;
    }
  }
}

export const testimonialService = new TestimonialService();