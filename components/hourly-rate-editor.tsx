"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/app/(dashboard)/profile/edit-actions";

// Xwork freelancer service fee = 10% (no hidden charges).
const FEE_RATE = 0.1;

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function HourlyRateEditor({
  rate,
}: {
  rate: number | string | null;
}) {
  const initial = rate != null && rate !== "" ? String(rate) : "";
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  const num = Number(value) || 0;
  const fee = num * FEE_RATE;
  const receive = num - fee;

  const save = () => {
    const fd = new FormData();
    fd.set("hourly_rate", value);
    start(async () => {
      await updateProfile(fd);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setValue(initial);
          setOpen(true);
        }}
        aria-label="Edit hourly rate"
        title="Edit hourly rate"
        className="w-9 h-9 shrink-0 rounded-full border border-purple-200 bg-purple-50 text-purple-600 flex items-center justify-center hover:bg-purple-100 transition"
      >
        ✎
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border max-w-xl w-full p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                Change hourly rate
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <p className="text-muted-foreground mt-3">
              Please note that your new hourly rate will only apply to new
              contracts.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Your profile rate:{" "}
              <span className="text-foreground font-semibold">
                {initial ? `${money(Number(initial))}/hr` : "Not set"}
              </span>
            </p>

            <div className="mt-6 divide-y divide-border">
              {/* Hourly rate */}
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold text-foreground">Hourly Rate *</p>
                  <p className="text-sm text-muted-foreground">
                    Total amount the client will see
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center rounded-lg border border-border bg-background px-3 py-2 w-32">
                    <span className="text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full bg-transparent text-right text-foreground outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <span className="text-muted-foreground text-sm w-8">/hr</span>
                </div>
              </div>

              {/* Service fee */}
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold text-foreground">
                    Xwork Service Fee
                  </p>
                  <p className="text-sm text-muted-foreground">
                    A flat 10% fee — no hidden charges
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="rounded-lg border border-border bg-secondary px-3 py-2 w-32 text-right text-muted-foreground">
                    -{money(fee)}
                  </div>
                  <span className="text-muted-foreground text-sm w-8">/hr</span>
                </div>
              </div>

              {/* You'll receive */}
              <div className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-semibold text-foreground">
                    You&apos;ll Receive
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The estimated amount you&apos;ll receive after service fees
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="rounded-lg border border-border bg-background px-3 py-2 w-32 text-right text-foreground font-medium">
                    {money(receive)}
                  </div>
                  <span className="text-muted-foreground text-sm w-8">/hr</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 mt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-foreground hover:bg-secondary rounded-full font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="bg-primary text-primary-foreground px-7 py-2.5 rounded-full font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
