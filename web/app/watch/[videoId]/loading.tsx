import { AppHeader } from "@/components/app-header";
import { WatchSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="relative z-10 min-h-screen">
      <AppHeader user={null} />
      <WatchSkeleton />
    </div>
  );
}
