// src/hooks/useTranslation.js
// Custom hook for getting user translations

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getTranslation, getTranslations } from '@/utils/translations';

/**
 * Custom hook to get user's preferred language and translations
 * @returns {Object} { userLanguage, t, translations, loading }
 */
export function useTranslation(user = null) {
  const [userLanguage, setUserLanguage] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserLanguage() {
      if (!user?.id) {
        setUserLanguage('en');
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('players')
          .select('preferred_language')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          setUserLanguage(data.preferred_language || 'en');
        } else {
          console.error('Error fetching user language preference:', error);
          setUserLanguage('en');
        }
      } catch (err) {
        console.error('Error in fetchUserLanguage:', err);
        setUserLanguage('en');
      } finally {
        setLoading(false);
      }
    }

    fetchUserLanguage();
  }, [user?.id]);

  // Translation function
  const t = (key, fallback = '') => getTranslation(key, userLanguage, fallback);

  // Multiple translations function
  const translations = (keys) => getTranslations(keys, userLanguage);

  return {
    userLanguage,
    t,
    translations,
    loading
  };
}