"use client";

import React, { useState, useEffect } from "react";
import { Settings, Globe, Volume2, Save, Check } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function SettingsContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    english_variant: 'british', // british or american
    preferred_language: 'en',
    voice_gender: 'male', // male or female
  });

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('players')
          .select('english_variant, preferred_language, voice_gender')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading settings:', error);
        } else if (data) {
          setSettings({
            english_variant: data.english_variant || 'british',
            preferred_language: data.preferred_language || 'en',
            voice_gender: data.voice_gender || 'male',
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadSettings();
    }
  }, [user]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({
          english_variant: settings.english_variant,
          preferred_language: settings.preferred_language,
          voice_gender: settings.voice_gender,
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving settings:', error);
        alert('Failed to save settings. Please try again.');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Customise your FieldTalk English learning experience
        </p>
      </div>

      <div className="space-y-6">
        {/* English Variant Setting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-4">
            <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                English Variant
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Choose between British and American English for AI feedback, pronunciation, and vocabulary.
              </p>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="english_variant"
                    value="british"
                    checked={settings.english_variant === 'british'}
                    onChange={(e) => updateSetting('english_variant', e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      British English
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Colour, realise, centre, pitch, kit, football boots
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="english_variant"
                    value="american"
                    checked={settings.english_variant === 'american'}
                    onChange={(e) => updateSetting('english_variant', e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      American English
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Color, realize, center, field, uniform, soccer cleats
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Gender Setting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-4">
            <Volume2 className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Voice Gender
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Choose your preferred voice gender for text-to-speech audio.
              </p>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="voice_gender"
                    value="male"
                    checked={settings.voice_gender === 'male'}
                    onChange={(e) => updateSetting('voice_gender', e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      Male Voice
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {settings.english_variant === 'british' ? 'British male voice (Onyx)' : 'American male voice (Echo)'}
                    </p>
                  </div>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="voice_gender"
                    value="female"
                    checked={settings.voice_gender === 'female'}
                    onChange={(e) => updateSetting('voice_gender', e.target.value)}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      Female Voice
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {settings.english_variant === 'british' ? 'British female voice (Fable)' : 'American female voice (Nova)'}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Interface Language Setting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-4">
            <Globe className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Interface Language
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Choose your preferred language for instructions, feedback, and interface elements.
              </p>
              
              <select
                value={settings.preferred_language}
                onChange={(e) => updateSetting('preferred_language', e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="pt-BR">Português (Brasil)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}