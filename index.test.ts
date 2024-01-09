import BotSwarm from "@federationwtf/botswarm";
import { FederationNounsPool } from "@federationwtf/botswarm/contracts";

const { Ethereum } = BotSwarm();

const { addTask, tasks, rescheduleTask, watch, read } = Ethereum({
  contracts: {
    FederationNounsPool,
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
