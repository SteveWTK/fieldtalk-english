# FieldTalk Deployment Checklist

Complete checklist for deploying the Schools & Academies functionality.

---

## 📊 Database Setup

### Step 1: Run SQL Scripts in Order

Run these in your Supabase SQL Editor:

1. **`DATABASE_UPDATES.sql`** (If not already run)
   - Creates schools, classes, conversation_topics, topic_votes, conversation_attendance tables
   - Adds school_id, class_id, client_type to players table
   - Sets up RLS policies for schools

2. **`VOTING_SCHEMA_UPDATE.sql`**
   - Creates lesson_votes table for embedded voting
   - Sets up RLS policies for voting

3. **`ACADEMIES_DATABASE_SCHEMA.sql`** (NEW)
   - Creates academies table
   - Adds academy_id to players table
   - Sets up RLS policies for academies

### Step 2: Verify Tables Created

Check that these tables exist:
- ✅ schools
- ✅ classes
- ✅ conversation_topics
- ✅ topic_votes
- ✅ conversation_attendance
- ✅ lesson_votes
- ✅ academies

Check that players table has these columns:
- ✅ client_type (student/player)
- ✅ user_type (platform_admin/school_admin/teacher/student/client_admin/player)
- ✅ school_id
- ✅ class_id
- ✅ academy_id

---

## 🧪 Testing Guide

### Test Platform Admin (You)

1. **Login as platform_admin**
   - Go to `/admin`
   - Should see overview with Schools and Academies cards

2. **Test Schools Management**
   - Go to `/admin/schools`
   - Click "Add School"
   - Create a test school (e.g., "Test International School")
   - Verify it appears in the list
   - Click into school detail page
   - Edit school info and save

3. **Test Academies Management**
   - Go to `/admin/academies`
   - Click "Add Academy"
   - Create a test academy (e.g., "Test FC Academy")
   - Verify it appears in the list
   - Click into academy detail page
   - Edit academy info and save

4. **Test Lesson CMS**
   - Go to `/admin/lessons`
   - Create a lesson with `target_audience = "schools"`
   - Create a lesson with `target_audience = "players"`
   - Create a lesson with `target_audience = "both"`
   - Verify lessons are created successfully

### Test School Admin

1. **Create School Admin User**
   ```sql
   -- In Supabase SQL Editor
   INSERT INTO players (id, user_type, client_type, school_id, full_name, email)
   VALUES (
     '[auth_user_id]',
     'school_admin',
     'student',
     '[school_id_from_schools_table]',
     'School Admin Test',
     'schooladmin@test.com'
   );
   ```

2. **Login as School Admin**
   - Go to `/school-admin/dashboard`
   - Should see school name and stats
   - Check all tabs: Overview, Classes, Students
   - Verify "No classes yet" message shows

### Test Teacher

1. **Create Teacher User & Assign to Class**
   ```sql
   -- First create a class
   INSERT INTO classes (school_id, name, is_active)
   VALUES ('[school_id]', 'Test Class 7A', true);

   -- Then create teacher
   INSERT INTO players (id, user_type, client_type, school_id, full_name, email)
   VALUES (
     '[auth_user_id]',
     'teacher',
     'student',
     '[school_id]',
     'Teacher Test',
     'teacher@test.com'
   );

   -- Assign teacher to class
   UPDATE classes SET teacher_id = '[teacher_id]' WHERE id = '[class_id]';
   ```

2. **Login as Teacher**
   - Go to `/teacher/dashboard`
   - Should see list of classes
   - Click into a class
   - Check Students, Attendance, Voting tabs
   - Try marking attendance

### Test Student

1. **Create Student User**
   ```sql
   INSERT INTO players (id, user_type, client_type, school_id, class_id, full_name, email)
   VALUES (
     '[auth_user_id]',
     'student',
     'student',
     '[school_id]',
     '[class_id]',
     'Student Test',
     'student@test.com'
   );
   ```

2. **Login as Student**
   - Go to `/lessons` (main app)
   - Should only see lessons with `target_audience = "schools"` or `"both"`
   - Should NOT see lessons with `target_audience = "players"`
   - Open a lesson and complete it

### Test Academy Admin

1. **Create Academy Admin User**
   ```sql
   INSERT INTO players (id, user_type, client_type, academy_id, full_name, email)
   VALUES (
     '[auth_user_id]',
     'client_admin',
     'player',
     '[academy_id_from_academies_table]',
     'Academy Admin Test',
     'academyadmin@test.com'
   );
   ```

2. **Login as Academy Admin**
   - Go to `/academy-admin/dashboard`
   - Should see academy name and stats
   - Check Overview and Players tabs

### Test Player

1. **Create Player User**
   ```sql
   INSERT INTO players (id, user_type, client_type, academy_id, full_name, email)
   VALUES (
     '[auth_user_id]',
     'player',
     'player',
     '[academy_id]',
     'Player Test',
     'player@test.com'
   );
   ```

2. **Login as Player**
   - Go to `/lessons`
   - Should only see lessons with `target_audience = "players"` or `"both"`
   - Should NOT see lessons with `target_audience = "schools"`
   - Open a lesson and complete it

### Test Conversation Voting

1. **Create a Voting Lesson**
   - Login as platform_admin
   - Go to `/admin/lessons/new`
   - Create lesson with `target_audience = "schools"`
   - Add a "Conversation Vote" step
   - Set vote deadline to future date (e.g., tomorrow)
   - Add 3 topics
   - Save lesson

2. **Test Voting as Student**
   - Login as student
   - Open the voting lesson
   - Should see countdown timer
   - Select a topic and vote
   - Should see "Vote Submitted" confirmation
   - Try voting again - should show "already voted" message

3. **Test Results After Deadline**
   - Change vote deadline to past date in database
   - Refresh page
   - Should see voting results with percentages
   - Winner should be highlighted

---

## 🚀 Route Testing Checklist

| Route | Role Required | Status |
|-------|--------------|--------|
| `/admin` | platform_admin | ⬜ |
| `/admin/lessons` | platform_admin | ⬜ |
| `/admin/schools` | platform_admin | ⬜ |
| `/admin/schools/new` | platform_admin | ⬜ |
| `/admin/schools/[id]` | platform_admin | ⬜ |
| `/admin/academies` | platform_admin | ⬜ |
| `/admin/academies/new` | platform_admin | ⬜ |
| `/admin/academies/[id]` | platform_admin | ⬜ |
| `/school-admin/dashboard` | school_admin | ⬜ |
| `/teacher/dashboard` | teacher | ⬜ |
| `/teacher/class/[id]` | teacher | ⬜ |
| `/academy-admin/dashboard` | client_admin | ⬜ |
| `/lessons` | All authenticated | ⬜ |
| `/lesson/[id]` | All authenticated | ⬜ |

---

## 🔧 Common Issues & Solutions

### Issue: "No school/academy assigned" message
**Solution:** User needs `school_id` or `academy_id` set in players table

### Issue: Lessons not showing for students/players
**Solution:** Check `client_type` in players table and `target_audience` in lessons table

### Issue: Can't access dashboard
**Solution:** Check `user_type` in players table matches required role

### Issue: RLS policy error
**Solution:** Make sure all SQL scripts ran successfully and policies were created

### Issue: Voting not working
**Solution:**
- Check `lesson_votes` table exists
- Verify RLS policies for lesson_votes
- Check step has valid `vote_deadline` in future

---

## 📋 Next Steps After Testing

Once all tests pass:

1. **Document for Team**
   - Share `NAVIGATION_STRUCTURE.md` with team
   - Explain user types and their access
   - Show typical workflows

2. **Prepare for Stripe Integration**
   - Decide on pricing (per student/player cost)
   - Set up Stripe account and keys
   - Plan webhook handlers for subscription events

3. **Production Deployment**
   - Run all SQL scripts in production Supabase
   - Deploy Next.js app to Vercel
   - Test with real users

4. **Monitoring**
   - Set up error tracking (Sentry)
   - Monitor user signups and billing
   - Track lesson completions

---

## ✅ Sign-off Checklist

Before presenting to team/deploying:

- ⬜ All database tables created
- ⬜ All RLS policies working
- ⬜ Platform admin can create schools
- ⬜ Platform admin can create academies
- ⬜ School admin can view their school
- ⬜ Teachers can view their classes
- ⬜ Academy admin can view their academy
- ⬜ Students see school-focused lessons only
- ⬜ Players see player-focused lessons only
- ⬜ Voting system works end-to-end
- ⬜ All dashboards render correctly
- ⬜ Navigation is intuitive
- ⬜ No console errors
- ⬜ Dark mode works throughout

---

## 🎉 You're Ready!

Once all checks pass, you're ready to:
1. Present to team
2. Make any requested adjustments
3. Move on to Stripe integration
4. Launch! 🚀