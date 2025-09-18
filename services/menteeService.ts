import { supabase } from "../app/supabase/initiliaze";

// Define the Mentee interface
export interface Mentee {
    menteeid: number;
    auth_userid: string;
    bio?: string;
    skills: string[];
    target_roles: string[];
    current_level: string;
    location?: string;
    learning_goals?: string;
    study_level?: string;
    field?: string;
}

// Function to load mentees from the database
export const loadMentees = async (): Promise<Mentee[]> => {
    try {
        const { data, error } = await supabase
        .from("mentees")
        .select(`
            menteeid,
            auth_userid,
            bio,
            skills,
            target_roles,
            current_level,
            location,
            learning_goals,
            study_level,
            field
        `)
        .limit(5);

        if (error) throw error;
        return data || [];
    } catch {
        return [];
    }
};