import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type Props = {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  showBackspace?: boolean;
};

export function PinPad({ value, onChange, length = 4, showBackspace = true }: Props) {
  const handlePress = useCallback(
    (digit: string) => {
      if (digit === "back") {
        onChange(value.slice(0, -1));
      } else if (value.length < length) {
        onChange(value + digit);
      }
    },
    [value, onChange, length]
  );

  return (
    <View style={styles.pad}>
      {KEYS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((key, ki) => {
            if (key === "") return <View key={ki} style={styles.key} />;
            if (key === "back") {
              if (!showBackspace) return <View key={ki} style={styles.key} />;
              return (
                <Pressable
                  key={ki}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                  onPress={() => handlePress("back")}
                  accessibilityLabel="წაშლა"
                >
                  <Text style={styles.backLabel}>⌫</Text>
                </Pressable>
              );
            }
            return (
              <Pressable
                key={ki}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                onPress={() => handlePress(key)}
              >
                <Text style={styles.keyLabel}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const KEYS: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "back"],
];

const styles = StyleSheet.create({
  pad: { gap: spacing.md, alignItems: "center" },
  row: { flexDirection: "row", gap: spacing.md },
  key: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  keyPressed: { backgroundColor: colors.surfaceElevated, transform: [{ scale: 0.97 }] },
  keyLabel: { color: colors.text, fontSize: 28, fontWeight: "600" },
  backLabel: { color: colors.textMuted, fontSize: 24 },
});

type DotsProps = { length: number; filled: number; error?: boolean };
export function PinDots({ length, filled, error }: DotsProps) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i < filled && (error ? dotStyles.dotError : dotStyles.dotFilled),
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md, justifyContent: "center" },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: "transparent",
  },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotError: { backgroundColor: colors.danger, borderColor: colors.danger },
});

type CellsProps = { length: number; value: string; error?: boolean };
export function CodeCells({ length, value, error }: CellsProps) {
  return (
    <View style={cellStyles.row}>
      {Array.from({ length }).map((_, i) => {
        const ch = value[i];
        return (
          <View
            key={i}
            style={[
              cellStyles.cell,
              ch !== undefined && cellStyles.cellFilled,
              error && cellStyles.cellError,
            ]}
          >
            <Text style={cellStyles.cellText}>{ch ?? ""}</Text>
          </View>
        );
      })}
    </View>
  );
}

const cellStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.md, justifyContent: "center" },
  cell: {
    width: 56,
    height: 64,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cellFilled: { borderColor: colors.primary, backgroundColor: colors.surfaceElevated },
  cellError: { borderColor: colors.danger },
  cellText: { color: colors.text, fontSize: fontSize.xxl, fontWeight: "700" },
});
