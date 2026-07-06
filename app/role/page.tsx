import React from "react";
import { selectRole } from "./actions";

export default function RolePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4 lg:px-8 py-10">
      <h1 className="text-3xl font-bold text-foreground">
        Choose Your Role
      </h1>

      <p className="text-muted-foreground">
        Select how you want to use the marketplace
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl">
        <form action={selectRole.bind(null, "client")} className="flex-1">
          <button
            type="submit"
            className="w-full text-left rounded-2xl border border-border bg-card p-8 hover:border-primary transition"
          >
            <span className="block text-xl font-bold text-foreground">Client</span>
            <span className="mt-2 block text-sm text-muted-foreground">
              Hire talent and post jobs
            </span>
          </button>
        </form>

        <form action={selectRole.bind(null, "freelancer")} className="flex-1">
          <button
            type="submit"
            className="w-full text-left rounded-2xl border border-border bg-card p-8 hover:border-primary transition"
          >
            <span className="block text-xl font-bold text-foreground">Freelancer</span>
            <span className="mt-2 block text-sm text-muted-foreground">
              Find work and earn
            </span>
          </button>
        </form>
      </div>
    </main>
  );
}