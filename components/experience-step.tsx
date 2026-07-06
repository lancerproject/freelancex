"use client";

import { useState, useTransition } from "react";
import { COUNTRIES } from "@/lib/countries";
import { saveExperience } from "@/app/create-profile/actions";

type Exp = {
  title: string;
  company: string;
  city: string;
  country: string;
  current: boolean;
  from_month: string;
  from_year: string;
  to_month: string;
  to_year: string;
  description: string;
};

const BLANK: Exp = {
  title: "",
  company: "",
  city: "",
  country: "",
  current: false,
  from_month: "",
  from_year: "",
  to_month: "",
  to_year: "",
  description: "",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const YEARS: string[] = [];
for (let y = 2026; y >= 1975; y--) YEARS.push(String(y));

export function ExperienceStep({ initialItems = [] }: { initialItems?: Exp[] }) {
  const [items, setItems] = useState<Exp[]>(initialItems);
  const [idx, setIdx] = useState(0); // which card is shown
  const [editing, setEditing] = useState<number | null>(null); // -1 = new
  const [draft, setDraft] = useState<Exp>(BLANK);
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

  const set = (k: keyof Exp, v: string | boolean) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const valid =
    draft.title.trim() &&
    draft.company.trim() &&
    draft.from_month &&
    draft.from_year &&
    (draft.current || (draft.to_month && draft.to_year));

  const saveDraft = () => {
    if (!valid) return;
    if (editing === -1) {
      setIdx(items.length); // show the newly added card
      setItems((p) => [...p, draft]);
    } else {
      setItems((p) => p.map((it, i) => (i === editing ? draft : it)));
    }
    setEditing(null);
  };

  const proceed = () => {
    const fd = new FormData();
    fd.set("employment", JSON.stringify(items));
    startTransition(() => saveExperience(fd));
  };

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
        If you have relevant work experience, add it here.
      </h1>
      <p className="text-neutral-600 mt-3 max-w-3xl">
        Freelancers who add their experience are twice as likely to win work.
        But if you&apos;re just starting out, you can still create a great
        profile — just head on to the next page.
      </p>

      {items.length === 0 ? (
        /* empty state — dashed add card */
        <div className="mt-8 max-w-md">
          <button
            type="button"
            onClick={openAdd}
            className="w-full rounded-2xl border-2 border-dashed border-neutral-300 p-6 min-h-[180px] flex flex-col justify-center text-left hover:border-primary transition"
          >
            <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-lg">
              +
            </span>
            <span className="text-xl text-neutral-700 mt-4">Add experience</span>
          </button>
        </div>
      ) : (
        /* added experiences — card carousel with add + arrows */
        <div className="mt-8 flex items-center gap-3 max-w-4xl">
          <button
            type="button"
            onClick={openAdd}
            aria-label="Add experience"
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
              {/* folder icon */}
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="shrink-0 text-primary">
                <path
                  d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
                  fill="currentColor"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-2xl font-semibold text-neutral-900">
                    {items[idx].title}
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
                <p className="text-neutral-800 mt-2">
                  {items[idx].company} |{" "}
                  {items[idx].from_month} {items[idx].from_year} -{" "}
                  {items[idx].current
                    ? "Present"
                    : `${items[idx].to_month} ${items[idx].to_year}`}
                </p>
                {(items[idx].city || items[idx].country) && (
                  <p className="text-neutral-500 mt-1">
                    {[items[idx].city, items[idx].country]
                      .filter(Boolean)
                      .join(",")}
                  </p>
                )}
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
          href="/create-profile/title"
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
            {pending ? "Saving…" : "Next, add your education"}
          </button>
        </div>
      </div>

      {/* modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10 px-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-8 my-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Add Work Experience</h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="text-neutral-500 hover:text-neutral-900 text-xl"
              >
                ✕
              </button>
            </div>

            <label className="block font-medium mb-1.5">Title *</label>
            <input
              value={draft.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Ex: Software Engineer"
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 mb-5 outline-none focus:border-primary"
            />

            <label className="block font-medium mb-1.5">Company *</label>
            <input
              value={draft.company}
              onChange={(e) => set("company", e.target.value)}
              placeholder="Ex: Microsoft"
              className="w-full rounded-lg border border-neutral-300 px-4 py-3 mb-5 outline-none focus:border-primary"
            />

            <label className="block font-medium mb-1.5">Location</label>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                value={draft.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="Ex: London"
                className="rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-primary"
              />
              <select
                value={draft.country}
                onChange={(e) => set("country", e.target.value)}
                className="rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-primary bg-white"
              >
                <option value="">Country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.current}
                onChange={(e) => set("current", e.target.checked)}
                className="w-5 h-5 rounded border-neutral-300 text-primary focus:ring-primary"
              />
              <span>I am currently working in this role</span>
            </label>

            <div className="grid grid-cols-2 gap-6 mb-5">
              <div>
                <label className="block font-medium mb-1.5">Start Date *</label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={draft.from_month}
                    onChange={(e) => set("from_month", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-3 outline-none focus:border-primary bg-white"
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={draft.from_year}
                    onChange={(e) => set("from_year", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-3 outline-none focus:border-primary bg-white"
                  >
                    <option value="">Year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1.5">End Date *</label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={draft.to_month}
                    disabled={draft.current}
                    onChange={(e) => set("to_month", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-3 outline-none focus:border-primary bg-white disabled:bg-neutral-100"
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={draft.to_year}
                    disabled={draft.current}
                    onChange={(e) => set("to_year", e.target.value)}
                    className="rounded-lg border border-neutral-300 px-3 py-3 outline-none focus:border-primary bg-white disabled:bg-neutral-100"
                  >
                    <option value="">Year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <label className="block font-medium mb-1.5">Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              rows={5}
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
