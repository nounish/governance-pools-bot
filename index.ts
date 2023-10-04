import BotSwarm from "@federationwtf/botswarm";
import { FederationNounsPool } from "@federationwtf/botswarm/contracts";

const { addTask, tasks, rescheduleTask, watch, read } = BotSwarm({
  FederationNounsPool,
});

// Governance Pools
watch(
  { contract: "FederationNounsPool", chain: "mainnet", event: "BidPlaced" },
  async (event) => {
    if (!event.args.propId) return;

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
