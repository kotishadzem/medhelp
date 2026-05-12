import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style="light" />
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { status, storedPhone } = useAuth();

  if (status === "loading") return <SplashView />;

  const isAuthed = status === "authenticated";
  const initialAuthRoute = storedPhone ? "login" : "register";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "fade",
      }}
    >
      <Stack.Protected guard={isAuthed}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!isAuthed}>
        <Stack.Screen name="(auth)" initialParams={{ start: initialAuthRoute }} />
      </Stack.Protected>
    </Stack>
  );
}

function SplashView() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={styles.logo}>
          <Text style={styles.logoMark}>+</Text>
        </View>
        <Text style={styles.title}>MedHelp</Text>
        <Text style={styles.subtitle}>თქვენი მედიკამენტების ასისტენტი</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMark: { color: colors.bg, fontSize: 44, fontWeight: "800", marginTop: -6 },
  title: { color: colors.text, fontSize: fontSize.display, fontWeight: "800", letterSpacing: -1 },
  subtitle: { color: colors.textMuted, fontSize: fontSize.md },
});
