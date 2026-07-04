// Niimbotator — out-of-app feedback for a batch print run (Chantier 3, §12.7 + UX haptics).
//
// Wraps @capacitor/local-notifications (a single progress notification, updated in place) and
// @capacitor/haptics. Every call is best-effort: a failing plugin (e.g. permission denied, or
// running on web where the effect is a no-op) must never interrupt printing. Text is passed in
// so this module stays i18n-agnostic; the caller resolves strings via $tr.

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Haptics, NotificationType } from "@capacitor/haptics";

/** Fixed id so progress updates replace the same notification rather than stacking. */
const NOTIFICATION_ID = 4201;

const isNative = (): boolean => Capacitor.isNativePlatform();

/** Ask for notification permission once, before a run. Safe to call on web (no-op). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch {
    return false;
  }
}

async function post(title: string, body: string, ongoing: boolean): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{ id: NOTIFICATION_ID, title, body, ongoing, autoCancel: !ongoing }],
    });
  } catch {
    /* best-effort */
  }
}

/** Live progress notification (ongoing, non-dismissable). */
export function notifyPrinting(title: string, body: string): Promise<void> {
  return post(title, body, true);
}

/** Terminal notification (completed / errored) — dismissable. */
export function notifyDone(title: string, body: string): Promise<void> {
  return post(title, body, false);
}

export async function clearNotification(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
  } catch {
    /* best-effort */
  }
}

async function haptic(type: NotificationType): Promise<void> {
  try {
    await Haptics.notification({ type });
  } catch {
    /* best-effort */
  }
}

/** Print started / resumed. */
export const hapticStart = (): Promise<void> => haptic(NotificationType.Success);
/** Run completed. */
export const hapticSuccess = (): Promise<void> => haptic(NotificationType.Success);
/** Run interrupted by an error (§UX: error notification haptic). */
export const hapticError = (): Promise<void> => haptic(NotificationType.Error);
