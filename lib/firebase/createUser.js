import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { supabase } from '../supabase/initiliaze';

export default async function createUser(email, password, name, photoURL, userType) {
  const auth = getAuth();
  try {
    // Step 1: Create user in Firebase (optional for profile storage)
    console.log("Creating Firebase user...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user } = userCredential;

    // Step 2: Update Firebase user profile
    console.log("Updating Firebase profile...");
    await updateProfile(user, {
      displayName: name,
      photoURL: photoURL,
    });
    console.log("Firebase profile updated for:", user.email);

    // Step 3: Create user in Supabase Auth
    console.log("Creating Supabase auth user...");
    const { data: signUpData, error: supabaseAuthError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          user_type: userType === 0 ? "Mentee" : "Mentor",
          photo_url: photoURL,
        }
      }
    });

    if (supabaseAuthError) {
      console.error("Supabase auth error:", supabaseAuthError.message);
      return `Supabase auth error: ${supabaseAuthError.message}`;
    }

    console.log(
      "Supabase auth user created. Email:", signUpData.user?.email,
      "Email verification status:", signUpData.user?.email_confirmed_at || "pending"
    );

    // Step 4: Insert into users table (main table)
    console.log("Creating user record in users table...");
    const { data: userData, error: usersError } = await supabase.from("users").insert({
      user_type: userType === 0 ? "Mentee" : "Mentor",
      photoURL: photoURL || "",
      email: email,
      name: name,
      bio: "",
      location: "",
      DOB: null,
      pin_enabled: false,
      pin: null,
      acc_status: "active",
      auth_user_id: signUpData.user?.id // Set the UUID from Supabase auth
    }).select();

    if (usersError) {
      console.error("Supabase users table insert error:", usersError.message);
      return `Supabase users table error: ${usersError.message}`;
    }

    console.log("User record created successfully:", userData);

    // Step 5: Insert into specific role table (mentees only for now)
    if (userType === 0) { // Student/Mentee
      console.log("Creating mentee record...");
      const { data: menteeData, error: menteeError } = await supabase.from("mentees").insert({
        user_id: userData[0].auth_user_id, // UUID from auth_user_id field
        skills: [],
        target_roles: [],
        current_level: "Beginner", // Must be one of: 'Beginner', 'Intermediate', 'Advanced'
        study_level: "Undergraduate", // Must be one of the allowed values
        field: "",
        learning_goals: "",
        preferred_mentoring_style: "",
        time_commitment_hours_per_week: 0
      }).select();

      if (menteeError) {
        console.error("Supabase mentees insert error:", menteeError.message);
        return `Supabase mentees table error: ${menteeError.message}`;
      }

      console.log("Mentee record created successfully:", menteeData);
    } else { // Tutor/Mentor
      console.log("Creating mentor record...");
      const { data: mentorData, error: mentorError } = await supabase.from("mentors").insert({
        user_id: userData[0].auth_user_id, // UUID from auth_user_id field
        bio: "",
        hourly_rate: null,
        skills: [],
        specialization_roles: [],
        experience_level: "Mid-level", // Default value
        years_of_experience: 0,
        teaching_style: [],
        max_mentees: 5,
        current_mentees: 0,
        availability_hours_per_week: null,
        industries: [],
        certifications: [],
        verified: false,
        active: true,
        upvotes: 0,
        downvotes: 0
      }).select();

      if (mentorError) {
        console.error("Supabase mentors insert error:", mentorError.message);
        return `Supabase mentors table error: ${mentorError.message}`;
      }

      console.log("Mentor record created successfully:", mentorData);
    }
    return "successful";

  } catch (error) {
    console.error("Overall user creation error:", error.message);
    if (error.code) {
      return `Firebase error: ${error.message} (Code: ${error.code})`;
    }
    return error.message;
  }
}
