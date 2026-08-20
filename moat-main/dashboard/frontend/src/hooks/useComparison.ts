"use client";

import { useMutation } from "@tanstack/react-query";
import { comparisonService } from "@/services/comparisonService";
import type { CompareRequest } from "@/types";

export function useComparePatents() {
  return useMutation({
    mutationFn: (data: CompareRequest) => comparisonService.compare(data),
  });
}
