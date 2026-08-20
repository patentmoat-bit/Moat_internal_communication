import { Feedback, Approval } from "./types";
import axios from "axios";

export async function fetchFeedback(): Promise<Feedback[]> {
  const { data } = await axios.get("/api/feedback");
  return data.data;
}

export async function submitFeedback(payload: Partial<Feedback>): Promise<Feedback> {
  const { data } = await axios.post("/api/feedback", payload);
  return data.data;
}

export async function fetchApprovals(): Promise<Approval[]> {
  const { data } = await axios.get("/api/feedback/approvals");
  return data.data;
}

export async function submitApproval(payload: Partial<Approval>): Promise<Approval> {
  const { data } = await axios.post("/api/feedback/approvals", payload);
  return data.data;
}
