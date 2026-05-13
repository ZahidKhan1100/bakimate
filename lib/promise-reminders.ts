import i18n from "@/lib/i18n";
import { formatMoneyMinor, normalizeCurrencyCode } from "@/lib/money";

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

function notificationIdForPromise(id: number) {
  return `bakimate-promise-${id}`;
}

function permitsPostingNotifications(settings: Notifications.NotificationPermissionsStatus): boolean {
  if ((settings as { granted?: boolean }).granted === true) {
    return true;
  }

  const st = settings.ios?.status;
  return (
    st === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    st === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureAndroidPromiseChannel(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }
  await Notifications.setNotificationChannelAsync("bakimate-business", {
    name: "Business",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 160],
    lightColor: "#2EC4B6",
  });
}

/** Local reminder on the promise date (09:30 device time). */
export async function schedulePromiseDueReminder(args: {
  promiseId: number;
  customerName: string;
  amountSen: number;
  promisedDateYmd: string;
  currencyCode?: string | null;
}): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const existing = await Notifications.getPermissionsAsync();
  if (!permitsPostingNotifications(existing)) {
    const req = await Notifications.requestPermissionsAsync();
    if (!permitsPostingNotifications(req)) {
      return;
    }
  }

  await cancelPromiseReminder(args.promiseId);
  await ensureAndroidPromiseChannel();

  const parts = args.promisedDateYmd.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return;
  }

  const [y, mo, da] = parts;
  const fireAt = new Date(y, mo - 1, da, 9, 30, 0, 0);
  const now = Date.now();
  /** Fire at least 90s ahead so we avoid missed immediate schedules. */
  if (fireAt.getTime() <= now + 90_000) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: notificationIdForPromise(args.promiseId),
    content: {
      title: i18n.t("promise_notif_title"),
      body: i18n.t("promise_notif_body", {
        name: args.customerName,
        amount: formatMoneyMinor(args.amountSen, normalizeCurrencyCode(args.currencyCode)),
        date: args.promisedDateYmd,
      }),
      data: { type: "promise_due", promiseId: args.promiseId },
      ...(Platform.OS === "android" ? { channelId: "bakimate-business" } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}

export async function cancelPromiseReminder(promiseId: number): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(notificationIdForPromise(promiseId)).catch(() => undefined);
}
