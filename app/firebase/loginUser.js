import { supabase } from '@/app/supabase/initiliaze'; // Ensure this path is correct

export default async function loginUser(email, password) {
    try {
        console.log("Attempting Supabase login for:", email);
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error("Supabase login error:", error.message);
            // You can customize error messages here if needed
            if (error.message.includes("Invalid login credentials")) {
                return "Invalid email or password. Please try again.";
            }
            if (error.message.includes("Email not confirmed")) {
                return "Your email address has not been confirmed. Please check your inbox for a verification email.";
            }
            return error.message; // Return Supabase's error message
        }

        if (data.user && data.session) {
            console.log("Supabase login successful. User:", data.user.email, "Session:", data.session ? "obtained" : "not obtained");
            // Optionally, you could return data.user or data.session if needed by the calling component
            return true; // Indicates success
        }

        // Fallback for unexpected scenarios where no error but no user/session
        console.warn("Supabase login: No error, but no user/session data returned.");
        return "Login failed. Please try again.";

    } catch (e) { // Catch any other unexpected errors
        console.error("Unexpected error during login:", e.message);
        return "An unexpected error occurred. Please try again.";
    }
}