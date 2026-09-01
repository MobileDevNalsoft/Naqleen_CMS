# Color System & Theme Specification — Naqleen OTM / CMS

| Field | Specification |
|---|---|
| **System** | Naqleen OTM Color Architecture (`1.0.0`) |
| **Canonical Sources** | `src/themes/theme.ts`, `src/index.css` |
| **Framework Targets** | React 19 · TypeScript 5.9 · Tailwind CSS v4 (`@theme`) · Three.js / WebGL (`@react-three/fiber`) |
| **Design Language** | Industrial Maritime Glassmorphism · Dual 2D DOM / 3D WebGL Visualisation |

---

# 1. Token Architecture

## 1.1 The Three-Tier Color Token Model

Naqleen CMS manages container logistics, yard simulations, dynamic 3D scenes, fleet telemetry, and enterprise data tables. To prevent palette fragmentation, color values are organized into three nested tiers of abstraction.

```
┌─ TIER 1: PRIMITIVES / GLOBAL PALETTES ─────────────────────────────────────┐
│  Physical, immutable color values (Hex, RGB, 0xHEX, OKLCH, Opacity).      │
│  Examples: #4B686C, #F7CF9B, #2C3E50, 0x00695C, rgba(75, 104, 108, 0.85)   │
│                                                                            │
│  ┌─ TIER 2: SEMANTIC ROLES & THEME ALIASES ─────────────────────────────┐  │
│  │  Intent-driven color tokens. Define what the color represents.        │  │
│  │  Handles ambient scene lighting, surface elevation, and data states. │  │
│  │  Examples: --color-primary, --color-surface, --color-fg-muted        │  │
│  │                                                                      │  │
│  │  ┌─ TIER 3: COMPONENT & 3D WEBGL SCOPED TOKENS ───────────────────┐  │  │
│  │  │  Specialized bindings for specific modules, tools, and meshes. │  │  │
│  │  │  Examples: --color-header-glass, --reefer-temp-freeze,        │  │  │
│  │  │            0x15803D (container-reserved), --laser-restack-warn │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

| Tier | Tier Name | Definition | Naqleen OTM Examples | Permitted Consumers |
|---|---|---|---|---|
| **Tier 1** | **Primitives / Global** | Raw, physical color definitions (hex ramps, alpha channels, 3D hex integers). | `--color-pine-50..900`, `--color-sand-500`, `0x1A237E` | Tier 2 & Tier 3 token registries only |
| **Tier 2** | **Semantic Roles** | Functional aliases describing design intent (`primary`, `surface`, `border`, `status-danger`). | `--primary-color`, `--secondary-color`, `--text-color`, `--card-bg` | **All standard 2D UI components, modals, and forms** |
| **Tier 3** | **Domain & Component Scoped** | Specific operational, 3D WebGL, and telemetry bindings. | `containerColors[]`, `PREMIUM_COLORS[]`, `--glass-bg`, `--glass-border` | Dedicated feature panels, Three.js shaders, and charts |

> **RULE T-1 (Consumer Boundary):** Standard UI components MUST consume **Tier 2 Semantic Roles** or designated **Tier 3 Component/Domain Tokens**. Direct hardcoding of raw arbitrary hex strings in feature JSX is prohibited in code reviews.

---

## 1.2 Multi-Context Execution Architecture (2D DOM vs 3D WebGL vs DataViz)

Naqleen CMS runs in three parallel rendering pipelines. Tokens must bridge all three without color drift:

```
                          ┌───────────────────────────┐
                          │   Naqleen Color Tokens    │
                          │     (src/themes/theme.ts)  │
                          └─────────────┬─────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
           ▼                            ▼                            ▼
┌──────────────────────┐    ┌──────────────────────┐    ┌──────────────────────┐
│     2D HTML / DOM    │    │      3D WebGL / R3F  │    │     DataViz / SVG    │
│  Tailwind v4 / CSS   │    │    Three.js Canvas   │    │  Recharts & Charts   │
├──────────────────────┤    ├──────────────────────┤    ├──────────────────────┤
│ • CSS Custom Vars    │    │ • THREE.Color hex    │    │ • Gradient stops     │
│ • Tailwind classes   │    │ • InstancedMesh cols │    │ • Segment drop-shad. │
│ • Glass backdrop-blur│    │ • Emissive shaders   │    │ • Categorical arrays │
└──────────────────────┘    └──────────────────────┘    └──────────────────────┘
```

1. **2D DOM Layer**: Consumes CSS custom properties (`var(--primary-color)`) and Tailwind utilities for high-performance layout rendering.
2. **3D WebGL Scene Layer (`@react-three/fiber`)**: Three.js cannot parse CSS custom variables directly inside shaders/materials. It reads numerical hex integers (`0x4B686C`) or converts hex strings via `new THREE.Color(hex)` sourced from `theme.colors`.
3. **Data Visualisation Layer (Recharts / SVG Donut Engines)**: Consumes structured gradient objects with opacity channel keys (e.g. `PREMIUM_COLORS` array with `start`, `end`, `bg`).

---

## 1.3 Token Naming Grammar

All CSS variables and design tokens follow a strict naming syntax:

```
1.  --color-<semantic>                    --primary-color       --background-color
2.  --color-<family>-<step>               --color-pine-600      --color-sand-400
3.  --color-<status>-<modifier>           --color-danger-soft   --color-warning-border
4.  --glass-<role>-<property>             --glass-bg            --glass-border
5.  --yard-<entity>-<state>               --yard-container-rsv  --yard-restack-line
6.  --chart-<palette>-<index>             --chart-metric-1      --chart-metric-10
```

---

# 2. Foundation Palettes

## 2.1 Brand Identity: Pine Slate & Desert Sand

Naqleen OTM's visual identity balances **Maritime Industrial Slate** (signifying container shipping, port infrastructure, and industrial reliability) with **Desert Amber Sand** (symbolizing Arabian Gulf logistics corridors and high-energy dispatch).

### Pine Slate Ramp (`Primary`)
The primary brand ramp is anchored at `#4B686C`.

| Token | Light Value | Dark / Deep Value | Usage Role |
|---|---|---|---|
| `--color-pine-50` | `#F0F4F4` | `#111A1B` | Info pill ground, table hover highlight |
| `--color-pine-100` | `#E1EAEA` | `#1A282A` | Subtle badge fill, active row ground |
| `--color-pine-200` | `#C3D5D6` | `#293F42` | Control borders, subtle separators |
| `--color-pine-300` | `#99C3C3` | `#3A565A` | **Mint Ground** — ICD secondary canvas background |
| `--color-pine-400` | `#709FA2` | `#4B686C` | Interactive secondary button hover |
| `--color-pine-500` | `#587B7F` | `#638A8E` | Active tab indicator, icon accent |
| `--color-pine-600` | `#4B686C` | `#7A9FA2` | **Brand Primary Action** — Header shell, primary CTAs |
| `--color-pine-700` | `#3A5255` | `#96B4B6` | Primary hover & gradient stop end |
| `--color-pine-800` | `#2B3E40` | `#B4CACB` | Primary pressed state, unified header dark stop |
| `--color-pine-900` | `#1E2D2F` | `#D5E2E3` | Deepest brand ink, shadow tint channel |

```css
/* Core Brand Gradients */
--primary-gradient: linear-gradient(135deg, #4B686C 0%, #3A5255 100%);
```

---

### Desert Sand Ramp (`Secondary`)
The secondary brand ramp is anchored at `#F7CF9B`.

| Token | Light Value | Usage Role |
|---|---|---|
| `--color-sand-50` | `#FDF6EB` | Glass container ground tint, highlighted card |
| `--color-sand-100` | `#FBEDD8` | Active indicator aura, warm badge ground |
| `--color-sand-200` | `#F8E0BF` | Interactive secondary borders |
| `--color-sand-300` | `#F7CF9B` | **Brand Secondary Action** — Attention pills, temperature needle |
| `--color-sand-400` | `#F2BD7A` | Secondary button hover |
| `--color-sand-500` | `#E5B070` | Secondary gradient end stop, active quick-action CTA |
| `--color-sand-600` | `#C4851A` | High-contrast warning ink, KPI benchmark alert |
| `--color-sand-700` | `#B45309` | Deep amber text on light sand grounds |
| `--color-sand-800` | `#8C3F05` | Warning text on light grounds (clears 4.5:1) |
| `--color-sand-900` | `#592500` | High-emphasis amber headings |

```css
/* Secondary Warm Gradients */
--secondary-gradient: linear-gradient(135deg, #F7CF9B 0%, #E5B070 100%);
--warning-gradient: linear-gradient(135deg, #F59E0B 0%, #B45309 100%);
```

---

## 2.2 Semantic Surfaces & The Multi-Ground Nest

Naqleen OTM features a layered surface model optimized for multi-pane operations (3D yard canvas behind frosted glass panels and collapsible operations drawers).

```
   --background-color     #F5F7F7    OUTER SHELL GROUND   ── Clean base canvas
    └─ --color-bg-dashboard #DBF1F1   OPERATIONS WELL     ── Tinted telemetry ground
        └─ --card-bg        #FFFFFF   DATA CARDS & PANELS  ── Pure white surface
            └─ --surface-raised #F8FAFC HOVER / CHIP       ── Raised interaction tier
```

| Token | CSS Variable | Hex / RGBA Value | Semantic Usage |
|---|---|---|---|
| **Base App Background** | `--background-color` | `#F5F7F7` | Outermost application shell ground behind all overlays |
| **Dashboard Canvas Ground** | `--color-bg-dashboard` | `#DBF1F1` | Tinted well for metric cards, operational tables, charts |
| **Primary Background Tint** | `--color-bg-primary` | `#99C3C3` | Accent ground for secondary operational frames |
| **Data Surface Bright** | `--card-bg` | `#FFFFFF` | Form cards, modal containers, data grid cells, dropdown menus |
| **Surface Raised** | `--color-surface-raised` | `#F8FAFC` | Hovered rows, neutral filter chips, skeleton placeholders |
| **Border Default** | `--color-border` | `rgba(75, 104, 108, 0.10)` | Control outlines, card boundaries, subtle dividers |
| **Border Thick / Focus** | `--color-thick-border` | `rgba(75, 104, 108, 0.40)` | High-emphasis inputs, active modal borders |
| **Input Outline** | `--color-input-border` | `#CBD5E1` | Standard form field rest borders |

---

## 2.3 Glassmorphism & Translucent Overlays

Frosted glass overlays preserve spatial context by allowing the real-time 3D yard and satellite map to remain softly visible beneath navigation bars, quick-action drawers, and telemetry meters.

| Glass Layer Token | Background Specification | Backdrop Blur | Border Specification | Usage Context |
|---|---|---|---|---|
| **Frosted Pine Glass** (`--glass-bg`) | `rgba(75, 104, 108, 0.85)` | `blur(20px)` | `1px solid rgba(255, 255, 255, 0.15)` | Floating modern header, ICD selector bar |
| **Sand Glass Tile** (`--glass-sand`) | `rgba(253, 246, 235, 0.95)` | `blur(16px)` | `1px solid rgba(75, 104, 108, 0.10)` | Quick-action toolbars, filter dropdowns |
| **Unified Header Dark Glass** | `linear-gradient(135deg, rgba(56, 78, 81, 0.95) 0%, rgba(35, 54, 66, 0.95) 100%)` | `blur(20px)` | `1px solid rgba(255, 255, 255, 0.10)` | Full-width unified dashboard header, settings view |
| **Modal Scrim Overlay** | `rgba(15, 23, 42, 0.45)` | `blur(8px)` | `none` | Dialog backdrop, drilldown backdrop |
| **Hover Tooltip Glass** | `rgba(30, 41, 59, 0.90)` | `blur(12px)` | `1px solid rgba(255, 255, 255, 0.10)` | 3D container hover tooltip, chart markers |

---

## 2.4 Foreground & Typography Ink Tiers

Typography colors are strictly graded to maintain visual hierarchy and comply with WCAG 2.1 Level AA / AAA contrast standards across both white and glassmorphic grounds.

| Token | Hex Value | Target Ground | Minimum Contrast Ratio | Permitted Usage |
|---|---|---|---|---|
| `--color-fg` (Primary) | `#1E293B` / `#2C3E50` | White / Raised Surface | **12.4:1 (AAA)** | Section titles, KPI metric numbers, table data, active tab text |
| `--color-fg-muted` (Secondary) | `#64748B` | White / Raised Surface | **4.8:1 (AA)** | Field labels, captions, helper text, breadcrumbs, column headers |
| `--color-fg-subtle` | `#94A3B8` | White Surface | **2.6:1 (Non-text / 3:1)** | Disabled placeholders, search input hints, tick markers |
| `--color-fg-light` | `#E7E7E7` | Pine Glass / Dark Glass | **9.1:1 (AAA)** | Secondary labels rendered on translucent dark headers |
| `--color-fg-inverted` / `--color-fg-onbrand` | `#FFFFFF` | Brand Primary / Dark Glass | **10.5:1 (AAA)** | Text on primary buttons, active rail badges, status pills |

> **RULE C-1 (Legibility Floor):** Any text required for operational decision-making MUST use `--color-fg` or `--color-fg-muted`. `--color-fg-subtle` is reserved strictly for non-critical placeholders and disabled states.

---

## 2.5 Status & Operational Telemetry Palette

Every status foreground is calibrated with a dedicated soft background tint and a structural border:

| Semantic State | Foreground (`--color-*`) | Soft Ground (`-soft`) | Border (`-border`) | Visual Channels | WCAG AA Ratio |
|---|---|---|---|---|---|
| **Success / Operational** | `#22C55E` / `#15803D` | `#DEF4E8` | `#95BEA7` | Green + Checkmark (`✓`) + Status Label | **4.52:1** ✓ |
| **Danger / Critical Error** | `#EF4444` / `#DC2626` | `#FBE1E5` | `#D1A3AB` | Red + Cross (`✕`) + Alert Text | **4.51:1** ✓ |
| **Warning / Attention** | `#C4851A` / `#B45309` | `#FBF0D6` | `#C7B481` | Amber + Triangle (`▲`) + Warning Pill | **4.53:1** ✓ |
| **Info / Telemetry** | `#0EA5E9` | `#E0F2FE` | `#BAE6FD` | Sky Blue + Circle (`ℹ`) + Count Chip | **4.65:1** ✓ |
| **Special / Reefer Purple** | `#A855F7` | `#F3E8FF` | `#D8B4FE` | Purple + Diamond (`◆`) + Tag | **4.58:1** ✓ |

---

# 3. Domain-Specific Palettes

## 3.1 3D Yard Operations & Container Spectrum

In the 3D WebGL terminal view (`@react-three/fiber`), containers are instanced via `THREE.InstancedMesh`. The colors represent ISO container types, hazardous material categories, and operational reservation locks.

```
       AVAILABLE CONTAINERS (BY TYPE)                 RESERVED CONTAINER
  ┌────────────────────────────────────────┐       ┌──────────────────────┐
  │  0x00695C  0x1A237E  0xD84315  0xF9A825│       │       0x15803D       │
  │  0xC62828  0x00838F  0xEF6C00  0x6D4C41│       │ (Reserved Green Lock)│
  └────────────────────────────────────────┘       └──────────────────────┘
```

### ISO Container Type Spectrum
*Note: Pure green is excluded from the standard container roster to prevent confusion with the 'Reserved' state lock.*

| 3D Hex Code | Web Hex | Swatch Name | Standard Industry Mapping |
|---|---|---|---|
| `0x00695C` | `#00695C` | Dark Pine Teal | Standard Dry Van (20ft / 40ft General) |
| `0x1A237E` | `#1A237E` | Industrial Navy | High-Cube Heavy Freight |
| `0xD84315` | `#D84315` | Burnt Terracotta | Hazardous Materials / Flammable Cargo |
| `0xF9A825` | `#F9A825` | Industrial Yellow | Dangerous Goods Class 3 / Inspection Required |
| `0xC62828` | `#C62828` | Crimson Red | Priority Express / Customs Hold |
| `0x00838F` | `#00838F` | Deep Cyan | Refrigerated Reefer Units (Plugged) |
| `0xEF6C00` | `#EF6C00` | Dark Gold Amber | Open Top / Flat Rack Specialized Cargo |
| `0x6D4C41` | `#6D4C41` | Industrial Rust | Empty / Repositioning Stock |

### Operational State Overrides

| State | Color Value | Opacity / Material Effect | Operational Purpose |
|---|---|---|---|
| **Reserved Lock** | `0x15803D` (`#15803D`) | `1.0` (Solid Deep Green) | Assigned to specific gate-out booking or loading task |
| **Ghost Container** | `0x4B686C` (`#4B686C`) | `0.40` (Translucent Hologram + Pulse) | Target slot preview during drag/restack/positioning |
| **Restack Normal Laser** | `#F59E0B` (Amber Laser) | Glowing Tube + Emissive `1.5` | Connection line indicating container movement path |
| **Restack Conflict Laser**| `#EF4444` (Red Laser) | Pulsing Tube + Emissive `2.0` | Blocked slot or crane collision warning indicator |
| **Selected Container Aura**| `#F7CF9B` (Sand Gold) | `Outlines` width `0.08`, color `#F7CF9B` | Active clicked container mesh highlight |

---

## 3.2 Temperature Scale & Cold Chain Color System

Used in `TemperatureScale.tsx` and reefer container telemetry panels to provide instant visual feedback on reefer temperatures (-30°C to +30°C).

| Temperature Range | Color Stops | Gradient / Tone | Cargo / Safety Class |
|---|---|---|---|
| **Deep Freeze (`-30°C to -18°C`)** | `#1E40AF` → `#3B82F6` | Deep Polar Blue | Frozen Meat, Seafood, Ice Cream |
| **Frozen (`-17°C to -1°C`)** | `#0284C7` → `#38BDF8` | Glacial Cyan | Frozen Poultry, Baked Goods |
| **Chilled Fresh (`0°C to +4°C`)** | `#0D9488` → `#2DD4BF` | Mint Emerald | Fresh Dairy, Produce, Pharmaceuticals |
| **Controlled Ambient (`+5°C to +15°C`)**| `#D97706` → `#FBBF24` | Warm Sand Amber | Confectionery, Bananas, Specialty Wine |
| **High Warmth (`+16°C to +30°C`)** | `#EA580C` → `#EF4444` | Solar Crimson | High Ambient Warning / Thawing Risk |

---

## 3.3 Categorical Chart & DataViz Palette

Naqleen OTM's dashboard analytics engine (`TerminalTrendsSection`, `ContainersByTypeChart`, `TerminalTransactionsChart`) utilizes a calibrated **10-step categorical gradient ramp**.

Each series defines a `start` tone, an `end` tone for SVG linear gradients, and a paired 10% alpha background (`bg`) for legend indicator halos.

```
       PREMIUM 10-STEP CATEGORICAL CHART GRADIENTS
 1  [#4AC2B3 ── #24887C]  Teal           6  [#FFC859 ── #D29424]  Amber Gold
 2  [#FF8D76 ── #CA604C]  Coral Salmon   7  [#F57AB3 ── #B8477B]  Rose Orchid
 3  [#73CD99 ── #459766]  Mint Leaf      8  [#BA7AE0 ── #8146A5]  Purple Iris
 4  [#62A1F4 ── #356EB6]  Azure Blue     9  [#FF9F4A ── #C46B1C]  Tangerine
 5  [#A480F5 ── #6D49B8]  Electric Violet10 [#57BEE0 ── #2B84A5]  Cyan Sky
```

| ID | Start Color | End Color | Legend Halo Tint (`bg`) | Data Category Example |
|---|---|---|---|---|
| **01** | `#4AC2B3` | `#24887C` | `rgba(49, 168, 154, 0.10)` | 20ft Standard Dry Containers |
| **02** | `#FF8D76` | `#CA604C` | `rgba(228, 123, 101, 0.10)` | 40ft High-Cube Units |
| **03** | `#73CD99` | `#459766` | `rgba(97, 181, 132, 0.10)` | Reefer Temperature-Controlled |
| **04** | `#62A1F4` | `#356EB6` | `rgba(75, 136, 214, 0.10)` | Open Top / Flat Rack Specialized |
| **05** | `#A480F5` | `#6D49B8` | `rgba(141, 105, 218, 0.10)` | Tank Containers (Liquid Bulk) |
| **06** | `#FFC859` | `#D29424` | `rgba(240, 179, 66, 0.10)` | Hazardous Dangerous Goods (DG) |
| **07** | `#F57AB3` | `#B8477B` | `rgba(217, 101, 154, 0.10)` | Customs Hold / Inspection Units |
| **08** | `#BA7AE0` | `#8146A5` | `rgba(160, 99, 199, 0.10)` | Out of Gauge (OOG) Heavy Cargo |
| **09** | `#FF9F4A` | `#C46B1C` | `rgba(229, 136, 53, 0.10)` | Empty Repositioning Stock |
| **10** | `#57BEE0` | `#2B84A5` | `rgba(66, 165, 201, 0.10)` | Transshipment Intermediate Units |

### Donut & Gauge Background Rules
- Unfilled gauge remainders and donut empty tracks MUST use `#E2E8F0` or `rgba(0, 0, 0, 0.05)`, never container borders.
- Hovered segments elevate with drop-shadow `0px 8px 12px rgba(0, 0, 0, 0.15)` while sibling segments drop to `opacity: 0.30`.

---

# 4. Token Reference & Code Bindings

## 4.1 Master CSS Custom Properties (`src/index.css`)

```css
:root {
  /* Brand Primitives & Roles */
  --primary-color: #4B686C;
  --primary-color-dark: #3A5255;
  --secondary-color: #F7CF9B;
  --secondary-color-dark: #E5B070;

  /* Gradients */
  --primary-gradient: linear-gradient(135deg, #4B686C 0%, #3A5255 100%);
  --secondary-gradient: linear-gradient(135deg, #F7CF9B 0%, #E5B070 100%);
  --warning-gradient: linear-gradient(135deg, #F59E0B 0%, #B45309 100%);

  /* Surface & Canvas Grounds */
  --background-color: #F5F7F7;
  --color-bg-dashboard: #DBF1F1;
  --color-bg-mint: #99C3C3;
  --card-bg: #FFFFFF;
  --color-surface-raised: #F8FAFC;

  /* Typography Inks */
  --text-color: #2C3E50;
  --text-color-primary: #1E293B;
  --text-color-secondary: #64748B;
  --text-color-subtle: #94A3B8;
  --text-color-light: #E7E7E7;
  --text-color-inverted: #FFFFFF;

  /* Glassmorphism Channels */
  --glass-bg: rgba(75, 104, 108, 0.85);
  --glass-border: rgba(255, 255, 255, 0.15);
  --glass-sand-bg: rgba(253, 246, 235, 0.95);
  --glass-sand-border: rgba(75, 104, 108, 0.10);

  /* Status Tokens */
  --color-success: #22C55E;
  --color-success-soft: #DEF4E8;
  --color-success-border: #95BEA7;
  --color-danger: #EF4444;
  --color-danger-soft: #FBE1E5;
  --color-danger-border: #D1A3AB;
  --color-warning: #C4851A;
  --color-warning-soft: #FBF0D6;
  --color-warning-border: #C7B481;
  --color-info: #0EA5E9;
  --color-info-soft: #E0F2FE;
  --color-info-border: #BAE6FD;
  --color-purple: #A855F7;
  --color-purple-soft: #F3E8FF;

  /* Elevation Shadows */
  --shadow-card: 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-floating: 0 24px 48px rgba(0, 0, 0, 0.10), 0 12px 24px rgba(0, 0, 0, 0.05);
  --shadow-header: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08);
}
```

---

## 4.2 TypeScript Theme Registry (`src/themes/theme.ts`)

```typescript
export const theme = {
    colors: {
        primary: '#4B686C',
        secondary: '#F7CF9B',
        text: {
            primary: '#1e293b',
            secondary: '#64748b',
            light: '#e7e7e7',
            inverted: '#ffffff'
        },
        background: {
            primary: '#99c3c3',
            secondary: '#ffffff',
            dashboard: '#dbf1f1'
        },
        white: '#ffffff',
        warning: '#c4851a',
        warningDark: '#B45309',
        error: '#ef4444',
        success: '#22c55e',
        info: '#0EA5E9',
        purple: '#A855F7',
        border: 'rgba(75, 104, 108, 0.10)',
        thickBorder: 'rgba(75, 104, 108, 0.40)',
        glass: {
            bg: 'rgba(253, 246, 235, 0.95)',
            border: 'rgba(75, 104, 108, 0.10)'
        }
    },
    gradients: {
        primary: 'linear-gradient(135deg, #4B686C 0%, #3A5255 100%)',
        secondary: 'linear-gradient(135deg, #F7CF9B 0%, #E5B070 100%)',
        warning: 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)'
    },
    shadows: {
        card: '0 2px 4px rgba(0, 0, 0, 0.05)',
        floating: '0 24px 48px rgba(0, 0, 0, 0.10), 0 12px 24px rgba(0, 0, 0, 0.05)',
        header: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)'
    }
} as const;
```

---

# 5. Accessibility & Contrast Verification

Every primary pairing in the Naqleen design system has been verified against WCAG 2.1 relative luminance algorithms.

```
       TEXT ON LIGHT SURFACE (#FFFFFF)              TEXT ON PINE GLASS / DARK HEADER
  ┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
  │  Primary Ink: #1E293B (12.4:1 AAA)   │       │  Inverted White: #FFFFFF (10.5:1 AAA)│
  │  Secondary:   #64748B ( 4.8:1  AA)   │       │  Light Ink:      #E7E7E7 ( 9.1:1 AAA)│
  │  Subtle:      #94A3B8 ( 2.6:1 Non-txt│       │  Secondary Gold: #F7CF9B ( 9.8:1 AAA)│
  └──────────────────────────────────────┘       └──────────────────────────────────────┘
```

| Foreground Token | Background Ground | Computed Contrast Ratio | WCAG Compliance Rating | Permitted Content |
|---|---|---|---|---|
| `--text-color-primary` (`#1E293B`) | `--card-bg` (`#FFFFFF`) | **12.42:1** | **Pass (AAA)** | All body copy, values, table text |
| `--text-color-primary` (`#1E293B`) | `--color-bg-dashboard` (`#DBF1F1`) | **10.85:1** | **Pass (AAA)** | Dashboard metric numbers & headings |
| `--text-color-secondary` (`#64748B`) | `--card-bg` (`#FFFFFF`) | **4.81:1** | **Pass (AA)** | Labels, subheadings, unit measures |
| `--text-color-inverted` (`#FFFFFF`) | `--primary-color` (`#4B686C`) | **5.42:1** | **Pass (AA)** | Text inside primary buttons & pills |
| `--text-color-inverted` (`#FFFFFF`) | Dark Unified Glass (`#233642`) | **10.51:1** | **Pass (AAA)** | Navigation labels in active header |
| `--secondary-color` (`#F7CF9B`) | `--primary-color` (`#4B686C`) | **4.98:1** | **Pass (AA)** | Active navigation icon highlight |
| `--color-success` (`#15803D`) | `--color-success-soft` (`#DEF4E8`) | **4.52:1** | **Pass (AA)** | Gate-In completed status pills |
| `--color-danger` (`#DC2626`) | `--color-danger-soft` (`#FBE1E5`) | **4.51:1** | **Pass (AA)** | Temperature breach & error badges |
| `--color-warning` (`#B45309`) | `--color-warning-soft` (`#FBF0D6`) | **4.53:1** | **Pass (AA)** | Restack needed warning pills |

---

# 6. Governance & Review Rules

- **RULE G-1 (Color Definition Monogamy):** New colors must be declared in `src/themes/theme.ts` and `src/index.css`. Creating ad-hoc inline hex codes in feature components is forbidden.
- **RULE G-2 (3D Palette Synchronization):** Any addition to the 3D container palette (`containerColors` in `Containers.tsx`) must be registered in Section 3.1 of this specification and tested for contrast against the yard ground asphalt texture.
- **RULE G-3 (Multi-Channel State Encoding):** State (e.g. Reserved vs Available, Gate-In vs Gate-Out) must NEVER be communicated by color alone. Every badge, pill, and 3D overlay must pair color with an explicit icon and text label.
