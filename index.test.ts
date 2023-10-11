import BotSwarm from "@federationwtf/botswarm";

import {
  FederationNounsPool,
  FederationNounsGovernor,
  FederationNounsRelayer,
} from "@federationwtf/botswarm/contracts";

const { Ethereum } = BotSwarm();

const { addTask, tasks, rescheduleTask, watch, read } = Ethereum({
  contracts: {
    FederationNounsPool,
    FederationNounsGovernor,
    FederationNounsRelayer,
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
    const [, , , , , , , , , , castWindow, finalityBlocks] = await read({
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
      contract: "FederationNounsGovernor",
      chain: "zkSyncTestnet",
      functionName: "settleVotes",
      args: [event.args.proposal],
    });
  }
);
