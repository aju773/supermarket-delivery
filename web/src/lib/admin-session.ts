import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type StaffMember = { username: string };

/** The signed-in Staff Member, read by forwarding the browser's session cookie to the API. */
export async function getStaffMember(): Promise<StaffMember | null> {
  const response = await fetch(`${process.env.API_INTERNAL_URL}/api/admin/auth/me`, {
    headers: { cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Staff session request failed: ${response.status}`);
  return response.json();
}

/** For every admin page: logged-out visitors go to the login page. */
export async function requireStaffMember(): Promise<StaffMember> {
  const staffMember = await getStaffMember();
  if (!staffMember) redirect("/admin/login");
  return staffMember;
}

/** GETs from the admin API on the server, as the signed-in Staff Member. */
export async function adminGet<T>(path: string): Promise<T> {
  const response = await fetch(`${process.env.API_INTERNAL_URL}/api/admin${path}`, {
    headers: { cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  if (response.status === 401) redirect("/admin/login");
  if (!response.ok) throw new Error(`Admin request ${path} failed: ${response.status}`);
  return response.json();
}

/** Every item of a paginated admin list, fetching page after page. */
export async function adminGetAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const { items: pageItems, count } = await adminGet<{ items: T[]; count: number }>(`${path}?page=${page}`);
    items.push(...pageItems);
    if (pageItems.length === 0 || items.length >= count) return items;
  }
}
