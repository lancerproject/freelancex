"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { updateCompanyDetails } from "@/app/settings/actions";

// Company details card for the client "My info" page — matches Upwork's
// middle card (company logo + company name, with an edit pencil).
export function CompanyDetails({
  companyName,
  companyLogo,
}: {
  companyName: string;
  companyLogo: string;
}) {
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState<string>(companyLogo || "");
  const fileRef = useRef<HTMLInputElement>(null);

  const Logo = ({ size = 64 }: { size?: number }) =>
    preview ? (
      <Image
        src={preview}
        alt="Company logo"
        width={size}
        height={size}
        className="rounded-full object-cover bg-secondary"
        style={{ width: size, height: size }}
        unoptimized
      />
    ) : (
      <div
        className="rounded-full bg-secondary flex items-center justify-center text-muted-foreground"
        style={{ width: size, height: size }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 21h18M6 21V7l6-4 6 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
        </svg>
      </div>
    );

  if (!editing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold text-foreground">Company details</h3>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit company details"
            className="shrink-0 w-9 h-9 rounded-full border border-primary text-primary hover:bg-primary/10 flex items-center justify-center"
          >
            ✎
          </button>
        </div>
        <div className="flex items-center gap-5 mt-6">
          <Logo />
          <p className="text-foreground font-medium">
            {companyName || "Add your company name"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form
      action={updateCompanyDetails}
      className="rounded-2xl border border-border bg-card p-6 lg:p-8"
    >
      <h3 className="text-xl font-bold text-foreground mb-6">Company details</h3>
      <div className="flex items-center gap-5">
        <Logo />
        <div>
          <input
            ref={fileRef}
            type="file"
            name="company_logo_file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setPreview(URL.createObjectURL(f));
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border border-border text-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Upload logo
          </button>
        </div>
      </div>

      <div className="mt-6 max-w-md">
        <label className="block text-sm font-medium text-foreground mb-1">
          Company name
        </label>
        <input
          name="company_name"
          defaultValue={companyName}
          placeholder="Your company name"
          className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold hover:opacity-90"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => {
            setPreview(companyLogo || "");
            setEditing(false);
          }}
          className="text-sm font-medium text-foreground hover:text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
