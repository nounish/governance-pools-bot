import BotSwarm from "@federationwtf/botswarm";
import { FederationNounsPool } from "@federationwtf/botswarm/contracts";
import MockNounsGovernor from "./contracts/MockNounsGovernor";
import MockNounsRelayer from "./contracts/MockNounsRelayer";
import Relic from "@relicprotocol/client";
import { ethers } from "ethers";

const { Ethereum } = BotSwarm();

const ethersProvider = new ethers.providers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL as string
);

const relic = await Relic.RelicClient.fromProvider(ethersProvider);

const { addTask, tasks, rescheduleTask, watch, read, clients } = Ethereum({
  contracts: {
    FederationNounsPool,
    MockNounsGovernor,
    MockNounsRelayer,
  },
  hooks: {
    getBlockProof: async (task) => {
      const { startBlock } = await read({
        contract: "MockNounsGovernor",
        chain: "sepolia",
        functionName: "getProposal",
        args: [task.args[0]],
      });

      const { hash } = await clients.sepolia.getTransaction({
        blockNumber: startBlock + 2n,
        index: 0,
      });

      const receipt = await ethersProvider.getTransactionReceipt(hash);

      const { proof } = await relic.transactionProver.getProofData(receipt);

      task.args.push(proof);

      return task;
    },
  },
  privateKey: process.env.ETHEREUM_PRIVATE_KEY as string,
  cacheTasks: false,
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
    contract: "MockNounsGovernor",
    chain: "sepolia",
    event: "VoteCast",
  },
  async (event) => {
    // const [, , , , , , , , , , , castWindow, finalityBlocks] = await read({
    //   contract: "MockNounsGovernor",
    //   chain: "sepolia",
    //   functionName: "config",
    // });

    // const { endBlock } = await read({
    //   contract: "MockNounsGovernor",
    //   chain: "sepolia",
    //   functionName: "getProposal",
    //   args: [event.args.proposal],
    // });

    addTask({
      block: event.blockNumber + 2n,
      hooks: ["getBlockProof"],
      contract: "MockNounsGovernor",
      chain: "sepolia",
      functionName: "settleVotes",
      // @ts-ignore
      args: [event.args.proposal],
    });
  }
);

// Relayer
watch(
  {
    contract: "MockNounsGovernor",
    chain: "sepolia",
    event: "VotesSettled",
  },
  async (event) => {
    addTask({
      block: event.blockNumber + 2n,
      // hooks: ["getMessageProof"],
      contract: "MockNounsRelayer",
      chain: "sepolia",
      functionName: "relayVotes",
      args: [event.args],
    });
  }
);
