"use client";

import Link from "next/link";
import { useState } from "react";
import { updateAccount } from "@/app/settings/contact/actions";

function maskEmail(email: string): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const end = local.length > 2 ? local.slice(-2) : "";
  return `${local[0] ?? ""}******${end}@${domain}`;
}

export function ContactAccountCard({
  userId,
  fullName,
  email,
}: {
  userId: string;
  fullName: string;
  email: string;
}) {
  const [editing, setEditing] = useState(false);

  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ");

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="mt-5 first:mt-0">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-foreground mt-0.5">{value || "Not set"}</p>
    </div>
  );

  const inputCls =
    "w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-bold text-foreground">Account</h3>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit account"
            className="shrink-0 w-9 h-9 rounded-full border border-primary text-primary hover:bg-primary/10 flex items-center justify-center"
          >
            ✎
          </button>
        )}
      </div>

      {editing ? (
        <form action={updateAccount} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>First name</label>
              <input name="first_name" defaultValue={firstName} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Last name</label>
              <input name="last_name" defaultValue={lastName} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              name="email"
              type="email"
              defaultValue={email}
              className={inputCls}
            />
            <p className="text-xs text-muted-foreground mt-1">
              If you change your email, we&apos;ll send a verification link to the
              new address. Confirm it, then sign in with your new email and the
              same password.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90"
            >
              Update
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm font-medium text-foreground hover:text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <Field label="User ID" value={userId} />
          <Field label="Name" value={fullName} />
          <Field label="Email" value={maskEmail(email)} />
          <div className="mt-6">
            <Link
              href="/settings/close-account"
              className="text-primary hover:underline text-sm font-medium"
            >
              Close my account
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
