"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/profile/edit-actions";

const inputCls =
  "w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

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
        className="bg-card rounded-2xl border border-border max-w-3xl w-full max-h-[85vh] overflow-y-auto p-7 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-foreground mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function PencilButton({
  onClick,
  label = "Edit",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition"
    >
      ✎
    </button>
  );
}

export function ShareButton({
  path,
  label = "Share",
}: {
  path: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = `${window.location.origin}${path}`;
    // Native share sheet on devices that have one; otherwise copy the link.
    try {
      if (navigator.share) {
        await navigator.share({ title: "Xwork profile", url });
        return;
      }
    } catch {
      /* share sheet dismissed — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy this profile link:", url);
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      className="border border-border text-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary"
    >
      {copied ? "✓ Link copied" : `🔗 ${label}`}
    </button>
  );
}

function PlusButton({
  onClick,
  label = "Add",
}: {
  onClick: () => void;
  label?: string;
}) {
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

/* ---------------------------------------------------------------------- */
/* Generic single-section editor — children are the form fields           */
/* ---------------------------------------------------------------------- */
export function InlineEdit({
  title,
  children,
  label = "Edit",
  asAdd = false,
}: {
  title: string;
  children: React.ReactNode;
  label?: string;
  asAdd?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const submit = (formData: FormData) => {
    start(async () => {
      await updateProfile(formData);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      {asAdd ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm text-purple-600 hover:underline font-medium"
        >
          {label}
        </button>
      ) : (
        <PencilButton onClick={() => setOpen(true)} label={label} />
      )}
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <form action={submit} className="space-y-4">
            {children}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

/* Field helpers used inside InlineEdit children */
export function TextField({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

export function TextArea({
  name,
  label,
  defaultValue,
  placeholder,
  rows = 6,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

export function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      <select name={name} defaultValue={defaultValue ?? ""} className={inputCls}>
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Repeatable list editor — portfolio / certifications / employment / etc */
/* ---------------------------------------------------------------------- */
export function InlineListEdit({
  name,
  title,
  fields,
  initial,
  blank,
  label = "Edit",
  asAdd = false,
  trigger,
}: {
  name: string;
  title: string;
  fields: {
    key: string;
    label: string;
    textarea?: boolean;
    type?: "text" | "textarea" | "select" | "checkbox";
    options?: string[];
    half?: boolean;
  }[];
  initial: Row[];
  blank: Row;
  label?: string;
  asAdd?: boolean;
  trigger?: "plus" | "pencil" | "text";
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(initial ?? []);
  const [pending, start] = useTransition();
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setVal = (i: number, key: string, val: any) =>
    setRows((r) => r.map((row, x) => (x === i ? { ...row, [key]: val } : row)));
  const add = () => setRows((r) => [...r, { ...blank }]);
  const remove = (i: number) => setRows((r) => r.filter((_, x) => x !== i));

  // Open straight to a fillable item: reset to existing rows, and if there are
  // none, seed one blank row so the fields show immediately (Upwork behaviour).
  const openEditor = () => {
    const base = (initial ?? []).map((r) => ({ ...r }));
    setRows(base.length ? base : [{ ...blank }]);
    setOpen(true);
  };

  const save = () => {
    const fd = new FormData();
    fd.set(name, JSON.stringify(rows.filter((r) => Object.values(r).some(Boolean))));
    start(async () => {
      await updateProfile(fd);
      setOpen(false);
      router.refresh();
    });
  };

  const mode = trigger ?? (asAdd ? "text" : "pencil");

  return (
    <>
      {mode === "plus" ? (
        <PlusButton onClick={openEditor} label={label} />
      ) : mode === "text" ? (
        <button
          type="button"
          onClick={openEditor}
          className="text-sm text-purple-600 hover:underline font-medium"
        >
          {label}
        </button>
      ) : (
        <PencilButton onClick={openEditor} label={label} />
      )}
      {open && (
        <Modal title={title} onClose={() => setOpen(false)}>
          <div className="space-y-5">
            {rows.map((row, i) => (
              <div
                key={i}
                className="rounded-xl border border-border p-3 space-y-2 relative"
              >
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute top-2 right-2 text-xs text-orange-400 hover:text-orange-500 hover:underline"
                >
                  Remove
                </button>
                <div className="flex flex-wrap gap-2">
                  {fields.map((f) => {
                    const type = f.type || (f.textarea ? "textarea" : "text");
                    const widthCls = f.half ? "w-[calc(50%-0.25rem)]" : "w-full";
                    if (type === "checkbox") {
                      return (
                        <label
                          key={f.key}
                          className="w-full flex items-center gap-2 text-sm text-foreground py-1"
                        >
                          <input
                            type="checkbox"
                            checked={!!row[f.key]}
                            onChange={(e) => setVal(i, f.key, e.target.checked)}
                            className="w-4 h-4 accent-[var(--primary)]"
                          />
                          {f.label}
                        </label>
                      );
                    }
                    return (
                      <div key={f.key} className={widthCls}>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          {f.label}
                        </label>
                        {type === "textarea" ? (
                          <textarea
                            rows={3}
                            value={row[f.key] || ""}
                            onChange={(e) => setVal(i, f.key, e.target.value)}
                            className={inputCls}
                          />
                        ) : type === "select" ? (
                          <select
                            value={row[f.key] || ""}
                            onChange={(e) => setVal(i, f.key, e.target.value)}
                            className={inputCls}
                          >
                            <option value="">Select…</option>
                            {(f.options || []).map((o) => (
                              <option key={o}>{o}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={row[f.key] || ""}
                            onChange={(e) => setVal(i, f.key, e.target.value)}
                            className={inputCls}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={add}
              className="text-sm text-purple-600 hover:underline font-medium"
            >
              + Add item
            </button>
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
