"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  setConvoPref,
  endConversation,
  reopenConversation,
  goToDirectConversation,
  blockUser,
  unblockUser,
} from "@/app/(dashboard)/messages/inbox-actions";

// The ⋯ menu in the chat header: jump to the plain 1:1 conversation,
// favorite, hide, block/unblock the user, and end/reopen the conversation.
export function ChatHeaderMenu({
  conversationId,
  otherId,
  otherName,
  isDirect,
  favorite,
  hidden,
  ended,
  endedByMe,
  canBlock,
  blockedByMe,
}: {
  conversationId: string;
  otherId: string;
  otherName: string;
  isDirect: boolean; // already a plain 1:1 (no job/contract)
  favorite: boolean;
  hidden: boolean;
  ended: boolean;
  endedByMe: boolean;
  // False while the two users share an active contract — the block option is
  // HIDDEN entirely in that case (working relationships can't be blocked).
  canBlock: boolean;
  blockedByMe: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [blockErr, setBlockErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Escape / outside click closes everything.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirmEnd(false);
        setConfirmBlock(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, []);

  const run = async (fn: () => Promise<unknown>, after?: () => void) => {
    if (busy) return;
    setBusy(true);
    await fn().catch(() => null);
    setBusy(false);
    setOpen(false);
    if (after) after();
    else router.refresh();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Conversation options"
        onClick={() => setOpen((o) => !o)}
        className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground font-bold"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-40 bg-card border border-border rounded-xl shadow-lg py-1 w-56 text-sm">
          {!isDirect && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const res = await goToDirectConversation(otherId);
                  if (res.ok && res.conversationId) {
                    router.push(`/messages/${res.conversationId}`);
                  }
                }, () => undefined)
              }
              className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary"
            >
              💬 Go to 1:1 conversation
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => setConvoPref(conversationId, { favorite: !favorite }))
            }
            className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary"
          >
            {favorite ? "★ Remove from favorites" : "☆ Add to favorites"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                () => setConvoPref(conversationId, { hidden: !hidden }),
                () => router.push("/messages")
              )
            }
            className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary"
          >
            {hidden ? "👁 Unhide conversation" : "🙈 Hide conversation"}
          </button>
          {canBlock &&
            (blockedByMe ? (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await unblockUser(otherId);
                  })
                }
                className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary"
              >
                ✅ Unblock {otherName}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setBlockErr(null);
                  setConfirmBlock(true);
                }}
                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
              >
                ⛔ Block {otherName}
              </button>
            ))}
          {!ended ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setConfirmEnd(true);
              }}
              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
            >
              🚫 End conversation
            </button>
          ) : endedByMe ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => reopenConversation(conversationId))}
              className="block w-full text-left px-4 py-2 text-foreground hover:bg-secondary"
            >
              🔓 Reopen conversation
            </button>
          ) : null}
        </div>
      )}

      {/* Block-user confirm */}
      {confirmBlock && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setConfirmBlock(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-card rounded-2xl border border-border max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-foreground">
              Block {otherName}?
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Neither of you will be able to send new messages to each other.
              The chat history stays visible, and you can unblock them from
              this menu at any time.
            </p>
            {blockErr && (
              <p className="text-sm text-red-500 mt-3">{blockErr}</p>
            )}
            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setConfirmBlock(false)}
                className="text-foreground text-sm font-medium hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const res = await blockUser(otherId, conversationId).catch(
                    () => ({ ok: false, error: "Something went wrong." })
                  );
                  setBusy(false);
                  if (res.ok) {
                    setConfirmBlock(false);
                    router.refresh();
                  } else {
                    setBlockErr(
                      ("error" in res && res.error) || "Couldn't block this user."
                    );
                  }
                }}
                className="bg-red-600 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Blocking…" : "Block user"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End-conversation confirm */}
      {confirmEnd && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setConfirmEnd(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="bg-card rounded-2xl border border-border max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-foreground">
              End this conversation?
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Neither of you will be able to send new messages. The history
              stays visible, and you can reopen it later.
            </p>
            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className="text-foreground text-sm font-medium hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await endConversation(conversationId).catch(() => null);
                  setBusy(false);
                  setConfirmEnd(false);
                  router.refresh();
                }}
                className="bg-red-600 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? "Ending…" : "End conversation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
