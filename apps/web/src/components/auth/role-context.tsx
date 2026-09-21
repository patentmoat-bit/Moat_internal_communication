"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export type RoleType = "ADMIN" | "PATENT_ANALYST" | "CEO" | "PATENT_DRAFTER" | "DESIGN_TEAM" | "FINANCE";

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: RoleType;
  department: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  avatarTone?: string;
}

export interface RoleProfile {
  id: RoleType;
  title: string;
  defaultRoute: string;
  description: string;
  color: string;
}

export const ROLE_CONFIGS: Record<RoleType, RoleProfile> = {
  ADMIN: {
    id: "ADMIN",
    title: "System Administrator",
    defaultRoute: "/admin",
    description: "User management, role assignment, permissions matrix, and workspace security.",
    color: "rose",
  },
  PATENT_ANALYST: {
    id: "PATENT_ANALYST",
    title: "Patent Analyst",
    defaultRoute: "/search",
    description: "Prior-art research, novelty scoring, claim comparison, and patentability reports.",
    color: "purple",
  },
  CEO: {
    id: "CEO",
    title: "Chief Executive Officer",
    defaultRoute: "/portfolio",
    description: "Executive oversight, filing decisions, strategic radar, and budget approvals.",
    color: "amber",
  },
  PATENT_DRAFTER: {
    id: "PATENT_DRAFTER",
    title: "Patent Drafter",
    defaultRoute: "/drafts",
    description: "Patent specification writing, claim tree architecture, and revision history.",
    color: "blue",
  },
  DESIGN_TEAM: {
    id: "DESIGN_TEAM",
    title: "Design & Illustration Lead",
    defaultRoute: "/design",
    description: "FIG 1..N patent drawings, margin compliance, and technical schematics.",
    color: "emerald",
  },
  FINANCE: {
    id: "FINANCE",
    title: "Finance & Fee Controller",
    defaultRoute: "/payments",
    description: "Statutory USPTO filing fees, attorney disbursements, and payment docket.",
    color: "teal",
  },
};

// Backward-compatible alias for existing components
export const ROLE_PROFILES = ROLE_CONFIGS;

const DEFAULT_ADMIN: PlatformUser = {
  id: "usr-admin",
  name: "Organization Admin",
  email: "admin@moat.ai",
  role: "ADMIN",
  department: "Administration & Security",
  status: "ACTIVE",
  createdAt: new Date().toISOString().split("T")[0],
  avatarTone: "rose",
};

interface RoleContextValue {
  currentRole: RoleType;
  currentUser: PlatformUser;
  profile: RoleProfile & { name: string; email: string };
  users: PlatformUser[];
  setRole: (role: RoleType) => void;
  switchUser: (userId: string) => void;
  createUser: (userData: Omit<PlatformUser, "id" | "createdAt">) => PlatformUser;
  updateUser: (id: string, updates: Partial<PlatformUser>) => void;
  deleteUser: (id: string) => void;
}

const RoleContext = React.createContext<RoleContextValue>({
  currentRole: "ADMIN",
  currentUser: DEFAULT_ADMIN,
  profile: { ...ROLE_CONFIGS.ADMIN, name: DEFAULT_ADMIN.name, email: DEFAULT_ADMIN.email },
  users: [DEFAULT_ADMIN],
  setRole: () => {},
  switchUser: () => {},
  createUser: () => DEFAULT_ADMIN,
  updateUser: () => {},
  deleteUser: () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [users, setUsers] = React.useState<PlatformUser[]>([DEFAULT_ADMIN]);
  const [currentUserId, setCurrentUserId] = React.useState<string>(DEFAULT_ADMIN.id);

  // Load registered users from localStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUsers = localStorage.getItem("moat_system_users");
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setUsers(parsed);
          }
        } catch {
          // ignore
        }
      }

      const activeUid = localStorage.getItem("moat_active_user_id");
      if (activeUid) {
        setCurrentUserId(activeUid);
      }
    }
  }, []);

  const saveUsers = (updated: PlatformUser[]) => {
    setUsers(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("moat_system_users", JSON.stringify(updated));
    }
  };

  const currentUser = users.find((u) => u.id === currentUserId) || users[0] || DEFAULT_ADMIN;
  const currentRole = currentUser.role || "ADMIN";

  const setRole = (role: RoleType) => {
    const updatedUsers = users.map((u) => (u.id === currentUser.id ? { ...u, role } : u));
    saveUsers(updatedUsers);
    const target = ROLE_CONFIGS[role]?.defaultRoute || "/search";
    router.push(target);
  };

  const switchUser = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (targetUser) {
      setCurrentUserId(userId);
      if (typeof window !== "undefined") {
        localStorage.setItem("moat_active_user_id", userId);
      }
      const targetRoute = ROLE_CONFIGS[targetUser.role]?.defaultRoute || "/admin";
      router.push(targetRoute);
    }
  };

  const createUser = (userData: Omit<PlatformUser, "id" | "createdAt">) => {
    const newUser: PlatformUser = {
      ...userData,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    const updated = [...users, newUser];
    saveUsers(updated);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<PlatformUser>) => {
    const updated = users.map((u) => (u.id === id ? { ...u, ...updates } : u));
    saveUsers(updated);
  };

  const deleteUser = (id: string) => {
    if (users.length <= 1) {
      alert("Cannot delete the only remaining user in the organization.");
      return;
    }
    const updated = users.filter((u) => u.id !== id);
    saveUsers(updated);
    if (currentUserId === id) {
      switchUser(updated[0].id);
    }
  };

  const activeProfile = ROLE_CONFIGS[currentRole] || ROLE_CONFIGS.ADMIN;

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        currentUser,
        profile: {
          ...activeProfile,
          name: currentUser.name,
          email: currentUser.email,
        },
        users,
        setRole,
        switchUser,
        createUser,
        updateUser,
        deleteUser,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useActiveRole() {
  return React.useContext(RoleContext);
}

