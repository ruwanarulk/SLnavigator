import "server-only";
import { cookies } from "next/headers";
import { ApiError } from "./api";
import type { User } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Server Component calls straight to NestJS, forwarding the session cookie. */
export async function serverApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    cache: "no-store",
    headers: { ...init.headers, cookie: jar.toString() },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.message ?? res.statusText);
  return body as T;
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  if (!jar.has("sln_session")) return null;
  try {
    return await serverApi<User>("/auth/me");
  } catch {
    return null;
  }
}
