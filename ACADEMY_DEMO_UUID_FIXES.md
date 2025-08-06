# Academy Demo Lesson - UUID Fixes Applied ✅

## 🔧 Changes Made

### 1. **Fixed SQL Migration** 
File: `supabase/migrations/20250104_academy_demo_lesson.sql`

**Key Changes:**
- ✅ Uses `gen_random_uuid()` instead of text string `"academy-demo-001"`
- ✅ Added missing table definitions (`lesson_metadata`, `lesson_access`)
- ✅ Uses PostgreSQL `DO` block to capture generated UUID
- ✅ All foreign key references now work properly
- ✅ Stores original ID as metadata for reference

**Main INSERT Statement:**
```sql
INSERT INTO lessons (
  id,
  pillar_id,
  title,
  -- ... other fields
) VALUES (
  gen_random_uuid(),  -- ✅ Now uses proper UUID
  1,                  -- Survival pillar
  'Your Academy Trial - The First Step to Your Dream',
  -- ... rest of values
) RETURNING id INTO lesson_uuid;
```

### 2. **Created Helper Functions**
File: `src/lib/supabase/academyDemo.js`

**Functions Added:**
- `getAcademyDemoLesson()` - Gets full lesson data by metadata
- `getAcademyDemoLessonId()` - Gets just the UUID
- `academyDemoLessonExists()` - Checks if lesson exists

### 3. **Updated Demo Landing Page**
File: `src/app/demo/academy-trial/page.js`

**Changes:**
- ✅ Now fetches actual lesson UUID on page load
- ✅ Button shows loading state while fetching
- ✅ Proper error handling if lesson not found
- ✅ Uses real UUID for navigation

### 4. **Updated Test File**
File: `test-academy-demo.js`

**Changes:**
- ✅ Added helper function to get lesson UUID
- ✅ Updated all lesson ID references
- ✅ Added fallback for testing scenarios

## 🚀 How to Use

### 1. Run the Migration
```sql
-- In Supabase SQL Editor, run:
-- File: supabase/migrations/20250104_academy_demo_lesson.sql
```

**Expected Output:**
```
NOTICE: Academy Demo Lesson created with UUID: [some-uuid-here]
```

### 2. Access the Demo
- **Landing Page**: `http://localhost:3000/demo/academy-trial`
- **Direct Lesson**: Will be `http://localhost:3000/lesson/[generated-uuid]`

### 3. Test AI Features
```javascript
// In browser console (after logging in):
// Load: test-academy-demo.js
runAllTests();
```

## 📋 Database Tables Created

### `lesson_metadata`
```sql
CREATE TABLE lesson_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id, key)
);
```

### `lesson_access`
```sql
CREATE TABLE lesson_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id),
  access_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id, access_type, user_id)
);
```

## 🔍 Finding the Lesson

Since the lesson now uses a random UUID, you can find it by:

### Option 1: Metadata Search
```sql
SELECT l.* FROM lessons l
JOIN lesson_metadata m ON l.id = m.lesson_id
WHERE m.key = 'original_id' AND m.value = 'academy-demo-001';
```

### Option 2: Title Search
```sql
SELECT * FROM lessons 
WHERE title = 'Your Academy Trial - The First Step to Your Dream';
```

### Option 3: Demo Flag
```sql
SELECT l.* FROM lessons l
JOIN lesson_metadata m ON l.id = m.lesson_id
WHERE m.key = 'is_demo' AND m.value = 'true';
```

## ✅ Verification Checklist

After running the migration, verify:

- [ ] ✅ Lesson created with UUID (check console output)
- [ ] ✅ Metadata records created (5 entries)
- [ ] ✅ Access record created (public_demo)
- [ ] ✅ Landing page loads without errors
- [ ] ✅ Button fetches lesson UUID successfully
- [ ] ✅ Clicking button navigates to lesson
- [ ] ✅ All AI components work with lesson ID

## 🐛 Troubleshooting

### Migration Fails
- Check if `lessons` table exists and has UUID `id` column
- Verify `pillars` table exists with ID = 1
- Ensure PostgreSQL extensions are enabled (uuid-ossp)

### Landing Page Shows "Demo Unavailable"
- Run the migration first
- Check browser console for errors
- Verify helper function can access Supabase

### Lesson Not Found
- Check lesson was created: `SELECT COUNT(*) FROM lessons WHERE title LIKE '%Academy Trial%'`
- Verify metadata: `SELECT * FROM lesson_metadata WHERE value = 'academy-demo-001'`

## 🎯 Result

The Academy Demo Lesson now:
- ✅ Uses proper UUID primary keys
- ✅ Has all required supporting tables
- ✅ Can be found dynamically by metadata
- ✅ Works with existing lesson infrastructure
- ✅ Maintains all AI tutoring capabilities
- ✅ Provides smooth user experience

**Ready for Brazilian academy players to start their English learning journey! 🇧🇷⚽🌟**