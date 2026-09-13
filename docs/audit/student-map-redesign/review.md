# Student profile and maps — 2026-09-13

The student profile now places identity and a short achievement summary above one map card, followed by the earned badge collection. Removed the completed-program card section; cross-program memorization still contributes where repository access permits.

The supplied `/preview-maps.html` informed the winding track and original badge artwork. The product uses two keyboard-accessible tabs, six readable stations per segment, a direct station selector, next/previous controls, and a current-station shortcut. Quran stations drill into the surahs of each part. Selection shows read-only details, with no simulated progress or public editing controls. Completion colors only connect adjacent completed stations, so gaps in memorization are not presented as finished.

Juz totals use verse boundaries, including shared surahs and parts 2 and 5. Tests cover the 6236-ayah partition, a memorized surah spanning parts, and complete Quran status.

Validation: 59 runtime modules checked; 119 tests pass; git diff --check clean. Browser checks at desktop and 390px mobile: tabs and arrow-key switching, pagination, current-station focus, part drilldown/return, student switching and no-memorization state. All visible images loaded and browser error logs were empty. Screenshots: desktop.png and mobile.png. Local in-memory UI fixtures only; no Firebase records changed or deployment performed.

## Continuous map revision
Replaced segmented navigation with a bounded, natively scrollable continuous trail. Removed the selector, current-station action, pagination and detail panel. All stations remain in one ordered list; tabs retain independent scroll positions. Initial placement shows the current row with the preceding row for context. Keyboard scrolling and the 30-station Quran tab were checked in the browser; removed controls are absent. The screenshots above document the earlier revision.

## Full overview revision
Removed internal scrolling. The whole route fits in a responsive overview with adaptive columns and row spacing, capped at 440px. Small badges provide the overview; station names remain in accessible labels and native titles, with visible names on short routes. Current position and completed connections remain highlighted. The 119 automated tests pass.

## Current design: horizontal journey
The full overview has been replaced with a 230px-high horizontal journey. It opens around the first unfinished station, uses 72×76px original badge artwork with visible names, and remembers an independent horizontal position in each tab. Touch/trackpad scrolling is native; mouse dragging is supported. Roving keyboard focus uses RTL arrow keys, Home and End. Badge enlargement remains a native popover. No dropdown, next/previous pages, vertical scrolling area, or permanent detail panel.

Validation: 119 automated tests and static project checks pass. Browser keyboard navigation moved from Al-Masad to An-Nasr and scrolled the viewport; switching maps restored the position. Mobile-width screenshot inspected, and browser error logs were empty. Earlier screenshots and design notes in this file describe superseded iterations.

## Current design: stage-based journey
Following approval to group the program into stages, removed horizontal scrolling and drag handlers. Each stage contains up to six stations in the existing teaching order, laid out on a 242px-high winding map. Both map tabs default to the stage containing current progress and preserve an independently chosen stage. “Choose stage” opens an accessible native dialog of stage cards showing station ranges, completion counts and current-stage status; choosing a card jumps directly and restores focus. There are no Previous/Next controls.

Validation: 120 automated tests pass, including stage order, completion counts, current-stage assignment, empty input and a final partial stage. Browser checks on the beta fixture verified default stage 7, selection of completed stage 1, six visible stations, dialog closure/focus restoration, and selection retained after switching map tabs. Mobile layout and chooser inspected. Earlier screenshots document superseded designs.

## Current design: preview card → full-screen map
Replaced stage selection with a single accessible preview-card button. It shows up to six nearby stations and an explicit “View full map” cue. Opening presents a full-screen native dialog with a persistent close button and program/Quran tabs. The complete map uses readable original badges and vertical exploration in this dedicated view, initially near current progress. Closing restores focus to the card; each map remembers its scroll position. Removed stage grouping, stage-picker styles and obsolete badge-popover styles.

Validation: 120 automated tests pass, including preview-window boundaries and short/empty programs. Browser verified 114 program stations and 30 Quran stations in the expanded view, Escape dismissal, focus restoration and identical position before/after reopening (1297.65px for beta). Mobile preview and expanded map screenshots inspected; desktop viewport checked. Browser error logs empty. Files: preview-final.png, fullscreen-mobile-final.png, fullscreen-desktop-final.png (viewport scaling affected desktop image sharpness). Earlier designs above are superseded.

Design reference: Apple Human Interface Guidelines, Modality — full-screen presentation for in-depth content: https://developer.apple.com/design/human-interface-guidelines/modality . This informed the dedicated exploration view; the preview and app styling remain specific to Wisam.
