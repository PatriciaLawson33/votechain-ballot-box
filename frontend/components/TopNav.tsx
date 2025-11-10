"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Vote } from "lucide-react";
import Link from "next/link";

export function TopNav() {
  return (
    <nav className="flex items-center justify-between py-6">
      <Link href="/" className="flex items-center gap-2">
        <Vote className="h-8 w-8 text-[#30ffb1]" />
        <span className="text-xl font-bold">VoteChain Ballot</span>
      </Link>

      <div className="flex items-center gap-4">
        <ConnectButton />
      </div>
    </nav>
  );
}
