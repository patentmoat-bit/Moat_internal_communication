import { UserProfile, UserRole } from "./types";
import axios from "axios";

export async function fetchProfile(): Promise<UserProfile> {
  const { data } = await axios.get("/api/users/profile");
  return data.data;
}

export async function updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
  const { data } = await axios.put("/api/users/profile", profile);
  return data.data;
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
  const { data } = await axios.get("/api/users");
  return data.data;
}
