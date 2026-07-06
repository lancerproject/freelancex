"use client";

import { useRouter } from "next/navigation";
import { usePasswordGate } from "@/components/password-confirm-modal";

// "Set up" / "Update question and answer" link. Confirms the account password
// (same prompt used everywhere) before opening the security-question page.
export function SecurityQuestionLink({ hasQuestion }: { hasQuestion: boolean }) {
  const router = useRouter();
  const { require, modal } = usePasswordGate();

  const open = async () => {
    if (!(await require())) return;
    router.push("/settings/security/security-question");
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="text-primary hover:underline font-medium"
      >
        {hasQuestion ? "Update question and answer" : "Set up question and answer"}
      </button>
      {modal}
    </>
  );
}
