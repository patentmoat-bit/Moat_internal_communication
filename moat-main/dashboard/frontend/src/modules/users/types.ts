export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  role: string;
  department: string | null;
  company: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}
