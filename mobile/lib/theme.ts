import { DEFAULT_THEME_NAME, THEMES, type Colors, type ThemeName } from "./theme/themes";

// The `colors` object is the single source consumed by every existing
// StyleSheet.create() across the codebase. We deliberately keep it as a
// mutable singleton: when the user switches theme, we copy the preset's
// values onto this same object reference and re-mount the navigator (via
// a key on the root) so StyleSheets recompute with the new colors. That
// avoids touching the 30+ files that currently `import { colors }`.
export const colors: Colors = { ...THEMES[DEFAULT_THEME_NAME].colors };

export function applyTheme(name: ThemeName): void {
  const preset = THEMES[name] ?? THEMES[DEFAULT_THEME_NAME];
  Object.assign(colors, preset.colors);
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  display: 34,
};

export type { Colors, ThemeName };
