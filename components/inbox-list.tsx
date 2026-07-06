"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePasswordGate } from "@/components/password-confirm-modal";
import {
  setConvoPref,
  setOutOfOffice,
  saveMessageSettings,
} from "@/app/(dashboard)/messages/inbox-actions";
import type { InboxItem, SavedItem } from "@/lib/inbox";

// The Messages left rail — search, ⋯ menu (settings / out of office /
// shortcuts), filters (interviews / contracts / 1:1 / saved / hidden),
// Unread + Favorites chips, and conversation rows with presence, pin,
// favorite and unread states. Used by BOTH /messages and /messages/[id].

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All conversations" },
  { key: "interview", label: "All interviews" },
  { key: "contract", label: "All contracts" },
  { key: "direct", label: "All 1:1 messages" },
  { key: "saved", label: "Saved messages" },
  { key: "hidden", label: "Hidden and archived" },
];

function timeLabel(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay)
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function InboxList({
  items: initialItems,
  saved,
  activeId,
  meOutOfOffice,
  meOooUntil,
  meOnline = false,
  msgInapp = true,
  msgEmail = true,
}: {
  items: InboxItem[];
  saved: SavedItem[];
  activeId?: string;
  meOutOfOffice: boolean;
  meOooUntil?: string | null;
  // Message-settings popup initial values.
  meOnline?: boolean;
  msgInapp?: boolean;
  msgEmail?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  useEffect(() => setItems(initialItems), [initialItems]);

  const [filter, setFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [oooOpen, setOooOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const [ooo, setOoo] = useState(meOutOfOffice);
  const [oooUntil, setOooUntil] = useState(meOooUntil ?? "");
  const searchRef = useRef<HTMLInputElement>(null);

  // Message-settings popup state.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [online, setOnline] = useState(meOnline);
  const [inapp, setInapp] = useState(msgInapp);
  const [email, setEmail] = useState(msgEmail);
  const [soundOn, setSoundOn] = useState(true);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);
  const { require: requirePassword, modal: passwordModal } = usePasswordGate();
  useEffect(() => {
    setSoundOn(localStorage.getItem("xwork_message_sound_off") !== "1");
  }, []);

  // Keyboard shortcuts: "/" focuses search, Escape closes popovers.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setFilterOpen(false);
        setOooOpen(false);
        setKeysOpen(false);
      } else if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const patchLocal = (id: string, patch: Partial<InboxItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
  };

  const togglePref = async (
    item: InboxItem,
    key: "pinned" | "favorite" | "hidden"
  ) => {
    const next = !item[key];
    patchLocal(item.id, { [key]: next } as Partial<InboxItem>);
    const res = await setConvoPref(item.id, { [key]: next }).catch(() => ({
      ok: false,
    }));
    if (!res.ok) patchLocal(item.id, { [key]: !next } as Partial<InboxItem>);
    else router.refresh();
  };

  const q = search.trim().toLowerCase();
  const visible = items
    .filter((i) => (filter === "hidden" ? i.hidden : !i.hidden))
    .filter((i) =>
      filter === "all" || filter === "hidden" || filter === "saved"
        ? true
        : i.type === filter
    )
    .filter((i) => (unreadOnly ? i.unread > 0 : true))
    .filter((i) => (favoritesOnly ? i.favorite : true))
    .filter((i) =>
      q
        ? i.otherName.toLowerCase().includes(q) ||
          (i.jobTitle ?? "").toLowerCase().includes(q) ||
          (i.contractTitle ?? "").toLowerCase().includes(q) ||
          i.lastPreview.toLowerCase().includes(q)
        : true
    )
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return (b.lastAt ?? "").localeCompare(a.lastAt ?? "");
    });

  const saveOoo = async () => {
    setOooOpen(false);
    const res = await setOutOfOffice(ooo, ooo ? oooUntil || null : null).catch(
      () => ({ ok: false })
    );
    if (res.ok) router.refresh();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Messages</h1>
          <div className="flex items-center gap-1 relative">
            <button
              type="button"
              aria-label="Search conversations"
              onClick={() => {
                setSearchOpen((s) => !s);
                setTimeout(() => searchRef.current?.focus(), 0);
              }}
              className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
            >
              🔍
            </button>
            <button
              type="button"
              aria-label="Message options"
              onClick={() => setMenuOpen((m) => !m)}
              className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground font-bold"
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-30 bg-card border border-border rounded-xl shadow-lg py-1 w-48 text-sm">
                <button
                  type="button"
                  className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary"
                  onClick={() => {
                    setMenuOpen(false);
                    setSettingsMsg(null);
                    setSettingsOpen(true);
                  }}
                >
                  Message settings
                </button>
                <button
                  type="button"
                  className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary"
                  onClick={() => {
                    setMenuOpen(false);
                    setOooOpen(true);
                  }}
                >
                  Out of office{" "}
                  {ooo && (
                    <span className="text-amber-500 text-xs font-semibold">
                      · On
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary"
                  onClick={() => {
                    setMenuOpen(false);
                    setKeysOpen(true);
                  }}
                >
                  Shortcut keys
                </button>
              </div>
            )}
          </div>
        </div>

        {searchOpen && (
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, job or message…"
            className="mt-2 w-full border border-border rounded-full px-4 py-1.5 bg-background text-foreground text-sm"
          />
        )}

        {/* Filters */}
        <div className="flex items-center gap-2 mt-3 relative">
          <button
            type="button"
            aria-label="Filter conversations"
            onClick={() => setFilterOpen((f) => !f)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border ${
              filter !== "all"
                ? "border-primary text-primary bg-primary/5"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            ⚙
          </button>
          {filterOpen && (
            <div className="absolute left-0 top-9 z-30 bg-card border border-border rounded-xl shadow-lg py-1 w-52 text-sm">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => {
                    setFilter(f.key);
                    setFilterOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 hover:bg-secondary ${
                    filter === f.key
                      ? "text-primary font-semibold"
                      : "text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setUnreadOnly((u) => !u)}
            className={`rounded-full border px-4 py-1 text-sm ${
              unreadOnly
                ? "border-primary text-primary bg-primary/5 font-medium"
                : "border-border text-foreground hover:bg-secondary"
            }`}
          >
            Unread
          </button>
          <button
            type="button"
            onClick={() => setFavoritesOnly((f) => !f)}
            className={`rounded-full border px-4 py-1 text-sm ${
              favoritesOnly
                ? "border-primary text-primary bg-primary/5 font-medium"
                : "border-border text-foreground hover:bg-secondary"
            }`}
          >
            Favorites
          </button>
        </div>
        {filter !== "all" && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing: {FILTERS.find((f) => f.key === filter)?.label}
          </p>
        )}
      </div>

      {/* List / saved view */}
      <div className="flex-1 overflow-y-auto">
        {filter === "saved" ? (
          saved.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-6">
              No saved messages yet. Hover a message and click ☆ to save it.
            </p>
          ) : (
            saved.map((s) => (
              <Link
                key={s.id}
                href={`/messages/${s.conversationId}#msg-${s.messageId}`}
                className="block px-4 py-3 border-b border-border hover:bg-secondary"
              >
                <p className="text-xs text-muted-foreground">
                  ⭐ {s.senderName} · {timeLabel(s.createdAt)}
                </p>
                <p className="text-sm text-foreground mt-0.5 line-clamp-2">
                  {s.preview}
                </p>
              </Link>
            ))
          )
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-6">
            {filter === "hidden"
              ? "No hidden conversations."
              : "No conversations match."}
          </p>
        ) : (
          visible.map((i) => (
            <div
              key={i.id}
              className={`group relative border-b border-border ${
                i.id === activeId ? "bg-secondary" : "hover:bg-secondary/60"
              }`}
            >
              <Link href={`/messages/${i.id}`} className="flex gap-3 px-4 py-3">
                {/* Avatar + presence */}
                <div className="relative shrink-0">
                  {i.otherAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.otherAvatar}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">
                      {(i.otherName || "?").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <span
                    title={
                      i.otherAway ? "Away" : i.otherOnline ? "Online" : "Offline"
                    }
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card ${
                      i.otherAway
                        ? "bg-amber-400"
                        : i.otherOnline
                          ? "bg-green-500"
                          : "bg-neutral-300"
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-sm ${
                        i.unread > 0
                          ? "font-bold text-foreground"
                          : "font-medium text-foreground"
                      }`}
                    >
                      {i.pinned && <span title="Pinned">📌 </span>}
                      {i.favorite && (
                        <span className="text-amber-500" title="Favorite">
                          ★{" "}
                        </span>
                      )}
                      {i.otherName}
                    </p>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {timeLabel(i.lastAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {i.jobTitle || i.contractTitle || "Direct message"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-xs truncate mt-0.5 flex-1 ${
                        i.unread > 0
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground"
                      }`}
                    >
                      {i.lastFromMe ? "You: " : ""}
                      {i.lastPreview}
                    </p>
                    {i.unread > 0 && (
                      <span className="shrink-0 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {i.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              {/* Hover actions */}
              <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-card border border-border rounded-full px-1 py-0.5 shadow-sm">
                <button
                  type="button"
                  title={i.pinned ? "Unpin" : "Pin to top"}
                  onClick={() => togglePref(i, "pinned")}
                  className={`w-6 h-6 rounded-full text-xs flex items-center justify-center hover:bg-secondary ${
                    i.pinned ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  📌
                </button>
                <button
                  type="button"
                  title={i.favorite ? "Remove favorite" : "Add to favorites"}
                  onClick={() => togglePref(i, "favorite")}
                  className={`w-6 h-6 rounded-full text-sm flex items-center justify-center hover:bg-secondary ${
                    i.favorite ? "text-amber-500" : "text-muted-foreground"
                  }`}
                >
                  {i.favorite ? "★" : "☆"}
                </button>
                {filter === "hidden" ? (
                  <button
                    type="button"
                    title="Unhide"
                    onClick={() => togglePref(i, "hidden")}
                    className="px-2 h-6 rounded-full text-xs text-primary hover:bg-secondary"
                  >
                    Unhide
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message-settings popup — everything editable right here, no trip to
          account settings. Saving is password-gated like all settings. */}
      {settingsOpen && (
        <Modal onClose={() => setSettingsOpen(false)} title="Message settings">
          <div className="space-y-4 mt-1">
            <ToggleRow
              label="Online for messages"
              desc="Show a green dot so clients know you're available to chat."
              on={online}
              onToggle={() => setOnline((v) => !v)}
            />
            <ToggleRow
              label="In-app message notifications"
              desc="Bell notifications for new messages."
              on={inapp}
              onToggle={() => setInapp((v) => !v)}
            />
            <ToggleRow
              label="Email message notifications"
              desc="An email when you receive a new message."
              on={email}
              onToggle={() => setEmail((v) => !v)}
            />
            <ToggleRow
              label="Message tone"
              desc="Play a sound when a new message arrives."
              on={soundOn}
              onToggle={() => setSoundOn((v) => !v)}
            />
            <div className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="font-medium text-foreground">Desktop alerts</p>
                <p className="text-xs text-muted-foreground">
                  System notifications from your browser.
                </p>
              </div>
              {typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted" ? (
                <span className="text-primary text-xs font-semibold shrink-0">
                  Enabled ✓
                </span>
              ) : typeof window !== "undefined" &&
                "Notification" in window &&
                Notification.permission === "denied" ? (
                <span className="text-muted-foreground text-xs shrink-0">
                  Blocked in browser
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => Notification.requestPermission()}
                  className="border border-border rounded-full px-3 py-1 text-xs font-medium text-foreground hover:bg-secondary shrink-0"
                >
                  Enable
                </button>
              )}
            </div>
          </div>

          {settingsMsg && (
            <p className="text-sm text-primary mt-3">{settingsMsg}</p>
          )}

          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="text-foreground text-sm font-medium hover:underline"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={settingsBusy}
              onClick={async () => {
                setSettingsMsg(null);
                if (!(await requirePassword())) return;
                setSettingsBusy(true);
                if (soundOn) localStorage.removeItem("xwork_message_sound_off");
                else localStorage.setItem("xwork_message_sound_off", "1");
                const res = await saveMessageSettings({
                  online,
                  inapp,
                  email,
                }).catch(() => ({ ok: false }));
                setSettingsBusy(false);
                if (res.ok) {
                  setSettingsMsg("Your message settings were saved.");
                  router.refresh();
                } else {
                  setSettingsMsg("Couldn't save. Please try again.");
                }
              }}
              className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {settingsBusy ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}
      {passwordModal}

      {/* Out-of-office modal */}
      {oooOpen && (
        <Modal onClose={() => setOooOpen(false)} title="Out of office">
          <p className="text-sm text-muted-foreground">
            While out of office, people you chat with see an amber
            &quot;Away&quot; dot instead of your online status.
          </p>
          <label className="flex items-center justify-between gap-3 mt-4 text-sm text-foreground">
            Out of office
            <button
              type="button"
              onClick={() => setOoo((o) => !o)}
              aria-label="Toggle out of office"
              className={`relative w-11 h-6 rounded-full transition shrink-0 ${
                ooo ? "bg-amber-400" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  ooo ? "translate-x-5" : ""
                }`}
              />
            </button>
          </label>
          {ooo && (
            <label className="block mt-3 text-sm text-foreground">
              Until (optional)
              <input
                type="date"
                value={oooUntil}
                onChange={(e) => setOooUntil(e.target.value)}
                className="mt-1 w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground text-sm"
              />
            </label>
          )}
          <div className="flex justify-end gap-3 mt-5">
            <button
              type="button"
              onClick={() => setOooOpen(false)}
              className="text-foreground text-sm font-medium hover:underline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveOoo}
              className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90"
            >
              Save
            </button>
          </div>
        </Modal>
      )}

      {/* Shortcut keys modal */}
      {keysOpen && (
        <Modal onClose={() => setKeysOpen(false)} title="Shortcut keys">
          <ul className="text-sm text-foreground space-y-2 mt-1">
            <li className="flex justify-between gap-6">
              <span className="text-muted-foreground">Send message</span>
              <kbd className="border border-border rounded px-1.5 text-xs">Enter</kbd>
            </li>
            <li className="flex justify-between gap-6">
              <span className="text-muted-foreground">New line</span>
              <kbd className="border border-border rounded px-1.5 text-xs">
                Shift + Enter
              </kbd>
            </li>
            <li className="flex justify-between gap-6">
              <span className="text-muted-foreground">Search conversations</span>
              <kbd className="border border-border rounded px-1.5 text-xs">/</kbd>
            </li>
            <li className="flex justify-between gap-6">
              <span className="text-muted-foreground">Close menus &amp; popups</span>
              <kbd className="border border-border rounded px-1.5 text-xs">Esc</kbd>
            </li>
          </ul>
        </Modal>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  on,
  onToggle,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Toggle ${label}`}
        className={`relative w-11 h-6 rounded-full transition shrink-0 ${
          on ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            on ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-card rounded-2xl border border-border max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-foreground mb-2">{title}</h2>
        {children}
      </div>
    </div>
  );
}
