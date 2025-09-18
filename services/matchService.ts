import { supabase } from "../app/supabase/initiliaze";

// Define the MentorMatch interface
export interface MentorMatch {
    mentorid: number;
    userid: string;
    mentor_name: string;
    compatibility_score: number;
    skills_score: number;
    roles_score: number;
    skill_overlap_count: number;
    role_overlap_count: number;
    mentor_experience_level: string;
    mentor_location?: string;
    mentor_hourly_rate?: number;
    mentor_availability?: number;
    mentor_bio?: string;
    mentor_certifications?: string[];
    matching_skills?: string[];
    matching_roles?: string[];
}

// Function to get mentor matches for a given mentee user ID
export const getMentorMatches = async (menteeUserId: string): Promise<MentorMatch[]> => {
    try {
        const { data, error } = await supabase.rpc("get_matches", { mentee_userid: menteeUserId });
        if (error) throw error;

        return (data || []).map((match: any) => ({
            mentorid: match.mentorid || match.userid,
            userid: match.userid,
            mentor_name: match.mentor_name,
            compatibility_score: parseFloat(match.compatibility_score || 0),
            skills_score: parseFloat(match.skills_score || 0),
            roles_score: parseFloat(match.roles_score || 0),
            skill_overlap_count: match.skill_overlap_count || 0,
            role_overlap_count: match.role_overlap_count || 0,
            mentor_experience_level: match.mentor_experience_level,
            mentor_location: match.mentor_location,
            mentor_hourly_rate: match.mentor_hourly_rate,
            mentor_availability: match.mentor_availability,
            mentor_bio: match.mentor_bio,
            mentor_certifications: match.mentor_certifications,
            matching_skills: match.matching_skills,
            matching_roles: match.matching_roles,
        }));
    } catch {
        return [];
    }
};