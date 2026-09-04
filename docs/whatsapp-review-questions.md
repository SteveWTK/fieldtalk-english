# WhatsApp Review Questions — JSON shape

Stored on `lessons.review_questions` as a JSONB array. Rendered by the
quiz-spawn cron and delivered ~24 hours after a player completes the
lesson, via Z-API interactive buttons.

- **MVP:** only the FIRST question (`[0]`) is used per lesson.
- **Schema is arrayed so N-questions-per-lesson is a code change later, not a schema change.**
- **`review_questions IS NULL` = no quiz for this lesson.** Silently skipped by the cron. Enables gradual authoring — ship a lesson without a quiz today, add one tomorrow.

## Shape

```json
[
  {
    "id": "q1",
    "prompt": {
      "pt": "Como se diz 'chutar' em inglês?",
      "en": "How do you say 'chutar' in English?"
    },
    "buttons": [
      {
        "id": "a",
        "label": { "pt": "kick", "en": "kick" },
        "correct": true
      },
      {
        "id": "b",
        "label": { "pt": "throw", "en": "throw" },
        "correct": false
      },
      {
        "id": "c",
        "label": { "pt": "punch", "en": "punch" },
        "correct": false
      }
    ],
    "explanation": {
      "pt": "'Kick' é o verbo padrão para chutar uma bola. 'Throw' é lançar/atirar (mãos), 'punch' é dar um soco.",
      "en": "'Kick' is the standard verb for kicking a ball. 'Throw' is throwing (with the hands), 'punch' is hitting with a fist."
    }
  }
]
```

## Rules

| Field | Rule |
|---|---|
| `id` | String. Stable identifier for this question within the lesson. Convention: `q1`, `q2`, … Referenced by `whatsapp_review_sessions.question_id`. |
| `prompt.pt` / `prompt.en` | Both required. WhatsApp text — no rich formatting (bold `*asterisks*` and `_italics_` render; keep it minimal). Max ~1024 chars (WhatsApp button-list body limit). |
| `buttons` | Exactly **3** items. WhatsApp interactive-button messages cap at 3 replies. |
| `buttons[].id` | Short string, matches the label position (`a` / `b` / `c` is what we use). The **user-facing button label** shows the text; the ID is what the webhook returns for grading. |
| `buttons[].label.pt` / `.label.en` | Both required. Max 20 chars each (WhatsApp truncates longer labels). |
| `buttons[].correct` | Boolean. **Exactly one** button should be `correct: true`. If zero or multiple are marked correct, the cron logs a warning and skips that quiz. |
| `explanation.pt` / `.en` | Both required. Shown after ANY answer (right or wrong). Explains what the right answer is and why. Warm and short — 1-3 sentences. |

## Localization

The player's `preferred_language` picks the `.pt` / `.en` string. If a language is missing on the question, the render falls back to `pt`.

## Free-text fallback

The router accepts free-text replies too, for old WhatsApp clients or rendering failures:

- `1`, `2`, `3` map to buttons `[0]`, `[1]`, `[2]` respectively.
- `a`, `A`, `b`, `B`, `c`, `C` map to button `id` (case-insensitive).

Anything else counts as "unrelated reply" → the quiz session is **deferred** and the message flows through to the AI agent.

## Editing

Two ways:

1. **Admin UI:** `/admin/whatsapp/review-questions` — one row per lesson, inline edit.
2. **Direct SQL** (for bulk seeding):

```sql
UPDATE lessons
SET review_questions = $$
[
  {
    "id": "q1",
    "prompt": { "pt": "…", "en": "…" },
    "buttons": [
      { "id": "a", "label": { "pt": "…", "en": "…" }, "correct": true  },
      { "id": "b", "label": { "pt": "…", "en": "…" }, "correct": false },
      { "id": "c", "label": { "pt": "…", "en": "…" }, "correct": false }
    ],
    "explanation": { "pt": "…", "en": "…" }
  }
]
$$::jsonb
WHERE id = '…';
```

## Grading is snapshot-based

At send-time, the cron copies the question object into `whatsapp_review_sessions.question_snapshot`. Grading + explanation rendering both read from the snapshot. **Edits after send never retroactively change a player's answer** — the snapshot is the audit trail.
