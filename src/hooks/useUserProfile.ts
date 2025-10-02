import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Database } from '../lib/supabase';

type UserProfile = Database['public']['Tables']['users']['Row'];

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', user!.id)
          .maybeSingle();

        if (error) throw error;
        setProfile(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return { error: new Error('No user logged in') };

    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('auth_user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return { data, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
  };
}
