# Migration Guide: FieldTalk Lesson CMS → Neptune's Tribe

## Overview

This document provides context for migrating the lesson CMS system built in FieldTalk to Neptune's Tribe Eco English.

---

## What Was Built in FieldTalk

### 1. Dynamic Lesson CMS with Multiple Step Types

A complete lesson creation and editing system allowing platform admins to build lessons with various interactive steps.

**Key Features:**
- Visual lesson editor with drag-and-drop step management
- Multiple step types: MultipleChoice, Audio, Video, ConversationVote
- JSON-based lesson content storage in `lessons.content` column
- Rich metadata: difficulty, XP rewards, target audience, pillar assignment
- Clone lesson functionality
- Image and audio asset management

**Architecture:**
- Lessons stored in `lessons` table with JSONB `content` column
- Each lesson has array of steps with type-specific configuration
- Step components render in two modes: **editor mode** (form) and **player mode** (lesson view)
- Whitelist pattern for database updates (prevents column errors)

### 2. Step Component System

Each step type has a dedicated component that handles both editing and playing:

**Pattern:**
```javascript
// Editor mode (in lesson editor)
<MultipleChoiceStepForm
  step={stepData}
  onChange={(updatedStep) => handleUpdateStep(index, updatedStep)}
  onDelete={() => handleDeleteStep(index)}
/>

// Player mode (in lesson player)
<MultipleChoiceStep
  step={stepData}
  onComplete={(isCorrect) => handleNext()}
/>
```

**Step Types Built:**
1. **MultipleChoiceStepForm** - Question with 4 options, one correct answer
2. **AudioStepForm** - Audio playback with transcript and questions
3. **VideoStepForm** - YouTube video embed with responsive player
4. **ConversationVoteStepForm** - Students vote on conversation topics (with deadline and results)

### 3. Database Schema

**Lessons Table Key Columns:**
```sql
lessons (
  id UUID PRIMARY KEY,
  title TEXT,
  description TEXT,
  description_pt TEXT,
  pillar_id UUID REFERENCES pillars(id),
  difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'
  xp_reward INTEGER DEFAULT 10,
  content JSONB, -- Array of step objects
  image_url TEXT,
  audio_url TEXT,
  estimated_duration INTEGER,
  is_active BOOLEAN DEFAULT true,
  target_audience TEXT, -- 'schools', 'players', 'both'
  under_construction BOOLEAN DEFAULT false,
  lesson_code TEXT, -- e.g., 'SL1-U1-L1'
  unit_number INTEGER,
  lesson_number INTEGER,
  level_name TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

**Content JSONB Structure:**
```json
{
  "steps": [
    {
      "id": "step-1",
      "type": "multiple_choice",
      "question": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "correctAnswer": 1,
      "explanation": "Paris is the capital of France."
    },
    {
      "id": "step-2",
      "type": "video",
      "videoUrl": "https://youtube.com/watch?v=...",
      "title": "Video Title",
      "description": "Video description"
    }
  ]
}
```

**Supporting Tables:**
- `lesson_votes` - Stores student votes for ConversationVote steps
- `lesson_completions` - Tracks which users completed which lessons
- `player_progress` - Tracks user XP and progress

### 4. Platform Admin Routes

**Route Structure:**
```
/admin                           - Platform admin dashboard
/admin/lessons                   - List all lessons (with search)
/admin/lessons/new               - Create new lesson
/admin/lessons/[id]              - Edit existing lesson
```

**Access Control:**
- Uses `ProtectedRoute` component with `allowedRoles` prop
- Checks `user_type` field in database (must be 'platform_admin')
- Redirects unauthorized users to home page

### 5. Lesson Player (Student View)

**Route:**
```
/lesson/[id]                     - Individual lesson player
```

**Features:**
- Loads lesson from database
- Renders steps sequentially
- Progress indicator
- XP reward on completion
- Saves completion to database

---

## Files to Copy from FieldTalk

### Core CMS Files

**Admin Pages:**
```
src/app/(site)/admin/lessons/page.js              # Lessons list with search
src/app/(site)/admin/lessons/new/page.js          # Create lesson form
src/app/(site)/admin/lessons/[id]/page.js         # Edit lesson (LARGE FILE ~2500 lines)
```

**Lesson Player:**
```
src/app/(site)/lesson/[id]/page.js                # Student lesson player
```

**Database Queries:**
```
src/lib/supabase/lesson-queries.js                # All lesson CRUD operations
```

### Step Components

```
src/components/lesson-steps/MultipleChoiceStepForm.js
src/components/lesson-steps/AudioStepForm.js
src/components/lesson-steps/VideoStepForm.js
src/components/lesson-steps/ConversationVoteStepForm.js
```

### Supporting Components

```
src/components/ProtectedRoute.js                  # Role-based access control
```

### SQL Scripts

```
VOTING_SCHEMA_UPDATE.sql                          # Creates lesson_votes table (if needed)
```

---

## Key Technical Patterns

### 1. Whitelist Pattern for Database Updates

To prevent "column does not exist" errors:

```javascript
export async function updateLesson(lessonId, updates) {
  const allowedFields = [
    'title', 'description', 'description_pt', 'pillar_id', 'difficulty',
    'xp_reward', 'content', 'image_url', 'audio_url', 'estimated_duration',
    'is_active', 'sort_order', 'audio_assets', 'visual_assets',
    'interactive_config', 'lesson_code', 'unit_number', 'lesson_number',
    'level_name', 'under_construction', 'target_audience'
  ];

  const filteredUpdates = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = updates[key];
      return obj;
    }, {});

  const { data, error } = await supabase
    .from('lessons')
    .update(filteredUpdates)
    .eq('id', lessonId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### 2. Step Type Registration

In the lesson editor, step types are registered in an array:

```javascript
const STEP_TYPES = [
  { type: 'multiple_choice', label: 'Multiple Choice', icon: CheckCircle },
  { type: 'audio', label: 'Audio', icon: Headphones },
  { type: 'video', label: 'Video', icon: Video },
  { type: 'conversation_vote', label: 'Conversation Vote', icon: Users },
];
```

Each type is rendered via a switch statement:

```javascript
function renderStepForm(step, index) {
  switch (step.type) {
    case 'multiple_choice':
      return <MultipleChoiceStepForm step={step} onChange={...} />;
    case 'audio':
      return <AudioStepForm step={step} onChange={...} />;
    case 'video':
      return <VideoStepForm step={step} onChange={...} />;
    case 'conversation_vote':
      return <ConversationVoteStepForm step={step} onChange={...} />;
    default:
      return <div>Unknown step type</div>;
  }
}
```

### 3. Protected Route Pattern

```javascript
export default function PlatformAdminPage() {
  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <PageContent />
    </ProtectedRoute>
  );
}
```

The `ProtectedRoute` component:
- Checks if user is authenticated
- Loads user data from database
- Verifies `user_type` matches one of `allowedRoles`
- Shows loading state while checking
- Redirects if unauthorized

### 4. Step Component Interface

**Editor Mode Props:**
```javascript
{
  step: Object,              // Current step data
  onChange: Function,        // Called when step data changes
  onDelete: Function,        // Called when delete button clicked
}
```

**Player Mode Props:**
```javascript
{
  step: Object,              // Current step data
  onComplete: Function,      // Called when step is completed
}
```

---

## Adaptations Needed for Neptune's Tribe

### 1. Authentication

**FieldTalk uses:**
- Supabase Auth with email/password
- User data in `players` table
- `user_type` field for role checking

**Neptune's Tribe uses:**
- Google OAuth + Supabase email/password
- Different user table structure (needs investigation)

**Adaptation needed:**
- Update `ProtectedRoute` to work with Neptune's Tribe auth
- Map user role field correctly

### 2. Database Schema

**Check Neptune's Tribe:**
- Does a `lessons` table exist?
- What columns are present?
- Is there a JSONB `content` column?
- How are units/courses structured?

**May need to:**
- Run SQL migration to add missing columns
- Adjust queries to match existing schema
- Update field names in forms

### 3. Existing Step Types

**Neptune's Tribe has:**
- Two gap-fill variations (multiple-choice style)

**Integration strategy:**
- Keep existing gap-fill components
- Add them to STEP_TYPES array
- Register them in renderStepForm switch
- Ensure they follow the step component interface

### 4. File Structure

**FieldTalk uses:**
- Next.js App Router
- Routes in `src/app/(site)/`

**Neptune's Tribe:**
- Check if using App Router or Pages Router
- Adjust route file locations accordingly
- Update import paths

### 5. Styling

**FieldTalk uses:**
- Tailwind CSS
- Dark mode support throughout

**Neptune's Tribe:**
- Match existing design system
- May need to adjust color classes
- Ensure consistency with existing UI

---

## Migration Checklist

### Phase 1: Setup
- [ ] Copy files from FieldTalk to Neptune's Tribe
- [ ] Update all import paths
- [ ] Check for package dependency conflicts
- [ ] Review and adapt auth system integration

### Phase 2: Database
- [ ] Review existing Neptune's Tribe lessons table schema
- [ ] Run SQL migrations for missing columns
- [ ] Create lesson_votes table (if using voting)
- [ ] Set up RLS policies

### Phase 3: Adapt Components
- [ ] Update ProtectedRoute for Neptune's Tribe auth
- [ ] Adapt lesson-queries.js to match schema
- [ ] Add existing Neptune's Tribe gap-fill components to STEP_TYPES
- [ ] Update styling to match Neptune's Tribe design

### Phase 4: Testing
- [ ] Test lesson creation flow
- [ ] Test each step type in editor
- [ ] Test lesson player for students
- [ ] Test with different user roles
- [ ] Test clone lesson functionality

### Phase 5: Integration
- [ ] Add admin link to Neptune's Tribe navigation
- [ ] Integrate with existing course/unit structure
- [ ] Test with real lesson content
- [ ] Verify XP and completion tracking

---

## Common Issues & Solutions

### Issue 1: "Column does not exist" errors
**Solution:** Check allowedFields whitelist in lesson-queries.js matches actual database columns

### Issue 2: Auth not working in ProtectedRoute
**Solution:** Update user loading logic to match Neptune's Tribe auth system

### Issue 3: Import path errors
**Solution:** Use project-wide search/replace for common paths like `@/components/`, `@/lib/`

### Issue 4: Step types not rendering
**Solution:** Ensure step type is added to STEP_TYPES array AND renderStepForm switch

### Issue 5: Voting system errors
**Solution:** Ensure lesson_votes table exists and has correct columns

---

## Testing Instructions

### Test as Admin:
1. Login as user with admin role
2. Navigate to `/admin/lessons`
3. Click "Create Lesson"
4. Add various step types
5. Save lesson
6. Edit lesson and verify changes persist
7. Clone lesson

### Test as Student:
1. Login as regular user
2. Navigate to lesson URL
3. Complete each step type
4. Verify XP awarded on completion
5. Check completion recorded in database

---

## Next Steps After Migration

1. **Add Neptune's Tribe-specific step types** (gap-fill variations)
2. **Integrate with existing unit/course structure**
3. **Add lesson preview mode** (so admins can test before publishing)
4. **Enhance media management** (image/audio uploads)
5. **Add lesson analytics** (completion rates, time spent, etc.)

---

## Questions to Answer in Neptune's Tribe Session

1. **Auth System:** How does Google OAuth integrate with Supabase? Where is user data stored?
2. **User Roles:** What field controls admin access? (`role`, `user_type`, `is_admin`?)
3. **Lessons Table:** Does it exist? What columns are present? Show schema.
4. **File Structure:** App Router or Pages Router? Where are routes located?
5. **Existing Components:** Where are the gap-fill components? What are they called?
6. **Course Structure:** How are units/courses organized? Separate tables or within lessons?
7. **Styling:** Any specific design system or component library in use?
8. **Navigation:** Where should admin links be added?

---

## Contact Context

**When starting Neptune's Tribe session, share:**

"I'm migrating the lesson CMS from FieldTalk to Neptune's Tribe. In FieldTalk, we built:

- Dynamic lesson editor with multiple step types (MultipleChoice, Audio, Video, ConversationVote)
- Platform admin pages at /admin/lessons with full CRUD operations
- ProtectedRoute component for role-based access control
- Step components that render in both editor mode (forms) and player mode (lesson view)
- Lessons stored with JSONB content column containing array of steps
- Each step type has dedicated component following consistent interface
- Whitelist pattern for database updates to prevent column errors
- All using Supabase with RLS policies

I've copied the relevant files from FieldTalk and need help adapting them to Neptune's Tribe's auth system, database schema, file structure, and existing step types (gap-fill variations). I have a detailed migration guide document for reference."

---

## Summary

This migration involves bringing a battle-tested, flexible lesson CMS system into Neptune's Tribe. The core architecture is solid, but needs adaptation for Neptune's Tribe's specific setup. The key is understanding Neptune's Tribe's current structure first, then adapting imports, auth, and database queries accordingly.

**Main advantages of this system:**
- Easy to add new step types
- Clean separation between editor and player
- Robust error handling
- Flexible JSONB content storage
- Role-based access control
- Clone and reuse lessons

**Time estimate:** 2-4 hours depending on how much Neptune's Tribe's structure differs from FieldTalk.