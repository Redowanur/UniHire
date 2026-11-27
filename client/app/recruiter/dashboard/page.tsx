"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

/** The dashboard was split into /recruiter/cohorts and /recruiter/posts; keep old links working. */
export default function RecruiterDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/recruiter/cohorts");
  }, [router]);
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-12">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}
