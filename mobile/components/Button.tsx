import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  style,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.bg : colors.text} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "primary" && styles.labelPrimary,
            variant !== "primary" && styles.labelDefault,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    minHeight: 52,
  },
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: { backgroundColor: "transparent" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  label: { fontSize: fontSize.lg, fontWeight: "700", letterSpacing: 0.2 },
  labelPrimary: { color: colors.bg },
  labelDefault: { color: colors.text },
});
