"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getPlayerProfile } from "@/lib/supabase/queries";
import {
  QrCode,
  Plus,
  Download,
  Users,
  BarChart3,
  Copy,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Admin page to create and manage QR access code campaigns.
 * Allows generating QR codes, viewing campaign analytics, and managing settings.
 */
export default function QRCampaignsAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [campaignSessions, setCampaignSessions] = useState({});
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formCampaignName, setFormCampaignName] = useState("");
  const [formCampaignLocation, setFormCampaignLocation] = useState("");
  const [formDestination, setFormDestination] = useState("/dashboard");
  const [formAccessTier, setFormAccessTier] = useState("premium");
  const [formDuration, setFormDuration] = useState(72);
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formWelcome, setFormWelcome] = useState("");
  const [formWelcomePt, setFormWelcomePt] = useState("");
  const [formWelcomeTh, setFormWelcomeTh] = useState("");
  const [formExpires, setFormExpires] = useState("");

  const fetchCampaigns = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Fetching campaigns...");
      const res = await fetch("/api/guest-access/campaigns", {
        credentials: "include",
      });
      const data = await res.json();
      console.log("Campaigns response:", res.status, data);
      if (res.ok) {
        setCampaigns(data.campaigns || []);
        setSummary(data.summary || null);
      } else {
        console.error("Campaigns API error:", data.error);
        toast.error(data.error || "Failed to load campaigns");
      }
    } catch {
      console.error("Error fetching campaigns");
      toast.error("Failed to load campaigns");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadUserAndCampaigns = async () => {
      try {
        console.log("Loading user profile for:", user.id);
        const profile = await getPlayerProfile(user.id);
        console.log("Profile loaded:", profile?.user_type);
        setUserProfile(profile);
        if (profile?.user_type === "platform_admin") {
          await fetchCampaigns();
        } else {
          console.log("User is not platform_admin, stopping load");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        setIsLoading(false);
      }
    };

    if (!authLoading && user) {
      loadUserAndCampaigns();
    } else if (!authLoading && !user) {
      // User not logged in, stop loading
      setIsLoading(false);
    }
  }, [user, authLoading, fetchCampaigns]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const res = await fetch("/api/guest-access/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: formName,
          campaignName: formCampaignName || null,
          campaignLocation: formCampaignLocation || null,
          destinationPath: formDestination,
          accessTier: formAccessTier,
          durationHours: Number(formDuration),
          maxUses: formMaxUses ? Number(formMaxUses) : null,
          welcomeMessage: formWelcome || null,
          welcomeMessagePt: formWelcomePt || null,
          welcomeMessageTh: formWelcomeTh || null,
          expiresAt: formExpires
            ? new Date(formExpires).toISOString()
            : null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to create campaign");
        return;
      }

      toast.success(`QR code created: ${data.code}`);
      setShowCreateForm(false);
      resetForm();
      fetchCampaigns();
    } catch (err) {
      console.error("Error creating campaign:", err);
      toast.error("Failed to create campaign");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setFormName("");
    setFormCampaignName("");
    setFormCampaignLocation("");
    setFormDestination("/dashboard");
    setFormAccessTier("premium");
    setFormDuration(72);
    setFormMaxUses("");
    setFormWelcome("");
    setFormWelcomePt("");
    setFormWelcomeTh("");
    setFormExpires("");
  };

  const toggleActive = async (campaignId, currentActive) => {
    try {
      const res = await fetch(`/api/guest-access/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ is_active: !currentActive }),
      });

      if (res.ok) {
        toast.success(
          `Campaign ${!currentActive ? "activated" : "deactivated"}`
        );
        fetchCampaigns();
      }
    } catch {
      toast.error("Failed to update campaign");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const downloadQR = useCallback(async (url, code) => {
    try {
      // Dynamic import of qrcode library
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 512,
        margin: 2,
        color: {
          dark: "#1a365d",
          light: "#ffffff",
        },
      });

      const link = document.createElement("a");
      link.download = `qr-${code}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Error generating QR:", err);
      toast.error("Failed to generate QR code. Is the qrcode package installed?");
    }
  }, []);

  const loadCampaignDetail = async (campaignId) => {
    if (expandedCampaign === campaignId) {
      setExpandedCampaign(null);
      return;
    }

    try {
      const res = await fetch(
        `/api/guest-access/campaigns/${campaignId}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (res.ok) {
        setCampaignSessions((prev) => ({
          ...prev,
          [campaignId]: data.sessions || [],
        }));
      }
    } catch (err) {
      console.error("Error loading campaign detail:", err);
    }
    setExpandedCampaign(campaignId);
  };

  // Loading
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent-600" />
      </div>
    );
  }

  // Admin guard
  if (!user || userProfile?.user_type !== "platform_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Admin Access Required
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You need platform admin access to view this page.
          </p>
        </div>
      </div>
    );
  }

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://fieldtalk.app";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <QrCode className="w-8 h-8 text-accent-600" />
            QR Campaigns
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage QR code access campaigns for guest users
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Campaigns"
            value={summary.total_campaigns}
            icon={<QrCode className="w-5 h-5" />}
          />
          <StatCard
            label="Active Campaigns"
            value={summary.active_campaigns}
            icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          />
          <StatCard
            label="Total Activations"
            value={summary.total_activations}
            icon={<Users className="w-5 h-5 text-blue-500" />}
          />
          <StatCard
            label="Conversions"
            value={summary.total_conversions}
            icon={<BarChart3 className="w-5 h-5 text-purple-500" />}
          />
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Create New QR Campaign
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name (required) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Rayong Garden Entry QR"
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Campaign name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={formCampaignName}
                  onChange={(e) => setFormCampaignName(e.target.value)}
                  placeholder="e.g., rayong-botanical-2026"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formCampaignLocation}
                  onChange={(e) => setFormCampaignLocation(e.target.value)}
                  placeholder="e.g., Rayong Botanical Gardens, Thailand"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Destination path */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Destination Path
                </label>
                <input
                  type="text"
                  value={formDestination}
                  onChange={(e) => setFormDestination(e.target.value)}
                  placeholder="/dashboard"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Access tier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Access Tier
                </label>
                <select
                  value={formAccessTier}
                  onChange={(e) => setFormAccessTier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="full">Full</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  min={1}
                  max={8760}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Max uses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Uses (blank = unlimited)
                </label>
                <input
                  type="number"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  min={1}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Code expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Code Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formExpires}
                  onChange={(e) => setFormExpires(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Welcome messages */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Welcome Messages (optional, shown on activation)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    English
                  </label>
                  <textarea
                    value={formWelcome}
                    onChange={(e) => setFormWelcome(e.target.value)}
                    rows={2}
                    placeholder="Welcome to Rayong Botanical Gardens!"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Portuguese
                  </label>
                  <textarea
                    value={formWelcomePt}
                    onChange={(e) => setFormWelcomePt(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Thai
                  </label>
                  <textarea
                    value={formWelcomeTh}
                    onChange={(e) => setFormWelcomeTh(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating || !formName}
                className="px-6 py-2 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    Create QR Code
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns list */}
      <div className="space-y-4">
        {campaigns.length === 0 && !isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
            <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No campaigns yet. Create your first QR code campaign above.
            </p>
          </div>
        )}

        {campaigns.map((campaign) => {
          const qrUrl = `${baseUrl}/guest/${campaign.code}`;
          const isExpired =
            campaign.expires_at &&
            new Date(campaign.expires_at) < new Date();
          const isActive = campaign.is_active && !isExpired;
          const isExpanded = expandedCampaign === campaign.id;
          const sessions = campaignSessions[campaign.id] || [];

          return (
            <div
              key={campaign.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Campaign header */}
              <div className="p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                        {campaign.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {isActive ? "Active" : isExpired ? "Expired" : "Inactive"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 font-medium">
                        {campaign.access_tier}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {campaign.campaign_location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {campaign.campaign_location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {campaign.duration_hours}h access
                      </span>
                      {campaign.max_uses && (
                        <span>
                          {campaign.current_uses}/{campaign.max_uses} uses
                        </span>
                      )}
                      {!campaign.max_uses && (
                        <span>{campaign.current_uses} uses</span>
                      )}
                    </div>

                    {/* Code + URL */}
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-accent-700 dark:text-accent-300">
                        {campaign.code}
                      </code>
                      <button
                        onClick={() => downloadQR(qrUrl, campaign.code)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Download QR"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Copy Link Button - for sharing via WhatsApp, SMS, etc. */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => copyToClipboard(qrUrl)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent-50 hover:bg-accent-100 dark:bg-accent-900/30 dark:hover:bg-accent-900/50 text-accent-700 dark:text-accent-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </button>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Share via WhatsApp, SMS, or email
                      </span>
                    </div>
                  </div>

                  {/* Stats + actions */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {campaign.stats?.total_sessions || 0}
                        </p>
                        <p className="text-xs text-gray-500">Guests</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {campaign.stats?.converted || 0}
                        </p>
                        <p className="text-xs text-gray-500">Converted</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-accent-600 dark:text-accent-400">
                          {campaign.conversion_rate}%
                        </p>
                        <p className="text-xs text-gray-500">Rate</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          toggleActive(campaign.id, campaign.is_active)
                        }
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title={
                          campaign.is_active ? "Deactivate" : "Activate"
                        }
                      >
                        {campaign.is_active ? (
                          <ToggleRight className="w-6 h-6 text-green-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                      <button
                        onClick={() => loadCampaignDetail(campaign.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded detail: sessions list */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 md:p-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Guest Sessions ({sessions.length})
                  </h4>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No guest sessions yet for this campaign.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {sessions.map((s) => {
                        const isConverted = !!s.converted_at;
                        const isSessionExpired =
                          new Date(s.expires_at) < new Date();
                        return (
                          <div
                            key={s.id}
                            className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-3">
                              {isConverted ? (
                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                              ) : isSessionExpired ? (
                                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              )}
                              <span className="text-gray-700 dark:text-gray-300">
                                {isConverted
                                  ? s.converted_to_email
                                  : `Guest (${s.user_id?.slice(0, 8)}...)`}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <span>
                                {new Date(s.started_at).toLocaleDateString()}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  isConverted
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : isSessionExpired
                                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                }`}
                              >
                                {isConverted
                                  ? "Converted"
                                  : isSessionExpired
                                    ? "Expired"
                                    : "Active"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
