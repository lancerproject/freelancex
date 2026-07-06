"use client";

import { useRef, useState, useTransition } from "react";
import { uploadToStorage } from "@/app/(dashboard)/profile/upload-actions";

const D = 288; // display circle size (px)
const OUT = 512; // exported image size (px)

export function PhotoUploadModal({
  open,
  onClose,
  onAttach,
}: {
  open: boolean;
  onClose: () => void;
  onAttach: (url: string) => void;
}) {
  const [src, setSrc] = useState<string>(""); // data URL being edited
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [nat, setNat] = useState({ w: 0, h: 0 }); // natural image size
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const fileRef = useRef<HTMLInputElement>(null);
  const dragging = useRef<null | { sx: number; sy: number; ox: number; oy: number }>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  if (!open) return null;

  const reset = () => {
    setScale(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Cover-fit base size for a circle of side S (preserves aspect ratio so the
  // longer edge overflows and can be panned into view — unlike objectFit which
  // would crop it away permanently).
  const baseFor = (S: number) => {
    if (!nat.w || !nat.h) return { w: S, h: S };
    const c = Math.max(S / nat.w, S / nat.h);
    return { w: nat.w * c, h: nat.h * c };
  };

  // Keep the photo covering the circle — you can't drag past its edges.
  const clamp = (
    o: { x: number; y: number },
    s = scale,
    rot = rotation
  ) => {
    const b = baseFor(D);
    const r = ((rot % 360) + 360) % 360;
    const swapped = r === 90 || r === 270;
    const effW = (swapped ? b.h : b.w) * s;
    const effH = (swapped ? b.w : b.h) * s;
    const mx = Math.max(0, (effW - D) / 2);
    const my = Math.max(0, (effH - D) / 2);
    return {
      x: Math.max(-mx, Math.min(mx, o.x)),
      y: Math.max(-my, Math.min(my, o.y)),
    };
  };

  const pickFile = (file?: File) => {
    if (!file) return;
    setError("");
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5MB or less.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result as string);
      reset();
    };
    reader.readAsDataURL(file);
  };

  const transform = (f: number) =>
    `translate(${offset.x * f}px, ${offset.y * f}px) rotate(${rotation}deg) scale(${scale})`;

  // drag to move
  const onDown = (e: React.PointerEvent) => {
    dragging.current = { sx: e.clientX, sy: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setOffset(
      clamp({
        x: dragging.current.ox + (e.clientX - dragging.current.sx),
        y: dragging.current.oy + (e.clientY - dragging.current.sy),
      })
    );
  };
  const onUp = () => {
    dragging.current = null;
  };

  const onZoom = (s: number) => {
    setScale(s);
    setOffset((o) => clamp(o, s));
  };
  const onRotate = () => {
    const nr = rotation - 90;
    setRotation(nr);
    setOffset((o) => clamp(o, scale, nr));
  };

  // export cropped circle to a square canvas, upload, attach
  const attach = () => {
    if (!src) {
      onClose();
      return;
    }
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const cover = Math.max(OUT / iw, OUT / ih); // cover-fit base
    const dw = iw * cover;
    const dh = ih * cover;
    const k = OUT / D;

    ctx.save();
    ctx.beginPath();
    ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(OUT / 2, OUT / 2);
    ctx.translate(offset.x * k, offset.y * k);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "avatar.png", { type: "image/png" });
      const fd = new FormData();
      fd.set("file", file);
      start(async () => {
        const res = await uploadToStorage(fd);
        if (res.url) {
          onAttach(res.url);
          onClose();
        } else {
          setError(res.error || "Upload failed.");
        }
      });
    }, "image/png");
  };

  const PreviewCircle = ({ size }: { size: number }) => {
    const b = baseFor(size);
    return (
      <div
        className="rounded-full overflow-hidden bg-neutral-100 shrink-0 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            className="shrink-0 max-w-none"
            style={{
              width: b.w,
              height: b.h,
              transform: transform(size / D),
              transformOrigin: "center",
            }}
          />
        )}
      </div>
    );
  };

  const editorBase = baseFor(D);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-10 px-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl p-8 my-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold">Your photo</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-neutral-500 hover:text-neutral-900 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Editor */}
          <div className="flex flex-col items-center">
            {src ? (
              <>
                <div
                  className="relative rounded-full overflow-hidden bg-neutral-100 touch-none select-none flex items-center justify-center"
                  style={{ width: D, height: D, cursor: "move" }}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerLeave={onUp}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={src}
                    alt="Your photo"
                    draggable={false}
                    onLoad={(e) => {
                      setNat({
                        w: e.currentTarget.naturalWidth,
                        h: e.currentTarget.naturalHeight,
                      });
                    }}
                    className="shrink-0 max-w-none"
                    style={{
                      width: editorBase.w,
                      height: editorBase.h,
                      transform: transform(1),
                      transformOrigin: "center",
                    }}
                  />
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-4 bg-white/90 rounded-full px-3 py-1 text-sm flex items-center gap-1 pointer-events-none">
                    ✥ Move
                  </span>
                </div>

                {/* zoom + rotate */}
                <div className="flex items-center gap-3 mt-5 w-72">
                  <span className="text-neutral-500">🔍</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={scale}
                    onChange={(e) => onZoom(parseFloat(e.target.value))}
                    className="flex-1 accent-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={onRotate}
                    aria-label="Rotate"
                    className="text-neutral-600 hover:text-neutral-900 text-lg"
                  >
                    ↺
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSrc("");
                    setNat({ w: 0, h: 0 });
                    reset();
                  }}
                  className="mt-6 inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                  🗑 Delete current image
                </button>
              </>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className="rounded-full border-2 border-dashed border-neutral-300 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary"
                style={{ width: D, height: D }}
              >
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
                </svg>
                <p className="mt-3 text-neutral-700">
                  <span className="underline font-medium">Upload</span> or drop
                  image here
                </p>
              </div>
            )}
            <p className="text-sm text-neutral-500 mt-4">
              250x250 Min / 5MB Max
            </p>
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>

          {/* Right — tips + preview sizes */}
          <div>
            <h3 className="text-3xl font-semibold leading-tight">
              Show clients the best version of yourself!
            </h3>
            <div className="flex items-end gap-4 mt-8 h-28">
              <PreviewCircle size={96} />
              <PreviewCircle size={72} />
              <PreviewCircle size={56} />
              <PreviewCircle size={44} />
            </div>
            <p className="text-neutral-800 font-medium mt-8">
              Must be an actual photo of you.
            </p>
            <p className="text-neutral-600 mt-1">
              Logos, clip-art, group photos and digitally-altered images are not
              allowed.
            </p>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center justify-end gap-5 mt-8">
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-700 font-medium hover:underline"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={attach}
            disabled={pending || !src}
            className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-40"
          >
            {pending ? "Attaching…" : "Attach photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
