import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/lib/theme";
import { Platform, View } from "react-native";

export default function TabsLayout() {
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
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: spacing.sm,
          paddingBottom: Platform.OS === "ios" ? spacing.lg : spacing.sm,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "დღეს",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "today" : "today-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: "მედიკამენტები",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "medkit" : "medkit-outline"} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "პროფილი",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "person" : "person-outline"} color={color} />
          ),
        }}
      />
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
