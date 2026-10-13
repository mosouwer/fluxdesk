import React from "react";
import { getWorkspaceByPublicKeyAction } from "@/app/actions/widget";
import { EmbeddedChatWidget } from "@/components/embed/EmbeddedChatWidget";
import { AlertCircle, LifeBuoy } from "lucide-react";

export const dynamic = "force-dynamic";

interface EmbedChatPageProps {
  searchParams: Promise<{
    key?: string;
    workspace?: string;
  }>;
}

export default async function EmbedChatPage({ searchParams }: EmbedChatPageProps) {
  const resolvedParams = await searchParams;
  const publicKey = resolvedParams.key || resolvedParams.workspace || "pk_live_acme_cloud_tech";

  const workspace = await getWorkspaceByPublicKeyAction(publicKey);

  if (!workspace) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans text-slate-800">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full text-center space-y-3">
          <div className="h-12 w-12 rounded-xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Workspace Not Found</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Unable to locate the support workspace associated with key:
            </p>
            <p className="font-mono text-[11px] text-slate-700 bg-slate-50 border border-slate-200 rounded p-1.5 mt-2 break-all">
              {publicKey}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <EmbeddedChatWidget workspace={workspace} />;
}
