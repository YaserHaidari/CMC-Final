// Import a configured Supabase client instance
import { supabase } from "@/app/(supabase)/initiliaze";

// Function to fetch mentors from the database
export const fetchMentors = async (query?: string) => {

    let request = supabase
        .from("users")
        .select("*")
        .eq("user_type", "Mentor"); // only get rows where user_type = 'Mentor'

    // If a search query is not just empty spaces, it filters to match a mentors name
    if (query && query.trim()) {
        request = request.or(`name.ilike.%${query}%`);
    }

    // Execute the built request
    const { data, error } = await request;

    // Handle the potential errors
    if (error) {
        throw new Error(`Error fetching mentors: ${error.message}`);
    }

    return data;
};
