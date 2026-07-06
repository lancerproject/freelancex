"use client";

import { useState, useTransition } from "react";
import { DatePicker } from "@/components/date-picker";
import { COUNTRIES } from "@/lib/countries";
import { CITY_LOCATIONS, cityLabel } from "@/lib/city-locations";
import { PHONE_COUNTRIES, flagOf, PhoneCountry } from "@/lib/phone-countries";
import { saveDetails, saveAvatar } from "@/app/create-profile/actions";
import { PhotoUploadModal } from "@/components/photo-upload-modal";

export function DetailsStep({
  defaultCountry,
  defaultPhotoUrl,
  defaultName,
  defaultDob,
  defaultStreet,
  defaultApt,
  defaultCity,
  defaultState,
  defaultZip,
  defaultPhone,
}: {
  defaultCountry: string;
  defaultPhotoUrl?: string;
  defaultName?: string;
  defaultDob?: string;
  defaultStreet?: string;
  defaultApt?: string;
  defaultCity?: string;
  defaultState?: string;
  defaultZip?: string;
  defaultPhone?: string;
}) {
  const [photo, setPhoto] = useState(defaultPhotoUrl || "");
  const [dob, setDob] = useState(defaultDob || "");
  const [country, setCountry] = useState(defaultCountry || "Pakistan");
  const [street, setStreet] = useState(defaultStreet || "");
  const [apt, setApt] = useState(defaultApt || "");
  const [city, setCity] = useState(defaultCity || "");
  const [citySelected, setCitySelected] = useState(!!defaultCity);
  const [cityOpen, setCityOpen] = useState(false);
  const [stateProv, setStateProv] = useState(defaultState || "");
  const [zip, setZip] = useState(defaultZip || "");

  const cityMatches = city.trim()
    ? CITY_LOCATIONS.filter((c) =>
        c.city.toLowerCase().includes(city.trim().toLowerCase())
      ).slice(0, 8)
    : [];

  const initialPhone =
    PHONE_COUNTRIES.find((c) =>
      (defaultPhone || "").replace(/\s/g, "").startsWith("+" + c.dial)
    ) ||
    PHONE_COUNTRIES.find((c) => c.name === (defaultCountry || "Pakistan")) ||
    PHONE_COUNTRIES.find((c) => c.iso2 === "PK") ||
    PHONE_COUNTRIES[0];
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>(initialPhone);
  const [phoneNumber, setPhoneNumber] = useState(
    (defaultPhone || "")
      .replace(/\s/g, "")
      .replace(new RegExp("^\\+" + initialPhone.dial), "")
  );
  const [phoneOpen, setPhoneOpen] = useState(false);

  const [showErrors, setShowErrors] = useState(false);
  const [photoModal, setPhotoModal] = useState(false);
  const [pending, startSave] = useTransition();

  const missing = {
    dob: !dob,
    street: !street.trim(),
    city: !city.trim() || !citySelected,
    phone: !phoneNumber.trim(),
  };
  const hasError = Object.values(missing).some(Boolean);

  const submit = () => {
    if (hasError) {
      setShowErrors(true);
      return;
    }
    const fd = new FormData();
    fd.set("avatar_url", photo);
    fd.set("dob", dob);
    fd.set("country", country);
    fd.set("street", street);
    fd.set("apt", apt);
    fd.set("city", city);
    fd.set("state", stateProv);
    fd.set("zip", zip);
    fd.set("phone", `${phoneCountry.dial ? "+" + phoneCountry.dial : ""} ${phoneNumber}`.trim());
    startSave(() => saveDetails(fd));
  };

  const inputClass =
    "w-full rounded-lg border border-neutral-300 px-4 py-3 outline-none focus:border-primary";
  const errClass = "border-red-400";

  return (
    <div>
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
        A few last details, then you can check and publish your profile.
      </h1>
      <p className="text-neutral-600 mt-3 max-w-3xl">
        A professional photo helps you build trust with clients. To keep things
        safe and simple, clients pay you through Xwork — which is why we need
        your personal information.
      </p>

      <div className="mt-8 flex flex-col md:flex-row gap-10">
        {/* Photo */}
        <div className="shrink-0 flex flex-col items-center">
          <div className="relative w-32 h-32">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <svg viewBox="0 0 128 128" className="w-32 h-32" aria-label="Avatar placeholder">
                <circle cx="64" cy="64" r="64" fill="#E5E7EB" />
                <circle cx="64" cy="52" r="20" fill="#9CA3AF" />
                <path d="M28 116c0-18 16-30 36-30s36 12 36 30H28Z" fill="#C4B5FD" />
              </svg>
            )}
            <button
              type="button"
              onClick={() => setPhotoModal(true)}
              className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center border-2 border-white"
              aria-label="Upload photo"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => setPhotoModal(true)}
            className="mt-4 inline-flex items-center gap-2 border border-primary text-primary rounded-full px-5 py-2 font-semibold hover:bg-primary/5"
          >
            <span className="text-lg leading-none">+</span> Upload photo
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 space-y-6 max-w-3xl">
          {/* DOB */}
          <div>
            <label className="block font-medium mb-1.5">Date of Birth *</label>
            <DatePicker value={dob} onChange={setDob} error={showErrors && missing.dob} />
            {showErrors && missing.dob && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                <span>⚠</span> This field is required.
              </p>
            )}
            <p className="text-xs text-neutral-500 mt-1.5">
              Your date of birth must match your ID exactly — it&apos;s checked
              during identity verification.
            </p>
          </div>

          {/* Country */}
          <div>
            <label className="block font-medium mb-1.5">Country *</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              {[...COUNTRIES].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Street + Apt */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4">
            <div>
              <label className="block font-medium mb-1.5">Street address *</label>
              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Enter street address"
                className={`${inputClass} ${showErrors && missing.street ? errClass : ""}`}
              />
            </div>
            <div>
              <label className="block font-medium mb-1.5">Apt/Suite</label>
              <input
                value={apt}
                onChange={(e) => setApt(e.target.value)}
                placeholder="Apt/Suite (Optional)"
                className={inputClass}
              />
            </div>
          </div>

          {/* City + State + Zip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <label className="block font-medium mb-1.5">City *</label>
              <div className="relative">
                <input
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setCitySelected(false);
                    setCityOpen(true);
                  }}
                  onFocus={() => setCityOpen(true)}
                  onBlur={() => setTimeout(() => setCityOpen(false), 150)}
                  placeholder="Enter city"
                  className={`${inputClass} ${
                    (showErrors && missing.city) ||
                    (city.trim() && !citySelected)
                      ? errClass
                      : ""
                  }`}
                />
                {city.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setCity("");
                      setCitySelected(false);
                      setStateProv("");
                    }}
                    aria-label="Clear city"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                  >
                    ⊗
                  </button>
                )}
                {cityOpen && cityMatches.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 z-40 w-full max-h-60 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg py-1">
                    {cityMatches.map((c, i) => (
                      <button
                        key={`${c.city}-${c.country}-${i}`}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setCity(c.city);
                          setStateProv(c.state);
                          setCitySelected(true);
                          setCityOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-neutral-800 hover:bg-neutral-100"
                      >
                        {cityLabel(c)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {city.trim() && !citySelected && (
                <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                  <span>⚠</span> Type slowly to select a city from one of the
                  options on the list.
                </p>
              )}
            </div>
            <div>
              <label className="block font-medium mb-1.5">State/Province</label>
              <input
                value={stateProv}
                onChange={(e) => setStateProv(e.target.value)}
                placeholder="Enter state/province"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block font-medium mb-1.5">ZIP/Postal code</label>
              <input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="Enter ZIP/Postal code"
                className={inputClass}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block font-medium mb-1.5">Phone *</label>
            <div
              className={`relative flex items-center rounded-lg border ${
                showErrors && missing.phone ? errClass : "border-neutral-300"
              } max-w-md focus-within:border-primary`}
            >
              <button
                type="button"
                onClick={() => setPhoneOpen((o) => !o)}
                className="flex items-center gap-1 pl-4 pr-3 py-3 border-r border-neutral-200"
              >
                <span className="text-lg leading-none">{flagOf(phoneCountry.iso2)}</span>
                <span className="text-neutral-500 text-sm">⌄</span>
              </button>
              <span className="px-3 text-neutral-700">+{phoneCountry.dial}</span>
              <input
                value={phoneNumber}
                inputMode="tel"
                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Enter number"
                className="flex-1 bg-transparent py-3 pr-4 outline-none"
              />
              {phoneOpen && (
                <div className="absolute left-0 top-full mt-2 z-40 w-72 max-h-64 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg py-1">
                  {PHONE_COUNTRIES.map((c) => (
                    <button
                      key={c.iso2 + c.dial}
                      type="button"
                      onClick={() => {
                        setPhoneCountry(c);
                        setPhoneOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-neutral-100"
                    >
                      <span className="text-lg leading-none">{flagOf(c.iso2)}</span>
                      <span className="flex-1 text-neutral-800">{c.name}</span>
                      <span className="text-neutral-500">+{c.dial}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {showErrors && missing.phone && (
              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                <span>⚠</span> This field is required.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* footer */}
      <div className="flex items-center justify-between mt-12">
        <a
          href="/create-profile/rate"
          className="px-6 py-2.5 rounded-full border border-neutral-300 font-medium hover:bg-neutral-100 transition"
        >
          Back
        </a>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {pending ? "Saving…" : "Review your profile"}
        </button>
      </div>

      <PhotoUploadModal
        open={photoModal}
        onClose={() => setPhotoModal(false)}
        onAttach={(url) => {
          setPhoto(url);
          startSave(() => saveAvatar(url)); // persist immediately
        }}
      />
    </div>
  );
}
