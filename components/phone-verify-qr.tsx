import QRCode from "qrcode";

// Desktop → phone hand-off for identity verification. A phone's rear camera
// captures ID cards far better than a laptop webcam (which is why Stripe /
// Persona do the same), so we show a QR that opens this verification page on
// the user's phone. They sign in and capture their ID + selfie there. The QR
// is generated inside our own app — the link never touches a third-party QR
// service.
export async function PhoneVerifyQR() {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://thexwork.com";
  const url = `${base}/settings/identity?src=phone`;

  let dataUrl = "";
  try {
    dataUrl = await QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
    });
  } catch {
    dataUrl = "";
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="shrink-0 rounded-xl border border-border bg-white p-3">
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={dataUrl}
              alt="Scan to verify on your phone"
              width={180}
              height={180}
            />
          ) : (
            <div className="w-[180px] h-[180px] flex items-center justify-center text-xs text-muted-foreground text-center">
              QR unavailable — use the camera below
            </div>
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">
            📱 Verify with your phone (recommended)
          </h3>
          <p className="text-muted-foreground mt-2 max-w-md text-sm">
            Your phone&apos;s camera scans ID cards much better than a laptop
            webcam. Scan this code, sign in to your Xwork account on your phone,
            and capture your ID and selfie there.
          </p>
          <ol className="mt-3 text-sm text-muted-foreground list-decimal list-inside space-y-1">
            <li>Open your phone camera and point it at the code</li>
            <li>Tap the link and sign in to Xwork</li>
            <li>Scan your ID (front &amp; back), then take a selfie</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-3">
            When you finish on your phone, refresh this page to see your verified
            badge — or use your computer&apos;s camera below.
          </p>
        </div>
      </div>
    </div>
  );
}
