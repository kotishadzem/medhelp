import { useEffect } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

export default function AuthLayout() {
  const router = useRouter();
  const params = useLocalSearchParams<{ start?: string }>();

  useEffect(() => {
    if (params.start === "login") router.replace("/(auth)/login");
  }, [params.start, router]);

  return (
    <Stack
      screenOptions={{ headerShown: false, animation: "fade" }}
      initialRouteName="register"
    />
  );
}
