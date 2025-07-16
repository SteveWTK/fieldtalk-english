// src/lib/hooks/useUserRole.js
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/AuthProvider';

export function useUserRole() {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchUserProfile() {
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        // Get role-specific data based on user type
        let roleData = null;
        if (profile.user_type === 'player') {
          const { data } = await supabase
            .from('players')
            .select(`
              *,
              clubs:club_id (
                id,
                name,
                country,
                league,
                logo_url
              )
            `)
            .eq('id', user.id)
            .single();
          roleData = data;
        } else if (profile.user_type === 'client_admin') {
          const { data } = await supabase
            .from('client_admins')
            .select(`
              *,
              clubs:club_id (
                id,
                name,
                country,
                league,
                logo_url
              )
            `)
            .eq('id', user.id)
            .single();
          roleData = data;
        } else if (profile.user_type === 'platform_admin') {
          const { data } = await supabase
            .from('platform_admins')
            .select('*')
            .eq('id', user.id)
            .single();
          roleData = data;
        }

        setUserProfile({ ...profile, roleData });
      } catch (err) {
        setError(err.message);
        console.error('Error fetching user profile:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserProfile();
  }, [user]);

  const hasPermission = (permission) => {
    if (!userProfile) return false;
    
    // Platform admins have all permissions
    if (userProfile.user_type === 'platform_admin') return true;
    
    // Client admins check their specific permissions
    if (userProfile.user_type === 'client_admin') {
      return userProfile.roleData?.permissions?.includes(permission) || false;
    }
    
    // Players have basic permissions
    if (userProfile.user_type === 'player') {
      const playerPermissions = ['view_own_progress', 'access_lessons', 'view_profile'];
      return playerPermissions.includes(permission);
    }
    
    return false;
  };

  const isRole = (role) => {
    return userProfile?.user_type === role;
  };

  return {
    userProfile,
    loading,
    error,
    hasPermission,
    isRole,
    isPlayer: () => isRole('player'),
    isClientAdmin: () => isRole('client_admin'),
    isPlatformAdmin: () => isRole('platform_admin'),
  };
}