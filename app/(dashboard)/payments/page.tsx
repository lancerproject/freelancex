import { redirect } from "next/navigation";

// The old Payments page is superseded by /withdraw (withdrawal methods +
// balance + history) and /transactions (payments received). Redirect old
// links and bookmarks.
export default function PaymentsPage() {
  redirect("/withdraw");
}
