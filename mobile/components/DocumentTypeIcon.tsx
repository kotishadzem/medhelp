import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import { colors, radius } from "@/lib/theme";
import type { DocumentType } from "@/lib/types";

type IconSource =
  | { lib: "ionicons"; name: keyof typeof Ionicons.glyphMap }
  | { lib: "material"; name: keyof typeof MaterialCommunityIcons.glyphMap };

const ICON_MAP: Record<DocumentType, IconSource> = {
  FORM_100: { lib: "material", name: "file-document-outline" },
  PRESCRIPTION: { lib: "material", name: "prescription" },
  BLOOD_TEST: { lib: "material", name: "blood-bag" },
  CT_SCAN: { lib: "material", name: "radioactive" },
  MRI_SCAN: { lib: "material", name: "magnet" },
  ULTRASOUND: { lib: "material", name: "waveform" },
  ECG: { lib: "material", name: "heart-pulse" },
  LAB_ANALYSIS: { lib: "material", name: "test-tube" },
  OTHER: { lib: "ionicons", name: "document-outline" },
};

const TINT_MAP: Record<DocumentType, string> = {
  FORM_100: "#0ea5e9",
  PRESCRIPTION: "#22c55e",
  BLOOD_TEST: "#ef4444",
  CT_SCAN: "#f59e0b",
  MRI_SCAN: "#a855f7",
  ULTRASOUND: "#14b8a6",
  ECG: "#ec4899",
  LAB_ANALYSIS: "#8b5cf6",
  OTHER: "#8a94a8",
};

type Props = {
  type: DocumentType;
  size?: number;
};

export function DocumentTypeIcon({ type, size = 40 }: Props) {
  const source = ICON_MAP[type];
  const tint = TINT_MAP[type];
  const iconSize = Math.round(size * 0.55);
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, backgroundColor: tint + "22", borderColor: tint + "55" },
      ]}
    >
      {source.lib === "ionicons" ? (
        <Ionicons name={source.name} size={iconSize} color={tint} />
      ) : (
        <MaterialCommunityIcons name={source.name} size={iconSize} color={tint} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

export const DOCUMENT_TYPE_TINTS = TINT_MAP;
