import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { supabase } from '@/app/supabase/initiliaze';

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
          user_type: userType === 0 ? "Student" : "Tutor",
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

    // Step 4: Insert into the relevant table directly
    const role = userType === 0 ? "mentee" : "mentor"; // decide table
    let insertError, insertedData;

    if (role === "mentee") {
      const { data, error } = await supabase.from("mentees").insert({
        auth_userid: signUpData.user?.id, // foreign key to auth.users(id)
        name: name,
        email: email,
        photo_url: photoURL,
      }).select();
      insertError = error;
      insertedData = data;
    } else {
      const { data, error } = await supabase.from("mentors").insert({
        userid: signUpData.user?.id, // foreign key to auth.users(id)
        name: name,
        email: email,
        photo_url: photoURL,
      }).select();
      insertError = error;
      insertedData = data;
    }

    if (insertError) {
      console.error(`Supabase ${role} insert error:`, insertError.message);
      return `Supabase database error: ${insertError.message}`;
    }

    console.log(`Inserted ${role} record successfully:`, insertedData);
    return "successful";

  } catch (error) {
    console.error("Overall user creation error:", error.message);
    if (error.code) {
      return `Firebase error: ${error.message} (Code: ${error.code})`;
    }
    return error.message;
  }
}
