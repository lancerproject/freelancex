import { FeedSkeleton } from "@/components/skeletons";

// Shown instantly when navigating to the freelancer home while jobs load.
export default function Loading() {
  return <FeedSkeleton />;
}
