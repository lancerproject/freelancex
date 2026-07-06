"use client";

import { useRef, useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { TIMEZONES, timezoneLabel } from "@/lib/timezones";
import { updateLocation } from "@/app/settings/contact/actions";
import { usePasswordGate } from "@/components/password-confirm-modal";
import { PhoneVerify } from "@/components/phone-verify";

export function ContactLocationCard({
  timezone,
  country,
  address1,
  address2,
  city,
  state,
  postalCode,
  phone,
  phoneVerified,
}: {
  timezone: string;
  country: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  phoneVerified: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { require, modal } = usePasswordGate();
  const formRef = useRef<HTMLFormElement>(null);
  const verifiedRef = useRef(false);

  // Confirm the password before the form submits (see contact-account-card).
  const guard = async (e: React.FormEvent<HTMLFormElement>) => {
    if (verifiedRef.current) {
      verifiedRef.current = false;
      return;
    }
    e.preventDefault();
    if (!formRef.current?.reportValidity()) return;
    if (await require()) {
      verifiedRef.current = true;
      formRef.current.requestSubmit();
    }
  };

  const inputCls =
    "w-full bg-background border border-border text-foreground rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "block text-sm font-medium text-foreground mb-1";

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="mt-5 first:mt-0">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <p className="text-foreground mt-0.5 whitespace-pre-line">
        {value || "Not set"}
      </p>
    </div>
  );

  const fullAddress = [
    address1,
    address2,
    [city, state].filter(Boolean).join(", "),
    postalCode,
    country,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-bold text-foreground">Location</h3>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit location"
            className="shrink-0 w-9 h-9 rounded-full border border-primary text-primary hover:bg-primary/10 flex items-center justify-center"
          >
            ✎
          </button>
        )}
      </div>

      {editing ? (
        <form
          ref={formRef}
          action={updateLocation}
          onSubmit={guard}
          className="mt-6 space-y-6"
        >
          {/* Time Zone | Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Time Zone</label>
              <select name="timezone" defaultValue={timezone} className={inputCls}>
                <option value="">Time Zone</option>
                {TIMEZONES.map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <select name="country" defaultValue={country} className={inputCls}>
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            We take your privacy seriously. Only your city and country are ever
            shared with clients.
          </p>

          {/* Address | Address 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Address</label>
              <input name="address1" defaultValue={address1} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Address 2 (Apartment, suite, etc)</label>
              <input
                name="address2"
                defaultValue={address2}
                placeholder="Apt/Suite"
                className={inputCls}
              />
            </div>
          </div>

          {/* City | State/Province */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>City</label>
              <input name="city" defaultValue={city} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>State/Province</label>
              <input name="state" defaultValue={state} className={inputCls} />
            </div>
          </div>

          {/* ZIP/Postal code */}
          <div className="sm:w-1/2 sm:pr-3">
            <label className={labelCls}>ZIP/Postal code</label>
            <input
              name="postal_code"
              defaultValue={postalCode}
              className={inputCls}
            />
          </div>

          {/* Phone */}
          <div>
            <label className={labelCls}>Phone</label>
            <input
              name="phone"
              defaultValue={phone}
              placeholder="+92 3119812926"
              className={inputCls}
            />
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
          <Field label="Time Zone" value={timezoneLabel(timezone)} />
          <Field label="Address" value={fullAddress} />
          <div className="mt-5">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              Phone
              <PhoneVerify phone={phone} verified={phoneVerified} />
            </p>
            <p className="text-foreground mt-0.5">{phone || "Not set"}</p>
          </div>
        </>
      )}
      {modal}
    </div>
  );
}
