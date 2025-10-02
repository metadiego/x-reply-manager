"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const logout = async () => {
    await signOut({ callbackUrl: "/auth/login" });
  };

  return <Button onClick={logout}>Logout</Button>;
}
