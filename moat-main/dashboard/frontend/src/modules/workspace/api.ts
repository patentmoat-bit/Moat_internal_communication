import { WorkspaceDocument, Invention } from "./types";
import axios from "axios";

export async function fetchWorkspaceDocuments(): Promise<WorkspaceDocument[]> {
  const { data } = await axios.get("/api/workspace/documents");
  return data.data;
}

export async function createWorkspaceDocument(payload: Partial<WorkspaceDocument>): Promise<WorkspaceDocument> {
  const { data } = await axios.post("/api/workspace/documents", payload);
  return data.data;
}

export async function fetchInventions(): Promise<Invention[]> {
  const { data } = await axios.get("/api/workspace/inventions");
  return data.data;
}

export async function createInvention(payload: Partial<Invention>): Promise<Invention> {
  const { data } = await axios.post("/api/workspace/inventions", payload);
  return data.data;
}
