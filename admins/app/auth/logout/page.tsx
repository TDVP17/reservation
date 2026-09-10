"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logoutAdmin } from "@/lib/auth";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    logoutAdmin();
    router.replace("/auth/login");
  }, [router]);

  return null;
}
