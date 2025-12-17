import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'PASSWORD_RECOVERY') {
          setSession(session);
          setUser(session?.user ?? null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data: allowedEmails, error: checkError } = await supabase
        .from('allowed_emails')
        .select('email')
        .ilike('email', email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking allowed emails:', checkError);
        return { error: new Error('Erreur lors de la vérification de l\'email') };
      }

      if (!allowedEmails) {
        return { error: new Error('Cet email n\'est pas autorisé à se connecter. Contactez l\'administrateur.') };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('SignIn error:', error);
        return { error };
      }

      console.log('SignIn successful:', data);
      return { error: null };
    } catch (err) {
      console.error('SignIn exception:', err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const { data: allowedEmails, error: checkError } = await supabase
        .from('allowed_emails')
        .select('email')
        .ilike('email', email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking allowed emails:', checkError);
        return { error: new Error('Erreur lors de la vérification de l\'email') };
      }

      if (!allowedEmails) {
        return { error: new Error('Cet email n\'est pas autorisé à créer un compte. Contactez l\'administrateur.') };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (error) {
        console.error('SignUp error:', error);
        return { error };
      }

      if (data.user) {
        if (data.session) {
          console.log('User signed up and logged in immediately:', data);
          return { error: null };
        }

        if (!data.user.email_confirmed_at) {
          console.log('Confirming email for new user...');
          const confirmResponse = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, password }),
            }
          );

          if (!confirmResponse.ok) {
            console.error('Failed to confirm email');
            const errorText = await confirmResponse.text();
            console.error('Error details:', errorText);
            return { error: new Error('Failed to confirm email') };
          }

          await new Promise(resolve => setTimeout(resolve, 1000));

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            console.error('Auto sign-in error:', signInError);
            return { error: null };
          }

          console.log('SignUp and auto sign-in successful:', signInData);
        }
      }

      return { error: null };
    } catch (err) {
      console.error('SignUp exception:', err);
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    try {
      const { data: allowedEmails, error: checkError } = await supabase
        .from('allowed_emails')
        .select('email')
        .ilike('email', email)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking allowed emails:', checkError);
        return { error: new Error('Erreur lors de la vérification de l\'email') };
      }

      if (!allowedEmails) {
        return { error: new Error('Cet email n\'est pas autorisé. Contactez l\'administrateur.') };
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });

      if (error) {
        console.error('Reset password error:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('Reset password exception:', err);
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Update password error:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('Update password exception:', err);
      return { error: err };
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
