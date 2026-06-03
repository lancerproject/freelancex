import { createClient } from "../../../lib/supabase-server";
import { notFound } from "next/navigation";
import { completeContract } from "../../proposals/actions";
import {
  addMilestone,
  submitMilestone,
  approveMilestone,
  deleteMilestone,
} from "../../milestones/actions";
import { deleteFile } from "../../files/actions";
import Link from "next/link";

export default async function ContractDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contract) {
    notFound();
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("contract_id", contract.id)
    .maybeSingle();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("contract_id", id)
    .order("created_at", { ascending: true });

  const { data: files } = await supabase
    .from("contract_files")
    .select("*")
    .eq("contract_id", id)
    .order("created_at", { ascending: false });

  const isClient = user?.id === contract.client_id;
  const isFreelancer = user?.id === contract.freelancer_id;

  async function handleComplete() {
    "use server";
    await completeContract(contract.id);
  }

  return (
    <main className="min-h-screen p-8">
      <div className="border rounded-lg p-6 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">
          {contract.title}
        </h1>

        <p>
          <strong>Amount:</strong> ${contract.amount}
        </p>

        <p>
          <strong>Status:</strong> {contract.status}
        </p>

        <p>
          <strong>Start Date:</strong>{" "}
          {new Date(contract.start_date).toLocaleDateString()}
        </p>

        {contract.end_date && (
          <p>
            <strong>End Date:</strong>{" "}
            {new Date(contract.end_date).toLocaleDateString()}
          </p>
        )}

        {conversation && (
          <Link
            href={`/messages/${conversation.id}`}
            className="inline-block mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Open Chat
          </Link>
        )}

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Milestones</h2>

          <div className="space-y-4">
            {milestones?.map((milestone) => (
              <div
                key={milestone.id}
                className="border rounded-lg p-4"
              >
                <p>
                  <strong>Title:</strong> {milestone.title}
                </p>

                <p>
                  <strong>Amount:</strong> ${milestone.amount}
                </p>

                <p>
                  <strong>Due Date:</strong>{" "}
                  {new Date(milestone.due_date).toLocaleDateString()}
                </p>

                <p>
                  <strong>Status:</strong> {milestone.status}
                </p>

                <p>
                  <strong>Payment Status:</strong>{" "}
                  {milestone.payment_status}
                </p>

                {milestone.status === "pending" && isClient && (
                  <form
                    action={deleteMilestone.bind(
                      null,
                      milestone.id,
                      contract.id
                    )}
                    className="mt-3"
                  >
                    <button
                      type="submit"
                      className="bg-red-600 text-white px-4 py-2 rounded-lg"
                    >
                      Delete
                    </button>
                  </form>
                )}

                {milestone.status === "pending" && isFreelancer && (
                  <form
                    action={submitMilestone.bind(
                      null,
                      milestone.id,
                      contract.id
                    )}
                    className="mt-3"
                  >
                    <button
                      type="submit"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg"
                    >
                      Submit for Approval
                    </button>
                  </form>
                )}

                {milestone.status === "submitted" && isClient && (
                  <form
                    action={approveMilestone.bind(
                      null,
                      milestone.id,
                      contract.id
                    )}
                    className="mt-3"
                  >
                    <button
                      type="submit"
                      className="bg-green-600 text-white px-4 py-2 rounded-lg"
                    >
                      Approve & Pay
                    </button>
                  </form>
                )}

                {milestone.status === "approved" && (
                  <p className="mt-3 text-green-700 font-semibold">
                    Approved and Paid
                  </p>
                )}
              </div>
            ))}
          </div>

          {contract.status === "active" && isClient && (
            <form
              action={addMilestone.bind(null, contract.id)}
              className="mt-6 space-y-4 border rounded-lg p-4"
            >
              <h3 className="font-semibold">Add Milestone</h3>

              <input
                type="text"
                name="title"
                placeholder="Title"
                className="w-full border rounded-lg p-3"
                required
              />

              <input
                type="number"
                name="amount"
                placeholder="Amount"
                className="w-full border rounded-lg p-3"
                required
              />

              <input
                type="date"
                name="due_date"
                className="w-full border rounded-lg p-3"
                required
              />

              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Add Milestone
              </button>
            </form>
          )}
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Files</h2>

          <div className="space-y-4">
            {files?.map((file) => (
              <div
                key={file.id}
                className="border rounded-lg p-4"
              >
                <p>
                  <strong>File Name:</strong> {file.file_name}
                </p>

                <p>
                  <strong>Size:</strong>{" "}
                  {(file.file_size / 1024).toFixed(2)} KB
                </p>

                <p>
                  <strong>Uploaded:</strong>{" "}
                  {new Date(file.created_at).toLocaleDateString()}
                </p>

                <form
                  action={deleteFile.bind(
                    null,
                    file.id,
                    file.file_path,
                    contract.id
                  )}
                  className="mt-3"
                >
                  <button
                    type="submit"
                    className="bg-red-600 text-white px-4 py-2 rounded-lg"
                  >
                    Delete
                  </button>
                </form>
              </div>
            ))}
          </div>

          <form
            action={`/api/upload/${contract.id}`}
            method="POST"
            encType="multipart/form-data"
            className="mt-6 flex gap-3 items-center"
          >
            <input
              type="file"
              name="file"
              className="flex-1 border rounded-lg p-2"
              required
            />

            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Upload
            </button>
          </form>
        </div>

        {contract.status === "active" && (
          <form action={handleComplete} className="mt-6">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-lg"
            >
              Mark as Completed
            </button>
          </form>
        )}

        {contract.status === "completed" && (
          <p className="mt-6 text-green-700 font-semibold">
            This contract has been completed.
          </p>
        )}
      </div>
    </main>
  );
}