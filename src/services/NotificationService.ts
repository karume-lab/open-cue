import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { PRIMARY } from "@/lib/colors";

// Set up the notification handler to show alerts even when app is active
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const requestNotificationPermissions = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: PRIMARY, // Burnt Orange
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === "granted";
};

export const scheduleLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, unknown>,
) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
    },
    trigger: null, // trigger immediately
  });
};

export const NOTIFICATION_ROUTE_KEY = "route";

/**
 * Turns a deep-link path into notification data. When the notification is
 * tapped, the route is pushed so the user lands on the relevant screen
 * (e.g. a media title) instead of the app's home tab.
 */
export const routeNotificationData = (
  route: string,
): { [NOTIFICATION_ROUTE_KEY]: string } => ({
  [NOTIFICATION_ROUTE_KEY]: route,
});
