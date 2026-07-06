"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/profile/edit-actions";
import { ImageUpload } from "@/components/image-upload";
import { ComboInput } from "@/components/combo-input";
import { CITIES } from "@/lib/cities";
import { COUNTRIES } from "@/lib/countries";

const LOCATIONS = [...CITIES, ...COUNTRIES];

export function PhotoEditor({
  avatarUrl,
  fullName,
  location,
}: {
  avatarUrl: string | null;
  fullName: string | null;
  location: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState(avatarUrl || "");
  const [name, setName] = useState(fullName || "");
  const [loc, setLoc] = useState(location || "");
  const [pending, start] = useTransition();
  const router = useRouter();

  const open_ = () => {
    setPhoto(avatarUrl || "");
    setName(fullName || "");
    setLoc(location || "");
    setOpen(true);
  };

  const save = () => {
    const fd = new FormData();
    fd.set("avatar_url", photo);
    fd.set("full_name", name);
    fd.set("location", loc);
    start(async () => {
      await updateProfile(fd);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={open_}
        aria-label="Edit photo"
        title="Edit photo"
        className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition"
      >
        ✎
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-3xl w-full max-h-[90vh] overflow-y-auto p-7 sm:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-foreground">Edit photo</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 items-start">
              <ImageUpload
                value={photo}
                onChange={setPhoto}
                accept="image/*"
                hint="Upload a photo or drag & drop here"
                previewClass="w-40 h-40 rounded-full object-cover mx-auto"
              />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Show clients the best version of yourself!
                </h3>
                <p className="text-sm text-muted-foreground mt-3">
                  Must be an actual photo of you. Logos, clip-art, group photos,
                  and digitally-altered images are not allowed.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Full name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Location
                </label>
                <ComboInput
                  value={loc}
                  onChange={setLoc}
                  suggestions={LOCATIONS}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 mt-8">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
