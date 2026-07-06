"use client";

import { useRef, useState, useTransition } from "react";
import { uploadToStorage } from "@/app/(dashboard)/profile/upload-actions";

export function ImageUpload({
  value,
  onChange,
  accept = "image/*",
  hint = "Upload an image or drag & drop here",
  previewClass = "w-full aspect-[4/3] object-cover rounded-lg",
}: {
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  hint?: string;
  previewClass?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");

  const upload = (file: File) => {
    setError("");
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      const res = await uploadToStorage(fd);
      if (res.url) onChange(res.url);
      else setError(res.error || "Upload failed.");
    });
  };

  const isVideo = accept.includes("video");

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center p-6 transition ${
          drag
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 bg-background"
        }`}
      >
        {value ? (
          isVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={value} controls className="w-full rounded-lg max-h-60" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="preview" className={previewClass} />
          )
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-2xl">
              {isVideo ? "🎬" : "🖼️"}
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              {pending ? "Uploading…" : hint}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isVideo ? "MP4, MOV up to 50 MB" : "PNG, JPG up to 50 MB"}
            </p>
          </>
        )}
      </div>

      {value && (
        <div className="flex gap-4 mt-2 text-sm">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-primary hover:underline"
          >
            {pending ? "Uploading…" : "Change"}
          </button>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-orange-400 hover:text-orange-500 hover:underline"
          >
            Remove
          </button>
        </div>
      )}
      {error && <p className="text-sm text-destructive mt-2">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
