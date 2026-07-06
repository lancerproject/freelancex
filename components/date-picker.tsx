"use client";

import { useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const YEARS: number[] = [];
for (let y = 2012; y >= 1950; y--) YEARS.push(y);

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Lightweight calendar date picker. value is "yyyy-mm-dd" (or "").
export function DatePicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  // default the calendar view to Jan 2006 (a sensible DOB starting point)
  const initial = value ? value.split("-") : ["2006", "01"];
  const [viewYear, setViewYear] = useState(parseInt(initial[0]) || 2006);
  const [viewMonth, setViewMonth] = useState((parseInt(initial[1]) || 1) - 1);

  const firstDay = new Date(viewYear, viewMonth, 1);
  // Monday-first offset
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const pick = (d: number) => {
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`);
    setOpen(false);
  };

  return (
    <div className="relative max-w-md">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left ${
          error ? "border-red-400" : "border-neutral-300"
        } focus:border-primary`}
      >
        <span className={value ? "text-neutral-900" : "text-neutral-400"}>
          {value || "yyyy-mm-dd"}
        </span>
        <span className="text-neutral-500">🗓</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-40 w-[340px] rounded-2xl border border-neutral-200 bg-white shadow-xl p-4">
          {/* header */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 rounded-full hover:bg-neutral-100"
              aria-label="Previous month"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setYearOpen((y) => !y)}
              className="font-semibold text-lg flex items-center gap-1"
            >
              {MONTHS[viewMonth]} {viewYear} <span className="text-sm">⌄</span>
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 rounded-full hover:bg-neutral-100"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          {yearOpen ? (
            <div className="mt-3 grid grid-cols-4 gap-2 max-h-56 overflow-y-auto">
              {YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => {
                    setViewYear(y);
                    setYearOpen(false);
                  }}
                  className={`py-2 rounded-lg text-sm hover:bg-neutral-100 ${
                    y === viewYear ? "bg-primary text-white hover:bg-primary" : ""
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-1 mt-4 text-xs font-semibold text-neutral-500 text-center">
                {WEEKDAYS.map((w) => (
                  <div key={w}>{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 mt-2 text-center">
                {cells.map((d, i) => {
                  const iso = d
                    ? `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}`
                    : "";
                  const selected = d && iso === value;
                  return (
                    <div key={i} className="py-1">
                      {d ? (
                        <button
                          type="button"
                          onClick={() => pick(d)}
                          className={`w-9 h-9 rounded-full text-sm hover:bg-neutral-100 ${
                            selected
                              ? "bg-primary text-white hover:bg-primary"
                              : "text-neutral-800"
                          }`}
                        >
                          {d}
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-sm text-neutral-600 hover:underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
