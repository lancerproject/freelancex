"use client";

import { useState } from "react";
import { saveProfile } from "@/app/(dashboard)/profile/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function useRows(initial: Row[]) {
  const [rows, setRows] = useState<Row[]>(initial ?? []);
  const add = (blank: Row) => setRows((r) => [...r, blank]);
  const remove = (i: number) => setRows((r) => r.filter((_, x) => x !== i));
  const set = (i: number, key: string, val: string) =>
    setRows((r) => r.map((row, x) => (x === i ? { ...row, [key]: val } : row)));
  return { rows, add, remove, set };
}

const input =
  "w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function ProfileEditor({ profile }: { profile: Row }) {
  const portfolio = useRows(profile.portfolio ?? []);
  const certs = useRows(profile.certifications ?? []);
  const emp = useRows(profile.employment ?? []);
  const other = useRows(profile.other_experiences ?? []);

  return (
    <form action={saveProfile} className="space-y-6">
      {/* Basics */}
      <Section title="Basic information">
        <Field label="Profile photo">
          <div className="flex items-center gap-3">
            {profile.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border border-border" />
            )}
            <input name="avatar_file" type="file" accept="image/*" className="text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:text-primary-foreground file:px-4 file:py-2 file:font-medium" />
          </div>
        </Field>
        <Field label="Full name">
          <input name="full_name" defaultValue={profile.full_name ?? ""} className={input} />
        </Field>
        <Field label="Professional title">
          <input name="title" defaultValue={profile.title ?? ""} placeholder="e.g. Full-Stack Developer | React & Node" className={input} />
        </Field>
        <Field label="Overview">
          <textarea name="bio" rows={5} defaultValue={profile.bio ?? ""} placeholder="Describe your experience and what you offer clients." className={input} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Location"><input name="location" defaultValue={profile.location ?? ""} placeholder="City, Country" className={input} /></Field>
          <Field label="Website / portfolio link"><input name="website" defaultValue={profile.website ?? ""} placeholder="https://…" className={input} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Availability"><input name="availability_pref" defaultValue={profile.availability_pref ?? ""} placeholder="e.g. Open to offers" className={input} /></Field>
          <Field label="Avg. response time"><input name="avg_response" defaultValue={profile.avg_response ?? ""} placeholder="e.g. 1–2 hours" className={input} /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Hourly rate ($/hr)"><input name="hourly_rate" type="number" min="0" defaultValue={profile.hourly_rate ?? ""} placeholder="e.g. 35" className={input} /></Field>
        </div>
        <Field label="Skills (comma separated)"><input name="skills" defaultValue={profile.skills ?? ""} placeholder="React, Node.js, Figma" className={input} /></Field>
        <Field label="Working style (comma separated)"><input name="working_style" defaultValue={profile.working_style ?? ""} placeholder="Clear Communicator, Accountable for Outcomes" className={input} /></Field>
        <Field label="Languages (comma separated)"><input name="languages" defaultValue={profile.languages ?? ""} placeholder="English: Fluent, Urdu: Native" className={input} /></Field>
        <Field label="Education"><textarea name="education" rows={2} defaultValue={profile.education ?? ""} placeholder="Degree — University (years)" className={input} /></Field>
      </Section>

      {/* Portfolio */}
      <Repeatable
        title="Portfolio"
        rows={portfolio.rows}
        onAdd={() => portfolio.add({ title: "", description: "", link: "", image_url: "" })}
        onRemove={portfolio.remove}
        name="portfolio"
        render={(row, i) => (
          <>
            <input placeholder="Project title" value={row.title || ""} onChange={(e) => portfolio.set(i, "title", e.target.value)} className={input} />
            <input placeholder="Image URL (optional)" value={row.image_url || ""} onChange={(e) => portfolio.set(i, "image_url", e.target.value)} className={input} />
            <input placeholder="Link (optional)" value={row.link || ""} onChange={(e) => portfolio.set(i, "link", e.target.value)} className={input} />
            <textarea placeholder="Short description" rows={2} value={row.description || ""} onChange={(e) => portfolio.set(i, "description", e.target.value)} className={input} />
          </>
        )}
      />

      {/* Certifications */}
      <Repeatable
        title="Certifications"
        rows={certs.rows}
        onAdd={() => certs.add({ name: "", provider: "", issued: "", description: "" })}
        onRemove={certs.remove}
        name="certifications"
        render={(row, i) => (
          <>
            <input placeholder="Certification name" value={row.name || ""} onChange={(e) => certs.set(i, "name", e.target.value)} className={input} />
            <input placeholder="Provider" value={row.provider || ""} onChange={(e) => certs.set(i, "provider", e.target.value)} className={input} />
            <input placeholder="Issued (e.g. Jan 2024)" value={row.issued || ""} onChange={(e) => certs.set(i, "issued", e.target.value)} className={input} />
            <textarea placeholder="Description (optional)" rows={2} value={row.description || ""} onChange={(e) => certs.set(i, "description", e.target.value)} className={input} />
          </>
        )}
      />

      {/* Employment */}
      <Repeatable
        title="Employment history"
        rows={emp.rows}
        onAdd={() => emp.add({ title: "", period: "", description: "" })}
        onRemove={emp.remove}
        name="employment"
        render={(row, i) => (
          <>
            <input placeholder="Role | Company" value={row.title || ""} onChange={(e) => emp.set(i, "title", e.target.value)} className={input} />
            <input placeholder="Period (e.g. 2021 - Present)" value={row.period || ""} onChange={(e) => emp.set(i, "period", e.target.value)} className={input} />
            <textarea placeholder="What you did" rows={2} value={row.description || ""} onChange={(e) => emp.set(i, "description", e.target.value)} className={input} />
          </>
        )}
      />

      {/* Other experiences */}
      <Repeatable
        title="Other experiences"
        rows={other.rows}
        onAdd={() => other.add({ title: "", description: "" })}
        onRemove={other.remove}
        name="other_experiences"
        render={(row, i) => (
          <>
            <input placeholder="Title" value={row.title || ""} onChange={(e) => other.set(i, "title", e.target.value)} className={input} />
            <textarea placeholder="Description" rows={2} value={row.description || ""} onChange={(e) => other.set(i, "description", e.target.value)} className={input} />
          </>
        )}
      />

      <button type="submit" className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:opacity-90">
        Save profile
      </button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <h3 className="font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

function Repeatable({
  title,
  rows,
  onAdd,
  onRemove,
  name,
  render,
}: {
  title: string;
  rows: Row[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  name: string;
  render: (row: Row, i: number) => React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="text-sm text-primary hover:underline"
        >
          + Add
        </button>
      </div>
      {/* serialize current rows so the server action receives them */}
      <input type="hidden" name={name} value={JSON.stringify(rows)} readOnly />
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing added yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-2">
              <div className="flex justify-end">
                <button type="button" onClick={() => onRemove(i)} className="text-xs text-destructive hover:underline">
                  Remove
                </button>
              </div>
              {render(row, i)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
