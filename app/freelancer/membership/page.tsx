import { redirect } from "next/navigation";

// The membership page lives in Settings; /freelancer/membership is a friendly
// alias that redirects there.
export default function FreelancerMembershipRedirect() {
  redirect("/settings/membership");
}
