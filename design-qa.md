# Student journey race-track QA

final result: passed

## Current iteration — varied routes and a camera instead of scrolling

This section supersedes the original implementation notes below.

- Product rule corrected: a program map no longer represents all 114 surahs. New programs start at Juz Amma, cohort program creation offers juz programs only, and legacy whole-Quran scopes render the program map as Juz Amma while the Quran tab remains the 30-juz overview.
- Removed the visible surah/juz names and ayah counts underneath badges; retained accessible station names and status.
- Surah travel distance is now `72 × sqrt(ayahs)`, with no additive spacing baseline. A 20-ayah surah has twice the route length of a 5-ayah surah. This is a compressed length scale, not a strictly proportional word-count scale. Every juz uses exactly 360 route units.
- Replaced repeated horizontal hairpins with rounded terraces, broad diagonal S-bends and extended vertical stretches. The two maps use different stable routes. Changing memorization status does not move the route.
- The expanded view is a bounded 2D map with pointer dragging, pinch/wheel zoom, keyboard navigation, zoom buttons, fit-entire-map and return-to-current controls. The old scroll container and scroll-state code were removed. Each map retains its camera between tab switches.
- The entire-route overview is optional. Opening the map starts around current progress at a readable badge size. Fitting the complete route reserves room above the toolbar so the last station is not obscured.
- Upright landscape tiles now overlap with feathered image edges, replacing reflected tiles that made some trees appear upside down in the wider view.

### Current visual evidence and checks

- Native desktop: `docs/audit/student-map-redesign/racetrack/camera-desktop.png`, 1280 × 720.
- Mobile override: `docs/audit/student-map-redesign/racetrack/camera-mobile.png`, 390 × 780 CSS viewport. The in-app browser captures viewport overrides with a smaller rendered buffer in the screenshot; evaluated the visible component and DOM bounds rather than claiming pixel-exact density fidelity.
- Source and current mobile implementation were displayed together in one comparison input. This remains a concept adaptation of the 586 × 664 race-track reference. The later user requests explicitly override the reference's distance labels and conventional scrolling behavior.
- Typography: existing Arabic font and original badge calligraphy retained; removed redundant captions. Current badge and map controls remain readable at the default camera zoom.
- Spacing: badge positions follow measured route lengths, and camera zoom uniformly scales the route. All juz intervals are tested for equality; surah intervals are tested for length sensitivity and a meaningful short/long difference.
- Color/images: existing Wisam controls and gold/white completion palette retained; raster landscape remains sharp in the inspected default desktop view. No new illustration approximations were added.
- Content: captions below badges are absent (DOM count zero); program and Quran tabs retained.
- Interaction evidence: dragging translated the scene by the pointer's displacement while body scroll stayed zero. Fit-entire-map returned all route bounds inside the canvas and above the toolbar. Zoomed program camera was restored exactly after switching to Quran and back (`translate(-2513.05px, -1261.72px) scale(0.98)`). Current rendered profile check: the full program map contains 37 stations, the program summary is `37 من 37 سورة محفوظة`, labels below badges are absent, and the map body does not overflow vertically.
- `npm run verify`: 129 tests and 62 runtime module checks passed. Camera tests cover fit bounds, zoom anchoring and bounded panning; route tests cover consistent juz distances, length-sensitive surah distances, route continuity, different straight/turn profiles, badge separation and preventing a 114-surah program map.
- Pinch support is implemented but was not exercised on physical touch hardware. This is a remaining device-test gap, not a claim of verified touch-hardware behavior.
- Current visual result: no remaining actionable P0/P1/P2 findings in the inspected states. Repetition of the landscape image in the optional zoomed-out overview remains a P3 art refinement.

## Previous iteration history

## Target and evidence

- Source visual truth: `/home/bolafi/Pictures/screenshot-2026-09-12_19-48-26.png` (586 × 664 pixels).
- Implementation: `http://localhost:8080/tests/ui/app/b/qa-board/students/beta`.
- Screenshots: `docs/audit/student-map-redesign/racetrack/mobile-program-fixed.png`, `mobile-quran.png`, `mobile-preview.png`, and `desktop-program.png`.
- Mobile viewport: 352 × 646 CSS pixels; screenshot 352 × 646. Desktop viewport and screenshot: 1280 × 900, with the map capped at 760 CSS pixels. Desktop capture is softened by the in-app browser viewport override; fine typography was evaluated in the native mobile capture.
- State: beta student, program and Quran tabs, current progress, full-screen dialog and compact card.
- Comparison scope: an adaptation of the reference's continuous landscape race track, not a pixel clone of Samsung Health. The original Wisam badges, Arabic font, two tabs and profile card are retained. The source is a map-only crop at a different width; no pixel-exact layout or font matching is claimed.
- Full-view evidence: the source and final mobile capture were opened together in one comparison call. The source and desktop capture were also opened together. The native mobile images show the labels, badge edges, current marker, road and terrain clearly enough that a separate detail crop was unnecessary.

## Findings and comparison history

1. **Fixed — P1: Road/badge alignment at narrow widths.** Initial mobile capture `mobile-program.png` showed the road completion color displaced relative to milestone badges. The tall SVG was preserving its aspect ratio after its container narrowed for a scrollbar, introducing a large vertical offset. The map now measures the open dialog's content width, reserves scrollbar space, uses the same horizontal coordinate system for badges and road, and preserves the route's explicit vertical coordinates. `mobile-program-fixed.png` confirms that the gold route ends at the completed badge and the remaining route passes through upcoming badges correctly.
2. **Fixed — P2: Crowded short-surah milestones.** Geometry checks found potential overlaps at bends and narrow widths. Increased the minimum readable travel distance and inset the outer bends. The layout test now checks all 114 stations at widths 260, 280, 320, 390, 640 and 760 pixels, including label bounds and pairwise spacing.
3. **Fixed — P2: Focus lost when resize rebuilt the preview.** Preserve focus on the preview opener or selected tab during resize. After Escape, the observed active element is `فتح خريطة البرنامج بملء الشاشة`.
4. No remaining actionable P0/P1/P2 findings in the inspected states.

## Required visual surfaces

- **Typography:** Existing Arabic app typography and original badge calligraphy retained. Names and ayah counts have separate weights and sizes; opaque light caption surfaces keep them legible over foliage. No clipped labels in the inspected mobile state.
- **Spacing/layout:** Continuous rounded bends replace the fixed three-badges-per-row grid. Station placement follows measured path distance. A surah's incoming leg uses `200 + ayahs × 1.6` layout units, so long surahs travel farther while short surahs retain a readable minimum. This is an ayah-count approximation of length, not a word count or strict linear scale. Juz are treated as comparable reading units with equal legs. The card remains a 280-pixel-tall window onto current progress; the complete map scrolls only in the full-screen view.
- **Colors/tokens:** Wisam green remains the primary UI color. Gold denotes completed road sections, warm white denotes upcoming sections, and checks/text provide additional state cues. Selected tabs retain existing token colors.
- **Images:** Original local Wisam badge assets are reused. Terrain is a generated 1024 × 1536 WebP (~88 KB) with trees, meadow, ponds and sand. Alternate vertical tiles are mirrored so their boundaries meet without a hard seam. The code-driven SVG is the actual data route, not a replacement for landscape illustration assets.
- **Copy/content:** Existing map labels retained; current position and ayah counts support orientation. No stage selector, pagination, next-station CTA or station detail footer added.

## Verification

- `npm run verify`: 123 tests passed; 60 runtime modules passed syntax, import, architecture/reachability and static-resource checks.
- Focused geometry tests passed again after adjusting desktop bends.
- Program map: all 114 stations represented. Quran map: all 30 juz represented.
- No horizontal overflow in the mobile dialog. Visible terrain/badge images loaded successfully.
- Switching maps restored the same observed program scroll position: 5690.8505859375 pixels before and after.
- Escape closed the dialog and returned focus to the preview opener.
- Browser error log query returned no errors.
- Responsive viewport override reset after desktop verification.

## Follow-up polish

- Additional terrain artwork could add more regional variation to very long full-Quran journeys. The current optimized illustration repeats without visible tile seams.
- Browser Back integration for the full-screen dialog was not added or evaluated in this scoped map redesign.
