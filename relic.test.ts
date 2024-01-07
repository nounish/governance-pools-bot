import Relic from "@relicprotocol/client";
import { ethers } from "ethers";
import { Provider } from "zksync-web3";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import dotenv from "dotenv";
dotenv.config();

const client = createPublicClient({
  chain: sepolia,
  transport: http(),
});

const sepoliaProvider = new ethers.providers.JsonRpcProvider(
  process.env.SEPOLIA_RPC_URL as string
);
const sepoliaSigner = new ethers.Wallet(
  process.env.ETHEREUM_PRIVATE_KEY as string
).connect(sepoliaProvider);

const zkSyncTestnetProvider = new Provider("https://sepolia.era.zksync.dev");

const zkSyncTestnetSigner = new ethers.Wallet(
  process.env.ETHEREUM_PRIVATE_KEY as string
).connect(zkSyncTestnetProvider);

const relic = await Relic.RelicClient.fromProviders(
  zkSyncTestnetProvider,
  sepoliaProvider
);

async function test(block: number) {
  console.log("publishing block", block);

  // make sure theres no reorg
  const blockHash = await sepoliaProvider.getBlock(block).then((b) => b.hash);

  const tx = await sepoliaSigner.sendTransaction(
    await relic.bridge.sendBlock(blockHash)
    // {} // optional gas configuration goes here
  );

  console.log(tx.hash);

  await relic.bridge.waitUntilBridged(blockHash);

  const { hash } = await client.getTransaction({
    blockNumber: BigInt(block),
    index: 0,
  });

  const receipt = await sepoliaProvider.getTransactionReceipt(hash);

  const { proof } = await relic.transactionProver.getProofData(receipt);

  console.log("testing proof", proof);

  const contract = new ethers.Contract(
    "0x38DE964FeaD93231060CF1B16c2bcdb6eEA86c27",
    [
      {
        constant: false,
        inputs: [
          {
            name: "_data",
            type: "bytes",
          },
          {
            name: "_flag",
            type: "bool",
          },
        ],
        name: "prove",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
    ],
    zkSyncTestnetSigner
  );

  const prove = await contract.prove(proof, false);

  console.log("prove tx", prove);
}

test(5042382);
