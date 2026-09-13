# Student progression, badges and prior programs

Teachers run **programs** back to back: a curriculum grade, then juz 30, then juz 29, and so on. A student who finished one program must not lose what they earned when they move to the next one — before this feature, badges were computed only from the current board's scope, so every move reset a student to zero badges.

## The model

Two ideas, one rule each:

1. **The current plan measures progress.** `Student.progress`, `surahsCount` and `isCompleted` stay bound to the board's own scope — that is what the teacher is tracking this term.
2. **Badges measure the whole journey.** Badges are evaluated against `Student.effectiveMemorized` = memorized in this board ∪ prior programs.

`priorMode` (board setting, default `auto`) decides what counts as prior:

| Scope | Automatic prior (`autoPriorSurahs`) |
|-------|-------------------------------------|
| Juz (29) | every juz **above** it (30), because memorization runs 30 → 29 → 28 |
| Curriculum (grade 3) | every earlier grade **and** every earlier stage in the same country + system, each as a full year |
| Quran | nothing |
| Custom surah range | nothing |

`priorMode: 'none'` switches the automatic assumption off; `settings.priorSurahs` and a per-student `students[id].priorSurahs` can always add surahs by hand (both validated to 1–114).

`resolvePriorSurahs(board, student)` merges those three sources, and `badgeSurahsFor(board, student)` is what badge evaluation receives — so student cards, profiles, the badge wallet and the class leaderboard all agree.

## Teacher flows

- **Board settings → plan step → «احتساب البرامج السابقة في الأوسمة»**: on by default, with a live hint of exactly what will be credited ("سيُحتسب تلقائياً: 37 سورة · الجزء 30").
- **Cohort ↔ board link**: board settings (edit) has **«ربط الدفعة باللوحة»**. Linking a cohort copies its members into the board (with their `cohortStudentId`) and registers the board in the cohort's ordered `programs` list.
- **Sheet → student ⋯ menu → «المحتسب من برامج سابقة»**: a 30-chip juz grid to credit a single student who transferred from another school or program, with a live summary of what will be counted. It never touches the current plan's progress.

## Tests

- `tests/PriorMemorization.test.js` — the prior table, per-student credit, `nextProgramScope` (29 → 28, grade 1 → grade 2), `completedStudents`, and that a juz-30 badge stays earned while the student is in juz 29 while the juz-29 badge does not.
- `tests/ui/prior-checks.mjs` — the settings toggle and its hint, the promote button/counter/dialog and an actual promotion, the per-student juz grid, and the end-to-end profile check: a student moved into a juz-29 program shows 38 earned badges including `juz-30`, and zero when prior is switched off.

## الدفعات (Cohorts)

A **cohort (دفعة)** is the reusable roster: `cohorts/{id}` = `{ ownerUid, name, startedAt, note, students: { sid: { name } } }`, owned by one teacher, never publicly readable (`firestore.rules`). It exists so a teacher registers a group of students **once** — name and registration date — and then picks that cohort whenever a new program starts, instead of retyping the same names every term.

The split of responsibilities is deliberate and is what keeps the data honest:

| Entity | Holds | Changes |
|--------|-------|---------|
| Cohort | who the students are (names, intake date) | rarely |
| Board (program) | what each student memorized **in that program** | every lesson |

So a cohort never stores progress, and a board never invents students. Programs created from a cohort copy the names in and keep their own records, which is why previous programs stay intact when students move on.

### Pages

- `/cohorts` — register a cohort (name + date) and see them all with their student counts.
- `/cohorts/:id` — rename/redate the cohort, add students one at a time (the field stays open for rapid entry), paste a whole list at once, rename/remove a student, and **إنشاء برنامج لهذه الدفعة**: creates a board (juz 30 / juz 29 / full Quran), copies the cohort's students into it, and opens its settings. The new board carries `priorMode: 'auto'`, so badges accumulate as described above.

`CohortRepository` holds the only Firestore access (`listMine/get/create/update/delete/addStudent/addStudents/renameStudent/removeStudent`), and `js/domain/models/Cohort.js` owns the shape, the student limit and the date helpers.

Tests: `tests/Cohort.test.js` (model) and `tests/ui/cohort-checks.mjs` (register → add students → bulk paste → create a program with 6 students → sidebar entry present).

### لا صفحة منفصلة للطالب

A dedicated cross-program route (`/students/{cohortStudentId}`) existed briefly and was **removed on request**: the board-scoped profile already aggregates everything, so a second page only split the teacher's attention. `js/domain/usecases/StudentPrograms.js` remains — it is what the profile uses to find the student's other programs, their union of memorization and their cross-program badges.

### Linking existing data

`scripts/link-cohort.mjs` groups the repeated students of an account into a single cohort and links every board entry to it — matching names through `normalizeArabic` (hamza/taa-marbuta/diacritics/whitespace). It runs against the demo account by default:

```bash
node scripts/link-cohort.mjs --dry                       # تقرير بلا كتابة
node scripts/link-cohort.mjs --cohort "دفعة طلاب الحلقة"  # إنشاء الدفعة والربط
```

It creates the cohort empty and fills it in a second write, because `firestore.rules` requires `students == {}` at creation (same rule as boards).

### صفحة الطالب من داخل أي برنامج

The profile a teacher opens from a board (`/b/{boardId}/students/{studentId}`) is **not** program-scoped any more. When the viewer owns the board and the student entry carries a `cohortStudentId`, the page:

- shows «N سورة في هذا البرنامج»,
- renders a **«البرامج المجتازة»** section listing every program the student has completed — **including the current one** (tagged «البرنامج الحالي») — with a sheet link and, for other programs, their board profile link,
- evaluates badges over the union of this board's memorization, its automatic prior, and **every other program the student is in**,
- subscribes live to those other boards, so recording a surah in one program updates the profile immediately.

Guests and non-owners still see the board-scoped view (Firestore rules forbid reading other boards), which is why the aggregation is owner-only.

The teacher's **sheet stays per-program** on purpose: it is the record of what was covered in *this* program, while the student page is the record of the student. A surah marked in one program therefore shows on the student's page everywhere, but it does not tick a box in another program's sheet.

## تدرّج الدفعة (بلا نقل يدوي)

The manual «ترقية المتمين» dialog was **removed on request**. Progression is now a consequence of the cohort link, implemented as pure logic in `js/domain/usecases/CohortProgression.js`:

1. A cohort owns an **ordered** `programs` list (`[{ boardId, linkedAt }]`) — the order boards were linked in.
2. For every cohort member the engine looks them up in each program (by `cohortStudentId` first, then by normalized name) and asks one question per program: **did they complete its whole plan?**
3. The member's *last completed* program decides where they go: they move to **the program immediately after it** — never further — and only if they are not already there.

So a student who finishes grade 1 appears in جزء عم; once جزء عم is complete they appear in جزء تبارك. `planProgression({ cohort, boards })` is pure and returns `{ moves, total }`; `applyProgression(plan, { addStudent })` performs the writes, so the rule is unit-testable without Firestore (`tests/CohortProgression.test.js`).

**When it runs:** opening a cohort page loads its programs, shows the path («مسار الدفعة») with per-program counts, and runs a **silent idempotent sync** — plus a visible «مزامنة التقدّم الآن» button and a status line («نُقل N طالباً إلى البرنامج التالي»). Because the sync only ever *adds* a missing member to the next program, running it repeatedly is harmless.

Verified on the demo account: with the order منهج الصف الأول → جزء عم → جزء تبارك, the sync moved **13 completers of grade 1 into جزء عم** on first run.

## خرائط التقدّم (بدل لوحة الترتيب)

The profile's leaderboard was replaced on request by two **progress maps** (`js/presentation/views/ProgressMapView.js` + the pure `progress-map-model.js`):

| Map | Stations | Progress |
|-----|----------|----------|
| خريطة تقدّمي في البرنامج | one per surah in the current program's plan | memorized-in-scope ayahs ÷ scope ayahs |
| خريطة القرآن الكريم | one per **juz** (30 stations) | memorized ayahs ÷ 6236, all programs combined |

Each station is a medal: **emerald with the surah/juz calligraphy in white when memorized**, a pale mint disc with faint ink when pending, a green ring on the station the student is on now (for the Quran map that is the first incomplete juz scanning down from 30, matching how the programs run). A check badge marks completion, and the station's name and ayah count sit beside it.

**Station spacing follows length**: `gapFor(ayahs, maxAyahs)` maps each station's ayah count through a square root into a 34–132px gap, so الكوثر sits close to its neighbour while البقرة stretches the path — the map reads like a real journey instead of an even list. The path itself is a dashed vertical line with alternating right/left stations, collapsing to a single column under 720px.

All state comes from the same union as the badges (current program ∪ other programs), so a surah memorized anywhere lights up its station everywhere.
