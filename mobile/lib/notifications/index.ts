import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Medication, MedicationIntake } from "@/lib/types";

const STORAGE_KEY = "medhelp.notificationMap";
const isNativeAndSupported = Platform.OS !== "web";

// Global handler — show notification even when app is foregrounded.
if (isNativeAndSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

type NotifMap = Record<string, string>; // intakeId → notification identifier

async function readMap(): Promise<NotifMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NotifMap) : {};
  } catch {
    return {};
  }
}

async function writeMap(map: NotifMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export async function ensurePermission(): Promise<boolean> {
  if (!isNativeAndSupported) return false;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    await ensureAndroidChannel();
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  if (!requested.granted) return false;
  await ensureAndroidChannel();
  return true;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("medication-reminders", {
    name: "მედიკამენტის შეხსენებები",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#0ea5e9",
  });
}

export async function scheduleForMedication(
  medication: Medication,
  intakes: MedicationIntake[]
): Promise<void> {
  if (!isNativeAndSupported) return;
  const granted = await ensurePermission();
  if (!granted) return;

  const map = await readMap();
  const now = Date.now();

  for (const intake of intakes) {
    if (map[intake.id]) continue; // already scheduled
    if (intake.status !== "PENDING") continue;
    const at = new Date(intake.scheduledAt).getTime();
    if (at <= now) continue;

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: `დროა მიიღო ${medication.name}`,
          body: `${medication.dosage}${
            medication.instructions ? ` · ${medication.instructions}` : ""
          }`,
          sound: "default",
          data: { intakeId: intake.id, medicationId: medication.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(intake.scheduledAt),
          channelId: Platform.OS === "android" ? "medication-reminders" : undefined,
        },
      });
      map[intake.id] = identifier;
    } catch {
      // best-effort — skip on failure
    }
  }

  await writeMap(map);
}

export async function cancelForIntakes(intakeIds: string[]): Promise<void> {
  if (!isNativeAndSupported) return;
  const map = await readMap();
  for (const id of intakeIds) {
    const identifier = map[id];
    if (!identifier) continue;
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // ignore
    }
    delete map[id];
  }
  await writeMap(map);
}

export async function cancelForMedication(intakes: MedicationIntake[]): Promise<void> {
  await cancelForIntakes(intakes.map((i) => i.id));
}

export async function rescheduleMedication(
  medication: Medication,
  intakes: MedicationIntake[]
): Promise<void> {
  await cancelForMedication(intakes);
  await scheduleForMedication(medication, intakes);
}

export async function cancelAll(): Promise<void> {
  if (!isNativeAndSupported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
  await writeMap({});
}
