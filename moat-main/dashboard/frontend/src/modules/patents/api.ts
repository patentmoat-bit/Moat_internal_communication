import { PatentProject, PatentPortfolio } from "./types";
import axios from "axios";

export async function fetchPatentProjects(): Promise<PatentProject[]> {
  const { data } = await axios.get("/api/patents/projects");
  return data.data;
}

export async function createPatentProject(project: Partial<PatentProject>): Promise<PatentProject> {
  const { data } = await axios.post("/api/patents/projects", project);
  return data.data;
}

export async function fetchPatentPortfolio(): Promise<PatentPortfolio[]> {
  const { data } = await axios.get("/api/patents/portfolio");
  return data.data;
}
