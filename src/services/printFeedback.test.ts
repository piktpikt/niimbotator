import { beforeEach, describe, expect, it, vi } from "vitest";

// Control the platform + capture plugin calls. Real notifications/haptics only fire on-device;
// here we prove the wrappers invoke the plugins with the right arguments and stay best-effort.
// vi.hoisted so the mock factories can reference these (they run before imports).
type NotifArg = { notifications: Array<{ id: number; title?: string; body?: string; ongoing?: boolean; autoCancel?: boolean }> };

const h = vi.hoisted(() => ({
  native: true,
  schedule: vi.fn(async () => {}),
  cancel: vi.fn(async () => {}),
  checkPermissions: vi.fn(async () => ({ display: "granted" })),
  requestPermissions: vi.fn(async () => ({ display: "granted" })),
  notification: vi.fn(async () => {}),
}));

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => h.native } }));
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: { schedule: h.schedule, cancel: h.cancel, checkPermissions: h.checkPermissions, requestPermissions: h.requestPermissions },
}));
vi.mock("@capacitor/haptics", () => ({
  Haptics: { notification: h.notification },
  NotificationType: { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" },
}));

import * as fb from "$/services/printFeedback";

const firstNotif = (call: unknown) => (call as [NotifArg])[0].notifications[0];

beforeEach(() => {
  h.native = true;
  vi.clearAllMocks();
});

describe("printFeedback — notifications (native)", () => {
  it("posts an ongoing progress notification, then replaces it with a dismissable terminal one", async () => {
    await fb.notifyPrinting("Impression", "7/23");
    expect(h.schedule).toHaveBeenCalledTimes(1);
    const notif = firstNotif(h.schedule.mock.calls[0]);
    expect(notif).toMatchObject({ title: "Impression", body: "7/23", ongoing: true });

    await fb.notifyDone("Terminé", "23 étiquettes");
    expect(firstNotif(h.schedule.mock.calls[1])).toMatchObject({ id: notif.id, ongoing: false, autoCancel: true });
  });

  it("clears by the same fixed id", async () => {
    await fb.clearNotification();
    expect(h.cancel).toHaveBeenCalledWith({ notifications: [{ id: 4201 }] });
  });

  it("requests permission when not yet granted and reports the result", async () => {
    h.checkPermissions.mockResolvedValueOnce({ display: "prompt" });
    expect(await fb.ensureNotificationPermission()).toBe(true);
    expect(h.requestPermissions).toHaveBeenCalled();
  });
});

describe("printFeedback — haptics map to the right type", () => {
  it("start/success use Success, error uses Error", async () => {
    await fb.hapticStart();
    await fb.hapticSuccess();
    await fb.hapticError();
    expect(h.notification.mock.calls.map((c) => (c as unknown as [{ type: string }])[0].type)).toEqual(["SUCCESS", "SUCCESS", "ERROR"]);
  });
});

describe("printFeedback — best-effort", () => {
  it("is a no-op for notifications on web (non-native)", async () => {
    h.native = false;
    await fb.notifyPrinting("x", "y");
    await fb.clearNotification();
    expect(h.schedule).not.toHaveBeenCalled();
    expect(h.cancel).not.toHaveBeenCalled();
    expect(await fb.ensureNotificationPermission()).toBe(false);
  });

  it("never rejects when a plugin throws", async () => {
    h.schedule.mockRejectedValueOnce(new Error("permission denied"));
    h.notification.mockRejectedValueOnce(new Error("no motor"));
    await expect(fb.notifyPrinting("x", "y")).resolves.toBeUndefined();
    await expect(fb.hapticError()).resolves.toBeUndefined();
  });
});
