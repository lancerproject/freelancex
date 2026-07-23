import { FeedSkeleton } from "@/components/skeletons";

// Shown instantly when navigating to "Find work" while the job data loads.
export default function Loading() {
  return <FeedSkeleton title="Find work" />;
}
