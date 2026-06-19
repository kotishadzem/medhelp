import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";
import { SettingsProvider } from "@/lib/settings/SettingsContext";
import { initI18n } from "@/lib/i18n";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SettingsProvider>
            <AuthProvider>
              <StatusBar style="light" />
              {i18nReady ? <RootNavigator /> : <SplashView />}
            </AuthProvider>
          </SettingsProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { status, needsQuickUnlockSetup } = useAuth();

  if (status === "loading") return <SplashView />;

  const readyForApp = status === "authenticated" && !needsQuickUnlockSetup;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: "fade",
      }}
    >
      <Stack.Protected guard={readyForApp}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!readyForApp}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="share/[token]" />
    </Stack>
  );
}

function SplashView() {
  const { t, ready } = useTranslation();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <View style={styles.logo}>
          <Text style={styles.logoMark}>+</Text>
        </View>
        <Text style={styles.title}>MedHelp</Text>
        <Text style={styles.subtitle}>
          {ready ? t("splash.tagline") : "Your medication assistant"}
        </Text>
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
