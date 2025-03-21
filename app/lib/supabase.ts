import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rbxevkgabanoluykkbls.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJieGV2a2dhYmFub2x1eWtrYmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MzczMzUsImV4cCI6MjA1ODExMzMzNX0.1AZHNzwmqqG9lHe3jQE7pUIolx9k8CCqzq5gGk6nDzg';

// Create a Supabase client configured to use cookies
export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => {
          if (typeof window !== 'undefined') {
            return window.localStorage.getItem(key);
          }
          return null;
        },
        setItem: (key, value) => {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, value);
          }
        },
        removeItem: (key) => {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(key);
          }
        }
      }
    }
  }
);

// Set up a global event listener to refresh auth on expiry
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session ? 'Session valid' : 'No session');
    
    // When session is established, log details to help debug
    if (session) {
      console.log('User authenticated:', session.user.id);
      console.log('Session expires at:', new Date(session.expires_at! * 1000).toISOString());
    }
  });
}

// Helper function to get the current session
export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting session:', error);
    return null;
  }
  return data.session;
};

// Helper function to handle Supabase auth errors
export const handleSupabaseError = (error: any) => {
  if (error.code === 'auth/invalid-email') {
    return 'Invalid email address';
  } else if (error.code === 'auth/user-not-found') {
    return 'User not found';
  } else if (error.code === 'auth/wrong-password') {
    return 'Incorrect password';
  } else if (error.code === 'auth/email-already-in-use') {
    return 'Email already in use';
  } else {
    return error.message || 'An unexpected error occurred';
  }
}; 