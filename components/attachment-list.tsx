import type { Attachment } from "@/components/attachment-uploader";

// Renders the attachments on a support/dispute message: images as thumbnails
// (click to open full size), other files as labelled download links. Safe to
// use in server components — no client hooks.
export function AttachmentList({ items }: { items: unknown }) {
  const list: Attachment[] = Array.isArray(items)
    ? (items as Attachment[]).filter((a) => a && typeof a.url === "string")
    : [];
  if (list.length === 0) return null;

  const isImage = (a: Attachment) =>
    (a.type || "").startsWith("image/") ||
    /\.(png|jpe?g|gif|webp|svg)$/i.test(a.name || "");

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {list.map((a, i) => (
        <a
          key={`${a.url}-${i}`}
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group"
          title={a.name}
        >
          {isImage(a) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.url}
              alt={a.name}
              className="h-20 w-20 rounded-lg object-cover border border-border group-hover:opacity-90"
            />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground hover:border-primary">
              📄 <span className="max-w-[160px] truncate">{a.name || "Attachment"}</span>
            </span>
          )}
        </a>
      ))}
    </div>
  );
}
