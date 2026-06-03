import { createClient } from "../../../lib/supabase-server";
import { redirect, notFound } from "next/navigation";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .single();

  if (!conversation) {
    notFound();
  }

  const { data: messages } = await supabase
    .from("messages")
    .select(`
      *,
      profiles (
        full_name,
        email
      )
    `)
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  async function sendMessage(formData: FormData) {
    "use server";

    const content = formData.get("content") as string;

    if (!content || content.trim() === "") {
      return;
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      content,
    });

    redirect(`/messages/${id}`);
  }

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <div className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages?.map((message) => {
          const isOwn = message.sender_id === user.id;
          const profile = Array.isArray(message.profiles)
            ? message.profiles[0]
            : message.profiles;
          const senderName =
            profile?.full_name || profile?.email || "Unknown";

          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}
              >
                <p className="text-xs text-gray-500 mb-1 px-1">
                  {senderName}
                </p>

                <div
                  className={`rounded-2xl px-4 py-3 ${
                    isOwn
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>

                <p className="text-xs text-gray-400 mt-1 px-1">
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t bg-white px-6 py-4">
        <form action={sendMessage} className="flex gap-3 max-w-3xl mx-auto">
          <input
            type="text"
            name="content"
            placeholder="Type a message"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
