import { INITIAL_WORKSPACE } from "./workspaceStore";

export interface TeamMember {
  id: string;
  email: string;
  fullName: string;
  role: "superadmin" | "admin" | "agent" | "customer";
  workspaceId: string;
  avatarUrl?: string;
  password?: string;
  isActive?: boolean;
  createdAt: string;
}

export const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "u-superadmin-master-001",
    email: "superadmin@fluxdesk.com",
    fullName: "Platform Super Admin (Owner)",
    role: "superadmin",
    workspaceId: INITIAL_WORKSPACE.id,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    password: "superadmin123",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "u0000000-0000-0000-0000-000000000001",
    email: "alex.admin@acmesupport.com",
    fullName: "Alex Vance",
    role: "admin",
    workspaceId: INITIAL_WORKSPACE.id,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    password: "password123",
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "u0000000-0000-0000-0000-000000000002",
    email: "sarah.agent@acmesupport.com",
    fullName: "Sarah Connor",
    role: "agent",
    workspaceId: INITIAL_WORKSPACE.id,
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    password: "password123",
    isActive: true,
    createdAt: "2026-01-02T10:00:00Z",
  },
  {
    id: "u0000000-0000-0000-0000-000000000003",
    email: "david.agent@acmesupport.com",
    fullName: "David Kim",
    role: "agent",
    workspaceId: INITIAL_WORKSPACE.id,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    password: "password123",
    isActive: true,
    createdAt: "2026-01-03T11:00:00Z",
  },
];

declare global {
  // eslint-disable-next-line no-var
  var __FLUXDESK_TEAM_MEMBERS__: TeamMember[] | undefined;
}

if (!globalThis.__FLUXDESK_TEAM_MEMBERS__) {
  globalThis.__FLUXDESK_TEAM_MEMBERS__ = [...INITIAL_TEAM_MEMBERS];
}

export function getSharedTeamMembers(workspaceId?: string): TeamMember[] {
  if (!globalThis.__FLUXDESK_TEAM_MEMBERS__) {
    globalThis.__FLUXDESK_TEAM_MEMBERS__ = [...INITIAL_TEAM_MEMBERS];
  }
  if (!workspaceId) {
    return globalThis.__FLUXDESK_TEAM_MEMBERS__;
  }
  return globalThis.__FLUXDESK_TEAM_MEMBERS__.filter(
    (m) => m.workspaceId === workspaceId
  );
}

export function addSharedTeamMember(member: TeamMember): void {
  if (!globalThis.__FLUXDESK_TEAM_MEMBERS__) {
    globalThis.__FLUXDESK_TEAM_MEMBERS__ = [...INITIAL_TEAM_MEMBERS];
  }
  const existingIdx = globalThis.__FLUXDESK_TEAM_MEMBERS__.findIndex(
    (m) => m.email.toLowerCase() === member.email.toLowerCase() && m.workspaceId === member.workspaceId
  );
  if (existingIdx !== -1) {
    globalThis.__FLUXDESK_TEAM_MEMBERS__[existingIdx] = member;
  } else {
    globalThis.__FLUXDESK_TEAM_MEMBERS__.unshift(member);
  }
}

export function updateSharedTeamMember(id: string, updates: Partial<TeamMember>): TeamMember | undefined {
  if (!globalThis.__FLUXDESK_TEAM_MEMBERS__) {
    globalThis.__FLUXDESK_TEAM_MEMBERS__ = [...INITIAL_TEAM_MEMBERS];
  }
  const idx = globalThis.__FLUXDESK_TEAM_MEMBERS__.findIndex((m) => m.id === id);
  if (idx !== -1) {
    globalThis.__FLUXDESK_TEAM_MEMBERS__[idx] = {
      ...globalThis.__FLUXDESK_TEAM_MEMBERS__[idx],
      ...updates,
    };
    return globalThis.__FLUXDESK_TEAM_MEMBERS__[idx];
  }
  return undefined;
}

export function deleteSharedTeamMember(id: string): boolean {
  if (!globalThis.__FLUXDESK_TEAM_MEMBERS__) {
    globalThis.__FLUXDESK_TEAM_MEMBERS__ = [...INITIAL_TEAM_MEMBERS];
  }
  const idx = globalThis.__FLUXDESK_TEAM_MEMBERS__.findIndex((m) => m.id === id);
  if (idx !== -1) {
    globalThis.__FLUXDESK_TEAM_MEMBERS__.splice(idx, 1);
    return true;
  }
  return false;
}
