//ui.profileMenu.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";
import { getMonProfil } from "@/lib/client.service";

export default function ProfileMenu() {
  const [client, setClient] = useState<any>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    getMonProfil()
      .then(({ client }) => setClient(client))
      .catch(() => setClient(null));
  }, []);

  if (!client) return null;

  return (
    <div className="relative">
      {/* HEADER */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted"
      >
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
          {client.name?.charAt(0).toUpperCase()}
        </div>

        {/* Infos */}
        <div className="flex-1 text-left">
          <p className="text-sm font-medium">{client.name}</p>
          <p className="text-xs text-muted-foreground">
            {client.email}
          </p>
        </div>

        <ChevronDown size={16} />
      </button>

      {/* DROPDOWN */}
      {open && (
        <div className="absolute bottom-14 left-0 w-full bg-background border rounded-lg shadow-md">
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
          >
            <User size={16} />
            Profile
          </Link>


          <Link
            href="/setting"
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
          >
            <Settings size={16} />
            Settings
          </Link>

          <Link
            href="/logout"
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-muted"
          >
            <LogOut size={16} />
            Logout
          </Link>
        </div>
      )}
    </div>
  );
}
