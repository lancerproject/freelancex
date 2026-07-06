"use client";

import { useRef, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

// Reusable file/image attachment picker for support tickets and disputes.
// Files are uploaded straight to the "project-files" storage bucket from the
// browser (so we never hit the server-action body-size limit), and their
// public URLs are serialized into a hidden input the surrounding <form>
// submits. The server action reads formData.get(name) → JSON array of
// { name, url, type }. Mirrors the chat-thread upload pattern.

export type Attachment = { name: string; url: string; type: string };

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB, matching chat attachments.

export function AttachmentUploader({
  userId,
  name = "attachments",
  pathPrefix = "support",
}: {
  userId: string;
  name?: string;
  pathPrefix?: string;
}) {
  const [files, setFiles] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    setError(null);
    setUploading(true);
    const supabase = getBrowserSupabase();
    const added: Attachment[] = [];
    try {
      for (const file of Array.from(list)) {
        if (file.size > MAX_BYTES) {
          setError(`"${file.name}" is larger than 25 MB and was skipped.`);
          continue;
        }
        const safeName = file.name.replace(/[^\w.\-]+/g, "_");
        const path = `${pathPrefix}/${userId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("project-files")
          .upload(path, file, { upsert: true, contentType: file.type });
        if (upErr) {
          setError(`Couldn't upload "${file.name}". Please try again.`);
          continue;
        }
        const { data: pub } = supabase.storage
          .from("project-files")
          .getPublicUrl(path);
        if (pub?.publicUrl) {
          added.push({
            name: file.name,
            url: pub.publicUrl,
            type: file.type || "",
          });
        }
      }
      if (added.length) setFiles((prev) => [...prev, ...added]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = (url: string) =>
    setFiles((prev) => prev.filter((f) => f.url !== url));

  const isImage = (f: Attachment) =>
    f.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(files)} />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,.xls,.xlsx"
        onChange={(e) => pick(e.target.files)}
        className="hidden"
        id={`file-${name}`}
      />
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-sm text-primary border border-primary/30 hover:bg-primary/5 rounded-full px-3 py-1.5 disabled:opacity-50"
        >
          📎 {uploading ? "Uploading…" : "Attach files or photos"}
        </button>
        {files.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {files.length} attached
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f) => (
            <div
              key={f.url}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1"
            >
              {isImage(f) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={f.url}
                  alt={f.name}
                  className="h-8 w-8 rounded object-cover"
                />
              ) : (
                <span className="text-base">📄</span>
              )}
              <span className="text-xs text-foreground max-w-[160px] truncate">
                {f.name}
              </span>
              <button
                type="button"
                onClick={() => remove(f.url)}
                className="text-muted-foreground hover:text-red-500 text-sm leading-none"
                aria-label={`Remove ${f.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
