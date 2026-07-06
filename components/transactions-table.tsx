"use client";

import { useMemo, useState } from "react";

type Txn = {
  id: string;
  date: string;
  type: "earning" | "fee" | "withdrawal" | "refund";
  desc: string;
  amount: number;
};

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });
const fmtDate = (iso: string) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
const fmtShort = (d: Date) =>
  d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const typeLabel: Record<Txn["type"], string> = {
  earning: "Payment",
  fee: "Service fee",
  withdrawal: "Withdrawal",
  refund: "Refund",
};

const PRESETS: { key: string; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "this-week", label: "This week" },
  { key: "last-week", label: "Last week" },
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "this-year", label: "This year" },
  { key: "last-year", label: "Last year" },
];

// Resolve a preset (or custom) key to a [start, end] window relative to `now`.
function rangeFor(
  key: string,
  now: Date,
  customStart?: string,
  customEnd?: string
): { start: Date | null; end: Date | null } {
  const sod = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const eod = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  const weekStart = (d: Date) => {
    const x = sod(d);
    x.setDate(x.getDate() - x.getDay()); // Sunday
    return x;
  };
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (key) {
    case "this-week":
      return { start: weekStart(now), end: eod(now) };
    case "last-week": {
      const lwStart = weekStart(now);
      lwStart.setDate(lwStart.getDate() - 7);
      const lwEnd = weekStart(now);
      lwEnd.setDate(lwEnd.getDate() - 1);
      return { start: lwStart, end: eod(lwEnd) };
    }
    case "this-month":
      return { start: new Date(y, m, 1), end: eod(now) };
    case "last-month":
      return { start: new Date(y, m - 1, 1), end: eod(new Date(y, m, 0)) };
    case "this-year":
      return { start: new Date(y, 0, 1), end: eod(now) };
    case "last-year":
      return { start: new Date(y - 1, 0, 1), end: eod(new Date(y - 1, 11, 31)) };
    case "custom":
      return {
        start: customStart ? sod(new Date(customStart)) : null,
        end: customEnd ? eod(new Date(customEnd)) : null,
      };
    default:
      return { start: null, end: null };
  }
}

export function TransactionsTable({ txns }: { txns: Txn[] }) {
  const [range, setRange] = useState("all");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const filtered = useMemo(() => {
    const { start, end } = rangeFor(range, new Date(), customStart, customEnd);
    return txns
      .filter((t) => {
        if (type !== "all" && t.type !== type) return false;
        if (start || end) {
          if (!t.date) return false;
          const td = new Date(t.date).getTime();
          if (start && td < start.getTime()) return false;
          if (end && td > end.getTime()) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [txns, type, range, customStart, customEnd]);

  const earnings = filtered
    .filter((t) => t.type === "earning")
    .reduce((s, t) => s + t.amount, 0);
  const fees = filtered.filter((t) => t.type === "fee").reduce((s, t) => s + t.amount, 0);
  const refunds = filtered
    .filter((t) => t.type === "refund")
    .reduce((s, t) => s + t.amount, 0);
  const net = earnings + fees + refunds;

  // Label for the date-range button.
  const rangeLabel = (() => {
    if (range === "custom") {
      if (customStart && customEnd)
        return `${fmtShort(new Date(customStart))} - ${fmtShort(new Date(customEnd))}`;
      return "Custom date range";
    }
    return PRESETS.find((p) => p.key === range)?.label || "All time";
  })();

  // Download the currently-filtered transactions as a CSV.
  const downloadCsv = () => {
    const header = ["Date", "Type", "Description", "Amount (USD)"];
    const rows = filtered.map((t) => [
      fmtDate(t.date),
      typeLabel[t.type],
      t.desc,
      t.amount.toFixed(2),
    ]);
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [header, ...rows]
      .map((r) => r.map(esc).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "xwork-transactions.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const select =
    "bg-card border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const pill = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-sm border transition ${
      active
        ? "border-primary text-primary bg-primary/10"
        : "border-border text-foreground hover:bg-secondary"
    }`;

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Date range dropdown */}
        <div className="relative">
          <label className="block text-xs text-muted-foreground mb-1">
            Date range
          </label>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`${select} flex items-center justify-between gap-3 min-w-[220px]`}
          >
            <span>{rangeLabel}</span>
            <span aria-hidden>🗓</span>
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute z-50 mt-1 w-80 max-h-[60vh] overflow-y-auto rounded-xl border border-border bg-card shadow-lg py-2">
                {PRESETS.map((p) => {
                  const r = rangeFor(p.key, new Date());
                  const sub =
                    p.key === "all" || !r.start || !r.end
                      ? null
                      : `${fmtShort(r.start)} - ${fmtShort(r.end)}`;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => {
                        setRange(p.key);
                        setShowCustom(false);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 hover:bg-secondary ${
                        range === p.key ? "bg-secondary" : ""
                      }`}
                    >
                      <span className="block text-foreground">{p.label}</span>
                      {sub && (
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {sub}
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Custom date range */}
                <button
                  type="button"
                  onClick={() => setShowCustom((s) => !s)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-secondary ${
                    range === "custom" ? "bg-secondary" : ""
                  }`}
                >
                  <span className="block text-foreground">Custom date range</span>
                </button>

                {showCustom && (
                  <div className="px-4 py-3 border-t border-border space-y-2">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className={`${select} w-full`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className={`${select} w-full`}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!customStart || !customEnd}
                      onClick={() => {
                        setRange("custom");
                        setOpen(false);
                      }}
                      className="w-full bg-primary text-primary-foreground rounded-full py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Transaction type
          </label>
          <select value={type} onChange={(e) => setType(e.target.value)} className={select}>
            <option value="all">All types</option>
            <option value="earning">Earnings</option>
            <option value="fee">Service fees</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="refund">Refunds</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Client</label>
          <select disabled className={`${select} opacity-60`}>
            <option>All clients</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Contract</label>
          <select disabled className={`${select} opacity-60`}>
            <option>All contracts</option>
          </select>
        </div>
        <button
          type="button"
          onClick={downloadCsv}
          disabled={filtered.length === 0}
          title={
            filtered.length === 0
              ? "No transactions to download"
              : "Download these transactions as a CSV"
          }
          className={`${select} ml-auto ${
            filtered.length === 0
              ? "opacity-60 cursor-not-allowed"
              : "hover:bg-secondary"
          }`}
        >
          ↓ Download CSV
        </button>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap items-center gap-2 mt-4">
        <span className="text-sm text-muted-foreground mr-1">Quick filters:</span>
        <button onClick={() => setType("earning")} className={pill(type === "earning")}>
          Earnings
        </button>
        <button onClick={() => setType("withdrawal")} className={pill(type === "withdrawal")}>
          Withdrawals
        </button>
        <button onClick={() => setRange("this-month")} className={pill(range === "this-month")}>
          This month
        </button>
        <button onClick={() => setRange("this-year")} className={pill(range === "this-year")}>
          This year
        </button>
        {(type !== "all" || range !== "all") && (
          <button
            onClick={() => {
              setType("all");
              setRange("all");
              setShowCustom(false);
            }}
            className="text-sm text-primary hover:underline ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filtered totals */}
      <div className="rounded-2xl border border-border bg-card mt-6 px-6 py-4 flex flex-wrap items-center gap-x-10 gap-y-2 text-sm">
        <span className="font-semibold text-foreground">Filtered totals</span>
        <span className="text-muted-foreground">
          Earnings:{" "}
          <span className="text-foreground font-medium">{money(earnings)}</span>
        </span>
        <span className="text-muted-foreground">
          Service fees:{" "}
          <span className="text-foreground font-medium">{money(fees)}</span>
        </span>
        {refunds !== 0 && (
          <span className="text-muted-foreground">
            Refunds:{" "}
            <span className="text-foreground font-medium">{money(refunds)}</span>
          </span>
        )}
        <span className="text-muted-foreground">
          Net: <span className="text-foreground font-medium">{money(net)}</span>
        </span>
      </div>

      {/* Table / empty state */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center mt-6">
          <div className="text-5xl mb-3">📂</div>
          <p className="text-muted-foreground">
            No transactions to show. Approved milestone payments and withdrawals
            will appear here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden mt-6">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-3">Date</th>
                <th className="text-left font-medium px-5 py-3">Type</th>
                <th className="text-left font-medium px-5 py-3">Description</th>
                <th className="text-right font-medium px-5 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                    {fmtDate(t.date)}
                  </td>
                  <td className="px-5 py-3 text-foreground">{typeLabel[t.type]}</td>
                  <td className="px-5 py-3 text-foreground">{t.desc}</td>
                  <td
                    className={`px-5 py-3 text-right font-medium whitespace-nowrap ${
                      t.amount < 0 ? "text-muted-foreground" : "text-foreground"
                    }`}
                  >
                    {t.amount < 0 ? "−" : "+"}
                    {money(Math.abs(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
