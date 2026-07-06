"use client";

import { useState } from "react";
import {
  NOTIFICATION_CATEGORIES,
  withDefaults,
  type NotificationPrefs,
  type Channel,
} from "@/lib/notification-prefs";
import { saveNotificationPrefs } from "@/app/settings/notifications/actions";
import { usePasswordGate } from "@/components/password-confirm-modal";

function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        on ? "bg-primary" : "bg-neutral-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export function NotificationSettings({
  initial,
  isPro = false,
}: {
  initial: NotificationPrefs;
  isPro?: boolean;
}) {
  const { require, modal } = usePasswordGate();
  const [prefs, setPrefs] = useState<NotificationPrefs>(withDefaults(initial));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (key: string, channel: Channel) => {
    setSaved(false);
    setErr(null);
    setDirty(true);
    setPrefs((p) => ({
      ...p,
      [key]: { ...p[key], [channel]: !p[key][channel] },
    }));
  };

  const setAll = (channel: Channel, value: boolean) => {
    setSaved(false);
    setErr(null);
    setDirty(true);
    setPrefs((p) => {
      const next: NotificationPrefs = {};
      for (const c of NOTIFICATION_CATEGORIES) {
        // Don't flip locked Pro categories for Basic users.
        if (c.pro && !isPro) {
          next[c.key] = p[c.key];
          continue;
        }
        next[c.key] = { ...p[c.key], [channel]: value };
      }
      return next;
    });
  };

  const save = async () => {
    setErr(null);
    if (!(await require())) return; // password confirmation
    setBusy(true);
    const res = await saveNotificationPrefs(prefs);
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setDirty(false);
    } else {
      setErr(res.error || "Couldn't save.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-secondary/40">
          <div className="flex-1 text-sm font-semibold text-foreground">
            Notification
          </div>
          <div className="w-16 text-center text-sm font-semibold text-foreground">
            In-app
          </div>
          <div className="w-16 text-center text-sm font-semibold text-foreground">
            Email
          </div>
        </div>

        {NOTIFICATION_CATEGORIES.map((c) => {
          const locked = !!c.pro && !isPro;
          return (
            <div
              key={c.key}
              className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-b-0"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{c.label}</p>
                {locked ? (
                  <p className="text-sm text-muted-foreground">
                    Pro feature —{" "}
                    <a
                      href="/settings/membership"
                      className="text-primary hover:underline"
                    >
                      Upgrade to unlock
                    </a>
                    .
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{c.desc}</p>
                )}
              </div>
              {locked ? (
                <div className="w-[128px] flex justify-center text-muted-foreground">
                  <span aria-hidden className="text-lg">🔒</span>
                </div>
              ) : (
                <>
                  <div className="w-16 flex justify-center">
                    <Toggle
                      on={prefs[c.key].inapp}
                      onClick={() => toggle(c.key, "inapp")}
                      label={`${c.label} in-app`}
                    />
                  </div>
                  <div className="w-16 flex justify-center">
                    <Toggle
                      on={prefs[c.key].email}
                      onClick={() => toggle(c.key, "email")}
                      label={`${c.label} email`}
                    />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick bulk actions */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="text-muted-foreground">Quick actions:</span>
        <button
          type="button"
          onClick={() => setAll("email", false)}
          className="text-primary hover:underline font-medium"
        >
          Turn off all email
        </button>
        <button
          type="button"
          onClick={() => setAll("email", true)}
          className="text-primary hover:underline font-medium"
        >
          Turn on all email
        </button>
        <button
          type="button"
          onClick={() => setAll("inapp", true)}
          className="text-primary hover:underline font-medium"
        >
          Turn on all in-app
        </button>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}
      {saved && (
        <p className="text-sm text-primary">Your notification preferences were saved.</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={busy || !dirty}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save changes"}
        </button>
        {!dirty && !saved && (
          <span className="text-sm text-muted-foreground">No unsaved changes</span>
        )}
      </div>

      {modal}
    </div>
  );
}
