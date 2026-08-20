export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  department: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface SessionData {
  user: UserProfile | null;
  token: string | null;
}
