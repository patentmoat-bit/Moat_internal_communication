import { api } from "./api";
import type { CompareRequest, CompareResponse } from "@/types";

export const comparisonService = {
  async compare(data: CompareRequest): Promise<CompareResponse> {
    const response = await api.post<CompareResponse>("/comparison/compare", data);
    return response.data;
  },
};
