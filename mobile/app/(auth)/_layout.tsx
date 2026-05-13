import { Stack } from "expo-router";
import { useAuth } from "@/lib/auth/AuthContext";

export default function AuthLayout() {
  const { status, needsQuickUnlockSetup } = useAuth();

  let initialRouteName: string = "login";
  if (status === "authenticated" && needsQuickUnlockSetup) {
    initialRouteName = "setup-quick-unlock";
  } else if (status === "locked") {
    initialRouteName = "unlock";
  }

  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "fade" }}
      initialRouteName={initialRouteName}
    />
  );
}
