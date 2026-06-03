import React from "react";
import { selectRole } from "./actions";

export default function RolePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">
        Choose Your Role
      </h1>

      <p>
        Select how you want to use the marketplace
      </p>

      <div className="flex gap-4">
        <form action={selectRole.bind(null, "client")}>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl"
          >
            Client
          </button>
        </form>

        <form action={selectRole.bind(null, "freelancer")}>
          <button
            type="submit"
            className="bg-green-600 text-white px-6 py-3 rounded-xl"
          >
            Freelancer
          </button>
        </form>
      </div>
    </main>
  );
}