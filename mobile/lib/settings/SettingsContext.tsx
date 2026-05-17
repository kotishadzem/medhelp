import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_MED_FONT = "medhelp.settings.medFontScale";

export const MED_FONT_MIN = 1;
export const MED_FONT_MAX = 7;
export const MED_FONT_DEFAULT = 3;

// 7 steps that stay readable inside the existing medication cards on
// phone widths. Tweak the table if a step starts overflowing.
const MED_FONT_SIZES = [13, 15, 17, 19, 22, 25, 28];

export function medNameFontSize(scale: number): number {
  const idx = Math.max(0, Math.min(MED_FONT_SIZES.length - 1, Math.round(scale) - 1));
  return MED_FONT_SIZES[idx];
}

type SettingsContextValue = {
  medFontScale: number;
  setMedFontScale: (n: number) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(MED_FONT_DEFAULT);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY_MED_FONT);
        if (raw) {
          const n = Number(raw);
          if (n >= MED_FONT_MIN && n <= MED_FONT_MAX) setScale(n);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const setMedFontScale = useCallback(async (n: number) => {
    const clamped = Math.max(MED_FONT_MIN, Math.min(MED_FONT_MAX, Math.round(n)));
    setScale(clamped);
    try {
      await AsyncStorage.setItem(KEY_MED_FONT, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({ medFontScale: scale, setMedFontScale }),
    [scale, setMedFontScale]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useMedFontScale(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useMedFontScale must be used within <SettingsProvider>");
  return ctx;
}
