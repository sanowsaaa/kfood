# Bundled fonts

The existing Inter, Playfair Display and Remix Icon 4.0.0 fonts are served with the application to remove two third-party render-blocking stylesheets. Their designs and glyph mappings are unchanged.

- Inter: Google Fonts v20 WOFF2 subsets. SIL Open Font License in `inter-OFL.txt`.
- Playfair Display: Google Fonts v40 WOFF2 subsets, normal and italic. SIL Open Font License in `playfair-display-OFL.txt`.
- Remix Icon 4.0.0: original complete WOFF2 and CSS glyph map from https://cdn.jsdelivr.net/npm/remixicon@4.0.0/fonts/ . Apache License 2.0 in `remixicon-LICENSE.txt`. The font source declaration uses the local WOFF2 file. Decorative glyphs have an empty CSS text alternative so screen readers and button names use the visible label instead of a private-use character; the original declaration is retained as a fallback for older browsers.

Google Fonts stylesheet source (retrieved 2026-10-19):
https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap

All language subsets are retained. Identical variable-font files used by multiple weights share one weight-range declaration; browsers download only the subsets and styles actually used. Vite fingerprints these files for safe caching.
