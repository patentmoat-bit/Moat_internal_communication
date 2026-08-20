import { PortfolioPatent } from "./types";
import axios from "axios";

export async function fetchPortfolioPatents(): Promise<PortfolioPatent[]> {
  const { data } = await axios.get("/api/portfolio");
  return data.data;
}

export async function addPortfolioPatent(payload: Partial<PortfolioPatent>): Promise<PortfolioPatent> {
  const { data } = await axios.post("/api/portfolio", payload);
  return data.data;
}

export async function updatePortfolioPatent(id: string, payload: Partial<PortfolioPatent>): Promise<PortfolioPatent> {
  const { data } = await axios.put(`/api/portfolio/${id}`, payload);
  return data.data;
}

export async function deletePortfolioPatent(id: string): Promise<void> {
  await axios.delete(`/api/portfolio/${id}`);
}
