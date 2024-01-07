import BotSwarm from "@federationwtf/botswarm";
import {
  FederationNounsPool,
  FederationNounsGovernor,
  FederationNounsRelayer,
  NounsDAOLogicV3,
} from "@federationwtf/botswarm/contracts";
import Relic from "@relicprotocol/client";
import { ethers } from "ethers";
import { Provider } from "zksync-web3";

const { Ethereum, log } = BotSwarm();

const mainnetProvider = new ethers.providers.JsonRpcProvider(
  "https://rpc.flashbots.net/"
);
const mainnetWallet = new ethers.Wallet(
  process.env.ETHEREUM_PRIVATE_KEY as string
);
const mainnetSigner = mainnetWallet.connect(mainnetProvider);

const relic = await Relic.RelicClient.fromProvider(mainnetProvider);

const zkSyncProvider = new Provider(process.env.ZKSYNC_RPC_URL as string);

const {
  addTask,
  tasks,
  rescheduleTask,
  watch,
  read,
  clients,
  contracts,
  schedule,
} = Ethereum({
  contracts: {
    FederationNounsPool,
    FederationNounsGovernor,
    FederationNounsRelayer,
    NounsDAOLogicV3,
  },
  hooks: {
    getBlockProof: async (task) => {
      log.active(`Getting block proof for proposal end block ${task.args[1]}`);

      const { hash } = await clients.mainnet.getTransaction({
        blockNumber: task.args[1],
        index: 0,
      });

      const receipt = await mainnetProvider.getTransactionReceipt(hash);

      const { proof } = await relic.transactionProver.getProofData(receipt);

      return { ...task, args: [task.args[0], proof] };
    },
    getMessageProof: async (task) => {
      const messageHash = ethers.utils.keccak256(task.args[3]);

      const proofInfo = await zkSyncProvider.getMessageProof(
        task.args[5],
        contracts.FederationNounsGovernor.deployments.zkSync,
        messageHash
      );

      if (!proofInfo) {
        throw new Error("No proof found");
      }

      return {
        ...task,
        args: [
          task.args[0],
          proofInfo.id,
          task.args[2],
          task.args[3],
          proofInfo.proof,
        ],
      };
    },
    publishBlockHash: async (task) => {
      log.active(`Publishing block hash to Relic for block ${task.args[1]}`);

      const relic = await Relic.RelicClient.fromProvider(mainnetProvider);

      // make sure theres no reorg
      const blockHash = await mainnetProvider
        .getBlock(Number(task.args[1]))
        .then((b) => b.hash);

      await mainnetSigner.sendTransaction(
        await relic.bridge.sendBlock(blockHash)
        // {} // optional gas configuration goes here
      );

      await relic.bridge.waitUntilBridged(blockHash);

      return task;
    },
  },
  scripts: {
    publishBlockHash: async (block: number) => {
      const relic = await Relic.RelicClient.fromProvider(mainnetProvider);

      // make sure theres no reorg
      const blockHash = await mainnetProvider
        .getBlock(block)
        .then((b) => b.hash);

      await mainnetSigner.sendTransaction(
        await relic.bridge.sendBlock(blockHash)
        // {} // optional gas configuration goes here
      );

      await relic.bridge.waitUntilBridged(blockHash);
    },
  },
  privateKey: process.env.ETHEREUM_PRIVATE_KEY as string,
});

// Governance Pools
watch(
  { contract: "FederationNounsPool", chain: "mainnet", event: "BidPlaced" },
  async (event) => {
    const { auctionEndBlock } = await read({
      contract: "FederationNounsPool",
      chain: "mainnet",
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
        chain: "mainnet",
        functionName: "castVote",
        args: [event.args.propId],
        priorityFee: 15,
        maxBaseFeeForPriority: 30,
      });
    }
  }
);

// L2 Governance

// Publish proposal startBlock hash to Relic
watch(
  {
    contract: "NounsDAOLogicV3",
    chain: "mainnet",
    event: "ProposalCreated",
  },
  async (event) => {
    schedule({
      name: "publishBlockHash",
      block: Number(event.args.startBlock) + 1,
      args: [Number(event.args.startBlock)],
    });
  }
);

// Governor
watch(
  {
    contract: "FederationNounsGovernor",
    chain: "zkSync",
    event: "VoteCast",
  },
  async (event) => {
    const [, , , , , , , , , , , castWindow, finalityBlocks] = await read({
      contract: "FederationNounsGovernor",
      chain: "zkSync",
      functionName: "config",
    });

    const { endBlock } = await read({
      contract: "FederationNounsGovernor",
      chain: "zkSync",
      functionName: "getProposal",
      args: [event.args.proposal],
    });

    addTask({
      block: endBlock - (castWindow + finalityBlocks) + 1n,
      hooks: ["getBlockProof"],
      contract: "FederationNounsGovernor",
      chain: "zkSync",
      functionName: "settleVotes",
      // @ts-ignore
      args: [event.args.proposal, endBlock],
    });
  }
);

// Relayer
watch(
  {
    contract: "FederationNounsGovernor",
    chain: "zkSync",
    event: "VotesSettled",
  },
  async (event) => {
    const [, , , , , , , , , , , , finalityBlocks] = await read({
      contract: "FederationNounsGovernor",
      chain: "zkSync",
      functionName: "config",
    });

    const { l1BatchNumber, l1BatchTxIndex, blockNumber } =
      await zkSyncProvider.getTransactionReceipt(event.transactionHash);

    const encodedMessage = ethers.utils.AbiCoder.prototype.encode(
      ["uint256", "uint256", "uint256", "uint256"],
      [
        Number(event.args.proposal),
        Number(event.args.forVotes),
        Number(event.args.againstVotes),
        Number(event.args.abstainVotes),
      ]
    ) as `0x${string}`;

    const proof = {
      id: 0n, // Overriden by hook
      proof: ["0xPROOF"], // Overriden by hook
    } as const;

    addTask({
      block: event.blockNumber + finalityBlocks,
      hooks: ["getMessageProof"],
      contract: "FederationNounsRelayer",
      chain: "mainnet",
      functionName: "relayVotes",
      args: [
        BigInt(l1BatchNumber),
        proof.id,
        l1BatchTxIndex,
        encodedMessage,
        proof.proof,
        //@ts-ignore
        blockNumber,
      ],
    });
  }
);
