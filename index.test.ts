import NounsPoolABI from "./contracts/NounsPool.js";
import NounsDAOLogicV2ABI from "./contracts/NounsDAOLogicV2.js";

import BotSwarm from "@nounish/botswarm";

const { addTask, watch, read } = BotSwarm({
  NounsPool: {
    abi: NounsPoolABI,
    deployments: {
      sepolia: "0xd27dfb807DC3435AC3e14b55FcF1B50F96fF769a",
    },
  },
  NounsDAOLogicV2: {
    abi: NounsDAOLogicV2ABI,
    deployments: {
      sepolia: "0x75D84FC49Dc8A423604BFCd46E0AB7D340D5ea38",
    },
  },
});

watch(
  { contract: "NounsPool", chain: "sepolia", event: "BidPlaced" },
  async (event) => {
    if (!event.args.propId) return;

    const { castWindow } = await read({
      contract: "NounsPool",
      chain: "sepolia",
      functionName: "getConfig",
    });

    const { endBlock } = await read({
      contract: "NounsDAOLogicV2",
      chain: "sepolia",
      functionName: "proposals",
      args: [event.args.propId],
    });

    addTask({
      block: endBlock - castWindow,
      contract: "NounsPool",
      chain: "sepolia",
      functionName: "castVote",
      args: [event.args.propId],
      priorityFee: 10,
      maxBaseFeeForPriority: 25,
    });
  }
);
