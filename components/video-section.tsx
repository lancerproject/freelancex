"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/profile/edit-actions";

function youTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

export function VideoSection({
  videoUrl,
  isSelf,
}: {
  videoUrl: string | null;
  isSelf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(videoUrl || "");
  const [pending, start] = useTransition();
  const router = useRouter();

  const id = youTubeId(videoUrl || "");

  if (!isSelf && !id) return null;

  const save = () => {
    const fd = new FormData();
    fd.set("video_url", url);
    start(async () => {
      await updateProfile(fd);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xl font-bold text-foreground">
          Video introduction
        </h3>
        {isSelf && (
          <button
            type="button"
            onClick={() => {
              setUrl(videoUrl || "");
              setOpen(true);
            }}
            aria-label="Add video introduction"
            title={id ? "Edit video" : "Add video"}
            className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center text-xl leading-none hover:bg-purple-100 transition"
          >
            {id ? "✎" : "+"}
          </button>
        )}
      </div>

      {id ? (
        <div className="aspect-video w-full rounded-lg overflow-hidden border border-border">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title="Video introduction"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add a short video to introduce yourself to clients.
        </p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-3xl w-full p-7 sm:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                Add video introduction
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <label className="block font-medium text-foreground mt-6 mb-1">
              Link to your YouTube video
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Ex: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              className="w-full bg-background border border-border text-foreground rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Paste a public YouTube link. Keep it short and professional.
            </p>

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
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
