import { NextResponse } from "next/server";
import { getWorkspaceByPublicKeyAction } from "@/app/actions/widget";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") || searchParams.get("publicKey");

  if (!key) {
    return NextResponse.json(
      { error: "Missing required query parameter: key" },
      {
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  const workspace = await getWorkspaceByPublicKeyAction(key);
  if (!workspace) {
    return NextResponse.json(
      { error: "Workspace not found for key: " + key },
      {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  return NextResponse.json(
    {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        publicKey: workspace.publicKey,
        brandColor: workspace.brandColor,
        welcomeTitle: workspace.welcomeTitle,
        welcomeSubtitle: workspace.welcomeSubtitle,
        logoUrl: workspace.logoUrl,
        launcherIconUrl: workspace.launcherIconUrl,
        launcherText: workspace.launcherText,
        showLauncherText: workspace.showLauncherText,
      },
    },
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, data-workspace-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}
