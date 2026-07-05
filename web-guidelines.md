# bench — web guidelines

A design and build reference for **bench**, a black-and-white web project centered on a Manhattan map. These guidelines synthesize patterns from the reference sites listed in `style.md`.

---

## 1. Project overview

| Item | Spec |
|------|------|
| **Site title** | `bench` |
| **Homepage** | Full-viewport map of Manhattan |
| **Site tree** | `/` (maps) · `/archive` · `/about` |
| **Palette** | Strict black & white — no accent color |
| **Tone** | Archival, infrastructural, catalog-like — quiet and precise |

**Concept:** The homepage is not a landing page with a hero image. It *is* the map. Everything else supports reading, searching, and contextualizing what the map contains — similar to how [Diagram Website](https://diagram.website/) treats the internet as a navigable surface, or [Sounds of the Forest](https://timberfestival.org.uk/soundsoftheforest-soundmap/) treats woodland audio as a spatial index.

---

## 2. Reference synthesis

Each reference site contributes a specific principle. Use these as decision filters when designing or building.

### Map-as-interface

| Reference | Takeaway for bench |
|-----------|-------------------|
| [diagram.website](https://diagram.website/) | The map *is* the site. Controls are sparse: mode toggles, labels on/off, info panel. No decorative chrome. |
| [Sounds of the Forest soundmap](https://timberfestival.org.uk/soundsoftheforest-soundmap/) | Mapbox GL as full-screen canvas. Metadata lives in a slide-over panel, not on the map itself. |
| [lightpollutionmap.info](https://www.lightpollutionmap.info/) | Layered map with persistent zoom/state in URL. Useful if bench locations are grouped by type or borough. |
| [thetechnate.net](https://thetechnate.net/) | Map points link to an archive of discrete entries. Each marker is a door into documented material. |

### Archival & catalog structure

| Reference | Takeaway for bench |
|-----------|-------------------|
| [wholeearth.info](https://wholeearth.info/) | Numbered sections, chronological lists, index-style layout. Text is long-form but visually flat. |
| [evan-roth.com/timeline](https://www.evan-roth.com/timeline/) | Filterable archive by category/year. Persistent nav, content loads in place. |
| [thetechnate.net](https://thetechnate.net/) | Each project entry has a code number, title, and location — treat benches as catalogued artifacts. |

### Typographic & visual restraint

| Reference | Takeaway for bench |
|-----------|-------------------|
| [dia.studio](https://www.dia.studio/) | Navigation is text-only: `[ Filter ]` `[ Search ]` `[ Menu ]`. No icons unless strictly necessary. |
| [abcdinamo.com](https://abcdinamo.com/) | Strong type hierarchy, generous whitespace, monochrome photography. Let type carry identity. |
| [canopycanopycanopy.com/search](https://canopycanopycanopy.com/search) | Search as a primary interaction — consider search on `/archive`. |

---

## 3. Site architecture

```
bench/
├── index.html          → maps (homepage)
├── archive.html        → catalog of bench entries
├── about.html          → project statement, credits, method
├── css/
│   └── style.css
├── js/
│   ├── map.js          → map init, markers, interactions
│   └── archive.js      → filter/search (if needed)
├── data/
│   └── benches.json    → bench locations + metadata
└── assets/
    └── (images, map tiles if self-hosted)
```

### URL structure

| Route | Page | Role |
|-------|------|------|
| `/` | **maps** | Manhattan map with bench markers; default entry point |
| `/archive` | **archive** | Text index of all benches — searchable, filterable list |
| `/about` | **about** | Project description, data sources, attribution, contact |

### Navigation (persistent across all pages)

Place a fixed header or corner nav on every page. Keep it identical everywhere.

```
bench                    maps · archive · about
```

- **bench** — site title, links to `/`
- **maps** — active on homepage
- **archive** — active on `/archive`
- **about** — active on `/about`

Active state: underline or invert (white on black bar). No hamburger menu on desktop; collapse to a single-line nav on mobile.

---

## 4. Color system

Strict monochrome. No grays for "decoration" — only for hierarchy and disabled states.

| Token | Hex | Use |
|-------|-----|-----|
| `--black` | `#000000` | Text, markers, active nav, button fill |
| `--white` | `#FFFFFF` | Background, inverse text |
| `--gray-1` | `#111111` | Primary text on white |
| `--gray-2` | `#666666` | Secondary text, metadata, captions |
| `--gray-3` | `#CCCCCC` | Borders, grid lines, map UI chrome |
| `--gray-4` | `#F5F5F5` | Hover backgrounds, panel fill |

**Rules:**
- No color accents (no blue links — use underline)
- Map markers: solid black circles or crosses, 6–10px
- Map base layer: light (white/gray streets) or dark (inverted) — pick one and stay consistent
- Photography on `/archive` or `/about`: convert to grayscale or shoot/scan in B&W

---

## 5. Typography

Typography carries the site's identity. Avoid generic system sans-serif.

### Recommended pairings (choose one direction)

**Direction A — Grotesk / neutral** (closer to DIA, Diagram)
- Display: `Inter`, `Helvetica Neue`, or `Arial` — site title `bench` in lowercase
- Body: same family, 14–16px, line-height 1.5
- Data/coordinates: `IBM Plex Mono` or `Courier New` at 12px

**Direction B — Serif / editorial** (closer to Whole Earth, The Technate)
- Display: `Times New Roman`, `Georgia`, or `Libre Baskerville` — site title in lowercase italic
- Body: serif at 15–17px
- Metadata: monospace for lat/lng, dates, bench IDs

### Type scale

| Element | Size | Weight | Case |
|---------|------|--------|------|
| Site title `bench` | 18–24px | 400 | lowercase |
| Page heading | 14px | 700 | uppercase, letter-spacing 0.05em |
| Body | 14–16px | 400 | sentence case |
| Metadata / coords | 11–12px | 400 | monospace |
| Nav links | 13–14px | 400 | lowercase |

---

## 6. Homepage — maps

The homepage is a single full-viewport map of Manhattan. No hero banner, no scrollable content below the fold.

### Layout

```
┌─────────────────────────────────────────────────────┐
│ bench                          maps · archive · about│
├─────────────────────────────────────────────────────┤
│                                                     │
│              MANHATTAN MAP (100vh − header)         │
│                                                     │
│    ○ bench marker                                   │
│         ○                                           │
│              ○                                      │
│                                                     │
│  [labels]  [info]                    zoom +/−      │
└─────────────────────────────────────────────────────┘
```

### Map behavior

| Feature | Spec |
|---------|------|
| **Bounds** | Clamp to Manhattan island (+ small margin). No panning to Brooklyn by default. |
| **Default zoom** | Fit Manhattan width in viewport. ~zoom 12–13 for Mapbox. |
| **Base style** | Custom monochrome style: white/light-gray streets, black building footprints or reverse. Avoid default colorful Mapbox/OSM tiles. |
| **Markers** | One marker per bench entry. Black dot or `+` cross. No pin-drop icons. |
| **Hover** | Marker grows slightly; show bench ID or name in a small floating label (black text, white background, 1px border). |
| **Click** | Open a minimal side panel or bottom sheet with: bench ID, location name, coordinates, link to archive entry. |
| **URL state** | Encode selected bench in hash or query: `/?bench=014` or `/#14` — shareable permalinks. |
| **Controls** | Zoom +/- only. Optional `[labels]` toggle to show/hide bench names on map. |

### Map title treatment

The word **bench** appears in the nav (not as a large H1 overlaid on the map). The map speaks for itself — same logic as Diagram Website, where the title is small and the map dominates.

### Technical options

| Approach | Pros | Cons |
|----------|------|------|
| **Mapbox GL JS** | Vector tiles, custom B&W style, smooth zoom | Requires API token |
| **Leaflet + grayscale tiles** | Free, simple | Harder to fully customize tile aesthetic |
| **Static SVG map** | Full control, no API, lightweight | Manual updates, limited zoom |
| **D3 + GeoJSON** | Maximum customization | More build effort |

**Recommendation:** Mapbox GL JS with a custom monochrome style, following the Sounds of the Forest model.

---

## 7. Archive page

A text-forward catalog of all bench entries. Inspired by Whole Earth Index and Evan Roth's timeline filter.

### Layout

```
bench                          maps · archive · about
───────────────────────────────────────────────────────
ARCHIVE                                    [search ___]

filter: all · parks · plazas · waterfront · other

014  Bryant Park, west lawn         40.7536, -73.9832
013  Central Park, bench 847          40.7829, -73.9654
012  Washington Square Park           40.7308, -73.9973
...
```

### Entry format

Each bench is a catalog row:

| Field | Example |
|-------|---------|
| ID | `014` (zero-padded 3 digits) |
| Name | `Bryant Park, west lawn` |
| Coordinates | `40.7536, -73.9832` |
| Category | `parks` / `plazas` / `waterfront` / `other` |
| Date added | `2026-07-05` |
| Notes | Optional short description |
| Image | Optional B&W photo |

### Interactions

- **Search** — filter by name, ID, or neighborhood (text input, no button)
- **Category filter** — text links, not dropdown
- **Row click** — navigate to `/` with that bench selected on the map
- **Sort** — default by ID; optional sort by name or date

### Style

- Flat list, no cards or shadows
- `1px` bottom border (`--gray-3`) between rows
- Monospace for IDs and coordinates
- No pagination initially — single scrollable list

---

## 8. About page

A single-column text page. Quiet and factual.

### Suggested sections

1. **bench** — one-paragraph project statement: what is being mapped and why
2. **method** — how locations are found, documented, photographed
3. **data** — source of map tiles, coordinate system (WGS 84), update cadence
4. **credits** — author, course/project context, libraries used
5. **contact** — email or link

### Style

- Max-width: `680px`, centered
- No images required; if used, B&W only
- Section headings: uppercase, 14px, same as archive
- Body: 15–16px, generous line-height (1.6)

---

## 9. Components

Reusable UI pieces across all pages.

### Header / nav

```
Height: 48px
Background: white
Border-bottom: 1px solid #CCC
Padding: 0 24px
Display: flex, space-between, align-center
```

### Side panel (map detail)

```
Width: 320px (desktop), 100% bottom sheet (mobile)
Background: white
Border-left: 1px solid #CCC
Padding: 24px
Close: text link "close" or `×`
```

### Buttons & links

- Links: black text, underline on hover
- Buttons: black fill, white text, no border-radius (sharp corners)
- No shadows anywhere

### Map controls

```
Position: bottom-right, 16px inset
Style: white box, 1px black border, no border-radius
Icons: `+` `−` as text characters, not icon fonts
```

---

## 10. Data model

Store bench data in `data/benches.json`:

```json
{
  "benches": [
    {
      "id": "014",
      "name": "Bryant Park, west lawn",
      "lat": 40.7536,
      "lng": -73.9832,
      "category": "parks",
      "date": "2026-07-05",
      "notes": "Stone bench, south-facing",
      "image": null
    }
  ]
}
```

### ID convention

- Zero-padded 3-digit numbers: `001`, `002`, … `014`
- IDs are permanent — never renumber, even if a bench is removed (mark as `status: "removed"`)

---

## 11. Responsive behavior

| Breakpoint | Behavior |
|------------|----------|
| **Desktop** (>768px) | Full map, side panel for detail, horizontal nav |
| **Tablet** (480–768px) | Full map, bottom sheet for detail |
| **Mobile** (<480px) | Full map, bottom sheet, nav compresses to `bench · maps · archive · about` on one line |

- Map always fills available viewport below header
- Archive list remains a single column at all sizes
- Touch: tap marker to open detail; pinch-to-zoom on map

---

## 12. Motion & interaction

Keep motion minimal and functional.

| Interaction | Motion |
|-------------|--------|
| Marker hover | Scale 1.0 → 1.3, 150ms ease |
| Panel open | Slide in from right, 200ms ease (or instant — match Diagram's directness) |
| Page load | No fade-in, no loader animation. Map tiles may load progressively. |
| Link hover | Underline appears, no color change |

No autoplay, no scroll-jacking, no parallax.

---

## 13. Accessibility

- All nav links are `<a>` elements with descriptive text
- Map markers have `aria-label` with bench name
- Side panel is keyboard-focusable; `Escape` closes it
- Text contrast: black on white meets WCAG AAA
- Provide a non-map fallback on `/archive` — the full list is accessible without the map

---

## 14. Performance

- Load map library only on `/` (not on archive or about)
- Bench JSON should be <50KB for hundreds of entries
- Use vector tiles (Mapbox) or a single pre-rendered SVG for static approach
- Lazy-load bench photos on archive page
- No custom web fonts required — system fonts load instantly

---

## 15. Build checklist

### Phase 1 — skeleton
- [ ] HTML pages: `index.html`, `archive.html`, `about.html`
- [ ] Shared header/nav across all pages
- [ ] B&W CSS tokens and typography
- [ ] `data/benches.json` with 3–5 sample entries

### Phase 2 — map
- [ ] Map library integrated on homepage
- [ ] Monochrome map style applied
- [ ] Markers rendered from JSON
- [ ] Click → side panel with bench detail
- [ ] URL hash updates on selection

### Phase 3 — archive
- [ ] Bench list rendered from JSON
- [ ] Search/filter by text and category
- [ ] Row click navigates to map with bench selected

### Phase 4 — polish
- [ ] Mobile bottom sheet
- [ ] About page content
- [ ] Favicon (simple `b` or square mark)
- [ ] Open Graph meta tags (B&W preview image)

---

## 16. What to avoid

- Color accents, gradients, or colored map tiles
- Rounded corners, drop shadows, card UI
- Stock icon sets (Font Awesome, etc.)
- Hamburger menus on desktop
- Large hero text overlaid on the map
- Autoplay video or sound
- "Welcome to bench" introductory copy on the homepage — let the map be the introduction

---

*Derived from references in `style.md`. Update this document as the project evolves.*
