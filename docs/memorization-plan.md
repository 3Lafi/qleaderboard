# Memorization plan (`خطة الحفظ`)

The plan is chosen in the board settings/edit page (`js/presentation/pages/BoardSettingsPage.js` + `js/presentation/views/ScopePickerView.js`) either from the official curriculum or from a manual range of surahs/juz. The order the teacher picks is what every other screen follows: the teacher's sheet columns, class progress, student profiles and badges all read `Leaderboard.orderedSurahs()`.

## Ordering rules (`orderPlanSurahs` in `js/shared/quran-data.js`)

One helper decides the order so the picker preview and the saved board can never disagree.

| Scope | Direction | Result |
|-------|-----------|--------|
| Juz (`type: 'juz'`) | forward | Surahs in mushaf order (الجزء 29 ثم 30 = الملك … المرسلات ثم النبأ … الناس) |
| Juz | reverse | **Juz blocks themselves are reversed, but each juz stays in mushaf order**: النبأ … الناس (كامل الجزء 30) ثم الملك … المرسلات (كامل الجزء 29) |
| Surahs (`type: 'custom'`) | reverse | The selected surahs are reversed: 105 → 100 becomes الفيل … العاديات |
| Quran (`type: 'quran'`) | reverse | الناس … الفاتحة |
| Curriculum (`type: 'curriculum'`) | any | The official curriculum order — it is never reversed, because it is a published sequence |
| Any | any | A saved `scope.customOrder` wins when it is a full permutation of the scope's surahs |

The juz rule exists because a teacher reading a two-juz plan backwards still recites each juz from its beginning; only the juz blocks swap places.

## Custom order (drag & drop)

`ترتيب مخصص` in the plan preview header turns the surah list into an editor:

- drag a card by its handle (pointer events, so it works with touch, pen and mouse),
- `▲`/`▼` buttons move a card one step — the accessible path and the precise one,
- `ArrowUp`/`ArrowDown` while a handle is focused does the same from the keyboard,
- `استعادة الترتيب` drops the custom order and returns to the computed one.

The order is stored as `scope.customOrder` (array of surah numbers). `sanitizeSettings` keeps it **only** when it is an exact permutation of the scope's surahs, so a stale order can never leak into a changed scope; `getScope()` in the picker applies the same rule before saving. Any change of unit, range or plan mode clears the editor state.

## Removed from the UI

The plan used to explain its own ordering three times over. Removed on request:

- the `تصاعدي / تنازلي` badge under the range fields,
- the `مرتبة تصاعدياً حسب تسلسل المصحف` hint above the surah list (and `مرتبة حسب المصحف` in the range chooser),
- the bottom `عكس ترتيب الحفظ` button — the circular swap button between بداية الحفظ and نهاية الحفظ is the single control that flips the plan.

## Tests

- `tests/PlanOrder.test.js` — the ordering table above, end to end through `resolvePlanRange` → `Leaderboard.orderedSurahs`, plus `customOrder` validation.
- `tests/ui/plan-checks.mjs` — the removed labels/button are gone, juz 29→30 reversed lists النبأ…الناس then الملك…المرسلات, surah ranges still reverse, and the editor works by button, by drag and by reset.
- `tests/CurriculumOrder.test.js` — unchanged, and now also guards that curriculum boards ignore the reverse flag.
