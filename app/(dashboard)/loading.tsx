import { PageSkeleton } from "@/components/skeletons";

// Generic instant loading state for dashboard pages that don't define their own
// (jobs/freelancers have tailored skeletons that take priority).
export default function Loading() {
  return <PageSkeleton />;
}
