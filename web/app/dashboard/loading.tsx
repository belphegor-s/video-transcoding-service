import { AppHeader } from "@/components/app-header";
import { LibrarySkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="relative z-10 min-h-screen">
      <AppHeader user={null} />
      <LibrarySkeleton />
    </div>
  );
}
