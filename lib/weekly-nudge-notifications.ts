import i18n from "@/lib/i18n";

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const WEEKLY_INSIGHTS_ID = "bakimate_weekly_insights_review";

function allowsPostingNotifications(settings: Notifications.NotificationPermissionsStatus): boolean {
  /** `granted` is set at runtime across platforms — typings omit it on some SDK versions. */
  if ((settings as { granted?: boolean }).granted === true) {
    return true;
  }

  const st = settings.ios?.status;
  return (
    st === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    st === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
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

export async function cancelWeeklyInsightsReminder(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_INSIGHTS_ID).catch(() => undefined);
}

/** Mondays 10:00 — nudge shopkeeper to open Insights / chase slow payers. */
export async function scheduleWeeklyInsightsReminder(): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  const existing = await Notifications.getPermissionsAsync();

  if (!allowsPostingNotifications(existing)) {
    const req = await Notifications.requestPermissionsAsync();
    if (!allowsPostingNotifications(req)) {
      return;
    }
  }

  await ensureAndroidChannel();
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_INSIGHTS_ID).catch(() => undefined);

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_INSIGHTS_ID,
    content: {
      title: i18n.t("weekly_review_notif_title"),
      body: i18n.t("weekly_review_notif_body"),
      data: { route: "insights" },
      ...(Platform.OS === "android" ? { channelId: "bakimate-business" } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2,
      hour: 10,
      minute: 0,
    },
  });
}
