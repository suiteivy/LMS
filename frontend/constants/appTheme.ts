// constants/appTheme.ts
// Single source of truth for design tokens.
// Matches the established palette across admin dashboards (finance, timetable, etc.)
// light uses #f9fafb / #ffffff, dark uses #0F0B2E / #13103A

export const lightColors = {
    bg:           "#f9fafb",
    surface:      "#ffffff",
    surface2:     "#f3f4f6",
    border:       "#e5e7eb",
    borderLight:  "#f3f4f6",
    text:         "#111827",
    textSub:      "#6b7280",
    textMuted:    "#9ca3af",
    accent:       "#FF6B00",
    accentDim:    "rgba(255,107,0,0.08)",
    accentBorder: "rgba(255,107,0,0.3)",
    red:          "#ef4444",
    redDim:       "rgba(239,68,68,0.08)",
    redBorder:    "rgba(239,68,68,0.25)",
    amber:        "#f59e0b",
    amberDim:     "rgba(245,158,11,0.1)",
    blue:         "#3b82f6",
    blueDim:      "rgba(59,130,246,0.08)",
    green:        "#22c55e",
    greenDim:     "rgba(34,197,94,0.08)",
    greenBorder:  "rgba(34,197,94,0.25)",
} as const;

export const darkColors = {
    bg:           "#0F0B2E",
    surface:      "#13103A",
    surface2:     "#1a1645",
    border:       "rgba(255,255,255,0.1)",
    borderLight:  "rgba(255,255,255,0.06)",
    text:         "#f9fafb",
    textSub:      "#9ca3af",
    textMuted:    "#6b7280",
    accent:       "#FF6B00",
    accentDim:    "rgba(255,107,0,0.12)",
    accentBorder: "rgba(255,107,0,0.35)",
    red:          "#f87171",
    redDim:       "rgba(248,113,113,0.1)",
    redBorder:    "rgba(248,113,113,0.3)",
    amber:        "#fbbf24",
    amberDim:     "rgba(251,191,36,0.1)",
    blue:         "#60a5fa",
    blueDim:      "rgba(96,165,250,0.1)",
    green:        "#4ade80",
    greenDim:     "rgba(74,222,128,0.08)",
    greenBorder:  "rgba(74,222,128,0.25)",
} as const;

/** The resolved colour palette type — keys are fully typed, values accept any colour string. */
export type AppColors = { readonly [K in keyof typeof lightColors]: string };
