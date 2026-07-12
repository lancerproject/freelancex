"use client";

import { useState } from "react";
import { updateAccount } from "@/app/settings/actions";

export function AccountInfo({
  fullName,
  firstName,
  lastName,
  email,
  avatarUrl,
  role,
  plan,
}: {
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  role?: string;
  plan?: string;
}) {
  const [editing, setEditing] = useState(false);
  const isFreelancer = role === "freelancer";
  const planLabel = plan === "pro" ? "Pro" : "Basic";

  if (!editing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-foreground">Account</h3>
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit"
            className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition"
          >
            ✎
          </button>
        </div>
        <div className="flex items-center gap-5 mt-5">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="w-20 h-20 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
              {(fullName || email || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xl font-bold text-foreground">
              {fullName || "—"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{planLabel}</p>
            <p className="text-sm text-muted-foreground mt-3">Email</p>
            <p className="text-foreground">{email}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      action={updateAccount}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h3 className="text-lg font-semibold text-foreground mb-6">Account</h3>

      {isFreelancer && (
        <p className="text-sm text-muted-foreground mb-4">
          Please note: name changes on a freelancer account are reviewed to
          verify your identity before they go live.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-6">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="w-20 h-20 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shrink-0">
            {(firstName || email || "?").slice(0, 1).toUpperCase()}
          </div>
        )}

        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                First name
              </label>
              <input
                name="first_name"
                defaultValue={firstName}
                className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Last name
              </label>
              <input
                name="last_name"
                defaultValue={lastName}
                className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              defaultValue={email}
              className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Changing your email sends a verification link to the new address.
              Your email updates once you confirm it.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Profile photo
            </label>
            <input
              type="file"
              name="avatar_file"
              accept="image/*"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:text-primary-foreground file:px-4 file:py-2 file:font-medium file:cursor-pointer hover:file:opacity-90"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:opacity-90"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-foreground px-4 py-2.5 rounded-full font-medium hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
