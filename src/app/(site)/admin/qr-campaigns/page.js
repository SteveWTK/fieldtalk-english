"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getPlayerProfile } from "@/lib/supabase/queries";
import {
  QrCode,
  Plus,
  Download,
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
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import StatTile from "@/components/ui/stat-tile";

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
      <div className="min-h-screen flex items-center justify-center bg-primary-900">
        <Loader2 className="w-8 h-8 animate-spin text-accent-400" />
      </div>
    );
  }

  // Admin guard
  if (!user || userProfile?.user_type !== "platform_admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-900">
        <div className="text-center p-8">
          <XCircle className="w-12 h-12 text-signal-alert mx-auto mb-4" />
          <h1 className="text-xl font-bold text-primary-50">
            Admin Access Required
          </h1>
          <p className="text-primary-300 mt-2">
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
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary-50 flex items-center gap-3">
              <QrCode className="w-8 h-8 text-accent-400" />
              QR Campaigns
            </h1>
            <p className="text-primary-300 mt-1">
              Create and manage QR code access campaigns for guest users
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setShowCreateForm(!showCreateForm)}
            Icon={Plus}
          >
            New Campaign
          </Button>
        </div>

      {/* Summary stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatTile
            label="Total Campaigns"
            value={summary.total_campaigns}
          />
          <StatTile
            label="Active Campaigns"
            value={summary.active_campaigns}
          />
          <StatTile
            label="Total Activations"
            value={summary.total_activations}
          />
          <StatTile
            label="Conversions"
            value={summary.total_conversions}
            tone="accent"
          />
        </div>
      )}

      {/* Create form */}
      {showCreateForm && (
        <div className="bg-primary-panel rounded-card p-6 mb-8 border border-primary-700">
          <h2 className="text-xl font-bold text-primary-50 mb-4">
            Create New QR Campaign
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name (required) */}
              <Input
                label="Name *"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Rayong Garden Entry QR"
                required
              />

              {/* Campaign name */}
              <Input
                label="Campaign Name"
                type="text"
                value={formCampaignName}
                onChange={(e) => setFormCampaignName(e.target.value)}
                placeholder="e.g., rayong-botanical-2026"
              />

              {/* Location */}
              <Input
                label="Location"
                type="text"
                value={formCampaignLocation}
                onChange={(e) => setFormCampaignLocation(e.target.value)}
                placeholder="e.g., Rayong Botanical Gardens, Thailand"
              />

              {/* Destination path */}
              <Input
                label="Destination Path"
                type="text"
                value={formDestination}
                onChange={(e) => setFormDestination(e.target.value)}
                placeholder="/dashboard"
              />

              {/* Access tier */}
              <Select
                label="Access Tier"
                value={formAccessTier}
                onChange={(e) => setFormAccessTier(e.target.value)}
                options={[
                  { value: "basic", label: "Basic" },
                  { value: "premium", label: "Premium" },
                  { value: "full", label: "Full" },
                ]}
              />

              {/* Duration */}
              <Input
                label="Duration (hours)"
                type="number"
                value={formDuration}
                onChange={(e) => setFormDuration(e.target.value)}
                min={1}
                max={8760}
              />

              {/* Max uses */}
              <Input
                label="Max Uses (blank = unlimited)"
                type="number"
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
                min={1}
                placeholder="Unlimited"
              />

              {/* Code expiration */}
              <Input
                label="Code Expires At (optional)"
                type="datetime-local"
                value={formExpires}
                onChange={(e) => setFormExpires(e.target.value)}
              />
            </div>

            {/* Welcome messages */}
            <div className="border-t border-primary-700 pt-4 mt-4">
              <h3 className="text-sm font-medium text-primary-100 mb-3">
                Welcome Messages (optional, shown on activation)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="English"
                  multiline
                  rows={2}
                  value={formWelcome}
                  onChange={(e) => setFormWelcome(e.target.value)}
                  placeholder="Welcome to Rayong Botanical Gardens!"
                />
                <Input
                  label="Portuguese"
                  multiline
                  rows={2}
                  value={formWelcomePt}
                  onChange={(e) => setFormWelcomePt(e.target.value)}
                />
                <Input
                  label="Thai"
                  multiline
                  rows={2}
                  value={formWelcomeTh}
                  onChange={(e) => setFormWelcomeTh(e.target.value)}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isGenerating || !formName}
                loading={isGenerating}
                Icon={isGenerating ? undefined : QrCode}
              >
                {isGenerating ? "Creating..." : "Create QR Code"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns list */}
      <div className="space-y-4">
        {campaigns.length === 0 && !isLoading && (
          <div className="bg-primary-panel rounded-card p-8 text-center border border-primary-700">
            <QrCode className="w-12 h-12 text-primary-500 mx-auto mb-3" />
            <p className="text-primary-300">
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
              className="bg-primary-panel rounded-card border border-primary-700 overflow-hidden"
            >
              {/* Campaign header */}
              <div className="p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-primary-50 truncate">
                        {campaign.name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isActive
                            ? "bg-accent-400/15 text-accent-400"
                            : "bg-signal-alert/15 text-signal-alert"
                        }`}
                      >
                        {isActive ? "Active" : isExpired ? "Expired" : "Inactive"}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-signal-mental/15 text-signal-mental font-medium">
                        {campaign.access_tier}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-primary-400 mb-2">
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
                      <code className="text-sm bg-primary-800 px-2 py-1 rounded font-mono text-accent-400">
                        {campaign.code}
                      </code>
                      <button
                        onClick={() => downloadQR(qrUrl, campaign.code)}
                        className="text-primary-500 hover:text-primary-300"
                        title="Download QR"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Copy Link Button - for sharing via WhatsApp, SMS, etc. */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => copyToClipboard(qrUrl)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-accent-400/15 hover:bg-accent-400/25 text-accent-400 rounded-control text-sm font-medium transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </button>
                      <span className="text-xs text-primary-400">
                        Share via WhatsApp, SMS, or email
                      </span>
                    </div>
                  </div>

                  {/* Stats + actions */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-primary-50">
                          {campaign.stats?.total_sessions || 0}
                        </p>
                        <p className="text-xs text-primary-400">Guests</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-accent-400">
                          {campaign.stats?.converted || 0}
                        </p>
                        <p className="text-xs text-primary-400">Converted</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-accent-400">
                          {campaign.conversion_rate}%
                        </p>
                        <p className="text-xs text-primary-400">Rate</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          toggleActive(campaign.id, campaign.is_active)
                        }
                        className="text-primary-500 hover:text-primary-300"
                        title={
                          campaign.is_active ? "Deactivate" : "Activate"
                        }
                      >
                        {campaign.is_active ? (
                          <ToggleRight className="w-6 h-6 text-accent-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                      <button
                        onClick={() => loadCampaignDetail(campaign.id)}
                        className="text-primary-500 hover:text-primary-300"
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
                <div className="border-t border-primary-700 bg-primary-900 p-4 md:p-6">
                  <h4 className="text-sm font-medium text-primary-100 mb-3">
                    Guest Sessions ({sessions.length})
                  </h4>
                  {sessions.length === 0 ? (
                    <p className="text-sm text-primary-400">
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
                            className="flex items-center justify-between bg-primary-panel rounded-control px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-3">
                              {isConverted ? (
                                <CheckCircle className="w-4 h-4 text-accent-400 flex-shrink-0" />
                              ) : isSessionExpired ? (
                                <XCircle className="w-4 h-4 text-signal-alert flex-shrink-0" />
                              ) : (
                                <Clock className="w-4 h-4 text-signal-english flex-shrink-0" />
                              )}
                              <span className="text-primary-100">
                                {isConverted
                                  ? s.converted_to_email
                                  : `Guest (${s.user_id?.slice(0, 8)}...)`}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-primary-400">
                              <span>
                                {new Date(s.started_at).toLocaleDateString()}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded ${
                                  isConverted
                                    ? "bg-accent-400/15 text-accent-400"
                                    : isSessionExpired
                                      ? "bg-signal-alert/15 text-signal-alert"
                                      : "bg-signal-english/15 text-signal-english"
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
    </div>
  );
}
