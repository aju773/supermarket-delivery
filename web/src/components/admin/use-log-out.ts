"use client";

import { useRouter } from "next/navigation";

import { useToast } from "@/components/admin/toast";
import { adminPost, errorDetail } from "@/lib/admin-api";

export function useLogOut() {
  const router = useRouter();
  const toast = useToast();
  return async () => {
    const response = await adminPost("/auth/logout");
    // 401 means the session had already ended, which is what logging out wants.
    if (!response.ok && response.status !== 401) {
      toast(await errorDetail(response));
      return;
    }
    router.replace("/admin/login");
    router.refresh();
  };
}
