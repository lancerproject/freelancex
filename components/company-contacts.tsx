"use client";

import { useState } from "react";
import { updateCompanyContacts } from "@/app/settings/actions";
import { PhoneInput } from "@/components/phone-input";
import { SearchableSelect } from "@/components/searchable-select";
import { PHONE_COUNTRIES, flagOf } from "@/lib/phone-countries";
import { TIMEZONES, timezoneLabel } from "@/lib/timezones";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CompanyContacts({ owner, p }: { owner: string; p: any }) {
  const has =
    p?.phone || p?.vat_id || p?.time_zone || p?.country || p?.address || p?.city || p?.zip;
  const [editing, setEditing] = useState(!has);

  const countryOptions = PHONE_COUNTRIES.map((c) => ({
    value: c.name,
    label: `${flagOf(c.iso2)}  ${c.name}`,
  }));
  const tzOptions = TIMEZONES;

  if (!editing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Company contacts
          </h3>
          <button
            onClick={() => setEditing(true)}
            aria-label="Edit"
            className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition"
          >
            ✎
          </button>
        </div>
        <div className="space-y-4 mt-5 text-sm">
          <Read label="Owner" value={owner || "—"} />
          <Read label="Phone" value={p?.phone || "Not set"} />
          <Read
            label="VAT ID"
            value={p?.vat_id || "Enter your VAT ID to enable VAT invoicing"}
          />
          <Read label="Time Zone" value={timezoneLabel(p?.time_zone) || "Not set"} />
          <Read label="Country" value={p?.country || "Not set"} />
          <Read
            label="Address"
            value={
              [p?.address, p?.city, p?.zip, p?.country]
                .filter(Boolean)
                .join(", ") || "Not set"
            }
          />
        </div>
      </div>
    );
  }

  return (
    <form
      action={updateCompanyContacts}
      className="rounded-2xl border border-border bg-card p-6"
    >
      <h3 className="text-lg font-semibold text-foreground mb-6">
        Company contacts
      </h3>
      <div className="space-y-5 max-w-xl">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Owner</p>
          <p className="text-foreground">{owner || "—"}</p>
        </div>

        <Field label="Phone">
          <PhoneInput defaultValue={p?.phone} />
        </Field>

        <Field label="VAT ID">
          <input
            name="vat_id"
            defaultValue={p?.vat_id ?? ""}
            className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <Field label="Time Zone">
          <SearchableSelect
            name="time_zone"
            options={tzOptions}
            defaultValue={p?.time_zone ?? ""}
            placeholder="Select time zone"
          />
        </Field>

        <Field label="Country">
          <SearchableSelect
            name="country"
            options={countryOptions}
            defaultValue={p?.country ?? ""}
            placeholder="Select country"
          />
        </Field>

        <Field label="Address">
          <input
            name="address"
            defaultValue={p?.address ?? ""}
            className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="City">
            <input
              name="city"
              defaultValue={p?.city ?? ""}
              className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
          <Field label="Zip">
            <input
              name="zip"
              defaultValue={p?.zip ?? ""}
              className="w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-medium hover:opacity-90"
          >
            Save
          </button>
          {has && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-foreground px-4 py-2.5 rounded-full font-medium hover:bg-secondary"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

function Read({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
