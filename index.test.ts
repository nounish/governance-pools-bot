import BotSwarm from "@federationwtf/botswarm";
import {
  FederationNounsPool,
  FederationNounsGovernor,
  FederationNounsRelayer,
} from "@federationwtf/botswarm/contracts";
import { RelicClient } from "@relicprotocol/client";
import { ethers } from "ethers";

const { Ethereum } = BotSwarm();

const ethersProvider = new ethers.providers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL as string
);

const relic = await RelicClient.fromProvider(ethersProvider);

const { addTask, tasks, rescheduleTask, watch, read, clients } = Ethereum({
  contracts: {
    FederationNounsPool,
    FederationNounsGovernor,
    FederationNounsRelayer,
  },
  hooks: {
    getBlockProof: async (task, block) => {
      const { blockHash } = await clients.sepolia.getTransaction({
        blockNumber: block,
        index: 0,
      });

      const receipt = await ethersProvider.getTransactionReceipt(blockHash);

      const { proof } = await relic.transactionProver.getProofData(receipt);

      task.args.push(proof);

      return task;
    },
  },
  privateKey: process.env.ETHEREUM_PRIVATE_KEY as string,
});

// Governance Pools
watch(
  { contract: "FederationNounsPool", chain: "sepolia", event: "BidPlaced" },
  async (event) => {
    const { auctionEndBlock } = await read({
      contract: "FederationNounsPool",
      chain: "sepolia",
      functionName: "getBid",
      args: [event.args.propId],
    });

    const task = tasks().find((_task) => _task.args[0] === event.args.propId);

    if (task && task.block !== auctionEndBlock) {
      rescheduleTask(task.id, auctionEndBlock + 1n);
    } else {
      addTask({
        block: auctionEndBlock + 1n,
        contract: "FederationNounsPool",
        chain: "sepolia",
        functionName: "castVote",
        args: [event.args.propId],
        priorityFee: 15,
        maxBaseFeeForPriority: 30,
      });
    }
  }
);

// L2 Governance

// Governor
watch(
  {
    contract: "FederationNounsGovernor",
    chain: "zkSyncTestnet",
    event: "VoteCast",
  },
  async (event) => {
    const [, , , , , , , , , , , castWindow, finalityBlocks] = await read({
      contract: "FederationNounsGovernor",
      chain: "zkSyncTestnet",
      functionName: "config",
    });

    const { endBlock } = await read({
      contract: "FederationNounsGovernor",
      chain: "zkSyncTestnet",
      functionName: "getProposal",
      args: [event.args.proposal],
    });

    addTask({
      block: endBlock - (castWindow + finalityBlocks),
      hooks: ["getBlockProof"],
      contract: "FederationNounsGovernor",
      chain: "zkSyncTestnet",
      functionName: "settleVotes",
      // @ts-ignore
      args: [event.args.proposal],
    });
  }
);

// Relayer
watch(
  {
    contract: "FederationNounsGovernor",
    chain: "zkSyncTestnet",
    event: "VotesSettled",
  },
  async (event) => {
    addTask({
      block: event.blockNumber,
      hooks: ["getMessageProof"],
      contract: "FederationNounsRelayer",
      chain: "sepolia",
      functionName: "relayVotes",
      args: [event.args.proposal],
    });
  }
);
