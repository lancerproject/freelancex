"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/profile/edit-actions";
import { uploadToStorage } from "@/app/(dashboard)/profile/upload-actions";
import { TagInput } from "@/components/tag-input";
import { ALL_SKILLS, SKILL_KEYWORDS } from "@/lib/skills";
import { ImageUpload } from "@/components/image-upload";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Item = Record<string, any>;

const inputCls =
  "w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const BLANK: Item = {
  title: "",
  role: "",
  description: "",
  skills: "",
  images: [],
  thumbnail: "",
  image_url: "",
  file_url: "",
  file_name: "",
  link: "",
};

// Pull a single cover image out of an item (new `images`/`thumbnail` or legacy `image_url`).
function cover(it: Item): string {
  if (it.thumbnail) return it.thumbnail;
  if (Array.isArray(it.images) && it.images[0]) return it.images[0];
  return it.image_url || "";
}

export function PortfolioSection({
  items: initial,
  isSelf,
}: {
  items: Item[];
  isSelf: boolean;
}) {
  const [items, setItems] = useState<Item[]>(initial ?? []);
  const [editing, setEditing] = useState<number | null>(null); // -1 = new
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState<Item>(BLANK);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const images: string[] = Array.isArray(draft.images) ? draft.images : [];
  const thumbnail = draft.thumbnail || images[0] || "";

  const persist = (next: Item[]) => {
    const fd = new FormData();
    fd.set("portfolio", JSON.stringify(next));
    start(async () => {
      await updateProfile(fd);
      router.refresh();
    });
  };

  const normalize = (it: Item): Item => {
    const imgs =
      Array.isArray(it.images) && it.images.length
        ? it.images
        : it.image_url
          ? [it.image_url]
          : [];
    return { ...BLANK, ...it, images: imgs, thumbnail: it.thumbnail || imgs[0] || "" };
  };
  const openAdd = () => {
    setDraft({ ...BLANK, images: [] });
    setEditing(-1);
  };
  const openEdit = (i: number) => {
    setDraft(normalize(items[i]));
    setEditing(i);
    setMenuOpen(null);
  };
  const skillCount = String(draft.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
  const valid =
    !!String(draft.title || "").trim() &&
    !!String(draft.description || "").trim() &&
    skillCount > 0;

  const saveDraft = () => {
    if (!valid) return;
    const item = { ...draft, images, thumbnail, image_url: thumbnail };
    const next =
      editing === -1
        ? [...items, item]
        : items.map((it, x) => (x === editing ? item : it));
    setItems(next);
    setEditing(null);
    persist(next);
  };
  const remove = (i: number) => {
    const next = items.filter((_, x) => x !== i);
    setItems(next);
    setMenuOpen(null);
    persist(next);
  };
  const set = (key: string, val: string) =>
    setDraft((d) => ({ ...d, [key]: val }));

  // Image list helpers
  const setImages = (next: string[]) =>
    setDraft((d) => ({
      ...d,
      images: next,
      thumbnail: d.thumbnail && next.includes(d.thumbnail) ? d.thumbnail : next[0] || "",
    }));
  const addImage = (url: string) => {
    if (url && images.length < 3) setImages([...images, url]);
  };
  const removeImage = (i: number) => setImages(images.filter((_, x) => x !== i));
  const moveImage = (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    setImages(next);
  };
  const setThumb = (url: string) => setDraft((d) => ({ ...d, thumbnail: url }));

  const attachFile = (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const res = await uploadToStorage(fd);
      if (res.url)
        setDraft((d) => ({ ...d, file_url: res.url!, file_name: file.name }));
    });
  };

  if (!isSelf && items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-2xl font-bold text-foreground">Portfolio</h3>
        {isSelf && (
          <button
            type="button"
            onClick={openAdd}
            aria-label="Add portfolio"
            title="Add portfolio"
            className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center text-xl leading-none hover:bg-purple-100 transition"
          >
            +
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Showcase your best work to win more clients.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-7">
          {items.map((p, i) => {
            const img = cover(p);
            return (
              <div key={i} className="group relative">
                <a
                  href={p.link || undefined}
                  target={p.link ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="block"
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={p.title || ""}
                      className="w-full aspect-[4/3] object-cover rounded-lg border border-border"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-secondary rounded-lg border border-border" />
                  )}
                  <p className="text-foreground mt-3 leading-snug line-clamp-2 group-hover:underline">
                    {p.title || "Untitled project"}
                  </p>
                </a>

                {isSelf && (
                  <button
                    type="button"
                    aria-label="More options"
                    onClick={(e) => {
                      e.preventDefault();
                      setMenuOpen(menuOpen === i ? null : i);
                    }}
                    className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-card/90 border border-border shadow-sm flex items-center justify-center text-foreground hover:bg-card transition ${
                      menuOpen === i
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                    }`}
                  >
                    ⋯
                  </button>
                )}
                {isSelf && menuOpen === i && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(null)}
                    />
                    <div className="absolute top-11 right-2 z-20 w-44 rounded-xl border border-border bg-card shadow-lg py-1 text-sm">
                      <button
                        type="button"
                        onClick={() => openEdit(i)}
                        className="w-full text-left px-4 py-2 text-foreground hover:bg-secondary"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="w-full text-left px-4 py-2 text-destructive hover:bg-secondary"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {editing !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto p-7 sm:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                {editing === -1 ? "Add a new portfolio project" : "Edit project"}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Left: fields */}
              <div className="space-y-4">
                <Field label="Project title" required>
                  <input
                    value={draft.title || ""}
                    onChange={(e) => set("title", e.target.value)}
                    placeholder="Enter a brief but descriptive title"
                    className={inputCls}
                  />
                </Field>
                <Field label="Your role (optional)">
                  <input
                    value={draft.role || ""}
                    onChange={(e) => set("role", e.target.value)}
                    placeholder="e.g. Front-end engineer"
                    className={inputCls}
                  />
                </Field>
                <Field label="Project description" required>
                  <textarea
                    rows={4}
                    value={draft.description || ""}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Briefly describe the project's goals, your solution and the impact."
                    className={inputCls}
                  />
                </Field>
                <Field label="Skills and deliverables (up to 10)" required>
                  <TagInput
                    value={String(draft.skills || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)}
                    onChange={(arr) => set("skills", arr.join(", "))}
                    max={10}
                    suggestions={ALL_SKILLS}
                    keywords={SKILL_KEYWORDS}
                    placeholder="Search skills"
                  />
                </Field>
                <Field label="Project link (optional)">
                  <input
                    value={draft.link || ""}
                    onChange={(e) => set("link", e.target.value)}
                    placeholder="https://…"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Right: content (images + file) */}
              <div className="space-y-4">
                <Field label="Project images (up to 3)">
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      {images.map((url, i) => (
                        <div
                          key={i}
                          className="relative group/img rounded-lg border border-border overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className="w-full aspect-square object-cover"
                          />
                          {thumbnail === url && (
                            <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground rounded px-1.5 py-0.5 font-medium">
                              Thumbnail
                            </span>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-black/55 flex justify-center items-center gap-1 py-1 opacity-0 group-hover/img:opacity-100 transition">
                            <IconMini onClick={() => moveImage(i, -1)} title="Move left" disabled={i === 0}>◀</IconMini>
                            <IconMini onClick={() => setThumb(url)} title="Set as thumbnail">★</IconMini>
                            <IconMini onClick={() => moveImage(i, 1)} title="Move right" disabled={i === images.length - 1}>▶</IconMini>
                            <IconMini onClick={() => removeImage(i)} title="Remove">✕</IconMini>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {images.length < 3 ? (
                    <ImageUpload
                      value=""
                      onChange={addImage}
                      accept="image/*"
                      hint="Upload an image or drag & drop here"
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Maximum 3 images reached.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Click ★ to choose the thumbnail, ◀ ▶ to reorder.
                  </p>
                </Field>

                <Field label="Attach a file (optional)">
                  {draft.file_url ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2.5 text-sm">
                      <a
                        href={draft.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        📎 {draft.file_name || "Attached file"}
                      </a>
                      <button
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, file_url: "", file_name: "" }))}
                        className="text-destructive hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full rounded-lg border border-dashed border-border hover:border-primary/50 p-3 text-sm text-muted-foreground"
                    >
                      {pending ? "Uploading…" : "📎 Attach a file (PDF, ZIP, etc.)"}
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) attachFile(f);
                      e.target.value = "";
                    }}
                  />
                </Field>
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-6 mt-2 border-t border-border">
              {!valid && (
                <span className="text-sm text-muted-foreground mr-auto">
                  Title, description and at least one skill are required.
                </span>
              )}
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={pending || !valid}
                className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconMini({
  onClick,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="w-6 h-6 rounded-full bg-white/90 text-neutral-800 text-xs flex items-center justify-center hover:bg-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
