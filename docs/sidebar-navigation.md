# Navigation system

The sidebar has three stable main destinations. Teachers see **لوحاتي، الدفعات، الأوسمة**. Guests see **الرئيسية، الأوسمة، تسجيل الدخول**. Entering a board never changes the destination or label of a primary link.

## Information hierarchy

1. **Primary destinations:** labelled vertical rows at the top of the desktop sidebar; the same destinations and order inside the phone's sidebar.
2. **Current board:** a named, searchable switcher followed by **جدول المتابعة، عرض اللوحة، إعدادات اللوحة**. The public view is absent for private boards. Links are withheld until board visibility is known. Guests receive public links only.
3. **Student shortcuts:** an optional disclosure with alphabetical names and search. Selecting a profile opens this section and marks the current student. Rankings never reorder navigation.
4. **Account:** a named account and labelled sign-out action at the bottom. Creation leads to the existing guided flow; adding students and recording memorization stay in their pages.

On mobile, the sticky header exposes the sidebar button and current location. Board links sit under that header. The bottom navigation was removed at the user’s request; the sidebar is the only primary navigation surface. The header remains available while scrolling. On desktop, labels remain visible; the previous icon-only collapse mode was removed.

## Implementation

- `js/application/navigation/navigation-model.js` defines primary destinations, parent-section selection, board destinations and location labels. It has no DOM or Firebase dependency.
- `js/presentation/layout/SidebarView.js` and `AppHeaderView.js` render the same policy for their surfaces. Shared existing artwork is in `NavigationIcons.js`. Cohort pages supply a scoped location trail after their data loads.
- `SidebarStudentsNav.js` owns the optional student disclosure and search, without edit forms or persistence.
- `AppLayout.js` owns the shell, injected services, current board/student context, account changes and drawer accessibility. Changed sections are patched without resetting unrelated search inputs.
- `css/navigation.css` owns navigation styling and responsive behavior. Tokens come from `css/tokens.css`. Banner styles are scoped to banner classes so ordinary headers do not inherit them.

## Interaction and accessibility

Navigation uses native links, buttons, labelled `nav` regions, lists and `details/summary`; it does not impersonate an ARIA application menu. Exact pages use `aria-current="page"`; parent sections use `aria-current="true"`. The mobile drawer has a dialog label, traps focus, isolates its background and returns focus to the trigger. Escape closes an expanded board picker first, then the drawer. Desktop navigation stays nonmodal. Primary controls have at least 44px targets, visible focus indicators and reduced-motion support.

The drawer never adds a history entry. Back and Forward restore real routes and scroll positions. A route visit owns its container, subscriptions and cancellation signal. Queued persistence can finish after leaving while stale UI updates remain blocked. Protected redirects retain the requested internal destination. Static resources, external links and downloads keep native browser behavior.

Account changes clear board/student context immediately; late requests cannot restore another account's data. Private student profiles use `/edit/:boardId/students/:studentId`; public profiles use `/b/:boardId/students/:studentId`.

## Research grounding

- [NN/g: Menu-design checklist](https://www.nngroup.com/articles/menu-design/): visible desktop navigation, clear labels, consistent naming and an identifiable current location. Applied to the labelled top-level rows and separate board section.
- [Google: Adaptive navigation](https://developer.android.com/develop/adaptive-apps/guides/build-adaptive-navigation): adapt navigation placement to available space while sharing the destination model. Applied here to a permanent desktop sidebar and modal phone sidebar, following the user’s preference; this is a web implementation, not an Android component integration.
- [W3C: Disclosure navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/): ordinary navigation uses links and disclosure controls without ARIA menu semantics.
- [W3C: Modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/): keyboard containment, Escape and focus return for the mobile drawer.
- [NN/g: Navigation alignment](https://www.nngroup.com/articles/right-justified-navigation-menus/): align to the reading direction. Arabic navigation is aligned to the right using logical CSS properties.

## Validation

`npm run verify` covers the routing lifecycle, access policy, stable navigation destinations, loading/private-board links, parent-selection semantics, alphabetical student shortcuts and architecture boundaries. Browser evidence and the repeatable matrix are in [the redesign review](audit/navigation-redesign/review.md).
