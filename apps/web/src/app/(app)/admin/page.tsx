"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Trash2,
  Edit3,
  Sparkles,
  FileCode,
  PenTool,
  Wallet,
  ShieldCheck,
  Building,
  History,
  Lock,
  ArrowRight,
  Check,
  X,
  Plus,
  Sliders,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import {
  useActiveRole,
  ROLE_CONFIGS,
  type RoleType,
  type PlatformUser,
} from "@/components/auth/role-context";

interface AuditEvent {
  id: string;
  action: string;
  targetUser: string;
  actor: string;
  timestamp: string;
  roleAssigned?: RoleType;
}

const ROLE_ICONS: Record<RoleType, React.ElementType> = {
  ADMIN: ShieldCheck,
  PATENT_ANALYST: Sparkles,
  CEO: Shield,
  PATENT_DRAFTER: FileCode,
  DESIGN_TEAM: PenTool,
  FINANCE: Wallet,
};

const ROLE_BADGE_COLORS: Record<RoleType, string> = {
  ADMIN: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  PATENT_ANALYST: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  CEO: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  PATENT_DRAFTER: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  DESIGN_TEAM: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  FINANCE: "bg-teal-500/10 text-teal-600 border-teal-500/20",
};

const PERMISSIONS_MATRIX: {
  feature: string;
  description: string;
  ADMIN: boolean;
  PATENT_ANALYST: boolean;
  CEO: boolean;
  PATENT_DRAFTER: boolean;
  DESIGN_TEAM: boolean;
  FINANCE: boolean;
}[] = [
  {
    feature: "Prior Art & Novelty Search",
    description: "BigQuery patent retrieval, AI novelty scoring, and claim element comparison",
    ADMIN: true,
    PATENT_ANALYST: true,
    CEO: true,
    PATENT_DRAFTER: true,
    DESIGN_TEAM: false,
    FINANCE: false,
  },
  {
    feature: "Invention Workspace & Evidence",
    description: "Submit invention disclosures and technical evidence dossiers",
    ADMIN: true,
    PATENT_ANALYST: true,
    CEO: true,
    PATENT_DRAFTER: true,
    DESIGN_TEAM: false,
    FINANCE: false,
  },
  {
    feature: "Research Matters Tracker",
    description: "Manage project pipeline stages and evidence storage vault",
    ADMIN: true,
    PATENT_ANALYST: true,
    CEO: true,
    PATENT_DRAFTER: false,
    DESIGN_TEAM: false,
    FINANCE: false,
  },
  {
    feature: "Patent Specification Drafting",
    description: "Author complete patent specifications and build claim trees",
    ADMIN: true,
    PATENT_ANALYST: false,
    CEO: false,
    PATENT_DRAFTER: true,
    DESIGN_TEAM: false,
    FINANCE: false,
  },
  {
    feature: "FIG 1-N Patent Drawings",
    description: "Prepare and upload technical schematic sheets complying with patent office margins",
    ADMIN: true,
    PATENT_ANALYST: false,
    CEO: false,
    PATENT_DRAFTER: false,
    DESIGN_TEAM: true,
    FINANCE: false,
  },
  {
    feature: "Strategic Portfolio & 1-Click Filing Approval",
    description: "Executive oversight, budget authorization, and statutory filing approvals",
    ADMIN: true,
    PATENT_ANALYST: false,
    CEO: true,
    PATENT_DRAFTER: false,
    DESIGN_TEAM: false,
    FINANCE: false,
  },
  {
    feature: "Filing Fee & Outside Counsel Docket",
    description: "Track statutory USPTO fees and external attorney drafting disbursements",
    ADMIN: true,
    PATENT_ANALYST: false,
    CEO: true,
    PATENT_DRAFTER: false,
    DESIGN_TEAM: false,
    FINANCE: true,
  },
  {
    feature: "Admin Control & User Role Management",
    description: "Create users, assign platform roles, configure permissions, and view audit logs",
    ADMIN: true,
    PATENT_ANALYST: false,
    CEO: false,
    PATENT_DRAFTER: false,
    DESIGN_TEAM: false,
    FINANCE: false,
  },
];

export default function AdminControlPage() {
  const { users, currentUser, createUser, updateUser, deleteUser, switchUser } = useActiveRole();
  const [activeTab, setActiveTab] = React.useState<"users" | "roles" | "logs">("users");

  // Filter and search state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("ALL");

  // Modal states
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<PlatformUser | null>(null);

  // Form states for new user
  const [formName, setFormName] = React.useState("");
  const [formEmail, setFormEmail] = React.useState("");
  const [formDepartment, setFormDepartment] = React.useState("Intellectual Property");
  const [formRole, setFormRole] = React.useState<RoleType>("PATENT_ANALYST");
  const [formStatus, setFormStatus] = React.useState<"ACTIVE" | "SUSPENDED">("ACTIVE");

  // Audit Logs state
  const [auditLogs, setAuditLogs] = React.useState<AuditEvent[]>([]);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLogs = localStorage.getItem("moat_admin_audit_logs");
      if (savedLogs) {
        try {
          const parsed = JSON.parse(savedLogs);
          if (Array.isArray(parsed)) setAuditLogs(parsed);
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const addAuditLog = (action: string, targetUser: string, roleAssigned?: RoleType) => {
    const newLog: AuditEvent = {
      id: `log-${Date.now()}`,
      action,
      targetUser,
      actor: currentUser.name,
      timestamp: new Date().toLocaleString(),
      roleAssigned,
    };
    const updated = [newLog, ...auditLogs];
    setAuditLogs(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("moat_admin_audit_logs", JSON.stringify(updated));
    }
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const created = createUser({
      name: formName.trim(),
      email: formEmail.trim(),
      department: formDepartment.trim() || "General",
      role: formRole,
      status: formStatus,
    });

    addAuditLog(`Created user account & assigned role "${ROLE_CONFIGS[formRole].title}"`, created.name, formRole);

    setShowAddModal(false);
    setFormName("");
    setFormEmail("");
    setFormDepartment("Intellectual Property");
    setFormRole("PATENT_ANALYST");
  };

  const handleUpdateUserRole = (user: PlatformUser, newRole: RoleType) => {
    updateUser(user.id, { role: newRole });
    addAuditLog(`Updated role to "${ROLE_CONFIGS[newRole].title}"`, user.name, newRole);
    setEditingUser(null);
  };

  const handleToggleStatus = (user: PlatformUser) => {
    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    updateUser(user.id, { status: nextStatus });
    addAuditLog(`Changed status to ${nextStatus}`, user.name);
  };

  const handleDeleteUserClick = (user: PlatformUser) => {
    if (confirm(`Are you sure you want to remove ${user.name} from the organization?`)) {
      deleteUser(user.id);
      addAuditLog("Deleted user account", user.name);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const uniqueRolesCount = new Set(users.map((u) => u.role)).size;
  const activeUsersCount = users.filter((u) => u.status === "ACTIVE").length;

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h))] flex-col overflow-y-auto bg-canvas p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-rose-600">
              Admin Control Center
            </span>
            <span className="text-xs text-muted">Organization Governance & User Role Management</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-ink">
            Admin Dashboard & Access Control
          </h1>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-110 transition"
        >
          <UserPlus className="size-4" />
          Create New User
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Total Users</span>
            <Users className="size-4 text-accent" />
          </div>
          <div className="text-3xl font-black text-ink">{users.length}</div>
          <div className="text-[11px] text-muted font-medium">Registered platform accounts</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Active Status</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600">{activeUsersCount}</div>
          <div className="text-[11px] text-muted">Authorized & authenticated</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Assigned Roles</span>
            <KeyRound className="size-4 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-purple-600">{uniqueRolesCount} / 6</div>
          <div className="text-[11px] text-muted font-medium">Distinct functional personas</div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted">
            <span className="text-xs font-bold uppercase tracking-wider">Access Security</span>
            <ShieldCheck className="size-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-ink">RBAC</div>
          <div className="text-[11px] text-emerald-600 font-medium">Role-based isolation active</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-px text-xs font-bold">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
            activeTab === "users"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Users className="size-4" />
          User Management ({users.length})
        </button>

        <button
          onClick={() => setActiveTab("roles")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
            activeTab === "roles"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <KeyRound className="size-4" />
          Role Permissions Matrix
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 transition ${
            activeTab === "logs"
              ? "border-accent text-accent"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <History className="size-4" />
          System & Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: User Management & Role Directory */}
      {activeTab === "users" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-ink">Organization User Directory</h2>
              <p className="text-xs text-muted">
                Create new team members and assign specific role portals to govern functional permissions.
              </p>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="size-3.5 absolute left-3 top-2.5 text-muted" />
                <input
                  type="text"
                  placeholder="Search by name, email, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 rounded-xl border border-line bg-canvas pl-9 pr-3 py-1.5 text-xs text-ink outline-none focus:border-accent"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-semibold text-ink outline-none"
              >
                <option value="ALL">All Roles ({users.length})</option>
                <option value="ADMIN">Administrator</option>
                <option value="PATENT_ANALYST">Patent Analyst</option>
                <option value="CEO">CEO / Executive</option>
                <option value="PATENT_DRAFTER">Patent Drafter</option>
                <option value="DESIGN_TEAM">Design Lead</option>
                <option value="FINANCE">Finance Controller</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-hidden rounded-xl border border-line bg-canvas">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface font-semibold text-muted">
                <tr>
                  <th className="p-3.5">User Name & Info</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Account Status</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted">
                      <Users className="size-8 text-faint mb-2 opacity-40 mx-auto" />
                      <p className="font-semibold text-ink text-xs">No users match query</p>
                      <p className="text-[11px] text-muted mt-0.5">Adjust your filters or add a new user above.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const RoleIcon = ROLE_ICONS[user.role] || ShieldCheck;
                    const roleConfig = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.ADMIN;
                    const isCurrent = currentUser.id === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-hover/50 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-full bg-accent/15 text-accent font-bold text-xs uppercase">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-ink">{user.name}</span>
                                {isCurrent && (
                                  <span className="rounded bg-accent/10 px-1.5 py-0.2 text-[9px] font-bold text-accent">
                                    Current Session
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-medium text-ink">{user.department}</td>

                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                              ROLE_BADGE_COLORS[user.role]
                            }`}
                          >
                            <RoleIcon className="size-3" />
                            {roleConfig.title}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold transition ${
                              user.status === "ACTIVE"
                                ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                            }`}
                          >
                            {user.status === "ACTIVE" ? (
                              <>
                                <CheckCircle2 className="size-3" /> Active
                              </>
                            ) : (
                              <>
                                <XCircle className="size-3" /> Suspended
                              </>
                            )}
                          </button>
                        </td>

                        <td className="p-3.5 text-muted font-mono">{user.createdAt}</td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!isCurrent && (
                              <button
                                onClick={() => switchUser(user.id)}
                                className="rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-bold text-ink hover:border-accent hover:text-accent transition shadow-2xs"
                                title="Login and switch active portal to this user"
                              >
                                Switch Role
                              </button>
                            )}

                            <button
                              onClick={() => setEditingUser(user)}
                              className="rounded-lg border border-line bg-surface p-1.5 text-muted hover:border-line-strong hover:text-ink transition"
                              title="Edit user role"
                            >
                              <Edit3 className="size-3.5" />
                            </button>

                            {users.length > 1 && (
                              <button
                                onClick={() => handleDeleteUserClick(user)}
                                className="rounded-lg p-1.5 text-muted hover:bg-rose-500/10 hover:text-rose-500 transition"
                                title="Delete user"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Role Permissions & Access Matrix */}
      {activeTab === "roles" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-ink">Role-Based Access Control (RBAC) Matrix</h2>
            <p className="text-xs text-muted">
              Granular permission boundaries governing each functional platform portal.
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-canvas">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface font-semibold text-muted">
                <tr>
                  <th className="p-3.5 w-1/3">Capability / Feature Area</th>
                  <th className="p-3.5 text-center">Admin</th>
                  <th className="p-3.5 text-center">Patent Analyst</th>
                  <th className="p-3.5 text-center">CEO Executive</th>
                  <th className="p-3.5 text-center">Drafter</th>
                  <th className="p-3.5 text-center">Design Lead</th>
                  <th className="p-3.5 text-center">Finance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {PERMISSIONS_MATRIX.map((item, idx) => (
                  <tr key={idx} className="hover:bg-hover/50 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-ink">{item.feature}</div>
                      <div className="text-[11px] text-muted">{item.description}</div>
                    </td>
                    <td className="p-3.5 text-center">
                      {item.ADMIN ? <Check className="size-4 text-emerald-500 mx-auto" /> : <X className="size-4 text-faint mx-auto opacity-30" />}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.PATENT_ANALYST ? <Check className="size-4 text-emerald-500 mx-auto" /> : <X className="size-4 text-faint mx-auto opacity-30" />}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.CEO ? <Check className="size-4 text-emerald-500 mx-auto" /> : <X className="size-4 text-faint mx-auto opacity-30" />}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.PATENT_DRAFTER ? <Check className="size-4 text-emerald-500 mx-auto" /> : <X className="size-4 text-faint mx-auto opacity-30" />}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.DESIGN_TEAM ? <Check className="size-4 text-emerald-500 mx-auto" /> : <X className="size-4 text-faint mx-auto opacity-30" />}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.FINANCE ? <Check className="size-4 text-emerald-500 mx-auto" /> : <X className="size-4 text-faint mx-auto opacity-30" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: System & Audit Trail */}
      {activeTab === "logs" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-ink">Administrative Activity & Security Audit Trail</h2>
            <p className="text-xs text-muted">
              Immutable chronological log of user creations, role assignments, and permission changes.
            </p>
          </div>

          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted border border-dashed border-line rounded-xl bg-canvas/50">
                <History className="size-8 text-faint mb-2 opacity-40" />
                <p className="font-semibold text-ink text-xs">No admin actions recorded in this session</p>
                <p className="text-[11px] text-muted mt-0.5">Creating users or modifying roles will record audit events here.</p>
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-xl border border-line bg-canvas p-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex size-7 items-center justify-center rounded-md bg-accent/10 text-accent font-bold">
                      <KeyRound className="size-3.5" />
                    </div>
                    <div>
                      <div className="font-bold text-ink">{log.action}</div>
                      <div className="text-[11px] text-muted">
                        Target: <strong className="text-ink">{log.targetUser}</strong> · Executed by: <span>{log.actor}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-faint font-mono text-[11px]">{log.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <UserPlus className="size-4 text-accent" />
                Create New Platform User
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-muted hover:bg-line"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-ink">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Jane Doe"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g., jane.doe@company.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Department</label>
                <input
                  type="text"
                  placeholder="e.g., Legal & IP, R&D Architecture, Finance"
                  value={formDepartment}
                  onChange={(e) => setFormDepartment(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="font-bold text-ink">Assign Functional Role *</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as RoleType)}
                  className="mt-1 w-full rounded-lg border border-line bg-canvas px-3 py-2 text-ink font-semibold outline-none"
                >
                  <option value="PATENT_ANALYST">Patent Analyst (Prior Art & Search)</option>
                  <option value="CEO">CEO (Executive Approvals & Portfolio)</option>
                  <option value="PATENT_DRAFTER">Patent Drafter (Spec & Claims)</option>
                  <option value="DESIGN_TEAM">Design Lead (FIG 1-N Drawings)</option>
                  <option value="FINANCE">Finance Controller (USPTO Fees)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                </select>
                <p className="mt-1 text-[10.5px] text-muted">{ROLE_CONFIGS[formRole]?.description}</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-line px-3 py-2 font-semibold text-muted hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2 font-bold text-white shadow-sm hover:brightness-110"
                >
                  Register User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Edit3 className="size-4 text-accent" />
                Change Role: {editingUser.name}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1 text-muted hover:bg-line"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-ink">Select New Role</label>
                <div className="mt-2 space-y-2">
                  {(Object.keys(ROLE_CONFIGS) as RoleType[]).map((rKey) => {
                    const r = ROLE_CONFIGS[rKey];
                    const isSelected = editingUser.role === rKey;
                    const Icon = ROLE_ICONS[rKey];
                    return (
                      <button
                        key={rKey}
                        onClick={() => handleUpdateUserRole(editingUser, rKey)}
                        className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                          isSelected
                            ? "border-accent bg-accent/10 font-bold text-accent"
                            : "border-line bg-canvas hover:border-line-strong text-ink"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="size-4" />
                          <span>{r.title}</span>
                        </div>
                        {isSelected && <Check className="size-4 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
