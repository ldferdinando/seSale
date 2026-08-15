import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PlanesContent } from "./PlanesContent";

function PlanesPageSkeleton() {
  return (
    <main className="container mx-auto flex max-w-2xl flex-col gap-6 py-6">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </main>
  );
}

export default function PlanesPage() {
  return (
    <Suspense fallback={<PlanesPageSkeleton />}>
      <PlanesContent />
    </Suspense>
  );
}
