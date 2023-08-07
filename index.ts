import NounsPoolABI from "./contracts/NounsPool.js";
import NounsDAOLogicV2ABI from "./contracts/NounsDAOLogicV2.js";
import BotSwarm from "@federationwtf/botswarm";

const { addTask, tasks, rescheduleTask, watch, read } = BotSwarm({
  NounsPool: {
    abi: NounsPoolABI,
    deployments: {
      mainnet: "0x0f722d69B3D8C292E85F2b1E5D9F4439edd58F1e",
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

    const { auctionEndBlock } = await read({
      contract: "NounsPool",
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
        contract: "NounsPool",
        chain: "mainnet",
        functionName: "castVote",
        args: [event.args.propId],
        priorityFee: 15,
        maxBaseFeeForPriority: 30,
      });
    }
  }
);
