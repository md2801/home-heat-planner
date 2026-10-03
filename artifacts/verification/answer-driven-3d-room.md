# Answer-driven 3D room verification

Verified on 3 October 2026 using the production build on localhost:3003 and the existing app on localhost:3000 (read-only check).

- 122 automated tests passed, including direction/covering pairing, four windows on one wall, zero/unknown windows, fan and AC positions, and camera quadrants.
- ESLint, TypeScript and production build passed.
- Browser: selected portable fan, changed bedside to foot-of-bed, selected wall-mounted AC and north wall. Updated window 1 from west to north, with curtains; window 2 retained west with blinds. Confirmed and reloaded the room.
- Browser: switched 3D to 2D and back, navigated review → contributors → options → plan → follow-up. Same reported room retained. No captured browser errors.
- Mobile follow-up: document scroll width equals viewport width; 3D canvas reports two windows.
- Screenshot: answer-driven-3d-room.png.

Dimensions, furniture positions, diagonal bearings on a rectangular shell and ceiling-equipment positions are illustrative. Unknown physical positions remain unplaced and listed. This does not add thermal or financial estimates. Test choices were made only in the separate port-3003 browser storage.
