import Link from "next/link";
import { Button } from "./ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const session = await getServerSession(authOptions);

  return session?.user ? (
    <LogoutButton />
  ) : (
    <Button asChild size="sm" variant={"default"}>
      <Link href="/">Sign in with Twitter</Link>
    </Button>
  );
}
