import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { colors, spacing } from "@/lib/theme";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : Platform.OS === "ios" ? 24 : 18;
  return (
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
            <View style={{ marginTop: 14, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="add-circle" size={48} color={colors.primary} />
            </View>
          ),
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.primary,
        }}
        listeners={() => ({
          tabPress: (e) => {
            e.preventDefault();
            router.push("/(tabs)/medications/create");
          },
        })}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="family" options={{ href: null }} />
      <Tabs.Screen name="quick-unlock" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="report" options={{ href: null }} />
    </Tabs>
  );
}

function TabIcon({ name, color }: { name: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={{ marginTop: 2 }}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}
