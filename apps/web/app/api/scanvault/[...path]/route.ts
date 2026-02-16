import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const upstreamApiBaseUrl =
  process.env.SCANVAULT_API_UPSTREAM_URL ??
  "https://func-scanvault-dev-a9e0bre8hfapg4h4.westus-01.azurewebsites.net/api";

const jwtSecret = process.env.API_JWT_SECRET ?? process.env.BETTER_AUTH_SECRET ?? "";

function createTargetUrl(path: string[], source: NextRequest): string {
  const upstreamBase = upstreamApiBaseUrl.endsWith("/") ? upstreamApiBaseUrl : `${upstreamApiBaseUrl}/`;
  const target = new URL(path.join("/"), upstreamBase);
  target.search = source.nextUrl.search;
  return target.toString();
}

async function createApiToken(request: NextRequest): Promise<string | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return null;
    return jwt.sign(
      { sub: session.user.id, email: session.user.email ?? undefined, name: session.user.name ?? undefined },
      jwtSecret,
      { algorithm: "HS256", expiresIn: "1h" }
    );
  } catch {
    return null;
  }
}

async function proxyRequest(request: NextRequest, context: { params: { path: string[] } }): Promise<NextResponse> {
  const targetUrl = createTargetUrl(context.params.path, request);
  const reqHeaders = new Headers();

  for (const header of ["accept", "content-type"] as const) {
    const value = request.headers.get(header);
    if (value) reqHeaders.set(header, value);
  }

  const existingAuth = request.headers.get("authorization");
  if (existingAuth) {
    reqHeaders.set("authorization", existingAuth);
  } else {
    const token = await createApiToken(request);
    if (token) reqHeaders.set("authorization", `Bearer ${token}`);
  }

  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: reqHeaders,
    body: body && body.length > 0 ? body : undefined,
  });

  const responseBody = await response.text();
  const responseHeaders = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  return new NextResponse(responseBody, { status: response.status, headers: responseHeaders });
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }): Promise<NextResponse> {
  return proxyRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }): Promise<NextResponse> {
  return proxyRequest(request, context);
}
