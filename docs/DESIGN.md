# 🎨 Design System — Sovereign-AMM

---

## 1. Design Principles

| Principle                  | Description                                                              |
|:---------------------------|:-------------------------------------------------------------------------|
| **Exchange Terminal**      | Dense, monospaced numerals, tabular-nums. This is a control room, not a landing page. |
| **Physics Over Polish**    | Every visual element must convey data. No decorative gradients without purpose. |
| **10 Hz Stability**        | No layout shift and no numeric flicker at 10 Hz updates. Fixed-width numeric cells. |
| **Dual Theme**             | Full dark/light mode support with distinct, curated palettes.            |
| **Glassmorphic Panels**    | Frosted-glass terminal panels with subtle borders and backdrop blur.     |

---

## 2. Color Palette

### 🌑 Dark Mode — Deep Obsidian

| Token             | Value         | Usage                                    |
|:-------------------|:-------------|:-----------------------------------------|
| `--canvas`        | `#000000`     | Primary background                       |
| `--surface`       | `#0a0a0f`     | Panel backgrounds                        |
| `--edge`          | `#1e293b`     | Borders, hairlines                       |
| `--text-primary`  | `#f1f5f9`     | Primary text (slate-100)                 |
| `--text-muted`    | `#64748b`     | Secondary text (slate-500)               |
| `--accent-violet` | `#8b5cf6`     | Primary accent, scroll progress, badges  |
| `--accent-cyan`   | `#00e5ff`     | SoC line, secondary accent               |
| `--accent-emerald`| `#10b981`     | Bid side, healthy status, live dots      |
| `--accent-rose`   | `#f43f5e`     | Ask side, errors, emergency banners      |
| `--accent-amber`  | `#f59e0b`     | Warnings, scenario narration             |

### ☀️ Light Mode — Crisp Porcelain

| Token             | Value         | Usage                                    |
|:-------------------|:-------------|:-----------------------------------------|
| `--canvas`        | `#f8fafc`     | Primary background (slate-50)            |
| `--surface`       | `#ffffff`     | Panel backgrounds                        |
| `--edge`          | `#e2e8f0`     | Borders (slate-200)                      |
| `--text-primary`  | `#0f172a`     | Primary text (slate-900)                 |
| `--text-muted`    | `#94a3b8`     | Secondary text (slate-400)               |
| `--accent-violet` | `#7c3aed`     | Slightly deeper for light backgrounds    |
| `--accent-emerald`| `#059669`     | Bid side, healthy status                 |
| `--accent-rose`   | `#e11d48`     | Ask side, errors                         |

---

## 3. Typography

| Role             | Font Family        | Weight      | Usage                                          |
|:-----------------|:-------------------|:------------|:------------------------------------------------|
| **Display**      | `Aldrich`          | 400         | Page headers, section labels, status text, branding |
| **Mono / Data**  | `JetBrains Mono`   | 400–600     | Prices, SoC values, tabular data, code, event log |
| **Body**         | System sans-serif  | 400         | General UI text, descriptions, tooltips         |

### Font Loading

```tsx
// app/layout.tsx
const aldrich = Aldrich({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
```

### Numeric Rendering Rules

- All price / SoC / energy values use `font-variant-numeric: tabular-nums`
- Fixed-width containers prevent layout shift at 10 Hz
- Numbers right-aligned within their cells

---

## 4. UI Components

### 4.1 Terminal Panel

The core layout primitive. A glassmorphic card with:
- `label-caps` header (e.g., `01 — L2 BOOK`)
- Optional action slot (top-right, for controls like range selectors)
- Frosted border (`border-edge/40`), backdrop blur

### 4.2 Live Ribbon

A thin status bar spanning the full width, showing:
- Active data source (Live / Demo)
- Tick count and uptime
- Connection status pill (🟢 Connected / 🔴 Disconnected)
- Current SoC, price, and scenario

### 4.3 Page Header

Consistent across all routes:
- `label-caps` route indicator (e.g., `00 — DASHBOARD`)
- `Aldrich` title
- Subtitle with brief description
- Action slot (right-aligned badges or controls)

### 4.4 Segmented Pill

A horizontal pill selector for ranges (`1H | 4H | 24H | 7D | ALL`) with:
- Active state: filled accent background
- Inactive state: ghost, with hover transition

### 4.5 Loading Skeleton

Used in `loading.tsx` boundaries for instant route transitions:
- Triple concentric spinning rings (emerald / indigo / rose)
- Centered `Aldrich` text: `[ SYSTEM WAKING UP: ESTABLISHING SECURE CONNECTION... ]`
- Animated gradient progress bar

### 4.6 Chart Skeleton

Fallback for `dynamic()` chart imports:
- Spinning border loader
- Mono text: `Loading Telemetry...`
- Maintains the exact height of the chart it replaces to prevent layout shift

---

## 5. Animation Guidelines

| Animation            | Duration   | Easing             | Purpose                          |
|:---------------------|:-----------|:-------------------|:---------------------------------|
| Page transitions     | 300ms      | ease-out           | Route changes via `PageTransitionWrapper` |
| Hover effects        | 150ms      | ease-in-out        | Buttons, links, interactive elements |
| Live dot pulse       | 1.5s       | infinite alternate | Connection status indicator      |
| Scroll progress      | Continuous | linear             | 1px hairline at viewport top     |
| Skeleton pulse       | 2s         | infinite           | Loading state animation          |

> [!NOTE]
> All animations respect `prefers-reduced-motion`. The 10 Hz data stream is throttled at the rendering layer — the WebSocket always runs at full speed but React only re-renders at the display refresh rate.
