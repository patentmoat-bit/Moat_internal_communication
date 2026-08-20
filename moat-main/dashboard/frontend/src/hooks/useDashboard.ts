"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { DashboardStats } from "@/types";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const response = await api.get<DashboardStats>("/dashboard/stats");
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}
