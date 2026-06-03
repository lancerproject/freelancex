import React from "react";
import Link from "next/link";
import { createClient } from "../../lib/supabase-server";

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const activeTab =
    status === "completed" ? "completed" : "active";

  const supabase = await createClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("status", activeTab)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-6">
        Contracts
      </h1>

      <div className="flex gap-3 mb-6">
        <Link
          href="/contracts?status=active"
          className={`px-4 py-2 rounded-lg ${
            activeTab === "active"
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          Active
        </Link>

        <Link
          href="/contracts?status=completed"
          className={`px-4 py-2 rounded-lg ${
            activeTab === "completed"
              ? "bg-green-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          Completed
        </Link>
      </div>

      {(!contracts || contracts.length === 0) && (
        <p className="text-gray-500">
          {activeTab === "active"
            ? "No active contracts found"
            : "No completed contracts found"}
        </p>
      )}

      <div className="space-y-4">
        {contracts?.map((contract) => (
          <div
            key={contract.id}
            className="border rounded-lg p-4"
          >
            <Link href={`/contracts/${contract.id}`}>
              <h2 className="text-xl font-semibold text-blue-600 hover:underline cursor-pointer">
                {contract.title}
              </h2>
            </Link>

            <p>
              <strong>Amount:</strong> ${contract.amount}
            </p>

            <p>
              <strong>Status:</strong> {contract.status}
            </p>

            <p>
              <strong>Start Date:</strong>{" "}
              {new Date(
                contract.start_date
              ).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}