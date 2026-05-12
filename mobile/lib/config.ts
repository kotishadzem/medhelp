import { Platform } from "react-native";

const fromEnv = process.env.EXPO_PUBLIC_API_URL;

function defaultApiUrl(): string {
  if (Platform.OS === "android") return "http://10.0.2.2:3002/api";
  return "http://localhost:3002/api";
}

export const API_URL = fromEnv && fromEnv.length > 0 ? fromEnv : defaultApiUrl();
