"use client";

import React from "react";
import type { ReactNode } from "react";
import { ArrowRight, BarChart3, Lock, RefreshCw, ShieldCheck } from "lucide-react";

import { useEncryptedMvpVoting } from "@/hooks/useEncryptedMvpVoting";
import { useRainbowSigner } from "@/hooks/useRainbowSigner";

const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export default function Home() {
  const signer = useRainbowSigner();
  const voting = useEncryptedMvpVoting();

  // Handle client-side only conditions to prevent hydration mismatch
  const [isClient, setIsClient] = React.useState(false);
  const [isLocalhost, setIsLocalhost] = React.useState(false);
  const [showDecryptModal, setShowDecryptModal] = React.useState(false);
  const [decryptProgress, setDecryptProgress] = React.useState<string>("");

  React.useEffect(() => {
    setIsClient(true);
    setIsLocalhost(typeof window !== 'undefined' && window.location.hostname === 'localhost');
  }, []);

  const connectedChain = voting.contractInfo.chainName ?? "Unsupported network";
  const contractBadge = voting.contractInfo.address
    ? `${voting.contractInfo.address.slice(0, 6)}...${voting.contractInfo.address.slice(-4)}`
    : "No deployment for this network";

  const allowActions = Boolean(signer.isConnected && voting.contractInfo.address);

  // State for rating selection
  const [selectedRatings, setSelectedRatings] = React.useState<{[playerId: number]: number}>({});

  // Track which players the user has voted for (per-player voting)
  const [votedPlayers, setVotedPlayers] = React.useState<Set<number>>(new Set());

  // Track which players' scores have been decrypted
  const [decryptedPlayers, setDecryptedPlayers] = React.useState<Set<number>>(new Set());

  return (
    <>
      <main className="space-y-10 pb-16">
      <section className="hero-grid frosted relative overflow-hidden rounded-3xl border border-white/5 p-8 md:p-12">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d1f3f]/60 via-transparent to-[#30ffb1]/10" />
        <div className="relative flex flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm uppercase tracking-[0.35em] text-[--muted]">
            Encrypted MVP Voting
          </div>
          <h1 className="text-4xl font-bold md:text-6xl">
            Secure{" "}
            <span className="bg-gradient-to-r from-[#30ffb1] to-[#0d1f3f] bg-clip-text text-transparent">
              Blockchain Voting
            </span>
          </h1>
          <p className="text-lg text-[--muted] md:text-xl">
            Vote for your favorite players with complete privacy and security powered by FHEVM.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm">
              <ShieldCheck className="h-4 w-4" />
              Privacy-Preserving
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm">
              <Lock className="h-4 w-4" />
              Encrypted Ratings
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Transparent Results
            </div>
          </div>
        </div>
        <div className="relative">
          <div className="mx-auto max-w-md">
            <div className="frosted rounded-2xl border border-white/5 p-6">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[--foreground]">
                    {formatter.format(voting.totalVotes)}
                  </div>
                  <div className="text-sm text-[--muted]">Total Votes Cast</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-[--foreground]">
                      {voting.players.length}
                    </div>
                    <div className="text-xs text-[--muted]">Players</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-[--foreground]">
                      {connectedChain}
                    </div>
                    <div className="text-xs text-[--muted]">Network</div>
                  </div>
                </div>
                <div className="text-center text-xs text-[--muted]">
                  Contract: {contractBadge}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Players Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Vote for Players</h2>
          <button
            onClick={() => voting.refreshData()}
            disabled={!allowActions}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm hover:bg-black/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {!allowActions && (
          <div className="frosted rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <div>
                <div className="font-medium text-yellow-500">Wallet Connection Required</div>
                <div className="text-sm text-[--muted]">
                  Please connect your wallet to vote and interact with the contract.
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {voting.players.map((player, index) => {
            const playerId = index;
            const hasVoted = votedPlayers.has(playerId);
            const isDecrypted = decryptedPlayers.has(playerId);

            return (
              <div
                key={playerId}
                className="frosted rounded-xl border border-white/5 p-6 hover:border-white/10 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{player.name}</h3>
                    {hasVoted && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-500">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Voted
                      </div>
                    )}
                  </div>

                  {isDecrypted ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[--muted]">Score</span>
                        <span className="font-mono font-medium">
                          {formatter.format(Number(player.score || 0))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[--muted]">Votes</span>
                        <span className="font-mono font-medium">
                          {formatter.format(Number(player.ballots || 0))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-[--muted]">Rate this player (1-11)</div>
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((rating) => (
                          <button
                            key={rating}
                            onClick={() => {
                              setSelectedRatings(prev => ({
                                ...prev,
                                [playerId]: rating
                              }));
                            }}
                            disabled={hasVoted || !allowActions}
                            className={`rounded px-3 py-1 text-sm transition-colors ${
                              selectedRatings[playerId] === rating
                                ? "bg-[#30ffb1] text-black"
                                : "border border-white/10 bg-black/30 hover:bg-black/50"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={async () => {
                          const rating = selectedRatings[playerId];
                          if (!rating) return;

                          try {
                            await voting.voteForPlayer(playerId, rating);
                            setVotedPlayers(prev => new Set([...prev, playerId]));
                            setSelectedRatings(prev => {
                              const newRatings = { ...prev };
                              delete newRatings[playerId];
                              return newRatings;
                            });
                          } catch (error) {
                            console.error("Voting failed:", error);
                          }
                        }}
                        disabled={!selectedRatings[playerId] || hasVoted || !allowActions}
                        className="w-full rounded-lg bg-[#30ffb1] px-4 py-2 text-sm font-medium text-black hover:bg-[#30ffb1]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {hasVoted ? "Already Voted" : "Vote"}
                      </button>
                    </div>
                  )}

                  {!isDecrypted && (
                    <button
                      onClick={async () => {
                        setShowDecryptModal(true);
                        setDecryptProgress("Initializing decryption...");

                        try {
                          await voting.decryptLocally(
                            playerId,
                            (progress: string) => setDecryptProgress(progress)
                          );
                          setDecryptedPlayers(prev => new Set([...prev, playerId]));
                        } catch (error) {
                          console.error("Decryption failed:", error);
                        } finally {
                          setShowDecryptModal(false);
                          setDecryptProgress("");
                        }
                      }}
                      disabled={!allowActions}
                      className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-2 text-sm hover:bg-black/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Decrypt Results
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
      </main>

      {/* Decrypt Modal */}
      {showDecryptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="frosted mx-4 max-w-md rounded-2xl border border-white/5 p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <h3 className="font-semibold">Decrypting Results</h3>
              </div>
              <p className="text-sm text-[--muted]">{decryptProgress}</p>
              <div className="h-2 rounded-full bg-white/10">
                <div className="h-2 w-1/2 rounded-full bg-[#30ffb1] animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
