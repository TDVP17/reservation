
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AgenceHome() {
  const router = useRouter();

  useEffect(() => {
    router.push("/dashboard");
  }, []);

  return null;
}
