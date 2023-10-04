import BotSwarm from "@federationwtf/botswarm";

import { NounsDAOLogicV3 } from "@federationwtf/botswarm/contracts";

const { watch, cast } = BotSwarm({
  NounsDAOLogicV3,
});

watch(
  {
    contract: "NounsDAOLogicV3",
    chain: "mainnet",
    event: "ProposalCreated",
  },
  async (event) => {
    cast(
      `Proposal ${event.args.id} was created by ${event.args.proposer}\n ${event.args.description}`
    );
  }
);
