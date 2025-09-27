# FieldTalk Navigation Structure

This document maps out the complete navigation structure for all user types in FieldTalk.

---

## 🎯 User Types & Their Roles

### Platform Admin (FieldTalk Internal Team)
- **Who:** You and your team
- **Access:** Full system access
- **Dashboard:** `/admin`

### School Admin
- **Who:** School administrators (e.g., head of English department)
- **Access:** Their school's data only
- **Dashboard:** `/school-admin/dashboard`

### Teacher
- **Who:** Teachers employed by schools
- **Access:** Their assigned classes only
- **Dashboard:** `/teacher/dashboard`

### Student
- **Who:** Students in schools
- **Access:** School-focused lessons, their class
- **Dashboard:** Main app (lessons page)

### Academy/Club Admin
- **Who:** Football academy/club administrators
- **Access:** Their academy's players only
- **Dashboard:** `/academy-admin/dashboard`

### Player
- **Who:** Young footballers in academies/clubs
- **Access:** Player-focused lessons, their progress
- **Dashboard:** Main app (lessons page)

---

## 📍 Complete Route Map

### Platform Admin Routes (`/admin/*`)
*Requires: `user_type = 'platform_admin'`*

```
/admin
├── / (Overview dashboard - all schools, academies, stats)
├── /lessons (Lesson CMS - existing)
│   ├── / (List all lessons)
│   ├── /new (Create new lesson)
│   └── /[id]/edit (Edit lesson)
├── /schools (Schools management - NEW)
│   ├── / (List all schools)
│   ├── /new (Create new school)
│   └── /[id] (School detail: classes, students, teachers)
└── /academies (Academies management - TO BUILD)
    ├── / (List all academies/clubs)
    ├── /new (Create new academy)
    └── /[id] (Academy detail: players, stats)
```

### School Admin Routes (`/school-admin/*`)
*Requires: `user_type = 'school_admin'` + `school_id` set*

```
/school-admin
└── /dashboard
    ├── Overview tab (School info, stats)
    ├── Classes tab (Create/view classes)
    ├── Teachers tab (Invite/manage teachers)
    └── Students tab (Create students - triggers billing)
```

### Teacher Routes (`/teacher/*`)
*Requires: `user_type = 'teacher'`*

```
/teacher
├── /dashboard (List of their classes)
└── /class/[id]
    ├── Students tab (View roster, progress)
    ├── Attendance tab (Mark attendance)
    └── Voting tab (View voting results)
```

### Academy Admin Routes (`/academy-admin/*`)
*Requires: `user_type = 'client_admin'` + `academy_id` set*

```
/academy-admin
└── /dashboard
    ├── Overview tab (Academy info, stats)
    ├── Players tab (Create/manage players - triggers billing)
    └── Progress tab (View all players' progress)
```

### Student/Player Routes (Main App)
*All users access lessons, filtered by their `client_type`*

```
/ (Main app)
├── /lessons (Filtered by target_audience based on client_type)
├── /lesson/[id] (Take lesson)
├── /progress (View own progress)
└── /profile (View/edit profile)
```

---

## 🗂️ Database Fields That Control Access

### `players` table determines access:

| Field | Values | Purpose |
|-------|--------|---------|
| `user_type` | `platform_admin`, `school_admin`, `teacher`, `student`, `client_admin`, `player` | Determines which dashboards user can access |
| `client_type` | `student`, `player` | Determines which lessons they see (schools vs academies) |
| `school_id` | UUID | Links school admin/teacher/student to their school |
| `academy_id` | UUID | Links academy admin/player to their academy (TO ADD) |
| `class_id` | UUID | Links student to their class |

---

## 🔐 Access Control Summary

| Route | Allowed Roles | Additional Check |
|-------|--------------|------------------|
| `/admin/*` | `platform_admin` | - |
| `/school-admin/*` | `school_admin`, `platform_admin` | Must have `school_id` |
| `/teacher/*` | `teacher`, `platform_admin` | - |
| `/academy-admin/*` | `client_admin`, `platform_admin` | Must have `academy_id` |
| Main app | All authenticated users | Lessons filtered by `client_type` |

---

## 🎨 Navigation Menu Structure

### For Platform Admin:
```
FieldTalk Admin
├── Dashboard (overview of all schools & academies)
├── Lessons (CMS)
├── Schools
└── Academies
```

### For School Admin:
```
[School Name]
└── Dashboard (classes, teachers, students)
```

### For Teacher:
```
My Classes
└── Dashboard (list of classes)
    └── [Class Name] (class detail)
```

### For Academy Admin:
```
[Academy Name]
└── Dashboard (players, progress)
```

### For Students/Players:
```
FieldTalk
├── Lessons
├── Progress
└── Profile
```

---

## 💡 Implementation Notes

### Current Status:
- ✅ Platform Admin: Lessons management complete
- ✅ Platform Admin: Schools management complete
- ✅ School Admin: Dashboard complete
- ✅ Teacher: Dashboard and class management complete
- ⏳ Platform Admin: Academies management (next)
- ⏳ Academy Admin: Dashboard (next)
- ⏳ Main Admin Dashboard: Overview page needs update

### To Build Next:
1. Academy/Club management pages (mirror schools structure)
2. Academy admin dashboard (simpler than school admin - no classes)
3. Update `/admin/page.js` to show overview of both schools and academies
4. Add navigation menu component for easier switching between sections

### Database Changes Needed:
- Add `academy_id` column to `players` table
- Create `academies` table (similar to `schools` but simpler)
- Update RLS policies for academy access

---

## 🔄 Typical User Workflows

### School Onboarding:
1. Platform admin creates school at `/admin/schools/new`
2. Platform admin creates school admin user (manually via Supabase or invite)
3. School admin logs in → sees `/school-admin/dashboard`
4. School admin creates classes
5. School admin creates/invites teachers
6. School admin creates students (triggers per-student billing)

### Academy Onboarding:
1. Platform admin creates academy at `/admin/academies/new`
2. Platform admin creates academy admin user
3. Academy admin logs in → sees `/academy-admin/dashboard`
4. Academy admin creates players (triggers per-player billing)

### Content Management:
1. Platform admin goes to `/admin/lessons`
2. Creates/edits lessons
3. Sets `target_audience` (schools, players, or both)
4. Students/players see filtered lessons based on their `client_type`

---

This structure keeps schools and academies separate but uses similar patterns, making it intuitive to manage both types of clients.