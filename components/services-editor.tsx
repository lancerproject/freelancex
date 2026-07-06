"use client";

import { useState } from "react";
import { saveServices } from "@/app/(dashboard)/services/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = Record<string, any>;

const input =
  "w-full bg-background border border-border text-foreground rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function ServicesEditor({ initial }: { initial: Service[] }) {
  const [rows, setRows] = useState<Service[]>(initial ?? []);

  const add = () =>
    setRows((r) => [
      ...r,
      { title: "", description: "", price: "", delivery_days: "" },
    ]);
  const remove = (i: number) => setRows((r) => r.filter((_, x) => x !== i));
  const set = (i: number, key: string, val: string) =>
    setRows((r) => r.map((row, x) => (x === i ? { ...row, [key]: val } : row)));

  return (
    <form action={saveServices} className="space-y-5">
      <input type="hidden" name="services" value={JSON.stringify(rows)} readOnly />

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          You haven&apos;t created any services yet. Add a packaged service that
          clients can buy directly.
        </div>
      )}

      <div className="space-y-4">
        {rows.map((row, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs text-destructive hover:underline"
              >
                Remove
              </button>
            </div>
            <input
              placeholder="Service title (e.g. I will build a responsive website)"
              value={row.title || ""}
              onChange={(e) => set(i, "title", e.target.value)}
              className={input}
            />
            <textarea
              placeholder="What's included in this service?"
              rows={3}
              value={row.description || ""}
              onChange={(e) => set(i, "description", e.target.value)}
              className={input}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Price ($) — fixed
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 150"
                  value={row.price || ""}
                  onChange={(e) => set(i, "price", e.target.value)}
                  className={input}
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  Delivery (days)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                  value={row.delivery_days || ""}
                  onChange={(e) => set(i, "delivery_days", e.target.value)}
                  className={input}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={add}
          className="border border-border text-foreground px-4 py-2 rounded-full text-sm hover:bg-secondary"
        >
          + Add a service
        </button>
        <button
          type="submit"
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full font-semibold hover:opacity-90"
        >
          Save services
        </button>
      </div>
    </form>
  );
}
