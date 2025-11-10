"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";
import type { Address } from "viem";

// For local demo, use simple voting without FHE complexity
const USE_SIMPLE_VOTING = true; // Set to true to use simple voting for local demo

import { EncryptedMvpVotingABI } from "@/abi/EncryptedMvpVotingABI";
import { EncryptedMvpVotingAddresses } from "@/abi/EncryptedMvpVotingAddresses";
import { SimpleVotingABI } from "@/abi/SimpleVotingABI";
import { SimpleVotingAddresses } from "@/abi/SimpleVotingAddresses";
import { useFhevm } from "@/fhevm/useFhevm";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { useInMemoryStorage } from "@/hooks/useInMemoryStorage";
import { useRainbowSigner } from "@/hooks/useRainbowSigner";

export type PlayerSnapshot = {
  id: number;
  name: string;
  ballots: number;
  handle: string;
  lastClear?: number;
  lastUpdated?: number;
  lastRequester?: string;
};

type ContractInfo = {
  abi: readonly any[];
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

type VotingState = {
  players: PlayerSnapshot[];
  isLoading: boolean;
  isCasting: boolean;
  isDecrypting: boolean;
  statusMessage?: string;
  contractInfo: ContractInfo;
  voteForPlayer: (playerId: number, rating?: number) => Promise<boolean>;
  decryptLocally: (playerId: number, progressCallback?: (progress: string) => void) => Promise<void>;
  refreshPlayers: () => Promise<void>;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function useVotingContract() {
  const signer = useRainbowSigner();
  const fhevm = useFhevm();
  const storage = useInMemoryStorage();

  // Determine which contract to use
  const contractInfo = useMemo((): ContractInfo => {
    if (!signer.chain?.id) return { abi: [], chainName: "No chain" };

    // Check environment variables for contract addresses first
    const envAddressKey = signer.chain.id === 31337 ? 'NEXT_PUBLIC_CONTRACT_ADDRESS_LOCALHOST' :
                          signer.chain.id === 11155111 ? 'NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA' :
                          `NEXT_PUBLIC_CONTRACT_ADDRESS_${signer.chain.id}`;

    const envAddress = process.env[envAddressKey];

    // Fallback to static configuration
    const key = signer.chain.id.toString() as keyof typeof SimpleVotingAddresses;
    const entry = SimpleVotingAddresses[key];

    // For SimpleVoting (our current implementation)
    const address = envAddress || entry?.address;
    const chainName = entry?.chainName || "unknown";

    return {
      abi: SimpleVotingABI,
      address: address as `0x${string}`,
      chainId: signer.chain.id,
      chainName,
    };
  }, [signer.chain?.id]);

  const [players, setPlayers] = useState<PlayerSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [totalVotes, setTotalVotes] = useState(0);

  const refreshPlayers = useCallback(async () => {
    if (!contractInfo.address || !signer.signer) return;

    setIsLoading(true);
    try {
      const contract = new ethers.Contract(
        contractInfo.address,
        contractInfo.abi,
        signer.signer
      );

      // Get total players
      const totalPlayers = await contract.totalPlayers();
      setTotalVotes(Number(await contract.totalVotes?.() || 0));

      if (totalPlayers > 0) {
        // Get player data
        const playersData = await contract.listPlayers();
        const newPlayers: PlayerSnapshot[] = [];

        for (let i = 0; i < Math.min(Number(totalPlayers), 20); i++) {
          const name = playersData[0][i];
          const score = playersData[1][i];
          const ballots = playersData[2][i];

          newPlayers.push({
            id: i,
            name: name || `Player ${i + 1}`,
            ballots: Number(ballots || 0),
            handle: name || `Player ${i + 1}`,
          });
        }

        setPlayers(newPlayers);
      } else {
        setPlayers([]);
      }
    } catch (error) {
      console.error("Failed to refresh players:", error);
      toast.error("Failed to load players");
    } finally {
      setIsLoading(false);
    }
  }, [contractInfo, signer.signer]);

  const voteForPlayer = useCallback(async (playerId: number, rating: number = 1): Promise<boolean> => {
    if (!contractInfo.address || !signer.signer) {
      toast.error("Wallet not connected");
      return false;
    }

    setIsCasting(true);
    setStatusMessage("Casting vote...");

    try {
      const contract = new ethers.Contract(
        contractInfo.address,
        contractInfo.abi,
        signer.signer
      );

      // Call vote function with rating
      const tx = await contract.voteFor(playerId, rating);
      setStatusMessage("Waiting for confirmation...");

      await tx.wait();
      setStatusMessage("Vote cast successfully!");

      toast.success(`Vote cast for ${players[playerId]?.name || `Player ${playerId + 1}`}`);

      // Refresh data
      await refreshPlayers();
      return true;
    } catch (error: any) {
      console.error("Voting failed:", error);

      // Handle specific error messages
      if (error.message?.includes("Already voted")) {
        toast.error("You have already voted for this player");
      } else if (error.message?.includes("Invalid player")) {
        toast.error("Invalid player selected");
      } else if (error.message?.includes("Rating must be between 1 and 11")) {
        toast.error("Rating must be between 1 and 11");
      } else if (error.code === "CALL_EXCEPTION" || error.message?.includes("missing revert data")) {
        toast.error("Transaction failed. Please check your wallet and try again.");
      } else {
        toast.error("Voting failed: " + (error.message || "Unknown error"));
      }

      return false;
    } finally {
      setIsCasting(false);
      setTimeout(() => setStatusMessage(undefined), 3000);
    }
  }, [contractInfo, signer.signer, players, refreshPlayers]);

  const decryptLocally = useCallback(async (
    playerId: number,
    progressCallback?: (progress: string) => void
  ): Promise<void> => {
    if (!contractInfo.address || !signer.signer) {
      throw new Error("Wallet not connected");
    }

    setIsDecrypting(true);
    setStatusMessage("Decrypting results...");

    try {
      const contract = new ethers.Contract(
        contractInfo.address,
        contractInfo.abi,
        signer.signer
      );

      progressCallback?.("Requesting decryption permission...");

      // Request decryption permission - this will trigger MetaMask popup
      const tx = await contract.allowAdminToDecrypt(playerId);
      progressCallback?.("Waiting for transaction confirmation...");
      await tx.wait();
      progressCallback?.("Permission granted, reading data...");

      // Read the decrypted data
      const [name, score, ballots] = await contract.getPlayer(playerId);

      // Update the player data
      setPlayers(prev => prev.map(player =>
        player.id === playerId
          ? { ...player, name, ballots: Number(ballots), score: Number(score) }
          : player
      ));

      progressCallback?.("Decryption complete!");
      toast.success("Results decrypted successfully");

    } catch (error: any) {
      console.error("Decryption failed:", error);

      if (error.code === 4001 || error.message?.includes("User denied")) {
        throw new Error("Transaction cancelled by user");
      } else if (error.code === "CALL_EXCEPTION" || error.message?.includes("missing revert data")) {
        // If transaction fails, try to read data directly (fallback)
        progressCallback?.("Transaction failed, attempting direct read...");
        try {
          const contract = new ethers.Contract(
            contractInfo.address,
            contractInfo.abi,
            signer.signer
          );

          const [name, score, ballots] = await contract.getPlayer(playerId);
          setPlayers(prev => prev.map(player =>
            player.id === playerId
              ? { ...player, name, ballots: Number(ballots), score: Number(score) }
              : player
          ));

          toast.success("Results read successfully (direct access)");
        } catch (directError) {
          throw new Error("Failed to decrypt results");
        }
      } else {
        throw error;
      }
    } finally {
      setIsDecrypting(false);
      setTimeout(() => setStatusMessage(undefined), 3000);
    }
  }, [contractInfo, signer.signer]);

  // Auto-refresh on mount and when contract info changes
  useEffect(() => {
    if (contractInfo.address && signer.signer) {
      refreshPlayers();
    }
  }, [contractInfo.address, signer.signer, refreshPlayers]);

  return {
    players,
    totalVotes,
    isLoading,
    isCasting,
    isDecrypting,
    statusMessage,
    contractInfo,
    voteForPlayer,
    decryptLocally,
    refreshData: refreshPlayers,
    refreshPlayers,
  };
}

export function useEncryptedMvpVoting(): VotingState {
  const voting = useVotingContract();

  return {
    players: voting.players,
    totalVotes: voting.totalVotes,
    isLoading: voting.isLoading,
    isCasting: voting.isCasting,
    isDecrypting: voting.isDecrypting,
    statusMessage: voting.statusMessage,
    contractInfo: voting.contractInfo,
    voteForPlayer: voting.voteForPlayer,
    decryptLocally: voting.decryptLocally,
    refreshPlayers: voting.refreshPlayers,
  };
}
