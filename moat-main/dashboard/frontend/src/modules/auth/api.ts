import { UserProfile } from "./types";
import axios from "axios";

export async function getCurrentUser(): Promise<UserProfile> {
  const { data } = await axios.get("/api/auth/me");
  return data.data;
}

export async function syncProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const { data } = await axios.post("/api/auth/sync", profile);
  return data.data;
}
