"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/profile/edit-actions";
import { ComboInput } from "@/components/combo-input";
import { ExpandableText } from "@/components/expandable-text";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>;
type Field = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "checkbox" | "combo";
  options?: string[];
  half?: boolean;
};

const inputCls =
  "w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function empHeading(e: any) {
  return [e.title, e.company].filter(Boolean).join(" | ");
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function empRange(e: any) {
  if (e.period) return e.period;
  const from = [e.from_month, e.from_year].filter(Boolean).join(" ");
  const to = e.current ? "Present" : [e.to_month, e.to_year].filter(Boolean).join(" ");
  return [from, to].filter(Boolean).join(" - ");
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function certIssued(c: any) {
  if (c.issued) return c.issued;
  return [c.issue_month, c.issue_year].filter(Boolean).join(" ");
}

function PlusBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center text-xl leading-none hover:bg-purple-100 transition"
    >
      +
    </button>
  );
}
function IconBtn({
  onClick,
  label,
  children,
  danger,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-8 h-8 shrink-0 rounded-full border flex items-center justify-center transition ${
        danger
          ? "border-orange-200 bg-orange-50 text-orange-500 hover:bg-orange-100"
          : "border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100"
      }`}
    >
      {children}
    </button>
  );
}

export function ListSection({
  name,
  title,
  kind,
  items: initial,
  isSelf,
  fields,
  blank,
  emptyText,
  variant = "card",
  autoOpen = false,
}: {
  name: string;
  title: string;
  kind:
    | "certification"
    | "employment"
    | "other"
    | "language"
    | "license"
    | "education";
  items: Item[];
  isSelf: boolean;
  fields: Field[];
  blank: Item;
  emptyText: string;
  variant?: "card" | "plain";
  autoOpen?: boolean;
}) {
  const [items, setItems] = useState<Item[]>(initial ?? []);
  const [editing, setEditing] = useState<number | null>(null); // -1 = new
  const [draft, setDraft] = useState<Item>(blank);
  const [pending, start] = useTransition();
  const router = useRouter();

  // Auto-open the add editor when deep-linked (e.g. from the dashboard
  // "Complete your profile" checklist via ?open=employment).
  useEffect(() => {
    if (autoOpen) {
      setDraft({ ...blank });
      setEditing(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  if (!isSelf && items.length === 0) return null;

  const persist = (next: Item[]) => {
    const fd = new FormData();
    fd.set(name, JSON.stringify(next));
    start(async () => {
      await updateProfile(fd);
      router.refresh();
    });
  };
  const openAdd = () => {
    setDraft({ ...blank });
    setEditing(-1);
  };
  const openEdit = (i: number) => {
    setDraft({ ...items[i] });
    setEditing(i);
  };
  const saveDraft = () => {
    const next =
      editing === -1
        ? [...items, draft]
        : items.map((it, x) => (x === editing ? draft : it));
    setItems(next);
    setEditing(null);
    persist(next);
  };
  const remove = (i: number) => {
    const next = items.filter((_, x) => x !== i);
    setItems(next);
    persist(next);
  };
  const set = (key: string, val: string | boolean) =>
    setDraft((d) => ({ ...d, [key]: val }));

  const renderItem = (it: Item) => {
    if (kind === "certification") {
      return (
        <div className="flex gap-4">
          <div className="w-10 h-10 shrink-0 rounded-lg bg-secondary flex items-center justify-center text-lg">
            📜
          </div>
          <div className="min-w-0">
            <p className="text-xl font-semibold text-foreground">{it.name}</p>
            {it.provider && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Provider: {it.provider}
              </p>
            )}
            {certIssued(it) && (
              <p className="text-sm text-muted-foreground">
                Issued: {certIssued(it)}
              </p>
            )}
            {it.description && (
              <div className="mt-1">
                <ExpandableText
                  text={it.description}
                  className="text-sm text-muted-foreground"
                />
              </div>
            )}
          </div>
        </div>
      );
    }
    if (kind === "employment") {
      return (
        <div className="min-w-0">
          <p className="text-xl font-semibold text-foreground">
            {empHeading(it) || it.title}
          </p>
          {empRange(it) && (
            <p className="text-sm text-muted-foreground">{empRange(it)}</p>
          )}
          {(it.city || it.country) && (
            <p className="text-sm text-muted-foreground">
              {[it.city, it.country].filter(Boolean).join(", ")}
            </p>
          )}
          {it.description && (
            <div className="mt-2">
              <ExpandableText
                text={it.description}
                className="text-sm text-muted-foreground"
              />
            </div>
          )}
        </div>
      );
    }
    if (kind === "language") {
      return (
        <p className="text-sm">
          <span className="font-medium text-foreground">{it.language}:</span>{" "}
          <span className="text-muted-foreground">{it.proficiency}</span>
        </p>
      );
    }
    if (kind === "license") {
      return (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{it.name}</p>
          {(it.provider || it.year) && (
            <p className="text-sm text-muted-foreground">
              {[it.provider, it.year].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      );
    }
    if (kind === "education") {
      return (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{it.school}</p>
          {it.degree && (
            <p className="text-sm text-muted-foreground">{it.degree}</p>
          )}
          {(it.start_year || it.end_year) && (
            <p className="text-sm text-muted-foreground">
              {[it.start_year, it.end_year].filter(Boolean).join(" - ")}
            </p>
          )}
        </div>
      );
    }
    // other
    return (
      <div className="min-w-0">
        <p className="text-xl font-semibold text-foreground">{it.title}</p>
        {it.description && (
          <div className="mt-1">
            <ExpandableText
              text={it.description}
              className="text-sm text-muted-foreground"
            />
          </div>
        )}
      </div>
    );
  };

  const plain = variant === "plain";

  const Wrapper = plain ? "section" : "div";

  return (
    <Wrapper
      className={
        plain ? "py-6" : "rounded-2xl border border-border bg-card p-6 lg:p-8"
      }
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className={`font-bold text-foreground ${
            plain ? "text-xl" : "text-2xl"
          }`}
        >
          {title}
        </h3>
        {isSelf && <PlusBtn onClick={openAdd} label={`Add ${title}`} />}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((it, i) => (
            <div
              key={i}
              className={`flex items-start justify-between gap-3 first:pt-0 last:pb-0 ${
                plain ? "py-3" : "py-5"
              }`}
            >
              <div className="min-w-0 flex-1">{renderItem(it)}</div>
              {isSelf && (
                <div className="flex items-center gap-2 shrink-0">
                  <IconBtn onClick={() => openEdit(i)} label="Edit">
                    ✎
                  </IconBtn>
                  <IconBtn onClick={() => remove(i)} label="Delete" danger>
                    🗑
                  </IconBtn>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {editing !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-3xl w-full max-h-[90vh] overflow-y-auto p-7 sm:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-foreground mb-5">
              {editing === -1 ? `Add ${title.toLowerCase()}` : `Edit ${title.toLowerCase()}`}
            </h2>
            <div className="flex flex-wrap gap-3">
              {fields.map((f) => {
                const type = f.type || "text";
                const widthCls = f.half ? "w-[calc(50%-0.375rem)]" : "w-full";
                if (type === "checkbox") {
                  return (
                    <label
                      key={f.key}
                      className="w-full flex items-center gap-2 text-sm text-foreground py-1"
                    >
                      <input
                        type="checkbox"
                        checked={!!draft[f.key]}
                        onChange={(e) => set(f.key, e.target.checked)}
                        className="w-4 h-4 accent-[var(--primary)]"
                      />
                      {f.label}
                    </label>
                  );
                }
                return (
                  <div key={f.key} className={widthCls}>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {f.label}
                    </label>
                    {type === "textarea" ? (
                      <textarea
                        rows={4}
                        value={draft[f.key] || ""}
                        onChange={(e) => set(f.key, e.target.value)}
                        className={inputCls}
                      />
                    ) : type === "combo" ? (
                      <ComboInput
                        value={draft[f.key] || ""}
                        onChange={(v) => set(f.key, v)}
                        suggestions={f.options || []}
                        placeholder="Type to search…"
                      />
                    ) : type === "select" ? (
                      <select
                        value={draft[f.key] || ""}
                        onChange={(e) => set(f.key, e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Select…</option>
                        {(f.options || []).map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={draft[f.key] || ""}
                        onChange={(e) => set(f.key, e.target.value)}
                        className={inputCls}
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end items-center gap-4 mt-8">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={pending}
                className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Wrapper>
  );
}
