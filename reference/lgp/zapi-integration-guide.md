# Z-API WhatsApp Integration — Portable Guide

**Source:** built and battle-tested in Lions Global Passport (LGP) between 2026-06 and 2026-08.

**Target readers:** Claude Code / a developer in another Next.js + Supabase project (FieldTalk, Habitat, future EFL projects) implementing the same integration for the first time.

**What this doc gives you:**

1. The end-to-end architecture, so you know WHICH pieces to build and in what order.
2. Concrete code patterns (copy-paste-adapt) for each piece.
3. The gotchas we hit — some of which cost days to debug — so you don't repeat them.
4. A "what to adapt for a B2C EFL app" section (FieldTalk / Habitat are individual-user apps, not schools — some LGP concepts collapse to nothing).

**What this doc does NOT do:**

- Explain Z-API's own docs — read those too, at [https://developer.z-api.io](https://developer.z-api.io/). The provider surface is stable enough that this guide won't drift, but always cross-check.
- Set up your Supabase project. Assumed done.

---

## 0. Prerequisites

- **Z-API account** with an instance (a WhatsApp number connected via QR code from the Z-API dashboard).
- **Supabase project** with service-role access (integrations must write server-side, bypassing RLS).
- **Next.js 15+ App Router** (Server Actions + `after()` are used).
- **Anthropic API key** — only if you're building the AI agent piece.
- **Vercel** (or equivalent) for hosting — cron endpoints assume Vercel Cron. Adapt for other schedulers if needed.

### Environment variables

All server-side only. Never expose via `NEXT_PUBLIC_*`.

```
# Z-API
ZAPI_INSTANCE_ID=                 # from the Z-API dashboard
ZAPI_TOKEN=                       # from the Z-API dashboard
ZAPI_CLIENT_TOKEN=                # from the Z-API "Segurança" tab — REQUIRED post-2026
ZAPI_WEBHOOK_TOKEN=               # OUR own random secret (32+ chars). Configured in
                                  # the Z-API webhook URL as ?token=XXX or as
                                  # X-Webhook-Secret header — both are supported.

# Supabase (standard)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only; used by the webhook processor + crons

# AI agent (optional)
ANTHROPIC_API_KEY=

# Cron auth
CRON_SECRET=                      # bearer token; Vercel Cron sends it in the Authorization header
```

**Gotcha:** `ZAPI_CLIENT_TOKEN` didn't exist in Z-API's early docs. It became required in mid-2026. We spent half a day chasing "Z-API 400" errors that were literally just this header missing. If you get `{"error":"your client-token is not configured"}` from Z-API, this is it.

---

## 1. Architecture at a glance

Three self-contained pieces. Build in this order:

```
1. Sender + phone normalizer          → outbound WhatsApp works
2. Webhook receiver + processor       → inbound WhatsApp works
3. Cron drain + AI agent (optional)   → automated conversations work
                                        (broadcasts sit on top of #1)
```

### The webhook flow

```
    WhatsApp user                            Z-API                      Your app
         │                                     │                            │
    types message ─────────────────────────────►                            │
         │                                     │                            │
         │                                     │  POST /api/zapi/webhook    │
         │                                     │  (with ?token=X)           │
         │                                     ├───────────────────────────►│
         │                                     │                            │
         │                                     │                        [ verify token ]
         │                                     │                        [ dedupe by messageId ]
         │                                     │                        [ insert to webhook_events ]
         │                                     │                        [ return 200 immediately ]
         │                                     │◄───────────────────────────┤
         │                                     │                            │
         │                                     │                        after() { processor }
         │                                     │                            │
         │                                     │                        [ route based on sender ]
         │                                     │                        [ persist inbound message ]
         │                                     │                        [ decide response ]
         │                                     │                            │
         │                                     │  POST /send-text           │
         │                                     │◄───────────────────────────┤
         │                                     │                            │
    receives reply  ◄─────────────────────────                              │
```

Two important design choices:

- **Return 200 to Z-API BEFORE processing.** Their retry policy is aggressive. Use Next's `after()` for the fast path, plus a cron every 5 minutes as the safety net for events that `after()` couldn't finish (container killed, etc.).
- **Persist the raw event first, process second.** UNIQUE `(provider, provider_event_id)` on `webhook_events` gives you free idempotency — Z-API DOES send duplicates.

---

## 2. Outbound sender

**LGP reference:** `src/lib/integrations/zapi.ts` (~140 lines).

Two exports: `sendWhatsapp` (send) + `parseZapiInbound` (parse incoming payload).

Key points to preserve:

1. **Every phone MUST go through the normalizer first.** Z-API rejects anything but `55DDDNNNNNNNNN`. Throw on unnormalizable — don't ship garbage to Z-API and let it fail silently.
2. **The `Client-Token` header goes conditionally.** If `ZAPI_CLIENT_TOKEN` is unset (local dev without security), skip it. In production, set it.
3. **Stub mode for local dev.** If `ZAPI_INSTANCE_ID` or `ZAPI_TOKEN` is unset, return a fake `messageId` so end-to-end flows are still testable without a Z-API account.
4. **`parseZapiInbound` normalises Z-API's payload variance.** Text lives under `text.message` for chat messages, `body` for legacy, `message` in some edge cases. Handle all three.
5. **DO NOT filter out `fromMe=true` events.** These are echoes of our own outbound (dedupe against messageId) AND any manual replies typed by staff in WhatsApp Web (which you want to capture into the conversation log). See §5.

### Copy-adapt

Copy `src/lib/integrations/zapi.ts` + `src/lib/utils/phone.ts` verbatim. The phone normalizer is Brazilian-specific but has a pass-through for international numbers (works for Stephen's UK phone during dev), so it's OK if a future FieldTalk market adds non-Brazilian users.

### JavaScript conversion notes

- Drop the `PhoneNormalization` discriminated union type — either return `{ ok: true, e164 }` or `{ ok: false, reason }` and let callers duck-type.
- Drop `WhatsappSendInput` / `WhatsappSendResult` types.
- The rest is plain JS already; just delete `: string` and `: null` annotations.

---

## 3. Webhook receiver + `webhook_events` table

**LGP reference:** `src/app/api/zapi/webhook/route.ts` (~140 lines) + migration section below.

### Migration

Create `webhook_events` — one table for BOTH Z-API and any other provider (Asaas etc. later):

```sql
create table webhook_events (
  id                  uuid primary key default gen_random_uuid(),
  provider            text not null,                           -- 'zapi'
  provider_event_id   text not null,                           -- Z-API's messageId
  event_type          text,                                    -- Z-API's `type` field
  payload             jsonb not null,                          -- the raw body
  status              text not null default 'received',        -- 'received' | 'processed' | 'failed'
  processed_at        timestamptz,
  error               text,
  created_at          timestamptz not null default now(),
  unique (provider, provider_event_id)                         -- the idempotency guarantee
);

create index on webhook_events (provider, status, created_at);
```

Enable RLS + grant nothing to `authenticated` — only the service-role client (used by the webhook route + cron) touches this.

### The webhook route

Two auth mechanisms accepted — `?token=X` in the URL OR `X-Webhook-Secret` header. Z-API's dashboard configures one or the other; supporting both means you can flip without redeploying.

Key sequence:

```
1. Verify token (constant-time comparison — leaks aren't security-critical
   here but the habit is good).
2. Parse body — if malformed, still return 200 so Z-API stops retrying
   pathological payloads. Store the raw body regardless.
3. Compute providerEventId — Z-API sends `messageId` OR `zaapId`
   depending on payload type; fall back to a SHA-256 of the raw body.
4. Insert into webhook_events. On UNIQUE violation (23505) return 200
   with `duplicate: true` — Z-API already replayed something we have.
5. Return 200 immediately.
6. `after()` → run the processor. Update webhook_events.status to
   'processed' or 'failed' when done.
```

**Never do the processing inline before returning 200.** Z-API retries after ~30 seconds. If your processor is doing an Anthropic call (2-5s) plus a Z-API send (1-2s), you're borderline. `after()` decouples the two.

### Cron drain safety net

Add `/api/cron/process-webhooks` that re-runs the processor for any row where `status = 'received'` and `created_at < now() - 1 minute`. Vercel Cron every 5 minutes:

```json
{
  "path": "/api/cron/process-webhooks",
  "schedule": "*/5 * * * *"
}
```

This catches the case where `after()` failed silently (container killed mid-processing).

---

## 4. Processor + routing

**LGP reference:** `src/lib/integrations/zapi-processor.ts` (~500 lines — HEAVILY LGP-specific, use as pattern only).

This is where your product's business logic lives. LGP's processor does:

```
1. Parse the payload → phone + text + fromMe + messageId + senderName.
2. If phone matches a staff member's registered number → audit and stop
   (staff messaging via the school WhatsApp shouldn't create leads).
3. If phone matches a known client whose responsavel is on file → route
   to Student Agent path.
4. If phone matches a "known client" (self-identified via menu) → skip
   the agent entirely, atendente takes over.
5. If fromMe=true → capture as a manual outbound, dedupe against our
   own agent sends (see §5).
6. Otherwise → Leads flow (verification menu first, then AI agent).
```

**For a B2C EFL app (FieldTalk / Habitat) this simplifies enormously:**

Most of the routing is "is this a staff member or a family member or a lead or an existing student?" That entire hierarchy doesn't exist in a B2C app where every WhatsApp user is a customer. Your processor probably reduces to:

```
1. Parse the payload.
2. If fromMe → capture and dedupe (see §5). Return.
3. Look up user by phone. If found → route to that user's conversation.
4. If not found → this is an unregistered person messaging us; log to
   an "unmatched_inbound" audit trail so an admin can decide whether to
   invite them or reply manually.
```

That's it. No verification menu, no staff filter, no responsável indirection.

---

## 5. `fromMe` capture (staff replies typed directly in WhatsApp)

This is a subtle but crucial pattern. The receptionist (or admin) sometimes types replies to users DIRECTLY in WhatsApp Web on the shared account, bypassing your app entirely. Z-API echoes those as `fromMe=true` webhook events. If you filter them out (the "obvious" thing), the app's conversation log is missing half the story — atendente panel shows only the customer side, and staff have to remember what they said themselves.

**Solution:** don't filter fromMe. Route them to a dedicated handler:

```
1. Dedupe: if messageId is already in your outbound-messages table
   (from an agent send), skip — we're echoing our own send back.
2. Otherwise: look up the user by phone, attach as an outbound in
   their conversation with `via: 'atendente_manual'` metadata.
3. If no user matches, log to `unmatched_inbound` audit — helps
   surface "who was this admin talking to?".
```

**LGP reference:** `handleFromMeMessage` in `src/lib/integrations/zapi-processor.ts`.

Display in the admin UI: label these differently from agent-sent outbounds — e.g. "👤 Atendente" vs "🤖 Agente" — so admins can tell at a glance who typed what.

---

## 6. AI agent pattern

**LGP references:**
- `src/lib/agents/leads/agent.ts` — the Claude call (~130 lines).
- `src/lib/agents/leads/execute.ts` — the executor pattern (~380 lines).
- `src/lib/agents/leads/types.ts` — the AgentAction schema (~55 lines).
- `src/lib/agents/prompts-loader.ts` — DB-backed prompt loader with fallback.

### Core pattern: "Decide → Execute" split

**`decideAgentAction`** — pure function that takes conversation context, calls Claude, returns a structured `AgentAction`. No side effects. Fails safely (returns `{ ok: false, error }`).

**`executeAgentAction`** — applies the action's side effects: sends the WhatsApp, persists the outbound message, updates the user's status, escalates if needed. Every side effect is separate so you can unit-test each in isolation.

This split matters because it makes the agent testable. You can invoke `decideAgentAction` in a script with mocked conversation and inspect what Claude wants to do, without any risk of real WhatsApp sends.

### Prompt storage — DB not code

Don't hardcode prompts in `.ts` files. Store them in a `configuracoes` (or `prompts`) Supabase table with a fallback to a version-controlled default:

```
loadPromptOrDefault(kind: 'coach' | 'onboarding') →
  1. Fetch from prompts table where kind = X and ativo = true
  2. If not found, fall back to bundled DEFAULT_PROMPT constant
```

Why: your product owner will iterate the prompt daily. Requiring a deploy for each tweak kills iteration speed.

**LGP reference:** `src/lib/agents/prompts-loader.ts`.

### Prompt caching

Anthropic's ephemeral cache saves 90% of cost on the (large, stable) system prompt. Wrap it in a `cache_control: { type: "ephemeral" }` block:

```typescript
system: [
  {
    type: "text",
    text: systemPrompt,
    cache_control: { type: "ephemeral" },   // ← 5-minute cache
  },
  { type: "text", text: conversationContext }, // ← changes per turn, not cached
],
```

Cache lives 5 minutes. Consecutive turns within that window are ~10x cheaper.

### JSON response contract

Claude returns structured JSON, not free-form text. Define an `AgentAction` type with your product's specific fields:

```typescript
type AgentAction = {
  reply: string;                          // ALWAYS required — what to send
  userUpdate?: { ... };                   // fields to patch on the user row
  escalate?: string;                       // non-empty = hand off to human
  // ...product-specific actions
};
```

Instruct the prompt to output JSON only. Parse with a permissive regex-extraction wrapper (`tryParseJson`) because Claude occasionally wraps output in markdown code blocks despite instructions.

### The "never go silent" rule

**Critical lesson from LGP.** Claude is invoked ONLY when the user sends a new message. If Claude's reply is "let me check that for you..." and then stops, the user is waiting forever — you don't have a scheduler that fires Claude on its own.

Add this to every agent prompt, high in the priority list:

> Every reply must terminate in one of three ways: (a) a question to the user, (b) a delivered action, or (c) an executed escalation in the same JSON turn. NEVER promise a future action. Forbidden phrases: "vou verificar", "aguarda um instante", "vou te contar sobre..." (name specific examples).

Naming forbidden phrases explicitly works far better than the abstract rule alone.

### Auto-pause on escalate

When Claude decides to escalate to a human, ALSO flip a `agent_paused = true` flag on the conversation. Otherwise the next customer message re-invokes Claude, and Claude ignores the fact that a human just took over.

---

## 7. Broadcasts (bulk messaging)

**LGP references:**
- `supabase/migrations/0051_broadcasts.sql` — schema.
- `src/lib/broadcasts/scheduler.ts` — slot allocation.
- `src/lib/broadcasts/recipients.ts` — filter → recipient list.
- `src/app/(staff)/admin/broadcasts/` — compose UI.
- `src/app/api/cron/dispatch-broadcasts/route.ts` — dispatcher.

### Data model

Two tables, polymorphic recipient:

```
broadcasts               (one per composed message)
  ├── id, nome, mensagem
  ├── target_type         ('users' | 'trial' | 'subscribed' | whatever)
  ├── filter              (jsonb — the filter shape at compose time)
  ├── agendado_para       (when to start the stagger)
  ├── intervalo_seg       (seconds between sends — default 8)
  ├── janela_inicio_h     (business hours start)
  ├── janela_fim_h        (business hours end)
  ├── respeitar_fim_de_semana
  ├── status              ('agendado' | 'em_envio' | 'concluido' | 'cancelado')
  └── enviados / falhou / skipped counters

broadcast_recipients     (one per intended send)
  ├── broadcast_id → broadcasts
  ├── user_id            (or whatever your product's user PK is)
  ├── telefone           (snapshotted at fan-out time)
  ├── agendado_para      (individual slot)
  ├── status             ('agendado' | 'enviada' | 'falhou' | 'skipped')
  └── zapi_message_id, error, skip_reason, sent_at
```

Unique index on `(broadcast_id, user_id)` prevents accidental double-sends.

### Rate limiting

**8 seconds between sends is the sweet spot.** Established WhatsApp accounts can handle 20-30/min; cold accounts 5-10/min. 8s = ~7.5/min = comfortably under all thresholds. Configurable 3-60s in the UI so aggressive campaigns can go faster if the account is warm.

Restrict to business hours (BRT 08:00-19:00 in LGP) and weekdays by default. Weekends opt-in.

### Auto-skip converted users

At dispatch time, re-check user state — if their subscription flipped from `trial` to `paid` between compose and send, skip. Nothing more annoying than a "come back and try our product!" message hitting someone who just paid.

### Test send

Before firing at hundreds, let the composer send the exact message to their own WhatsApp. Small feature, huge impact — catches typos and formatting issues in ~5 seconds of admin time.

**Implementation gotcha:** the test-send input CANNOT be a nested `<form>` inside the main compose form. HTML forbids form-in-form; the inner submit silently gets swallowed. Use `type="button"` + `useTransition` + a plain button that calls the server action directly with FormData constructed in JS. LGP hit this bug — the test button did literally nothing for a day.

---

## 8. Gotchas — the compressed list of bruises

Each of these cost us hours or days. Read them.

| Gotcha | Symptom | Fix |
|---|---|---|
| Missing `ZAPI_CLIENT_TOKEN` | All sends 400 with `"your client-token is not configured"` | Set the env var. Z-API added this ~mid-2026. |
| Node < 22 running scripts that use `@supabase/supabase-js` | `Node.js 20 detected without native WebSocket support` | `npm i -D ws @types/ws` and pass `realtime: { transport: WebSocket as any }` in `createClient`. |
| `<input type="datetime-local">` submits without a timezone | Server parses as UTC (Vercel runs UTC), scheduled event lands 3h in the past for BRT users | Server-side, append `-03:00` to the raw string before `new Date()` — see LGP `parseScheduleInputs`. |
| Same-day double-lessons dedupe in a calendar generator | Only half the aulas get created | Generator needs an `aulasPorDia` param. `dias_semana` used as a `Set` swallows duplicates. |
| Phone display truncation via a mask helper | Stored 13-digit E.164 phones get re-saved as 11 digits after admin edit | Any display mask must strip the country-code prefix BEFORE slicing — see LGP `maskTel`. Add a server-side guard that refuses 11-digit `55...` submissions. |
| Nested `<form>` in a compose page | Nested submit fires nothing, no error | Use `useTransition` + `type="button"` + manual `FormData`. |
| WhatsApp autoplay policy for audio (bell system) | Audio never plays despite `.play()` returning "success" | Browsers require a user gesture per tab session. Play a silent 100ms buffer inline with the enable-toggle click to "unlock" the audio context. |
| Email confirmation links pre-fetched by scanners | User clicks the invite email, gets sent to /login instead of setup-password | Interstitial page pattern: email link → your `/auth/confirm` page → button POSTs to verify. Scanners follow GETs but not form submits. Not directly Z-API-related, but every Supabase-auth EdTech project needs it. |
| Wizard doesn't dedupe by CPF on aluno creation | Rematrícula creates a duplicate `alunos` row alongside the original | Look up by CPF (or by nome+parent) before insert, UPDATE if found. |
| Prompt promises without executing ("vou verificar…") | Conversations die because Claude never fires unprompted | Name forbidden phrases in the prompt. Add the "every reply ends in question / action / escalate" rule. |
| Handoff via `escalate` doesn't pause the agent | Agent re-answers on the next user message, over-writing the human | Set `agent_paused = true` on the same DB update as the status flip. |

---

## 9. Adapting to JavaScript (no TypeScript)

LGP is TypeScript. FieldTalk and Habitat are plain JavaScript. Conversion notes:

- Remove all `type` / `interface` declarations. They're documentation only in TS anyway; keep the intent as JSDoc:

  ```javascript
  /** @typedef {{ reply: string, escalate?: string }} AgentAction */
  ```

- Zod for RUNTIME validation. Zod works in JS. Wrap Claude's JSON parse in a Zod schema so bad output throws with a clear message instead of undefined-property crashes downstream:

  ```javascript
  const AgentActionSchema = z.object({
    reply: z.string().min(1),
    escalate: z.string().optional(),
    // ...
  });
  const action = AgentActionSchema.parse(json);
  ```

- Supabase client's generated types are TS-only. Skip them — just use the untyped `createClient(url, key)`.

- `PageProps<"/route">` from Next's route types is TS-only. Use plain function signatures.

- `Database` generic on `createClient<Database>` — skip, use `createClient(...)`.

---

## 10. Adapting for a B2C EFL app (FieldTalk / Habitat)

The LGP integration is tailored for a school with staff, families, students, and leads. Your app is a B2C learning platform. Simplifications:

- **No `staff` filter in the processor.** Skip that check entirely.
- **No `responsavel` indirection.** The user's phone IS the user; no parent-child mapping.
- **No verification menu.** Users signed up on your site with a phone number — they opted in already. If someone messages the WhatsApp with an unknown phone, treat it as an unmatched inquiry (log for admin review) rather than starting a menu.
- **No "known client" list.** The `users` table IS your list.
- **No leads pipeline.** A user is a lead until they subscribe, then they're a customer. Same row, different status.
- **Agent persona changes.** LGP's agent is a sales rep. Yours is a coaching / tutor / practice-partner. The agent architecture is identical; the prompt is entirely different.

Product-specific additions worth considering:

- **Daily/weekly practice prompts.** Cron scans users with a due streak reminder, fires WhatsApps via the broadcasts infra you already built.
- **Response-driven follow-ups.** User replies "yes I did the exercise" → agent responds with the next micro-lesson.
- **Themed content push.** FieldTalk: match-day messages tailored to the user's favourite team. Habitat: weekly nature fact + English vocab. Broadcasts with per-user filter on `favourite_team` / `region` / `interests`.

---

## 11. Files to copy from LGP (curated list)

Share these with your Claude Code session in the target project. Order = order to read.

### Essential — the integration skeleton

1. `docs/zapi-integration-guide.md` — **this file**, first read.
2. `src/lib/utils/phone.ts` — Brazilian phone normalizer. Copy as-is (strip types).
3. `src/lib/integrations/zapi.ts` — sender + inbound parser. Copy as-is (strip types).
4. `src/app/api/zapi/webhook/route.ts` — webhook receiver. Copy the shape.

### Recommended — for the agent pattern

5. `src/lib/agents/leads/types.ts` — the `AgentAction` shape. Adapt for your product's action set.
6. `src/lib/agents/leads/agent.ts` — the Claude call. The caching + stub-mode pattern is what matters.
7. `src/lib/agents/leads/execute.ts` — the executor pattern. Longer and more specific to LGP; use as reference for the "one function per side effect" split, not verbatim.
8. `src/lib/agents/prompts-loader.ts` — DB-backed prompt with fallback.
9. `docs/leads-agent-prompt-06082026.md` — a full working prompt for reference (structure, sections, invioláveis, JSON schema). Yours will be entirely different content but the shape is worth studying.

### If you want broadcasts

10. `supabase/migrations/0051_broadcasts.sql` — schema (adapt column names for your user model).
11. `src/lib/broadcasts/scheduler.ts` — slot allocation logic.
12. `src/lib/broadcasts/recipients.ts` — filter → recipient list.
13. `src/lib/broadcasts/*` — folder for the whole broadcasts abstraction.
14. `src/app/api/cron/dispatch-broadcasts/route.ts` — the dispatcher.
15. `src/app/(staff)/admin/broadcasts/` — compose UI (adapt heavily; your admin surface is different).

### Reference-only — DON'T copy

- `src/lib/integrations/zapi-processor.ts` — LGP-specific routing logic. Read it to see the shape of a real processor, but yours will be simpler.
- Anything in `src/app/(staff)/*` — LGP's admin surface is huge and specific to the school context.

---

## 12. Build order (suggested)

For FieldTalk / Habitat, ship in this order:

1. **Sender + normalizer** — Copy `zapi.ts` + `phone.ts`. Test with a script that sends "hello" to your own number. **Ship: outbound works.**
2. **Webhook receiver** — Set up the endpoint + `webhook_events` table. Point Z-API at it. Send a message TO the WhatsApp — see the row land. **Ship: inbound is captured.**
3. **Processor v1** — Trivially route inbound to a database log per user. **Ship: conversations are persisted.**
4. **AI agent v1** — Wire Claude, one prompt, straight through. Reply to any inbound with the agent's response. **Ship: automated conversation works.**
5. **Broadcasts v1** — Add the tables + a manual "send to filter" UI. Skip staggering (send-all-at-once) for the MVP. **Ship: engagement pushes work.**
6. **Broadcasts staggering + dispatcher cron** — Add the scheduler + cron drain. **Ship: safe bulk.**
7. **Prompt iteration surface** — DB-backed prompts + a small admin UI to edit. **Ship: product owner can iterate without deploys.**

Steps 1-4 = usable AI assistant in ~2 focused days if you copy carefully. Steps 5-7 add another 1-2 days.

---

## 13. Ongoing hygiene

- **Log every WhatsApp send outcome.** LGP has `chamada_notificacoes` for chamada-triggered sends and per-recipient rows in `broadcast_recipients` for broadcasts. Without this, you're blind when a family says "I didn't get any message" — you have no way to know if Z-API accepted, rejected, or if the number was silently unparseable.
- **Audit the agent's decisions.** Every escalate / discard / handoff writes to an `audit_log`. Cheap DB writes; priceless when debugging why a specific conversation went sideways.
- **Kill switch.** A single boolean in a `configuracoes` row that turns off the agent globally. When something goes wrong (bad prompt push, Z-API outage), this beats redeploying.
- **Auto-pause per conversation.** When admin takes over via WhatsApp, flip a per-user `agent_paused` boolean so the agent doesn't interrupt.
- **Cron alerts.** If your webhook processor is failing consistently (`webhook_events.status = 'failed'` piling up), a daily digest email to the ops address saves a week of silent breakage.

---

**End of guide.** For anything not covered here, the primary source is the LGP codebase itself — the files listed in §11 are the canonical reference.

_Last updated: 2026-08-18, extracted from Lions Global Passport (Cultura Inglesa Teresina) production integration._
