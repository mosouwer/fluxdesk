export interface Workspace {
  id: string;
  name: string;
  slug: string;
  publicKey?: string;
  brandColor?: string;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  logoUrl?: string;
  launcherIconUrl?: string;
  launcherText?: string;
  showLauncherText?: boolean;
  adminName?: string;
  ownerEmail?: string;
  status?: 'active' | 'suspended';
  tier?: 'Free' | 'Starter' | 'Pro' | 'Enterprise VIP';
  createdAt: string;
}

export const INITIAL_WORKSPACE: Workspace = {
  id: "5c03df0f-591e-463c-8dd5-e64e6055af2a",
  name: "Acme Cloud Technologies",
  slug: "acme-support",
  publicKey: "pk_live_acme_cloud_tech",
  brandColor: "#2563eb",
  welcomeTitle: "Hi there! 👋 How can we help you today?",
  welcomeSubtitle: "Fill in your details below and a member of our team will assist you right away.",
  logoUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=AcmeCloud",
  launcherIconUrl: "",
  launcherText: "Chat with us",
  showLauncherText: false,
  adminName: "Alex Vance",
  ownerEmail: "alex.vance@acmecloud.io",
  status: "active",
  tier: "Enterprise VIP",
  createdAt: "2026-01-01T00:00:00Z",
};

declare global {
  // eslint-disable-next-line no-var
  var __FLUXDESK_WORKSPACES__: Workspace[] | undefined;
  // eslint-disable-next-line no-var
  var __FLUXDESK_ACTIVE_WORKSPACE__: Workspace | undefined;
}

if (!globalThis.__FLUXDESK_WORKSPACES__) {
  globalThis.__FLUXDESK_WORKSPACES__ = [INITIAL_WORKSPACE];
}

if (!globalThis.__FLUXDESK_ACTIVE_WORKSPACE__) {
  globalThis.__FLUXDESK_ACTIVE_WORKSPACE__ = INITIAL_WORKSPACE;
}

export function getSharedWorkspaces(): Workspace[] {
  if (!globalThis.__FLUXDESK_WORKSPACES__) {
    globalThis.__FLUXDESK_WORKSPACES__ = [INITIAL_WORKSPACE];
  }
  return globalThis.__FLUXDESK_WORKSPACES__;
}

export function getActiveWorkspace(): Workspace {
  if (!globalThis.__FLUXDESK_ACTIVE_WORKSPACE__) {
    globalThis.__FLUXDESK_ACTIVE_WORKSPACE__ = INITIAL_WORKSPACE;
  }
  return globalThis.__FLUXDESK_ACTIVE_WORKSPACE__;
}

export function setActiveWorkspace(workspace: Workspace): void {
  globalThis.__FLUXDESK_ACTIVE_WORKSPACE__ = workspace;
}

export function addSharedWorkspace(workspace: Workspace): void {
  const workspaces = getSharedWorkspaces();
  const existingIdx = workspaces.findIndex((w) => w.slug === workspace.slug || w.id === workspace.id);
  if (existingIdx !== -1) {
    workspaces[existingIdx] = workspace;
  } else {
    workspaces.unshift(workspace);
  }
}

export function getWorkspaceByPublicKey(publicKey: string): Workspace | undefined {
  if (!publicKey) return undefined;
  const workspaces = getSharedWorkspaces();
  return workspaces.find(
    (w) =>
      w.publicKey === publicKey ||
      w.id === publicKey ||
      w.slug === publicKey ||
      (publicKey === "pk_live_acme_cloud_tech" && w.id === INITIAL_WORKSPACE.id)
  );
}

export function updateSharedWorkspaceBrandColor(workspaceId: string, brandColor: string): Workspace | undefined {
  return updateSharedWorkspaceBranding(workspaceId, { brandColor });
}

export function updateSharedWorkspaceBranding(
  workspaceId: string,
  updates: Partial<Workspace>
): Workspace | undefined {
  const workspaces = getSharedWorkspaces();
  const ws = workspaces.find((w) => w.id === workspaceId);
  if (ws) {
    Object.assign(ws, updates);
  }
  const active = getActiveWorkspace();
  if (active.id === workspaceId) {
    Object.assign(active, updates);
  }
  return ws || active;
}

export function toggleSharedWorkspaceStatus(
  workspaceId: string,
  status: 'active' | 'suspended'
): Workspace | undefined {
  return updateSharedWorkspaceBranding(workspaceId, { status });
}

export function deleteSharedWorkspace(workspaceId: string): boolean {
  const workspaces = getSharedWorkspaces();
  const idx = workspaces.findIndex((w) => w.id === workspaceId);
  if (idx !== -1) {
    workspaces.splice(idx, 1);
    return true;
  }
  return false;
}
