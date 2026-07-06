"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadToStorage } from "@/app/(dashboard)/profile/upload-actions";
import { verifyIdentity } from "@/app/settings/identity/actions";
import { COUNTRIES } from "@/lib/countries";

/* ------------------------------------------------------------------ */
/* face-api.js (loaded from CDN at runtime, ignored by the bundler)    */
/* ------------------------------------------------------------------ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let faceapi: any = null;
let modelsLoaded = false;
async function loadFaceApi() {
  if (modelsLoaded) return faceapi;
  try {
    faceapi = await import(
      /* webpackIgnore: true */
      /* @vite-ignore */
      // @ts-expect-error remote ESM module
      "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.esm.js"
    );
    const base = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
    await faceapi.nets.ssdMobilenetv1.loadFromUri(base);
    await faceapi.nets.faceLandmark68Net.loadFromUri(base);
    await faceapi.nets.faceRecognitionNet.loadFromUri(base);
    modelsLoaded = true;
    return faceapi;
  } catch {
    return null;
  }
}
function imgFrom(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function descriptor(api: any, src: string) {
  try {
    const img = await imgFrom(src);
    const det = await api
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return det?.descriptor ?? null;
  } catch {
    return null;
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function matchPct(api: any, a: Float32Array | null, b: Float32Array | null) {
  if (!a || !b) return 0;
  const dist = api.euclideanDistance(a, b);
  // distance 0 = identical, ~0.6 = typical threshold. Map to a 0–100 score.
  return Math.max(0, Math.min(100, Math.round((1 - dist / 0.6) * 100)));
}

/* ------------------------------------------------------------------ */

type Shot = { url: string; preview: string } | null;

export function IdentityVerification({
  profilePhoto,
}: {
  profilePhoto: string | null;
}) {
  const [step, setStep] = useState(1);
  const [front, setFront] = useState<Shot>(null);
  const [back, setBack] = useState<Shot>(null);
  const [selfie, setSelfie] = useState<Shot>(null);
  const [legalName, setLegalName] = useState("");
  const [idType, setIdType] = useState("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [idCountry, setIdCountry] = useState("");
  const [dob, setDob] = useState("");
  const [faceScore, setFaceScore] = useState<number | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [inReview, setInReview] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const uploadFile = async (
    file: File,
    set: (s: Shot) => void,
    label: string
  ) => {
    setError("");
    setBusy(`Uploading ${label}…`);
    const preview = URL.createObjectURL(file);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadToStorage(fd);
    setBusy("");
    if (res.url) set({ url: res.url, preview });
    else setError(res.error || "Upload failed.");
  };

  // Camera for selfie
  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setError("Couldn't access your camera. Allow camera access and retry.");
    }
  };
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const captureSelfie = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.9)
    );
    stopCamera();
    const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
    const preview = URL.createObjectURL(file);
    setBusy("Uploading selfie…");
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadToStorage(fd);
    if (!res.url) {
      setBusy("");
      setError(res.error || "Upload failed.");
      return;
    }
    setSelfie({ url: res.url, preview });

    // Run face matching: selfie ↔ profile photo ↔ ID front
    setBusy("Matching your face…");
    const api = await loadFaceApi();
    if (!api) {
      setFaceScore(null); // matching unavailable — fall back to name + docs
      setBusy("");
      return;
    }
    const [selfieD, profD, idD] = await Promise.all([
      descriptor(api, preview),
      profilePhoto ? descriptor(api, profilePhoto) : Promise.resolve(null),
      front ? descriptor(api, front.preview) : Promise.resolve(null),
    ]);
    const scores: number[] = [];
    if (profD) scores.push(matchPct(api, selfieD, profD));
    if (idD) scores.push(matchPct(api, selfieD, idD));
    const score = scores.length ? Math.round(Math.min(...scores)) : 0;
    setFaceScore(score);
    setBusy("");
  };

  const submit = () => {
    setError("");
    if (!front || !back || !selfie) {
      setError("Please complete all steps.");
      return;
    }
    const fd = new FormData();
    fd.set("front_url", front.url);
    fd.set("back_url", back.url);
    fd.set("selfie_url", selfie.url);
    fd.set("legal_name", legalName);
    fd.set("face_score", String(faceScore ?? 0));
    fd.set("id_type", idType);
    fd.set("id_number", idNumber);
    fd.set("id_country", idCountry);
    fd.set("id_dob", dob);
    start(async () => {
      const res = await verifyIdentity(fd);
      if (res.ok) {
        setInReview(!!res.review);
        setDone(true);
        router.refresh();
      } else {
        setError(res.error || "Verification failed.");
      }
    });
  };

  if (done) {
    return inReview ? (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="text-5xl mb-3">🕐</div>
        <h3 className="text-xl font-bold text-foreground">
          Documents submitted — manual review
        </h3>
        <p className="text-muted-foreground mt-2">
          Automatic face matching wasn&apos;t available, so our team is
          checking your documents by hand. This usually takes less than 24
          hours — we&apos;ll send you a notification the moment it&apos;s done.
        </p>
      </div>
    ) : (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="text-5xl mb-3">✅</div>
        <h3 className="text-xl font-bold text-foreground">
          Identity verified
        </h3>
        <p className="text-muted-foreground mt-2">
          Your profile now shows a verified badge{" "}
          <span className="text-primary">✓</span>. Thanks for keeping Xwork
          safe.
        </p>
        <a
          href="/profile"
          className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
        >
          View your profile
        </a>
      </div>
    );
  }

  const Stepper = (
    <div className="flex items-center gap-2 mb-6 text-xs">
      {["Front of ID", "Back of ID", "Your name", "Selfie"].map((label, i) => {
        const n = i + 1;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold ${
                step > n
                  ? "bg-primary text-white"
                  : step === n
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {step > n ? "✓" : n}
            </span>
            <span
              className={step >= n ? "text-foreground" : "text-muted-foreground"}
            >
              {label}
            </span>
            {n < 4 && <span className="text-border">—</span>}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:p-8 max-w-2xl">
      {Stepper}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive p-3 text-sm">
          {error}
        </div>
      )}
      {busy && <p className="mb-4 text-sm text-muted-foreground">{busy}</p>}

      {/* Step 1 — front */}
      {step === 1 && (
        <div>
          <h3 className="text-lg font-bold text-foreground">Scan the front of your ID</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Upload a clear photo of the front of your government ID (passport,
            driver&apos;s license or national ID).
          </p>
          {front ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={front.preview} alt="front" className="w-full max-w-sm rounded-lg border border-border" />
          ) : (
            <button
              type="button"
              onClick={() => frontRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-8 text-center"
            >
              <p className="text-2xl">🪪</p>
              <p className="text-sm font-medium text-foreground mt-2">
                Upload front of ID
              </p>
            </button>
          )}
          <input
            ref={frontRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) =>
              e.target.files?.[0] &&
              uploadFile(e.target.files[0], setFront, "front of ID")
            }
          />
          <div className="flex justify-end mt-6">
            <button
              type="button"
              disabled={!front}
              onClick={() => setStep(2)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — back */}
      {step === 2 && (
        <div>
          <h3 className="text-lg font-bold text-foreground">Scan the back of your ID</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Now upload the back side of the same ID.
          </p>
          {back ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={back.preview} alt="back" className="w-full max-w-sm rounded-lg border border-border" />
          ) : (
            <button
              type="button"
              onClick={() => backRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border hover:border-primary/50 p-8 text-center"
            >
              <p className="text-2xl">🪪</p>
              <p className="text-sm font-medium text-foreground mt-2">
                Upload back of ID
              </p>
            </button>
          )}
          <input
            ref={backRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) =>
              e.target.files?.[0] &&
              uploadFile(e.target.files[0], setBack, "back of ID")
            }
          />
          <div className="flex justify-between mt-6">
            <button type="button" onClick={() => setStep(1)} className="px-4 py-2 text-foreground hover:bg-secondary rounded-full">
              Back
            </button>
            <button
              type="button"
              disabled={!back}
              onClick={() => setStep(3)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — name */}
      {step === 3 && (
        <div>
          <h3 className="text-lg font-bold text-foreground">Confirm your legal name</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Enter your name exactly as it appears on your ID. It must match your
            profile name.
          </p>
          <input
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Full name as on ID"
            className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-sm text-foreground mb-1">
                Document type
              </label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="national_id">National ID card</option>
                <option value="drivers_license">Driver&apos;s license</option>
                <option value="passport">Passport</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-foreground mb-1">
                Date of birth
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm text-foreground mb-1">
              ID document number
            </label>
            <input
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="Exactly as printed on your ID"
              className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Each person can verify only one Xwork account. This document can&apos;t
              be used to verify a second account.
            </p>
          </div>

          <div className="mt-3">
            <label className="block text-sm text-foreground mb-1">
              ID issuing country
            </label>
            <select
              value={idCountry}
              onChange={(e) => setIdCountry(e.target.value)}
              className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select the country that issued this ID</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              This must match the country on your profile.
            </p>
          </div>

          <div className="flex justify-between mt-6">
            <button type="button" onClick={() => setStep(2)} className="px-4 py-2 text-foreground hover:bg-secondary rounded-full">
              Back
            </button>
            <button
              type="button"
              disabled={
                legalName.trim().length < 3 ||
                !idNumber.trim() ||
                !dob ||
                !idCountry
              }
              onClick={() => setStep(4)}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — selfie */}
      {step === 4 && (
        <div>
          <h3 className="text-lg font-bold text-foreground">Take a live selfie</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            We match your selfie to your profile photo and ID photo to confirm
            it&apos;s really you.
          </p>

          {!selfie ? (
            <div>
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full max-w-sm rounded-lg border border-border bg-secondary aspect-[4/3] object-cover"
              />
              <div className="flex gap-3 mt-3">
                <button type="button" onClick={startCamera} className="border border-border rounded-full px-4 py-2 text-sm hover:bg-secondary">
                  Start camera
                </button>
                <button type="button" onClick={captureSelfie} className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90">
                  Capture selfie
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={selfie.preview} alt="selfie" className="w-full max-w-sm rounded-lg border border-border" />
              {faceScore !== null && (
                <p
                  className={`mt-3 text-sm font-medium ${
                    faceScore >= 60 ? "text-primary" : "text-destructive"
                  }`}
                >
                  Face match: {faceScore}%{" "}
                  {faceScore >= 60 ? "✓" : "— must be the same person"}
                </p>
              )}
              {faceScore === null && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Automatic face matching is unavailable right now — your
                  documents and name will be checked.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelfie(null);
                  setFaceScore(null);
                }}
                className="text-sm text-primary hover:underline mt-2"
              >
                Retake
              </button>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button type="button" onClick={() => { stopCamera(); setStep(3); }} className="px-4 py-2 text-foreground hover:bg-secondary rounded-full">
              Back
            </button>
            <button
              type="button"
              disabled={!selfie || pending || (faceScore !== null && faceScore < 60)}
              onClick={submit}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {pending ? "Verifying…" : "Submit & verify"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
