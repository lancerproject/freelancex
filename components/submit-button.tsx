"use client";

import { useFormStatus } from "react-dom";

// A submit button that disables itself while the form action is running, so a
// double-click can't fire the server action (and its emails) twice. Drop-in
// replacement for a plain <button type="submit">.
export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText || "Please wait…" : children}
    </button>
  );
}
