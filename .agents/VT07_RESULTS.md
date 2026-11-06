# VT-07: Independent saved rooms

Date: 2026-11-06. Status: complete for the browser-local library scope.

## Delivered

- `/valerian/rooms.html` is accessible before access-code entry or any agent or
  mission creation. Links are on the access screen and cockpit header.
- Reuses the accepted room builder, geometry and placement validation. The
  independent editor hides simulation and mission-draft controls.
- Multiple named rooms persist through browser reload. Open restores geometry,
  robot start/heading, objects, door states and smoke. Name validation and
  rejected imports/saves leave the draft intact.
- Each room has a UUID and numbered append-only saved revisions. Layout edits
  retain previous versions. The UI opens the latest; `loadLibraryRoom` supports
  an explicit revision for future mission bindings. Room-layout edit counters
  and saved-record revision numbers are separate concepts.
- Web Locks serialize library writes between tabs. Saving an outdated editor
  fails with an instruction to reopen or save as a new room. Storage quota,
  access errors and malformed existing libraries never silently replace data.
- Existing room JSON import/export works without a mission. Legacy per-agent
  drafts, simulation controls and authentication remain available as before.

## Persistence decision and limits

This increment uses localStorage under `prometheus.room-library.v1` for the
browser-local simulator. It stores layouts, names, IDs and revisions; no access
codes, supervisor tokens or mission authority. It is per origin and browser
profile, independent of login/access scope. Rooms are visible to other users of
the same browser profile/address. No private per-user storage or server sync.

`localhost` and `127.0.0.1`, and different ports, have separate libraries. A
temporary demo port change requires layout transfer through exported JSON.
Clearing browser data removes the library; use exports for portable copies.
Import/export transfers layouts, not saved-library IDs/history. Saving requires
Web Locks, supported by the current browser on loopback URLs. Older revisions
consume browser storage; quota errors direct the operator to export. No
migration/deletion UI or backend room storage is claimed.

VT-08 must use explicit saved room ID/revision or a validated snapshot in each
saved mission; merely reading whichever room revision is latest is insufficient.
No saved-mission selector or integrated mission Run is delivered here (VT-08/09).

## Verification

- `npm.cmd run test:room:unit`: 22 cases passed (3 new library cases).
- With `PROMETHEUS_SKIP_WEBSERVER=true`, `PLAYWRIGHT_CHROMIUM_CHANNEL=msedge`,
  `npm.cmd run test:room:browser`: 13 cases passed (4 new library journeys and
  all 9 existing room/mission widget journeys).
- New browser journeys cover two rooms before login, reload, full exported
  layout equality after reopen, immutable older revision, import/export,
  invalid input retention, concurrent tab conflict, storage quota failure and
  mobile width. No demo/backend calls are needed by the standalone editor.
- Initial cross-tab test failed because its source-asset fixture only routed
  one page. Routing the whole context fixed it; the production save flow then
  passed through both tabs.
- Live browser checks followed the actual access-screen link and saved,
  reloaded and reopened a room on both ports 49679 and 8080. No JavaScript page
  errors. Disposable browser contexts did not alter the user's library or
  backend missions. Static files copied to `target/classes/public/valerian`
  for the two running servers; no restart/database change.
- Screenshots: `target/room-library-desktop.png` and
  `target/room-library-mobile.png`; mobile visually inspected.

No Java implementation changes, provider calls, commit, push or deployment.
