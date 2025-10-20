// fetchMentorsAPI.ts
import { supabase } from "@/lib/supabase/initiliaze";

export const fetchMentors = async (query?: string) => {
  let request = supabase
    .from("mentors")
    .select("*, user:user_id(*)"); // join user info

  if (query && query.trim()) {
    // search by mentor's user name
    request = request.ilike("user->name", `%${query}%`);
  }

  const { data, error } = await request;

  if (error) {
    throw new Error(`Error fetching mentors: ${error.message}`);
  }

  return data || [];
};
