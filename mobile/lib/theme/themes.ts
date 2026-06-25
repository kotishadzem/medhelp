// All in-app color tokens live here. Each preset returns the same shape;
// lib/theme.ts mutates a shared `colors` object so every existing
// `import { colors }` keeps working — a single root remount on switch is
// enough to let StyleSheet.create() pick up the new values.

export type Colors = {
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  textDim: string;
  primary: string;
  primaryMuted: string;
  success: string;
  warning: string;
  danger: string;
  taken: string;
  missed: string;
  skipped: string;
  pending: string;
};

export type ThemeName =
  | "ocean"
  | "sunrise"
  | "forest"
  | "royal"
  | "midnight"
  | "light";

export type ThemePreset = {
  name: ThemeName;
  labelKey: string;
  colors: Colors;
};

const OCEAN: Colors = {
  bg: "#0b1220",
  surface: "#111a2e",
  surfaceElevated: "#172242",
  border: "#1f2b4d",
  text: "#e7ecf3",
  textMuted: "#8a94a8",
  textDim: "#5d6781",
  primary: "#0ea5e9",
  primaryMuted: "#1e3a5f",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  taken: "#22c55e",
  missed: "#ef4444",
  skipped: "#8a94a8",
  pending: "#f59e0b",
};

const SUNRISE: Colors = {
  bg: "#1c1208",
  surface: "#2a1d10",
  surfaceElevated: "#3a2716",
  border: "#4a3320",
  text: "#fff1e0",
  textMuted: "#c8a280",
  textDim: "#9a7553",
  primary: "#fb923c",
  primaryMuted: "#5a3417",
  success: "#84cc16",
  warning: "#facc15",
  danger: "#f43f5e",
  taken: "#84cc16",
  missed: "#f43f5e",
  skipped: "#c8a280",
  pending: "#facc15",
};

const FOREST: Colors = {
  bg: "#0a1612",
  surface: "#102220",
  surfaceElevated: "#193230",
  border: "#244540",
  text: "#e3f0ec",
  textMuted: "#8aa39d",
  textDim: "#5d7973",
  primary: "#10b981",
  primaryMuted: "#1d3f33",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
  taken: "#34d399",
  missed: "#f87171",
  skipped: "#8aa39d",
  pending: "#fbbf24",
};

const ROYAL: Colors = {
  bg: "#150f24",
  surface: "#221735",
  surfaceElevated: "#2f2148",
  border: "#3d2c5e",
  text: "#ece5fb",
  textMuted: "#a89cc5",
  textDim: "#7a6d9a",
  primary: "#a855f7",
  primaryMuted: "#3b245c",
  success: "#22d3ee",
  warning: "#f59e0b",
  danger: "#ec4899",
  taken: "#22d3ee",
  missed: "#ec4899",
  skipped: "#a89cc5",
  pending: "#f59e0b",
};

const MIDNIGHT: Colors = {
  bg: "#0a0a0a",
  surface: "#171717",
  surfaceElevated: "#222222",
  border: "#2e2e2e",
  text: "#f0f0f0",
  textMuted: "#a3a3a3",
  textDim: "#737373",
  primary: "#e5e5e5",
  primaryMuted: "#3a3a3a",
  success: "#4ade80",
  warning: "#fbbf24",
  danger: "#f87171",
  taken: "#4ade80",
  missed: "#f87171",
  skipped: "#a3a3a3",
  pending: "#fbbf24",
};

const LIGHT: Colors = {
  bg: "#f7f8fb",
  surface: "#ffffff",
  surfaceElevated: "#eef2f8",
  border: "#dbe1eb",
  text: "#0f172a",
  textMuted: "#64748b",
  textDim: "#94a3b8",
  primary: "#0284c7",
  primaryMuted: "#dbeafe",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  taken: "#16a34a",
  missed: "#dc2626",
  skipped: "#94a3b8",
  pending: "#d97706",
};

export const THEMES: Record<ThemeName, ThemePreset> = {
  ocean: { name: "ocean", labelKey: "settings.theme.ocean", colors: OCEAN },
  sunrise: { name: "sunrise", labelKey: "settings.theme.sunrise", colors: SUNRISE },
  forest: { name: "forest", labelKey: "settings.theme.forest", colors: FOREST },
  royal: { name: "royal", labelKey: "settings.theme.royal", colors: ROYAL },
  midnight: { name: "midnight", labelKey: "settings.theme.midnight", colors: MIDNIGHT },
  light: { name: "light", labelKey: "settings.theme.light", colors: LIGHT },
};

export const THEME_NAMES: ThemeName[] = [
  "ocean",
  "sunrise",
  "forest",
  "royal",
  "midnight",
  "light",
];

export const DEFAULT_THEME_NAME: ThemeName = "ocean";

export function isThemeName(v: unknown): v is ThemeName {
  return typeof v === "string" && v in THEMES;
}
