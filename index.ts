import BotSwarm from "@federationwtf/botswarm";
import { FederationNounsPool, FederationNounsGovernor, FederationNounsRelayer } from "@federationwtf/botswarm/contracts";
import Relic from "@relicprotocol/client";
import { ethers } from "ethers";
import { Provider } from "zksync-web3";

const { Ethereum } = BotSwarm();

const mainnetProvider = new ethers.providers.JsonRpcProvider(
  process.env.MAINNET_RPC_URL as string
);

const relic = await Relic.RelicClient.fromProvider(mainnetProvider);

const zkSyncProvider = new Provider(process.env.ZKSYNC_RPC_URL as string);

const { addTask, tasks, rescheduleTask, watch, read, clients, contracts } = Ethereum({
  contracts: {
    FederationNounsPool,
    FederationNounsGovernor,
    FederationNounsRelayer,
  },
  hooks: {
    getBlockProof: async (task, block) => {
      const { hash } = await clients.sepolia.getTransaction({
        blockNumber: block - 5n,
        index: 0,
      });

      const receipt = await mainnetProvider.getTransactionReceipt(hash);

      const { proof } = await relic.transactionProver.getProofData(receipt);

      task.args.push(proof);

      return task;
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

      return {...task, args: [task.args[0], proofInfo.id, task.args[2], task.args[3], proofInfo.proof]};
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
      block: endBlock - (castWindow + finalityBlocks) + 10n,
      hooks: ["getBlockProof"],
      contract: "FederationNounsGovernor",
      chain: "zkSync",
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
    chain: "zkSync",
    event: "VotesSettled",
  },
  async (event) => {
    const [, , , , , , , , , , , , finalityBlocks] = await read({
      contract: "FederationNounsGovernor",
      chain: "zkSync",
      functionName: "config",
    });

    const {l1BatchNumber, l1BatchTxIndex, blockNumber} = await zkSyncProvider.getTransactionReceipt(event.transactionHash);

    const encodedMessage = ethers.utils.AbiCoder.prototype.encode(
      ["uint256", "uint256", "uint256", "uint256"],
      [Number(event.args.proposal), Number(event.args.forVotes), Number(event.args.againstVotes), Number(event.args.abstainVotes)]
    ) as `0x${string}`;

    const proof = {
      id: 0n, // Overriden by hook
      proof: ["0xPROOF"],  // Overriden by hook
    } as const;

    addTask({
      block: event.blockNumber + finalityBlocks,
      hooks: ["getMessageProof"],
      contract: "FederationNounsRelayer",
      chain: "mainnet",
      functionName: "relayVotes",
      args: [BigInt(l1BatchNumber), proof.id, l1BatchTxIndex, encodedMessage, proof.proof, 
        //@ts-ignore
        blockNumber
      ],
    });
  }
);

