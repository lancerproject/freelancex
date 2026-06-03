import React from "react";
import { createJob } from "./actions";

export default function NewJobPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">
        Create Job Post
      </h1>

      <form
        action={createJob}
        className="flex flex-col gap-4 w-[400px]"
      >
        <input
          name="title"
          type="text"
          placeholder="Job Title"
          className="border p-3 rounded"
        />

        <textarea
          name="description"
          placeholder="Job Description"
          className="border p-3 rounded"
        />

        <input
          name="budget"
          type="number"
          placeholder="Budget"
          className="border p-3 rounded"
        />

        <button
          type="submit"
          className="bg-black text-white p-3 rounded"
        >
          Create Job
        </button>
      </form>
    </main>
  );
}