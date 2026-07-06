"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CategoryEditor } from "@/components/category-editor";
import { usePasswordGate } from "@/components/password-confirm-modal";
import {
  setVisibility,
  setProjectPreference,
  setHideEarnings,
  setExperienceLevel,
  saveCustomUrl,
  checkSlug,
} from "@/app/settings/profile/actions";

const EXPERIENCE = [
  { value: "entry", title: "Entry level", desc: "I am relatively new to this field" },
  {
    value: "intermediate",
    title: "Intermediate",
    desc: "I have substantial experience in this field",
  },
  {
    value: "expert",
    title: "Expert",
    desc: "I have comprehensive and deep expertise in this field",
  },
];

const card = "rounded-2xl border border-border bg-card p-6 lg:p-8";
const label = "block text-sm font-semibold text-foreground mb-1";
const select =
  "w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring";
const pencil =
  "shrink-0 w-8 h-8 rounded-full border border-primary text-primary hover:bg-primary/10 flex items-center justify-center text-sm";

export function ProfileSettings({
  initial,
  isPro = false,
}: {
  initial: {
    visibility: string;
    username: string;
    projectPref: string;
    hideEarnings: boolean;
    experience: string;
    categories: string[];
  };
  isPro?: boolean;
}) {
  const [, start] = useTransition();
  const { require, modal } = usePasswordGate();

  const appOrigin =
    typeof window !== "undefined" ? window.location.origin : "";

  // My profile
  const [visibility, setVis] = useState(initial.visibility || "public");
  const [projectPref, setPref] = useState(initial.projectPref || "both");
  const [hide, setHide] = useState(initial.hideEarnings);
  const [username, setUser] = useState(initial.username || "");
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState(initial.username || "");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlAvail, setUrlAvail] = useState<"idle" | "checking" | "yes" | "no">(
    "idle"
  );
  const [copied, setCopied] = useState(false);

  // Experience
  const [experience, setExp] = useState(initial.experience || "");

  // Categories
  const [cats, setCats] = useState<string[]>(initial.categories || []);
  const [catModal, setCatModal] = useState(false);

  // Each control confirms the password before persisting. Local state is only
  // updated after the save succeeds, so controlled inputs snap back to their
  // previous value if the user cancels the password prompt.
  const changeVisibility = async (value: string) => {
    if (!(await require())) return;
    setVis(value);
    start(() => setVisibility(value));
  };

  const changeProjectPref = async (value: string) => {
    if (!(await require())) return;
    setPref(value);
    start(() => setProjectPreference(value));
  };

  const changeHide = async (value: boolean) => {
    if (!(await require())) return;
    setHide(value);
    start(() => setHideEarnings(value));
  };

  const changeExperience = async (value: string) => {
    if (value === experience) return;
    if (!(await require())) return;
    setExp(value);
    start(() => setExperienceLevel(value));
  };

  const checkAvailability = async () => {
    if (!urlDraft.trim()) {
      setUrlAvail("idle");
      return;
    }
    setUrlAvail("checking");
    const res = await checkSlug(urlDraft);
    if (res.error) {
      setUrlError(res.error);
      setUrlAvail("no");
    } else {
      setUrlError(null);
      setUrlAvail(res.available ? "yes" : "no");
      if (!res.available) setUrlError("This URL is already in use. Try another.");
    }
  };

  const saveUrl = async () => {
    setUrlError(null);
    if (!(await require())) return;
    start(async () => {
      const res = await saveCustomUrl(urlDraft);
      if (res.ok && res.slug) {
        setUser(res.slug);
        setEditingUrl(false);
        setUrlAvail("idle");
      } else {
        setUrlError(res.error || "Couldn't save.");
      }
    });
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(`${appOrigin}/freelancer/${username}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- My profile ---------------- */}
      <div className={card}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-xl font-bold text-foreground">My profile</h3>
          <Link
            href="/profile?view=public"
            className="text-sm text-primary hover:underline font-medium"
          >
            View my profile as others see it
          </Link>
        </div>

        {/* Visibility — confirms password on change */}
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-1">
            <label className={label + " mb-0"}>Visibility</label>
            {isPro && (
              <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                Always Active (Pro)
              </span>
            )}
          </div>
          <select
            value={visibility}
            onChange={(e) => changeVisibility(e.target.value)}
            className={select}
          >
            <option value="public">Public</option>
            <option value="users">Xwork users only</option>
            <option value="private">Private</option>
          </select>
          <p className="text-xs text-muted-foreground mt-2">
            {isPro
              ? "As a Pro member your profile stays public and visible to clients even during periods of inactivity."
              : "Pro members keep their profile visible even when inactive."}
          </p>
        </div>

        {/* Custom profile URL — Pro feature */}
        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Custom Profile URL
            </span>
            {isPro && !editingUrl && (
              <button
                type="button"
                aria-label="Edit profile URL"
                onClick={() => {
                  setUrlDraft(username);
                  setUrlError(null);
                  setUrlAvail("idle");
                  setEditingUrl(true);
                }}
                className={pencil}
              >
                ✎
              </button>
            )}
          </div>

          {!isPro ? (
            <div className="mt-2 rounded-xl border border-dashed border-border bg-secondary/40 p-4 flex items-start gap-3">
              <span aria-hidden className="text-lg">🔒</span>
              <p className="text-sm text-muted-foreground">
                Custom Profile URL is a Pro feature.{" "}
                <Link
                  href="/settings/membership"
                  className="text-primary hover:underline font-medium"
                >
                  Upgrade to unlock
                </Link>
                .
              </p>
            </div>
          ) : editingUrl ? (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">
                  xwork.com/freelancer/
                </span>
                <input
                  value={urlDraft}
                  onChange={(e) => {
                    setUrlDraft(e.target.value);
                    setUrlAvail("idle");
                    setUrlError(null);
                  }}
                  onBlur={checkAvailability}
                  placeholder="your-handle"
                  className="flex-1 bg-background border border-border text-foreground rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              {urlAvail === "checking" && (
                <p className="text-sm text-muted-foreground mt-1">Checking…</p>
              )}
              {urlAvail === "yes" && !urlError && (
                <p className="text-sm text-primary mt-1">✓ Available</p>
              )}
              {urlError && (
                <p className="text-sm text-red-500 mt-1">{urlError}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={saveUrl}
                  className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold hover:opacity-90"
                >
                  Save URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingUrl(false);
                    setUrlError(null);
                    setUrlAvail("idle");
                  }}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : username ? (
            <div className="mt-1 flex items-center gap-3 flex-wrap">
              <p className="text-foreground">
                Your profile URL:{" "}
                <span className="text-primary">
                  xwork.com/freelancer/{username}
                </span>
              </p>
              <button
                type="button"
                onClick={copyUrl}
                className="text-sm font-medium text-primary hover:underline"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm mt-1">
              No custom URL set yet. Click the pencil to choose one.
            </p>
          )}
        </div>

        {/* Project preference — confirms password on change */}
        <div className="mt-6">
          <label className={label}>
            Project preference{" "}
            <span
              title="Tell clients whether you prefer short-term, long-term, or both kinds of projects."
              className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] text-muted-foreground cursor-help"
            >
              ?
            </span>
          </label>
          <select
            value={projectPref}
            onChange={(e) => changeProjectPref(e.target.value)}
            className={select}
          >
            <option value="both">Both short-term and long-term projects</option>
            <option value="short_term">Short-term projects</option>
            <option value="long_term">Long-term projects</option>
          </select>
        </div>

        {/* Earnings privacy — Pro only (F5). Basic users don't see this. */}
        {isPro && (
          <div className="mt-6">
            <label className={label}>
              Private earnings{" "}
              <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                Pro
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-foreground mt-1">
              <input
                type="checkbox"
                checked={hide}
                onChange={(e) => changeHide(e.target.checked)}
                className="mt-1 accent-primary"
              />
              <span>Hide total earnings from my public profile</span>
            </label>
            <p className="text-xs text-muted-foreground mt-2">
              This hides your total earnings figure on your public profile. Your
              earnings are still visible when you submit proposals or accept
              invitations to interview.
            </p>
          </div>
        )}
      </div>

      {/* ---------------- Experience level ---------------- */}
      <div className={card}>
        <h3 className="text-xl font-bold text-foreground mb-5">
          Experience level
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {EXPERIENCE.map((e) => {
            const active = experience === e.value;
            return (
              <button
                key={e.value}
                type="button"
                onClick={() => changeExperience(e.value)}
                className={`relative text-left rounded-xl border p-5 transition ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span
                  className={`absolute top-4 right-4 w-4 h-4 rounded-full border ${
                    active ? "border-primary bg-primary" : "border-border"
                  }`}
                />
                <p className="font-semibold text-foreground pr-6">{e.title}</p>
                <p className="text-sm text-muted-foreground mt-2">{e.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- Categories ---------------- */}
      <div className={card}>
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold text-foreground">Categories</h3>
          <button
            type="button"
            aria-label="Edit categories"
            onClick={() => setCatModal(true)}
            className={pencil}
          >
            ✎
          </button>
        </div>

        {cats.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-4">
            {cats.map((c) => (
              <span
                key={c}
                className="bg-secondary text-foreground rounded-md px-3 py-1.5 text-sm"
              >
                {c}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm mt-3">
            No categories selected yet. Click the pencil to add the categories
            you work in.
          </p>
        )}
      </div>

      {/* Upwork-style category editor modal (same as the rest of Xwork).
          beforeSave confirms the password before the categories are persisted. */}
      {catModal && (
        <CategoryEditor
          initial={cats}
          beforeSave={() => require()}
          onSaved={setCats}
          onClose={() => setCatModal(false)}
        />
      )}

      {modal}
    </div>
  );
}
