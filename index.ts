import NounsPoolABI from "./contracts/NounsPool.js";
import NounsDAOLogicV2ABI from "./contracts/NounsDAOLogicV2.js";
import BotSwarm from "@federationwtf/botswarm";

const { addTask, watch, read } = BotSwarm({
  NounsPool: {
    abi: NounsPoolABI,
    deployments: {
      mainnet: "0xBE5E6De0d0Ac82b087bAaA1d53F145a52EfE1642",
    },
  },
  NounsDAOLogicV2: {
    abi: NounsDAOLogicV2ABI,
    deployments: {
      mainnet: "0x6f3E6272A167e8AcCb32072d08E0957F9c79223d",
    },
  },
});

watch(
  { contract: "NounsPool", chain: "mainnet", event: "BidPlaced" },
  async (event) => {
    if (!event.args.propId) return;

    const { castWindow } = await read({
      contract: "NounsPool",
      chain: "mainnet",
      functionName: "getConfig",
    });

    const { endBlock } = await read({
      contract: "NounsDAOLogicV2",
      chain: "mainnet",
      functionName: "proposals",
      args: [event.args.propId],
    });

    addTask({
      block: endBlock - castWindow,
      contract: "NounsPool",
      chain: "mainnet",
      functionName: "castVote",
      args: [event.args.propId],
      priorityFee: 15,
      maxBaseFeeForPriority: 30,
    });
  }
);
