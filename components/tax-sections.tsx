"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES } from "@/lib/countries";
import {
  saveTaxResidence,
  saveTaxIdentification,
  saveTaxTin,
} from "@/app/settings/tax/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tax = Record<string, any>;
type Profile = {
  country?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  full_name?: string;
};

const FED_CLASSES = [
  { value: "individual", label: "Individual" },
  { value: "corporation", label: "Corporation" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other entity type" },
];
const fedLabel = (v?: string) =>
  FED_CLASSES.find((c) => c.value === v)?.label || "—";

function maskTin(v?: string) {
  if (!v) return "—";
  const s = String(v).replace(/\s+/g, "");
  return s.length <= 3 ? "***" : `********${s.slice(-3)}`;
}
function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString();
}
const todayISO = () => new Date().toISOString().slice(0, 10);

const input =
  "w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring";
const labelCls = "block text-sm font-semibold text-foreground mb-1";
const card = "rounded-2xl border border-border bg-card p-6 lg:p-8";

function Badge({ done }: { done: boolean }) {
  return done ? (
    <span className="text-xs font-medium text-primary border border-primary/40 rounded-full px-2.5 py-0.5">
      Completed
    </span>
  ) : (
    <span className="text-xs font-medium text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
      Not started
    </span>
  );
}
function Pencil({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Edit"
      onClick={onClick}
      className="shrink-0 w-9 h-9 rounded-full border border-primary text-primary hover:bg-primary/10 flex items-center justify-center"
    >
      ✎
    </button>
  );
}
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground mt-0.5 whitespace-pre-line">
        {value || "—"}
      </p>
    </div>
  );
}

type Section = "residence" | "identification" | "tin" | null;

export function TaxSections({
  initial,
  profile,
}: {
  initial: Tax;
  profile: Profile;
}) {
  const router = useRouter();
  // Keep a local copy so a saved section shows its new values immediately,
  // without waiting on a server round-trip / refresh.
  const [data, setData] = useState<Tax>(initial || {});
  const [saved, setSaved] = useState(false);
  const t = data;

  const residenceDone = !!(t.res_country && t.res_address1 && t.res_city);
  const idDone = !!(
    t.legal_name &&
    t.fed_tax_classification &&
    (t.us_person || t.country_citizenship)
  );
  const tinDone = !!(t.tin && t.certified && t.signature);

  const firstIncomplete: Section = !residenceDone
    ? "residence"
    : !idDone
    ? "identification"
    : !tinDone
    ? "tin"
    : null;

  const [editing, setEditing] = useState<Section>(firstIncomplete);

  const onSaved = (patch: Tax) => {
    setData((d) => ({ ...d, ...patch }));
    setEditing(null);
    setSaved(true);
    router.refresh();
  };
  const onCancel = () => setEditing(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Tax information</h2>
        <p className="text-muted-foreground text-sm mt-2 max-w-2xl">
          This information is required for tax reporting — it confirms whether
          you&apos;re a U.S. or non-U.S. taxpayer and appears on your invoices.
          Add your tax information to keep your account in good standing and
          avoid payment delays.
        </p>
      </div>

      {saved && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 text-primary px-4 py-2.5 text-sm">
          ✓ Your tax information was saved.
        </div>
      )}

      {/* ---------------- Tax residence ---------------- */}
      <section className={card}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-foreground">Tax residence</h3>
            <Badge done={residenceDone} />
          </div>
          {editing !== "residence" && (
            <Pencil onClick={() => setEditing("residence")} />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Your tax residence is part of the W-9 / W-8 form process. This address
          appears on your invoices.
        </p>

        {editing === "residence" ? (
          <ResidenceEdit
            key="res"
            t={t}
            profile={profile}
            onSaved={onSaved}
            onCancel={onCancel}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-5 mt-5">
            <Field label="Country" value={t.res_country} />
            <Field label="City" value={t.res_city} />
            <Field label="Postal code" value={t.res_postal} />
            <div className="sm:col-span-3">
              <Field
                label="Address"
                value={[t.res_address1, t.res_address2].filter(Boolean).join("\n")}
              />
            </div>
          </div>
        )}
      </section>

      {/* ---------------- Taxpayer identification ---------------- */}
      <section className={card}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-foreground">
              Taxpayer identification
            </h3>
            <Badge done={idDone} />
          </div>
          {editing !== "identification" && (
            <Pencil onClick={() => setEditing("identification")} />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Your taxpayer identification is included as a W-9 or W-8 series
          substitute form.
        </p>

        {editing === "identification" ? (
          <IdentificationEdit
            key="id"
            t={t}
            profile={profile}
            onSaved={onSaved}
            onCancel={onCancel}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-5">
            <Field label="Legal name of taxpayer" value={t.legal_name} />
            <Field
              label="Country of citizenship"
              value={t.us_person ? "United States" : t.country_citizenship}
            />
            <Field
              label="Federal tax classification"
              value={fedLabel(t.fed_tax_classification)}
            />
            <Field label="Date of birth" value={fmtDate(t.dob)} />
          </div>
        )}
      </section>

      {/* ---------------- Tax identification number ---------------- */}
      <section className={card}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-foreground">
              Tax identification number
            </h3>
            <Badge done={tinDone} />
          </div>
          {editing !== "tin" && <Pencil onClick={() => setEditing("tin")} />}
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Provide your tax identification number (TIN). If you don&apos;t have
          one, consult a local tax professional or your tax advisor.
        </p>

        {editing === "tin" ? (
          <TinEdit key="tin" t={t} onSaved={onSaved} onCancel={onCancel} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mt-5">
            <Field
              label="Tax identification number submitted"
              value={maskTin(t.tin)}
            />
            <Field label="Date" value={fmtDate(t.sign_date)} />
            <Field label="Signer of certificate" value={t.signature} />
          </div>
        )}
      </section>

      <p className="text-muted-foreground text-xs max-w-2xl">
        Your tax details are stored securely on your account. This collects the
        equivalent information of the IRS W-9 and W-8 forms; it isn&apos;t tax
        advice. For your situation, consult a qualified tax professional.
      </p>
    </div>
  );
}

/* ====================== Tax residence edit ====================== */
function ResidenceEdit({
  t,
  profile,
  onSaved,
  onCancel,
}: {
  t: Tax;
  profile: Profile;
  onSaved: (patch: Tax) => void;
  onCancel: () => void;
}) {
  const [country, setCountry] = useState(t.res_country || profile.country || "");
  const [a1, setA1] = useState(t.res_address1 || "");
  const [a2, setA2] = useState(t.res_address2 || "");
  const [city, setCity] = useState(t.res_city || "");
  const [postal, setPostal] = useState(t.res_postal || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const useProfile = () => {
    setCountry(profile.country || country);
    setA1(
      [profile.address1, profile.address2].filter(Boolean).join(" ") || a1
    );
    setCity(profile.city || city);
    setPostal(profile.postal_code || postal);
  };

  const save = async () => {
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("res_country", country);
    fd.set("res_address1", a1);
    fd.set("res_address2", a2);
    fd.set("res_city", city);
    fd.set("res_postal", postal);
    const res = await saveTaxResidence(fd);
    setBusy(false);
    if (res.ok)
      onSaved({
        res_country: country,
        res_address1: a1,
        res_address2: a2,
        res_city: city,
        res_postal: postal,
      });
    else setErr(res.error || "Couldn't save.");
  };

  return (
    <div className="mt-5 space-y-5">
      <button
        type="button"
        onClick={useProfile}
        className="text-sm text-primary hover:underline font-medium"
      >
        Use my profile address
      </button>

      <div>
        <label className={labelCls}>Country</label>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className={input}>
          <option value="">Select country</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Address line 1</label>
        <input value={a1} onChange={(e) => setA1(e.target.value)} className={input} />
      </div>
      <div>
        <label className={labelCls}>
          Address line 2 <span className="text-muted-foreground font-normal">— optional</span>
        </label>
        <input value={a2} onChange={(e) => setA2(e.target.value)} className={input} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={input} />
        </div>
        <div>
          <label className={labelCls}>Postal code</label>
          <input value={postal} onChange={(e) => setPostal(e.target.value)} className={input} />
        </div>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}
      <div className="flex justify-end items-center gap-4">
        <button type="button" onClick={onCancel} className="text-foreground font-medium hover:underline">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ================= Taxpayer identification edit ================= */
function IdentificationEdit({
  t,
  profile,
  onSaved,
  onCancel,
}: {
  t: Tax;
  profile: Profile;
  onSaved: (patch: Tax) => void;
  onCancel: () => void;
}) {
  const [usPerson, setUsPerson] = useState<"non" | "us">(t.us_person ? "us" : "non");
  const [legalName, setLegalName] = useState(t.legal_name || profile.full_name || "");
  const [fedClass, setFedClass] = useState(t.fed_tax_classification || "individual");
  const [dob, setDob] = useState(t.dob || "");
  const [citizenship, setCitizenship] = useState(
    t.country_citizenship || profile.country || ""
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("us_person", usPerson);
    fd.set("legal_name", legalName);
    fd.set("fed_tax_classification", fedClass);
    fd.set("dob", dob);
    fd.set("country_citizenship", citizenship);
    const res = await saveTaxIdentification(fd);
    setBusy(false);
    if (res.ok)
      onSaved({
        us_person: usPerson === "us",
        form_type: usPerson === "us" ? "w9" : "w8",
        legal_name: legalName,
        fed_tax_classification: fedClass,
        dob,
        country_citizenship: citizenship,
      });
    else setErr(res.error || "Couldn't save.");
  };

  return (
    <div className="mt-5 space-y-5">
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="usp"
            checked={usPerson === "non"}
            onChange={() => setUsPerson("non")}
            className="accent-primary"
          />
          <span className="text-foreground">I am a non-U.S. person</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="usp"
            checked={usPerson === "us"}
            onChange={() => setUsPerson("us")}
            className="accent-primary"
          />
          <span className="text-foreground">I am a U.S. person</span>
        </label>
      </div>
      <p className="text-sm text-muted-foreground">
        {usPerson === "us"
          ? "U.S. persons provide their W-9 information."
          : "Before withdrawing funds, all non-U.S. persons must provide their W-8BEN tax information."}
      </p>

      <div>
        <label className={labelCls}>Legal name of taxpayer</label>
        <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className={input} />
      </div>
      <div>
        <label className={labelCls}>Federal tax classification</label>
        <select value={fedClass} onChange={(e) => setFedClass(e.target.value)} className={input}>
          {FED_CLASSES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls}>Date of birth</label>
        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={input} />
      </div>
      {usPerson === "non" && (
        <div>
          <label className={labelCls}>Country of citizenship</label>
          <select value={citizenship} onChange={(e) => setCitizenship(e.target.value)} className={input}>
            <option value="">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {err && <p className="text-sm text-red-500">{err}</p>}
      <div className="flex justify-end items-center gap-4">
        <button type="button" onClick={onCancel} className="text-foreground font-medium hover:underline">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ============== Tax identification number + cert edit ============== */
function TinEdit({
  t,
  onSaved,
  onCancel,
}: {
  t: Tax;
  onSaved: (patch: Tax) => void;
  onCancel: () => void;
}) {
  const isUs = !!t.us_person;
  const isPakistan =
    (t.country_citizenship || t.res_country || "").toLowerCase() === "pakistan";
  const tinLabel = isUs
    ? "Social Security Number (SSN) or ITIN"
    : isPakistan
    ? "Computerized national identity card (CNIC)"
    : "Foreign tax identifying number";

  const [tin, setTin] = useState(t.tin || "");
  const [signature, setSignature] = useState(t.signature || "");
  const [certified, setCertified] = useState(!!t.certified);
  const [sourceSig, setSourceSig] = useState(t.source_signature || "");
  const [sourceCert, setSourceCert] = useState(!!t.source_certified);
  const today = t.sign_date || todayISO();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("tin", tin);
    fd.set("signature", signature);
    fd.set("sign_date", today);
    if (certified) fd.set("certified", "on");
    fd.set("source_signature", sourceSig);
    if (sourceCert) fd.set("source_certified", "on");
    const res = await saveTaxTin(fd);
    setBusy(false);
    if (res.ok)
      onSaved({
        tin,
        signature,
        sign_date: today,
        certified,
        source_signature: sourceSig,
        source_certified: sourceCert,
      });
    else setErr(res.error || "Couldn't save.");
  };

  return (
    <div className="mt-5 space-y-6">
      <div>
        <label className={labelCls}>{tinLabel}</label>
        <input value={tin} onChange={(e) => setTin(e.target.value)} className={input} />
        {isPakistan && (
          <p className="text-xs text-muted-foreground mt-1">
            Your CNIC has 13 digits and should look like this: 9999999999999.
          </p>
        )}
      </div>

      {/* W-8BEN / W-9 certification */}
      <div>
        <h4 className="font-bold text-foreground">
          {isUs ? "W-9 certification" : "W-8BEN certification"}
        </h4>
        <p className="text-sm text-muted-foreground mb-2">
          Please read the certification below before signing.
        </p>
        <div className="rounded-xl border border-border bg-background p-4 max-h-64 overflow-y-auto text-sm text-muted-foreground space-y-3">
          <p>
            Under penalties of perjury, I declare that I have examined the
            information on this form and, to the best of my knowledge and belief,
            it is true, correct, and complete. I further certify under penalties
            of perjury that:
          </p>
          {!isUs ? (
            <>
              <p>
                • I am the individual that is the beneficial owner (or am
                authorized to sign for the beneficial owner) of all the income to
                which this form relates, or am using this form to document myself
                for chapter 4 purposes;
              </p>
              <p>• The person named on line 1 of this form is not a U.S. person;</p>
              <p>
                • The income to which this form relates is (a) not effectively
                connected with the conduct of a trade or business in the United
                States, (b) effectively connected but not subject to tax under an
                applicable income tax treaty, or (c) the partner&apos;s share of a
                partnership&apos;s effectively connected income;
              </p>
              <p>
                • The person named on line 1 is a resident of the treaty country
                listed (if any) within the meaning of the income tax treaty
                between the United States and that country; and
              </p>
              <p>
                • For broker transactions or barter exchanges, the beneficial
                owner is an exempt foreign person.
              </p>
              <p>
                I authorize this form to be provided to any withholding agent that
                has control, receipt, or custody of the income of which I am the
                beneficial owner. I agree that I will submit a new form within 30
                days if any certification on this form becomes incorrect.
              </p>
            </>
          ) : (
            <>
              <p>
                • The number shown on this form is my correct taxpayer
                identification number; and
              </p>
              <p>
                • I am a U.S. citizen or other U.S. person; and I am not subject to
                backup withholding.
              </p>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 mt-4 items-start">
          <div>
            <label className={labelCls}>Signature (type your full legal name)</label>
            <input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Enter your full name"
              className={input}
            />
          </div>
          <div>
            <label className={labelCls}>Date</label>
            <input
              value={fmtDate(today)}
              disabled
              className={`${input} bg-secondary text-muted-foreground`}
            />
          </div>
        </div>
        <label className="flex items-start gap-2 mt-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={certified}
            onChange={(e) => setCertified(e.target.checked)}
            className="mt-1 accent-primary"
          />
          <span>
            I certify that I have the capacity to sign for the person identified
            on line 1 of this form, and I consent to provide an electronic
            signature by typing my name above.
          </span>
        </label>
      </div>

      {/* Statement of source / affidavit (non-U.S. only) */}
      {!isUs && (
        <div className="border-t border-border pt-5">
          <h4 className="font-bold text-foreground">Statement of source</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Only sign below if this statement is true; otherwise contact support.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            The services performed on this Xwork account have not been and will
            not be physically performed in the United States. I will provide
            written notice and update my tax information before performing any
            services in the United States.
          </p>
          <div className="mt-3 max-w-sm">
            <label className={labelCls}>Signature (type your full legal name)</label>
            <input
              value={sourceSig}
              onChange={(e) => setSourceSig(e.target.value)}
              placeholder="Enter your full name"
              className={input}
            />
          </div>
          <label className="flex items-start gap-2 mt-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={sourceCert}
              onChange={(e) => setSourceCert(e.target.checked)}
              className="mt-1 accent-primary"
            />
            <span>I certify that the statement of source above is true.</span>
          </label>
        </div>
      )}

      {err && <p className="text-sm text-red-500">{err}</p>}
      <div className="flex justify-end items-center gap-4">
        <button type="button" onClick={onCancel} className="text-foreground font-medium hover:underline">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
