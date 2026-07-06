"use client";

import { useState } from "react";
import { StarRating } from "@/components/star-rating";

type Item = {
  id: string;
  title: string;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  rating?: number | null;
  comment?: string | null;
};

function fmt(d: string | null) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function WorkHistory({
  completed,
  inProgress,
}: {
  completed: Item[];
  inProgress: Item[];
}) {
  const [tab, setTab] = useState<"completed" | "inprogress">(
    completed.length === 0 && inProgress.length > 0 ? "inprogress" : "completed"
  );

  const list = tab === "completed" ? completed : inProgress;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      <h3 className="text-2xl font-bold text-foreground mb-4">Work history</h3>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-border mb-5">
        <button
          type="button"
          onClick={() => setTab("completed")}
          className={`pb-3 -mb-px text-sm font-medium border-b-2 transition ${
            tab === "completed"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Completed jobs ({completed.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("inprogress")}
          className={`pb-3 -mb-px text-sm font-medium border-b-2 transition ${
            tab === "inprogress"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          In progress ({inProgress.length})
        </button>
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground">
          {tab === "completed"
            ? "No completed jobs yet. Finished jobs and client feedback will appear here."
            : "No jobs in progress right now. Active contracts will appear here."}
        </p>
      ) : (
        <div className="space-y-6">
          {list.map((c) => {
            const start = fmt(c.start_date);
            const end = fmt(c.end_date);
            return (
              <div
                key={c.id}
                className="border-b border-border last:border-0 pb-6 last:pb-0"
              >
                <p className="font-semibold text-foreground">{c.title}</p>

                {tab === "completed" ? (
                  <>
                    {c.rating != null && (
                      <div className="flex items-center gap-2 mt-1">
                        <StarRating value={c.rating} size="text-sm" />
                        <span className="text-sm font-medium text-foreground">
                          {c.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {c.comment && (
                      <p className="text-muted-foreground mt-2 leading-relaxed">
                        “{c.comment}”
                      </p>
                    )}
                    {c.rating == null && !c.comment && (
                      <p className="text-sm text-muted-foreground mt-1">
                        No feedback given.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-primary mt-1">
                    Job in progress — no feedback given yet.
                  </p>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  {start || "—"}
                  {" – "}
                  {tab === "completed" ? end || "Completed" : "Present"}
                  {c.amount ? ` · $${c.amount}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
