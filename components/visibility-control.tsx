"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setVisibility } from "@/app/actions";

const OPTIONS = [
  {
    value: "public",
    label: "Public",
    desc: "Your profile is visible to everyone and can show up in search results.",
  },
  {
    value: "users",
    label: "Xwork users only",
    desc: "Only signed-in Xwork users can see your profile.",
  },
  {
    value: "private",
    label: "Private",
    desc: "Your profile won't appear in any search results. People need a direct link and must be signed in to view it.",
  },
];

export function VisibilityControl({ initial }: { initial?: string }) {
  const [value, setValue] = useState(initial || "public");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(value);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const label = OPTIONS.find((o) => o.value === value)?.label || "Public";

  const save = () => {
    setValue(sel);
    setOpen(false);
    startTransition(() => {
      setVisibility(sel).then(() => router.refresh());
    });
  };

  return (
    <>
      <button
        onClick={() => {
          setSel(value);
          setOpen(true);
        }}
        className="text-primary hover:underline text-sm font-medium"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-foreground">
              Edit profile visibility
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Choose who can see your profile and where it can appear.
            </p>
            <div className="mt-5 space-y-4">
              {OPTIONS.map((o) => (
                <label key={o.value} className="flex gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="vis"
                    checked={sel === o.value}
                    onChange={() => setSel(o.value)}
                    className="mt-1 accent-primary"
                  />
                  <span>
                    <span className="block font-medium text-foreground">
                      {o.label}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {o.desc}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
