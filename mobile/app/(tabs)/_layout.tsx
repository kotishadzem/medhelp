import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export default function TabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset =
    insets.bottom > 0 ? insets.bottom : Platform.OS === "ios" ? 24 : 18;
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textDim,
          tabBarStyle: {
            backgroundColor: colors.bg,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 72 + bottomInset,
            paddingTop: 8,
            paddingBottom: bottomInset,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "600",
            lineHeight: 14,
          },
          tabBarLabelPosition: "below-icon",
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("tabs.upcoming"),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "today" : "today-outline"} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="medications"
          options={{
            title: "",
            tabBarIcon: () => (
              <View
                style={{
                  marginTop: 14,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add-circle" size={48} color={colors.primary} />
              </View>
            ),
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.primary,
          }}
          listeners={() => ({
            tabPress: (e) => {
              e.preventDefault();
              setAddSheetOpen(true);
            },
          })}
        />
        <Tabs.Screen
          name="documents"
          options={{
            title: t("tabs.documents"),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? "folder" : "folder-outline"} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="family" options={{ href: null }} />
        <Tabs.Screen name="quick-unlock" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="report" options={{ href: null }} />
      </Tabs>

      <AddActionSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onAddMedication={() => {
          setAddSheetOpen(false);
          router.push("/(tabs)/medications/create");
        }}
        onAddDocument={() => {
          setAddSheetOpen(false);
          router.push("/(tabs)/documents/create");
        }}
      />
    </>
  );
}

function TabIcon({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={{ marginTop: 2 }}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

function AddActionSheet({
  visible,
  onClose,
  onAddMedication,
  onAddDocument,
}: {
  visible: boolean;
  onClose: () => void;
  onAddMedication: () => void;
  onAddDocument: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={sheetStyles.backdrop} onPress={onClose}>
        <Pressable style={sheetStyles.card} onPress={() => {}}>
          <Text style={sheetStyles.title}>{t("tabs.addWhat")}</Text>
          <Pressable
            onPress={onAddMedication}
            style={({ pressed }) => [
              sheetStyles.option,
              pressed && sheetStyles.pressed,
            ]}
          >
            <View style={sheetStyles.iconBox}>
              <Ionicons name="medkit" size={22} color={colors.primary} />
            </View>
            <View style={sheetStyles.optionBody}>
              <Text style={sheetStyles.optionTitle}>
                {t("tabs.addMedication")}
              </Text>
              <Text style={sheetStyles.optionSubtitle}>
                {t("tabs.addMedicationSub")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
          </Pressable>
          <Pressable
            onPress={onAddDocument}
            style={({ pressed }) => [
              sheetStyles.option,
              pressed && sheetStyles.pressed,
            ]}
          >
            <View style={sheetStyles.iconBox}>
              <Ionicons name="document-text" size={22} color={colors.primary} />
            </View>
            <View style={sheetStyles.optionBody}>
              <Text style={sheetStyles.optionTitle}>{t("tabs.addDocument")}</Text>
              <Text style={sheetStyles.optionSubtitle}>
                {t("tabs.addDocumentSub")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
          </Pressable>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              sheetStyles.cancel,
              pressed && sheetStyles.pressed,
            ]}
          >
            <Text style={sheetStyles.cancelText}>{t("documents.actions.cancel")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000a",
    justifyContent: "flex-end",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  optionBody: { flex: 1 },
  optionTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: "700" },
  optionSubtitle: { color: colors.textMuted, fontSize: fontSize.xs, marginTop: 2 },
  pressed: { opacity: 0.75 },
  cancel: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  cancelText: { color: colors.primary, fontSize: fontSize.md, fontWeight: "700" },
});
