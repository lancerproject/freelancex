"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadIdDoc } from "@/app/(dashboard)/profile/upload-actions";
import { verifyIdentity } from "@/app/settings/identity/actions";
import { COUNTRIES } from "@/lib/countries";

/* ------------------------------------------------------------------ */
/* face-api.js (loaded from CDN at runtime, ignored by the bundler)    */
/* Loaded lazily HERE only — never in the main bundle — so it never    */
/* slows the rest of the site.                                         */
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
  const [camOn, setCamOn] = useState(false);
  // camReady flips true only once the video actually has frames (videoWidth>0).
  // On iOS the stream can attach before it's playable, so we gate "Capture" on
  // this to avoid the "camera isn't ready yet" failure.
  const [camReady, setCamReady] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pending, start] = useTransition();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamOn(false);
    setCamReady(false);
  };

  // Rear ("environment") camera for ID cards; front ("user") for the selfie.
  const startCamera = async (facing: "user" | "environment") => {
    stopCamera();
    setError("");
    setCamReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        // Mark ready only when the stream truly has frames — Capture stays
        // disabled until then. Handles iOS, where play() can resolve early.
        v.onloadedmetadata = () => {
          v.play().catch(() => {});
          if (v.videoWidth > 0) setCamReady(true);
        };
        v.onplaying = () => {
          if (v.videoWidth > 0) setCamReady(true);
        };
        v.play().catch(() => {});
      }
      setCamOn(true);
    } catch {
      setError(
        "We couldn't open your camera. Allow camera access for this site, then tap “Start camera”. On iPhone: Settings → Safari → Camera → Allow. On Android: tap the lock icon in the address bar → Permissions → Camera."
      );
      setCamOn(false);
    }
  };

  const captureFrame = async (
    name: string
  ): Promise<{ file: File; preview: string } | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("The camera isn't ready yet — give it a second and try again.");
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob: Blob = await new Promise((res) =>
      canvas.toBlob((b) => res(b!), "image/jpeg", 0.92)
    );
    const file = new File([blob], name, { type: "image/jpeg" });
    return { file, preview: URL.createObjectURL(file) };
  };

  const uploadShot = async (
    file: File,
    preview: string,
    set: (s: Shot) => void,
    label: string
  ) => {
    setBusy(`Saving ${label}…`);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadIdDoc(fd);
    setBusy("");
    if (res.path) {
      // We store the private storage PATH (admins view via a signed URL). The
      // on-screen preview + face match use the local blob, so this is fine.
      set({ url: res.path, preview });
      return true;
    }
    setError(res.error || "Upload failed.");
    return false;
  };

  // ---- Native file capture (RELIABLE on every device) ----
  // Tapping a file input with capture="environment"/"user" opens the phone's
  // real camera app (or gallery), which always works — unlike getUserMedia,
  // which is unreliable in mobile browsers/in-app webviews. This is the primary
  // capture path; the live preview below is an optional fallback.
  const onPickIdFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    set: (s: Shot) => void,
    label: string
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    stopCamera();
    await uploadShot(file, URL.createObjectURL(file), set, label);
  };

  const onPickSelfieFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    stopCamera();
    const preview = URL.createObjectURL(file);
    const ok = await uploadShot(file, preview, setSelfie, "selfie");
    if (!ok) return;
    setBusy("Checking your photo…");
    const api = await loadFaceApi();
    if (!api) {
      setFaceScore(null);
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
    setFaceScore(scores.length ? Math.round(Math.min(...scores)) : 0);
    setBusy("");
  };

  // Capture an ID side from the (rear) camera.
  const captureId = async (set: (s: Shot) => void, label: string) => {
    const shot = await captureFrame(`${label}.jpg`);
    if (!shot) return;
    stopCamera();
    await uploadShot(shot.file, shot.preview, set, label);
  };

  const captureSelfie = async () => {
    const shot = await captureFrame("selfie.jpg");
    if (!shot) return;
    stopCamera();
    const ok = await uploadShot(shot.file, shot.preview, setSelfie, "selfie");
    if (!ok) return;

    // Face match: selfie ↔ profile photo ↔ ID front. Best-effort — if it can't
    // run, the score stays null and the submission goes to manual review.
    setBusy("Checking your photo…");
    const api = await loadFaceApi();
    if (!api) {
      setFaceScore(null);
      setBusy("");
      return;
    }
    const [selfieD, profD, idD] = await Promise.all([
      descriptor(api, shot.preview),
      profilePhoto ? descriptor(api, profilePhoto) : Promise.resolve(null),
      front ? descriptor(api, front.preview) : Promise.resolve(null),
    ]);
    const scores: number[] = [];
    if (profD) scores.push(matchPct(api, selfieD, profD));
    if (idD) scores.push(matchPct(api, selfieD, idD));
    setFaceScore(scores.length ? Math.round(Math.min(...scores)) : 0);
    setBusy("");
  };

  // Face-ID-style countdown then auto-capture the selfie.
  const startSelfieCountdown = () => {
    if (!camOn) return;
    let n = 3;
    setCountdown(3);
    const tick = () => {
      n -= 1;
      if (n <= 0) {
        setCountdown(0);
        void captureSelfie();
      } else {
        setCountdown(n);
        setTimeout(tick, 1000);
      }
    };
    setTimeout(tick, 1000);
  };

  const submit = () => {
    setError("");
    if (!front || !back || !selfie) {
      setError("Please complete all three scans first.");
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
    // Whether it auto-verified or went to manual review, we thank the user the
    // same way — a low/failed face match is NEVER surfaced to them.
    return inReview ? (
      <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-lg">
        <div className="text-5xl mb-3">⏳</div>
        <h3 className="text-xl font-bold text-foreground">
          Verification submitted
        </h3>
        <p className="text-muted-foreground mt-2">
          Thank you! Your identity verification has been submitted successfully.
          Our trust &amp; safety team will review it manually — this usually
          takes up to 24 hours. We&apos;ll notify you once it&apos;s complete.
        </p>
        <a
          href="/dashboard"
          className="inline-block mt-5 bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
        >
          Go to dashboard
        </a>
      </div>
    ) : (
      <div className="rounded-2xl border border-border bg-card p-8 text-center max-w-lg">
        <div className="text-5xl mb-3">✅</div>
        <h3 className="text-xl font-bold text-foreground">Identity verified</h3>
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
    <div className="flex items-center gap-2 mb-6 text-xs flex-wrap">
      {["Front of ID", "Back of ID", "Your details", "Selfie"].map((label, i) => {
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

  // Reusable rear-camera capture UI for an ID side.
  const IdCapture = ({
    shot,
    set,
    label,
    heading,
    hint,
  }: {
    shot: Shot;
    set: (s: Shot) => void;
    label: string;
    heading: string;
    hint: string;
  }) => (
    <div>
      <h3 className="text-lg font-bold text-foreground">{heading}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{hint}</p>

      {shot ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={shot.preview}
            alt={label}
            className="w-full max-w-sm rounded-lg border border-border"
          />
          <button
            type="button"
            onClick={() => set(null)}
            className="text-sm text-primary hover:underline mt-2"
          >
            Retake
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Primary: native camera / photo picker — works on every device */}
          <label className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-semibold hover:opacity-90 cursor-pointer">
            📷 Take photo of your ID
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPickIdFile(e, set, label)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Opens your camera — or pick a clear photo from your gallery.
          </p>

          {/* Fallback: in-browser live camera preview */}
          <details className="mt-1">
            <summary className="text-sm text-primary cursor-pointer hover:underline">
              Or use the live camera
            </summary>
            <div className="mt-3">
              <div className="relative w-full max-w-sm">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-lg border border-border bg-black aspect-[4/3] object-cover"
                />
                <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/80" />
              </div>
              <div className="flex gap-3 mt-3">
                {!camOn ? (
                  <button
                    type="button"
                    onClick={() => startCamera("environment")}
                    className="border border-border rounded-full px-4 py-2 text-sm hover:bg-secondary"
                  >
                    Start camera
                  </button>
                ) : !camReady ? (
                  <button
                    type="button"
                    disabled
                    className="border border-border rounded-full px-4 py-2 text-sm opacity-60"
                  >
                    Starting camera…
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => captureId(set, label)}
                    className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90"
                  >
                    Capture
                  </button>
                )}
              </div>
            </div>
          </details>
        </div>
      )}
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

      {/* Step 1 — front of ID (rear camera) */}
      {step === 1 && (
        <div>
          <IdCapture
            shot={front}
            set={setFront}
            label="front of ID"
            heading="Scan the front of your ID"
            hint="Hold your government ID (passport, driver's license or national ID) inside the frame and tap Capture. Keep it flat and readable."
          />
          <div className="flex justify-end mt-6">
            <button
              type="button"
              disabled={!front}
              onClick={() => {
                stopCamera();
                setStep(2);
              }}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — back of ID (rear camera) */}
      {step === 2 && (
        <div>
          <IdCapture
            shot={back}
            set={setBack}
            label="back of ID"
            heading="Scan the back of your ID"
            hint="Now flip your ID over and show the back inside the frame."
          />
          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setStep(1);
              }}
              className="px-4 py-2 text-foreground hover:bg-secondary rounded-full"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!back}
              onClick={() => {
                stopCamera();
                setStep(3);
              }}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — details */}
      {step === 3 && (
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Confirm your details
          </h3>
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
              Each person can verify only one Xwork account.
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
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-foreground hover:bg-secondary rounded-full"
            >
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

      {/* Step 4 — automatic selfie (front camera) */}
      {step === 4 && (
        <div>
          <h3 className="text-lg font-bold text-foreground">Take a live selfie</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Look straight at the camera and hold still — we&apos;ll take your
            photo automatically.
          </p>

          {!selfie ? (
            <div className="space-y-3">
              {/* Primary: native front-camera selfie — reliable everywhere */}
              <label className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-5 py-2.5 text-sm font-semibold hover:opacity-90 cursor-pointer">
                🤳 Take a selfie
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={onPickSelfieFile}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Opens your front camera. Make sure your face is clear and
                well-lit.
              </p>

              {/* Fallback: in-browser live selfie */}
              <details className="mt-1">
                <summary className="text-sm text-primary cursor-pointer hover:underline">
                  Or use the live camera
                </summary>
                <div className="mt-3">
                  <div className="relative w-full max-w-xs mx-auto">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full rounded-full border border-border bg-black aspect-square object-cover"
                    />
                    <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-white/80" />
                    {countdown > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl font-bold text-white drop-shadow-lg">
                          {countdown}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-4 justify-center">
                    {!camOn ? (
                      <button
                        type="button"
                        onClick={() => startCamera("user")}
                        className="border border-border rounded-full px-4 py-2 text-sm hover:bg-secondary"
                      >
                        Start camera
                      </button>
                    ) : !camReady ? (
                      <button
                        type="button"
                        disabled
                        className="border border-border rounded-full px-4 py-2 text-sm opacity-60"
                      >
                        Starting camera…
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={countdown > 0}
                          onClick={startSelfieCountdown}
                          className="bg-primary text-primary-foreground rounded-full px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                        >
                          {countdown > 0 ? `Capturing in ${countdown}…` : "Start"}
                        </button>
                        <button
                          type="button"
                          onClick={captureSelfie}
                          className="border border-border rounded-full px-4 py-2 text-sm hover:bg-secondary"
                        >
                          Capture now
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </details>
            </div>
          ) : (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selfie.preview}
                alt="selfie"
                className="w-40 h-40 mx-auto rounded-full object-cover border border-border"
              />
              <button
                type="button"
                onClick={() => {
                  setSelfie(null);
                  setFaceScore(null);
                }}
                className="block mx-auto text-sm text-primary hover:underline mt-3"
              >
                Retake
              </button>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                setStep(3);
              }}
              className="px-4 py-2 text-foreground hover:bg-secondary rounded-full"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!selfie || pending || !!busy}
              onClick={submit}
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {pending ? "Submitting…" : "Submit verification"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
