import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/lib/i18n";
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

// Per intake we now schedule up to two notifications: a 30-min warning
// and the at-time reminder. Each can have its own notification identifier.
type Entry = { warn?: string; due?: string } | string;
type NotifMap = Record<string, Entry>;

async function readMap(): Promise<NotifMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NotifMap) : {};
  } catch {
    return {};
  }
}

function entryIdentifiers(entry: Entry | undefined): string[] {
  if (!entry) return [];
  if (typeof entry === "string") return [entry];
  const out: string[] = [];
  if (entry.warn) out.push(entry.warn);
  if (entry.due) out.push(entry.due);
  return out;
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
    name: i18n.t("notification.androidChannelName"),
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
    // scheduledAt is stored as wall-clock UTC ("08:00" -> 08:00Z). The OS
    // needs an absolute epoch that means "the user's local 08:00", so we
    // re-interpret the UTC components as a local-time Date.
    const s = new Date(intake.scheduledAt);
    const localAt = new Date(
      s.getUTCFullYear(),
      s.getUTCMonth(),
      s.getUTCDate(),
      s.getUTCHours(),
      s.getUTCMinutes(),
      0,
      0
    );
    const at = localAt.getTime();
    if (at <= now) continue;

    const entry: { warn?: string; due?: string } = {};
    const warnAt = at - 30 * 60 * 1000;
    const channelId =
      Platform.OS === "android" ? "medication-reminders" : undefined;
    const body = `${medication.dosage}${
      medication.instructions ? ` · ${medication.instructions}` : ""
    }`;

    // 30-minute warning (skip if already in the past)
    if (warnAt > now) {
      try {
        entry.warn = await Notifications.scheduleNotificationAsync({
          content: {
            title: i18n.t("notification.warnTitle", { name: medication.name }),
            body: i18n.t("notification.warnBody", { name: medication.name }),
            sound: "default",
            data: { intakeId: intake.id, medicationId: medication.id, kind: "warn" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(warnAt),
            channelId,
          },
        });
      } catch {
        // best-effort
      }
    }

    // At-time reminder — ringer style: high importance + default sound
    try {
      entry.due = await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t("notification.title", { name: medication.name }),
          body,
          sound: "default",
          data: { intakeId: intake.id, medicationId: medication.id, kind: "due" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: localAt,
          channelId,
        },
      });
    } catch {
      // best-effort
    }

    if (entry.warn || entry.due) map[intake.id] = entry;
  }

  await writeMap(map);
}

export async function cancelForIntakes(intakeIds: string[]): Promise<void> {
  if (!isNativeAndSupported) return;
  const map = await readMap();
  for (const id of intakeIds) {
    const ids = entryIdentifiers(map[id]);
    for (const identifier of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(identifier);
      } catch {
        // ignore
      }
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
