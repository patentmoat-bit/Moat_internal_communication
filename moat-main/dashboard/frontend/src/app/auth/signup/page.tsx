"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignupAliasPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(query ? `/accept-invitation?${query}` : "/accept-invitation");
  }, [router, searchParams]);
  return null;
}
