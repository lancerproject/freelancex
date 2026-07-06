"use client";

import { useState, useTransition } from "react";
import { ComboInput } from "@/components/combo-input";
import { UNIVERSITIES } from "@/lib/universities";
import { DEGREES } from "@/lib/degrees";
import { saveEducation } from "@/app/create-profile/actions";

type Edu = {
  school: string;
  degree: string;
  field: string;
  start_year: string;
  end_year: string;
  description: string;
};

const BLANK: Edu = {
  school: "",
  degree: "",
  field: "",
  start_year: "",
  end_year: "",
  description: "",
};

const YEARS: string[] = [];
for (let y = 2032; y >= 1975; y--) YEARS.push(String(y));

export function EducationStep({ initialItems = [] }: { initialItems?: Edu[] }) {
  const [items, setItems] = useState<Edu[]>(initialItems);
  const [idx, setIdx] = useState(0);
  const [editing, setEditing] = useState<number | null>(null); // -1 = new
  const [draft, setDraft] = useState<Edu>(BLANK);
  const [pending, startTransition] = useTransition();

  const openAdd = () => {
    setDraft({ ...BLANK });
    setEditing(-1);
  };
  const openEdit = (i: number) => {
    setDraft({ ...items[i] });
    setEditing(i);
  };
  const remove = (i: number) => {
    setItems((p) => p.filter((_, x) => x !== i));
    setIdx((cur) => Math.max(0, cur >= i ? cur - 1 : cur));
  };
  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min(items.length - 1, i + 1));

  const set = (k: keyof Edu, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const valid =
    draft.school.trim() &&
    draft.degree.trim() &&
    draft.field.trim() &&
    draft.start_year &&
    draft.end_year;

  const saveDraft = () => {
    if (!valid) return;
    if (editing === -1) {
      setIdx(items.length);
      setItems((p) => [...p, draft]);
    } else {
      setItems((p) => p.map((it, i) => (i === editing ? draft : it)));
    }
    setEditing(null);
  };

  const proceed = () => {
    const fd = new FormData();
    fd.set("education", JSON.stringify(items));
    startTransition(() => saveEducation(fd));
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
        Clients like to know what you know — add your education here.
      </h1>
      <p className="text-neutral-600 mt-3 max-w-3xl">
        You don&apos;t have to have a degree. Adding any relevant education helps
        make your profile more visible.
      </p>

      {items.length === 0 ? (
        <div className="mt-8 max-w-md">
          <button
            type="button"
            onClick={openAdd}
            className="w-full rounded-2xl border-2 border-dashed border-neutral-300 p-6 min-h-[180px] flex flex-col justify-center text-left hover:border-primary transition"
          >
            <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-lg">
              +
            </span>
            <span className="text-xl text-neutral-700 mt-4">Add education</span>
          </button>
        </div>
      ) : (
        <div className="mt-8 flex items-center gap-3 max-w-4xl">
          <button
            type="button"
            onClick={openAdd}
            aria-label="Add education"
            className="shrink-0 w-11 h-11 rounded-full border-2 border-primary text-primary flex items-center justify-center text-2xl hover:bg-primary/5 transition"
          >
            +
          </button>
          <button
            type="button"
            onClick={prev}
            disabled={idx === 0}
            aria-label="Previous"
            className="shrink-0 w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center hover:bg-neutral-200 disabled:opacity-40 transition"
          >
            ←
          </button>

          <div className="flex-1 rounded-2xl border border-neutral-200 p-6 min-h-[200px]">
            <div className="flex items-start gap-4">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="shrink-0 text-primary">
                <path d="M12 3 1 8l11 5 9-4.09V15h2V8L12 3Z" fill="currentColor" />
                <path d="M5 11.18V14c0 1.66 3.13 3 7 3s7-1.34 7-3v-2.82l-7 3.18-7-3.18Z" fill="currentColor" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-2xl font-semibold text-neutral-900">
                    {items[idx].school}
                  </h3>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(idx)}
                      aria-label="Edit"
                      className="w-9 h-9 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      aria-label="Delete"
                      className="w-9 h-9 rounded-full border border-orange-200 bg-orange-50 text-orange-600 flex items-center justify-center hover:bg-orange-100"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                <p className="text-neutral-700 mt-3">
                  {items[idx].degree}
                  {items[idx].field ? `, ${items[idx].field}` : ""}{" "}
                  {items[idx].start_year}-{items[idx].end_year}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={next}
            disabled={idx >= items.length - 1}
            aria-label="Next"
            className="shrink-0 w-10 h-10 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center hover:bg-neutral-200 disabled:opacity-40 transition"
          >
            →
          </button>
        </div>
      )}

      {/* footer */}
      <div className="flex items-center justify-between mt-12">
        <a
          href="/create-profile/experience"
          className="px-6 py-2.5 rounded-full border border-neutral-300 font-medium hover:bg-neutral-100 transition"
        >
          Back
        </a>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={proceed}
            disabled={pending}
            className="text-neutral-700 font-medium hover:underline disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={proceed}
            disabled={pending}
            className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {pending ? "Saving…" : "Next, add languages"}
          </button>
        </div>
      </div>

      {/* modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-8 my-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Add Education History</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="text-neutral-500 hover:text-neutral-900 text-xl"
              >
                ✕
              </button>
            </div>

            <label className="block font-medium mb-1.5">School *</label>
            <div className="mb-5">
              <ComboInput
                value={draft.school}
                onChange={(v) => set("school", v)}
                suggestions={UNIVERSITIES}
                placeholder="Ex: Northwestern University"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-primary"
              />
            </div>

            <label className="block font-medium mb-1.5">Degree *</label>
            <div className="mb-5">
              <ComboInput
                value={draft.degree}
                onChange={(v) => set("degree", v)}
                suggestions={DEGREES}
                placeholder="Ex: Bachelors"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-primary"
              />
            </div>

            <label className="block font-medium mb-1.5">Field of Study *</label>
            <input
              value={draft.field}
              onChange={(e) => set("field", e.target.value)}
              placeholder="Ex: Computer Science"
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 mb-5 outline-none focus:border-primary"
            />

            <label className="block font-medium mb-1.5">Dates Attended *</label>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <select
                value={draft.start_year}
                onChange={(e) => set("start_year", e.target.value)}
                className="rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-primary bg-white"
              >
                <option value="">From</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select
                value={draft.end_year}
                onChange={(e) => set("end_year", e.target.value)}
                className="rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-primary bg-white"
              >
                <option value="">To (or expected graduation year)</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <label className="block font-medium mb-1.5">Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={5}
              placeholder="Describe your studies, awards, etc."
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-primary resize-y"
            />

            <div className="flex items-center justify-end gap-5 mt-7">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-neutral-700 font-medium hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDraft}
                disabled={!valid}
                className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
