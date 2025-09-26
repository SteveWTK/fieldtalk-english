# FieldTalk Lesson CMS - Complete Guide

## Overview

The FieldTalk Lesson Content Management System (CMS) allows the Academic team to create, edit, and manage lesson content without needing to work directly with JSON or Supabase.

## Access

**URL:** `/admin/lessons`

**Authentication:** Only users with `user_type = 'platform_admin'` in the `players` table can access the CMS. The middleware automatically checks this and redirects unauthorized users.

## Features

### 1. Lesson Management

#### Lessons List (`/admin/lessons`)
- **View all lessons** with filtering options
- **Search** by title or description
- **Filter** by pillar or active status
- **Quick actions:**
  - 👁️ **Preview** - View the lesson as students see it
  - ✏️ **Edit** - Open the lesson editor
  - 📋 **Clone** - Duplicate an existing lesson
  - 🗑️ **Delete** - Remove a lesson (with confirmation)

#### Create New Lesson (`/admin/lessons/new`)
- Set up basic lesson information:
  - Title (required)
  - Pillar selection (required)
  - Difficulty level (beginner/intermediate/advanced)
  - Descriptions (English & Portuguese)
  - XP reward
  - Sort order
  - Active status

#### Edit Lesson (`/admin/lessons/[id]/edit`)
- **Two editing modes:**
  1. **Form Mode** (default) - User-friendly forms for each step type
  2. **JSON Mode** - Direct JSON editing for advanced users

- **Lesson Settings Panel:**
  - Edit all basic lesson properties
  - Toggle active status
  - Change pillar, difficulty, XP, etc.

- **Steps Management:**
  - Add new steps using dropdown
  - Drag & drop to reorder steps
  - Expand/collapse steps
  - Delete steps
  - Edit step content inline

### 2. Step Types

The CMS supports 11 step types with dedicated form interfaces:

#### Simple Form-Based Steps

1. **Scenario** (`scenario`)
   - Title, content (EN/PT)
   - Image, video, thumbnail uploads
   - Audio file upload
   - Translation toggle

2. **Vocabulary** (`vocabulary`)
   - Add multiple vocabulary items
   - Each item has:
     - English phrase
     - Portuguese translation
     - Example sentence
     - Pronunciation (IPA)
     - Usage tip
     - Audio file

3. **AI Speech Practice** (`ai_speech_practice`)
   - Prompt and context
   - Expected text (example)
   - Bilingual instructions (EN/PT)

4. **AI Gap Fill** (`ai_gap_fill`)
   - Add multiple sentences
   - Each sentence has:
     - Gap text (use ___ for gaps)
     - Context and hints
     - 4 multiple choice options
     - Correct answer

5. **AI Writing** (`ai_writing`)
   - Prompt, content, context
   - Example text
   - Min/max word count
   - Bilingual instructions

6. **Memory Match** (`memory_match`)
   - Add English/Portuguese vocabulary pairs
   - Simple interface for quick entry

7. **Completion** (`completion`)
   - Congratulations content
   - XP reward
   - Badge unlocked
   - List of achievements
   - Next lesson preview

#### JSON-Based Steps (Complex)

These use a JSON editor with templates:

8. **Interactive Pitch** (`interactive_pitch`)
9. **Interactive Game** (`interactive_game`)
10. **AI Conversation** (`ai_conversation`)
11. **AI Listening Challenge** (`ai_listening_challenge`)

**Why JSON mode?**
- These steps have complex nested structures (clickable areas, game configs, etc.)
- Templates are provided to get started quickly
- You can copy from existing lessons

### 3. Media Management

#### File Uploads
The CMS includes a built-in media uploader for:
- **Images** (JPG, PNG, GIF, WebP)
- **Videos** (MP4, WebM)
- **Audio** (MP3, WAV, OGG)

**How to upload:**
1. Click the "Upload" button next to any media field
2. Select your file
3. Wait for upload to complete
4. URL is automatically inserted

**Where files are stored:**
- All uploaded files go to Supabase Storage bucket: `videos`
- Organized in folders: `lesson-media/`, `scenario-images/`, `vocab-audio/`, etc.

**Manual URL entry:**
- You can also paste URLs directly if files are already hosted
- Useful for existing media in the `/public` folder

### 4. Workflow

#### Creating a New Lesson from Scratch

1. **Navigate to `/admin/lessons`**
2. **Click "Create New Lesson"**
3. **Fill in basic information:**
   - Title: "Meeting Your Coach"
   - Pillar: Select "Survival English"
   - Difficulty: Beginner
   - Description: Add English and Portuguese descriptions
   - XP: 150
   - Active: Leave unchecked until ready

4. **Click "Create Lesson"** - You'll be taken to the editor

5. **Add Steps:**
   - Click "+ Add Step" dropdown
   - Select "Scenario"
   - Fill in the scenario details
   - Upload media files
   - Click expand/collapse to move to next

6. **Continue adding steps** in order:
   - Scenario (introduction)
   - Vocabulary (key phrases)
   - AI Speech Practice (speaking)
   - AI Gap Fill (comprehension)
   - Completion (summary)

7. **Reorder if needed** - Drag steps by the grip handle

8. **Preview** - Click "Preview" button to see student view

9. **Save** - Click "Save" button

10. **Activate** - Edit lesson settings and check "Active"

#### Cloning an Existing Lesson

1. Find the lesson you want to duplicate
2. Click the 📋 Clone icon
3. A copy is created with "(Copy)" in the title
4. Edit the clone as needed
5. Change title and update content
6. Activate when ready

### 5. Tips & Best Practices

#### Content Creation
- **Start with a template:** Clone a similar lesson to save time
- **Use consistent naming:** Keep titles clear and descriptive
- **Fill translations:** Always provide Portuguese translations
- **Test audio:** Ensure audio files work before saving
- **Preview often:** Use preview mode to check student experience

#### Media Files
- **Optimize images:** Use reasonable file sizes (< 1MB for photos)
- **Name files clearly:** Even though URLs are generated, good names help during upload
- **Reuse media:** You can use the same URL across multiple steps/lessons

#### Step Organization
- **Scenario first:** Start with context-setting scenarios
- **Vocabulary early:** Teach key phrases before exercises
- **Practice middle:** Place speaking/writing exercises after vocab
- **Completion last:** Always end with a completion step

#### JSON Mode
- **Use templates:** Click "Load Template" button
- **Validate:** JSON errors are shown immediately
- **Format:** Click "Format JSON" to clean up formatting
- **Copy existing:** Easiest way is to copy from a working lesson

### 6. Troubleshooting

#### "Failed to load lessons"
- Check your authentication (must be platform_admin)
- Check browser console for errors
- Refresh the page

#### "Failed to upload file"
- Check file size (< 10MB recommended)
- Check file type is supported
- Try a different file
- Check Supabase Storage permissions

#### "Invalid JSON"
- Click "Format JSON" to identify errors
- Common issues:
  - Missing commas
  - Extra commas
  - Unmatched brackets
  - Missing quotes
- Use a JSON validator online if needed

#### Steps not saving
- Check for required fields (title, etc.)
- Ensure all vocabul ary items are complete
- Check browser console for errors
- Try JSON mode to see the data structure

#### Preview not working
- Ensure lesson has an ID (saved at least once)
- Check that steps are properly formatted
- Try refreshing the preview

### 7. Advanced: Database Structure

For reference, lessons are stored in the `lessons` table:

```sql
- id (uuid)
- title (text)
- description (text)
- description_pt (text)
- pillar_id (uuid) - links to pillars table
- difficulty (text)
- xp_reward (integer)
- sort_order (integer)
- is_active (boolean)
- content (jsonb) - the actual lesson steps
- created_at (timestamp)
- updated_at (timestamp)
```

The `content` column structure:
```json
{
  "type": "multi_step",
  "steps": [
    {
      "id": "step-1",
      "type": "scenario",
      "title": "...",
      ...
    }
  ]
}
```

### 8. Future Enhancements

Potential features to add later:
- **Preview mode within editor** - See changes without leaving page
- **Version history** - Restore previous versions
- **Bulk operations** - Edit multiple lessons at once
- **Content templates** - Save and reuse common step configurations
- **Media library** - Browse and select from uploaded files
- **Collaborative editing** - Multiple users editing with conflict resolution
- **Import/Export** - Transfer lessons between environments

### 9. File Structure

For developers, here's where everything lives:

```
src/
├── app/(site)/admin/lessons/
│   ├── page.js                    # Lessons list
│   ├── new/page.js                # Create new lesson
│   └── [id]/edit/page.js          # Edit lesson
├── components/admin/
│   ├── MediaUploader.js           # File upload component
│   └── step-forms/
│       ├── ScenarioStepForm.js
│       ├── VocabularyStepForm.js
│       ├── AISpeechPracticeStepForm.js
│       ├── AIGapFillStepForm.js
│       ├── AIWritingStepForm.js
│       ├── MemoryMatchStepForm.js
│       ├── CompletionStepForm.js
│       └── JSONStepForm.js        # For complex step types
├── lib/supabase/
│   └── lesson-queries.js          # Database queries
└── middleware.js                   # Authentication check
```

### 10. Support & Questions

If you encounter issues or need help:
1. Check this guide first
2. Look at existing lessons for examples
3. Try JSON mode to see the raw data
4. Contact the development team with:
   - What you were trying to do
   - What happened instead
   - Screenshots if relevant
   - Browser console errors (F12 > Console)

## Quick Reference

| Action | Location | Shortcut |
|--------|----------|----------|
| View all lessons | `/admin/lessons` | - |
| Create lesson | Click "Create New Lesson" | - |
| Edit lesson | Click ✏️ icon | - |
| Preview lesson | Click 👁️ icon | - |
| Clone lesson | Click 📋 icon | - |
| Delete lesson | Click 🗑️ icon | - |
| Add step | "+ Add Step" dropdown | - |
| Reorder steps | Drag by 📍 handle | - |
| Switch to JSON | "JSON Mode" button | - |
| Upload file | "Upload" button | - |
| Save changes | "Save" button | - |

---

**Last Updated:** 2025-09-26
**Version:** 1.0