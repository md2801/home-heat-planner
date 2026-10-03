# Room model assets

Original procedural models created for this project in ../artifacts/3d-asset-library (relative to workspace root). GLB exports use metres and Y-up. Only assets needed by the current scene are loaded; the full example room is not used as the user's room.

The application builds its own four-wall shell and openings from the bounded room-layout projection, then loads individual furnishings, windows/coverings and equipment from these files. Three.js is installed as a version-pinned package and loaded on demand. See THREE-LICENSE.txt and docs/contracts/room-scene.md.
