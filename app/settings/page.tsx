import { redirect } from "next/navigation";

// /settings has no page of its own — send users to the first settings section.
export default function SettingsIndex() {
  redirect("/settings/contact");
}
