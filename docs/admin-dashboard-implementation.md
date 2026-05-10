# Admin Analytics Dashboard Implementation Guide

This document details the implementation of the admin analytics dashboard for Neptune's Tribe English (Habitat English). Use this as a reference when implementing similar functionality in FieldTalk English.

---

## Overview

The admin dashboard provides platform administrators with comprehensive analytics including:
- User acquisition and growth metrics
- Content performance (lessons, adventures)
- Guest session tracking by campaign and device
- Premium upgrade analytics with source attribution
- Time period comparisons
- CSV export functionality
- Real-time updates via polling

---

## Architecture

### File Structure

```
src/app/(site)/admin/dashboard/
├── page.js                    # Main dashboard page with tabs
└── components/
    ├── MetricCard.js          # Stat card with comparison %
    ├── DateRangePicker.js     # Date range selector
    ├── FilterBar.js           # Multi-filter dropdowns
    ├── DataTable.js           # Sortable/paginated table
    └── ExportButton.js        # CSV export

src/app/api/admin/dashboard/
├── metrics/route.js           # Aggregated overview stats
├── users/route.js             # User analytics
├── content/route.js           # Lesson/adventure performance
├── guests/route.js            # Guest analytics by campaign
└── premium/route.js           # Premium upgrade analytics
```

---

## Database: Premium Upgrades Tracking

### Why This Approach

We needed to track when users upgrade to premium, not just who is currently premium. This allows us to:
- Measure CTA effectiveness (which screens drive conversions)
- Track conversion funnels (guest → registered → premium)
- Attribute upgrades to specific campaigns

### Migration SQL

Run this in Supabase SQL Editor:

```sql
-- Premium Upgrades Audit Table
-- Tracks every premium upgrade for analytics

CREATE TABLE IF NOT EXISTS premium_upgrades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Type of upgrade
  upgrade_type TEXT NOT NULL DEFAULT 'new'
    CHECK (upgrade_type IN ('new', 'renewal', 'reactivation')),

  -- Where the upgrade was initiated from (for CTA tracking)
  source TEXT DEFAULT 'unknown'
    CHECK (source IN (
      'unknown',
      'subscription_page',
      'premium_lesson_modal',
      'species_companion_cta',
      'guest_conversion',
      'qr_campaign',
      'marketing_email',
      'referral',
      'admin_grant'
    )),

  -- Subscription details
  plan_type TEXT DEFAULT 'premium'
    CHECK (plan_type IN ('premium_monthly', 'premium_yearly', 'premium', 'enterprise_monthly', 'enterprise_yearly')),

  -- For funnel tracking
  previous_state TEXT DEFAULT 'registered'
    CHECK (previous_state IN ('guest', 'registered', 'expired_premium')),

  -- QR/Campaign tracking
  was_qr_guest BOOLEAN DEFAULT false,
  qr_campaign_id UUID REFERENCES guest_access_codes(id),

  -- Timestamps
  upgraded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_premium_upgrades_user ON premium_upgrades(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_upgrades_date ON premium_upgrades(upgraded_at);
CREATE INDEX IF NOT EXISTS idx_premium_upgrades_source ON premium_upgrades(source);

-- RPC function to record upgrades (called from webhook)
CREATE OR REPLACE FUNCTION record_premium_upgrade(
  p_user_id UUID,
  p_source TEXT DEFAULT 'unknown',
  p_plan_type TEXT DEFAULT 'premium',
  p_previous_state TEXT DEFAULT 'registered'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_upgrade_id UUID;
  v_was_qr_guest BOOLEAN := false;
  v_qr_campaign_id UUID := NULL;
  v_upgrade_type TEXT := 'new';
BEGIN
  -- Check if user was a QR guest
  SELECT
    gs.access_code_id INTO v_qr_campaign_id
  FROM guest_sessions gs
  JOIN users u ON u.id = p_user_id
  WHERE gs.converted_user_id = p_user_id
    OR (gs.device_fingerprint IS NOT NULL AND gs.converted_at IS NOT NULL)
  ORDER BY gs.converted_at DESC NULLS LAST
  LIMIT 1;

  IF v_qr_campaign_id IS NOT NULL THEN
    v_was_qr_guest := true;
  END IF;

  -- Check for previous premium status (renewal vs new)
  IF EXISTS (
    SELECT 1 FROM premium_upgrades
    WHERE user_id = p_user_id
  ) THEN
    v_upgrade_type := 'renewal';
  END IF;

  -- Insert the upgrade record
  INSERT INTO premium_upgrades (
    user_id,
    upgrade_type,
    source,
    plan_type,
    previous_state,
    was_qr_guest,
    qr_campaign_id
  ) VALUES (
    p_user_id,
    v_upgrade_type,
    COALESCE(p_source, 'unknown'),
    COALESCE(p_plan_type, 'premium'),
    COALESCE(p_previous_state, 'registered'),
    v_was_qr_guest,
    v_qr_campaign_id
  )
  RETURNING id INTO v_upgrade_id;

  RETURN v_upgrade_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION record_premium_upgrade TO service_role;
```

---

## Stripe Webhook Integration

### Webhook Route Updates

In `src/app/api/stripe/webhook/route.js`, update the `updateUserSubscription` function:

```javascript
async function updateUserSubscription(userId, subscription, supabase, metadata = {}) {
  const isActive = ["active", "trialing"].includes(subscription.status);

  // Check if user was previously premium (for tracking new vs renewal)
  const { data: currentUser } = await supabase
    .from("users")
    .select("is_premium, role")
    .eq("id", userId)
    .single();

  const wasPremium = currentUser?.is_premium === true;
  const wasGuest = currentUser?.role === "guest";

  const updateData = {
    is_premium: isActive,
    stripe_subscription_status: subscription.status,
    role: isActive ? "premium" : "free",
    is_supporter: true,
  };

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    console.error("Failed to update user subscription:", error.message);
    throw error;
  }

  // Record premium upgrade in audit table (only when becoming premium)
  if (isActive && !wasPremium) {
    try {
      const upgradeSource = metadata.upgrade_source || "subscription_page";
      const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
      const planType = interval === "year" ? "premium_yearly" : "premium_monthly";
      const previousState = wasGuest ? "guest" : "registered";

      const { error: upgradeError } = await supabase.rpc("record_premium_upgrade", {
        p_user_id: userId,
        p_source: upgradeSource,
        p_plan_type: planType,
        p_previous_state: previousState,
      });

      if (upgradeError) {
        console.error("Failed to record premium upgrade:", upgradeError.message);
      } else {
        console.log(`Premium upgrade recorded for user ${userId} (source: ${upgradeSource})`);
      }
    } catch (trackingError) {
      // Log but don't fail - the table might not exist yet
      console.error("Error recording premium upgrade:", trackingError.message);
    }
  }
}
```

### Checkout Session Updates

In `src/app/api/create-checkout-session/route.js`, accept and pass `upgrade_source`:

```javascript
const {
  priceType,
  subscriptionInterval,
  tierLevel,
  oneTimeAmount,
  currency = "USD",
  // ... other params ...
  // Premium upgrade source tracking (for analytics)
  upgrade_source = "subscription_page",
} = await req.json();

// Include in checkout session metadata
const checkoutSession = await stripe.checkout.sessions.create({
  // ... other config ...
  metadata: {
    supabase_id: user.id,
    price_type: priceType,
    // ... other metadata ...
    upgrade_source,
  },
});
```

### Frontend: Passing upgrade_source

When calling the checkout API from different CTAs:

```javascript
// From subscription page (default)
const response = await fetch("/api/create-checkout-session", {
  method: "POST",
  body: JSON.stringify({
    priceType: "subscription",
    subscriptionInterval: "monthly",
    tierLevel: "premium",
    currency: "USD",
    upgrade_source: "subscription_page", // default
  }),
});

// From premium lesson modal
upgrade_source: "premium_lesson_modal"

// From species companion CTA
upgrade_source: "species_companion_cta"

// From guest conversion flow
upgrade_source: "guest_conversion"
```

---

## API Endpoints

### GET /api/admin/dashboard/metrics

Returns aggregated overview stats with period comparison.

**Query Parameters:**
- `startDate` - ISO date string (default: 30 days ago)
- `endDate` - ISO date string (default: today)
- `compareMode` - 'previous_period' | 'same_period_last_year'

**Response:**
```json
{
  "metrics": {
    "totalUsers": { "value": 1234, "label": "Total Users" },
    "newUsers": { "value": 56, "change": 12, "label": "New Users" },
    "premiumUsers": { "value": 89, "label": "Premium Users" },
    "premiumUpgrades": { "value": 15, "change": 25, "label": "Premium Upgrades" },
    "lessonCompletions": { "value": 432, "change": 8, "label": "Lessons Completed" },
    "guestSessions": { "value": 200, "change": -5, "label": "Guest Sessions" },
    "guestConversions": { "value": 45, "change": 10, "label": "Guest Conversions" },
    "conversionRate": { "value": 22, "change": 3, "label": "Conversion Rate", "suffix": "%" }
  },
  "period": {
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-01-31T23:59:59.999Z",
    "compareStart": "2023-12-01T00:00:00.000Z",
    "compareEnd": "2023-12-31T23:59:59.999Z"
  }
}
```

### GET /api/admin/dashboard/premium

Returns detailed premium upgrade analytics.

**Query Parameters:**
- `startDate`, `endDate` - Date range
- `source` - Filter by upgrade source

**Response:**
```json
{
  "overview": {
    "totalUpgrades": 45,
    "qrGuestUpgrades": 12,
    "qrGuestPercentage": 27
  },
  "upgradesBySource": [
    { "source": "Subscription Page", "sourceKey": "subscription_page", "count": 20, "percentage": 44 },
    { "source": "Premium Lesson Modal", "sourceKey": "premium_lesson_modal", "count": 15, "percentage": 33 }
  ],
  "upgradesByPreviousState": [
    { "state": "From Registered", "stateKey": "registered", "count": 30, "percentage": 67 },
    { "state": "From Guest", "stateKey": "guest", "count": 15, "percentage": 33 }
  ],
  "dailyUpgrades": [
    { "date": "2024-01-15", "label": "Jan 15", "upgrades": 3 }
  ],
  "recentUpgrades": [
    {
      "id": "uuid",
      "userName": "John",
      "userEmail": "john@example.com",
      "source": "Subscription Page",
      "planType": "premium_monthly",
      "previousState": "From Registered",
      "wasQrGuest": false,
      "upgradedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET /api/admin/dashboard/guests

Returns guest analytics by campaign, device, and conversion status.

**Response includes:**
- Guest sessions by campaign with conversion rates
- Device breakdown (mobile/desktop/tablet)
- Browser distribution
- Conversion metrics and timing

---

## UI Components

### MetricCard

Displays a single metric with comparison percentage.

```jsx
<MetricCard
  label="New Users"
  value={56}
  change={12}        // Percentage change from previous period
  suffix=""          // Optional suffix like "%"
  loading={false}
/>
```

### DateRangePicker

Provides date presets, custom date range selection, and comparison mode selection.

```jsx
<DateRangePicker
  dateRange={{ start: Date, end: Date }}
  onChange={(newDateRange) => {}}
  compareMode="previous_period"
  onCompareModeChange={(mode) => {}}
  customCompareRange={{ start: Date, end: Date }}
  onCustomCompareRangeChange={(range) => {}}
/>
```

**Presets:**
- Today
- Last 7 days
- Last 30 days
- This month
- Last month
- This year
- Custom range (with date inputs)

**Compare Modes:**
- Previous period (automatic calculation)
- Same period last year
- Custom period (manual date selection)

### FilterBar

Multi-filter component with cascading dropdowns.

```jsx
<FilterBar
  filters={{
    userType: null,
    worldId: null,
    adventureId: null,
    campaignId: null,
    deviceType: null,
    conversionStatus: null,
    upgradeSource: null,
  }}
  onChange={(newFilters) => {}}
  options={{
    userTypes: [{ value: "premium", label: "Premium" }],
    worlds: [{ value: "uuid", label: "Ocean World" }],
    // etc.
  }}
  onReset={() => {}}
/>
```

### DataTable

Sortable, paginated table with export capability.

```jsx
<DataTable
  columns={[
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email" },
  ]}
  data={users}
  sortColumn="name"
  sortDirection="asc"
  onSort={(column) => {}}
  pageSize={20}
  currentPage={1}
  totalItems={100}
  onPageChange={(page) => {}}
/>
```

### ExportButton

CSV export for current data.

```jsx
<ExportButton
  data={tableData}
  filename="users-export"
  columns={["name", "email", "role", "created_at"]}
/>
```

---

## Main Dashboard Page

The dashboard uses a tabbed interface:

1. **Overview** - Key metrics with charts
2. **Users** - User growth, signups table
3. **Content** - Lesson completions, popular content
4. **Guests** - Campaign performance, device stats
5. **Premium** - Upgrade analytics, source attribution

### State Management

```javascript
const [dateRange, setDateRange] = useState({
  start: subDays(new Date(), 30),
  end: new Date(),
});
const [compareMode, setCompareMode] = useState("previous_period");
const [filters, setFilters] = useState({
  userType: null,
  worldId: null,
  adventureId: null,
  campaignId: null,
  deviceType: null,
  conversionStatus: null,
  upgradeSource: null,
});
const [activeTab, setActiveTab] = useState("overview");
```

### Real-Time Updates

Polling every 30 seconds:

```javascript
useEffect(() => {
  fetchAllData();
  const interval = setInterval(fetchAllData, 30000);
  return () => clearInterval(interval);
}, [dateRange, compareMode, filters]);
```

---

## Security

All endpoints check for `platform_admin` role:

```javascript
const { data: userData } = await supabase
  .from("users")
  .select("role")
  .eq("email", session.user.email)
  .single();

if (userData?.role !== "platform_admin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

---

## Dependencies

```json
{
  "recharts": "^2.x",      // Charts
  "date-fns": "^3.x",      // Date manipulation
  "lucide-react": "^0.x"   // Icons
}
```

Install if not present:
```bash
npm install recharts date-fns
```

---

## Adaptation Notes for FieldTalk

1. **Table Names**: Update references to match FieldTalk schema (if different)
2. **Upgrade Sources**: Modify the source enum to match FieldTalk CTAs
3. **Content Types**: FieldTalk may have different content types than lessons/adventures
4. **Guest Access**: Adjust guest_sessions/guest_access_codes if FieldTalk uses different table names
5. **Role Checking**: Ensure FieldTalk has a `platform_admin` role or adjust accordingly

---

## Testing Checklist

- [ ] Run the SQL migration in Supabase
- [ ] Verify API endpoints return data correctly
- [ ] Test date range filtering
- [ ] Test all filter combinations
- [ ] Verify CSV export works
- [ ] Test premium upgrade tracking by making a test purchase
- [ ] Confirm charts render properly
- [ ] Check mobile responsiveness
- [ ] Verify platform_admin access control

---

## Troubleshooting

### "column users.updated_at does not exist"
The users table doesn't have an updated_at column. We use the premium_upgrades audit table instead.

### Premium upgrades not tracking
1. Ensure the SQL migration was run
2. Check that `record_premium_upgrade` function exists
3. Verify webhook is receiving events (check Stripe dashboard)
4. Check server logs for RPC errors

### Charts not rendering
Ensure recharts is installed: `npm install recharts`

---

*Last updated: March 2026*
