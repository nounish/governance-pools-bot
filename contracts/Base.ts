export default {
    abi: [
        { "type": "constructor", "inputs": [], "stateMutability": "nonpayable" },
        { "type": "receive", "stateMutability": "payable" },
        {
          "type": "function",
          "name": "execute",
          "inputs": [
            { "name": "_target", "type": "address", "internalType": "address" },
            { "name": "_value", "type": "uint256", "internalType": "uint256" },
            { "name": "_data", "type": "bytes", "internalType": "bytes" }
          ],
          "outputs": [{ "name": "", "type": "bytes", "internalType": "bytes" }],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "hasActiveLock",
          "inputs": [],
          "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "initialize",
          "inputs": [
            { "name": "_owner", "type": "address", "internalType": "address" }
          ],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "maxLockDurationBlocks",
          "inputs": [],
          "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "moduleEnabled",
          "inputs": [
            { "name": "_module", "type": "address", "internalType": "address" }
          ],
          "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "name",
          "inputs": [],
          "outputs": [{ "name": "", "type": "string", "internalType": "string" }],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "owner",
          "inputs": [],
          "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
          "stateMutability": "view"
        },
        {
          "type": "function",
          "name": "releaseLock",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "renounceOwnership",
          "inputs": [],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "requestLock",
          "inputs": [
            { "name": "_blocks", "type": "uint256", "internalType": "uint256" }
          ],
          "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "setMaxLockDurationBlocks",
          "inputs": [
            { "name": "_blocks", "type": "uint256", "internalType": "uint256" }
          ],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "setModule",
          "inputs": [
            { "name": "_module", "type": "address", "internalType": "address" },
            { "name": "_enable", "type": "bool", "internalType": "bool" }
          ],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "function",
          "name": "transferOwnership",
          "inputs": [
            { "name": "newOwner", "type": "address", "internalType": "address" }
          ],
          "outputs": [],
          "stateMutability": "nonpayable"
        },
        {
          "type": "event",
          "name": "ExecuteTransaction",
          "inputs": [
            {
              "name": "caller",
              "type": "address",
              "indexed": true,
              "internalType": "address"
            },
            {
              "name": "target",
              "type": "address",
              "indexed": true,
              "internalType": "address"
            },
            {
              "name": "value",
              "type": "uint256",
              "indexed": false,
              "internalType": "uint256"
            }
          ],
          "anonymous": false
        },
        {
          "type": "event",
          "name": "Initialized",
          "inputs": [
            {
              "name": "version",
              "type": "uint8",
              "indexed": false,
              "internalType": "uint8"
            }
          ],
          "anonymous": false
        },
        {
          "type": "event",
          "name": "MaxLockDurationBlocksChanged",
          "inputs": [
            {
              "name": "blocks",
              "type": "uint256",
              "indexed": false,
              "internalType": "uint256"
            }
          ],
          "anonymous": false
        },
        {
          "type": "event",
          "name": "OwnershipTransferred",
          "inputs": [
            {
              "name": "previousOwner",
              "type": "address",
              "indexed": true,
              "internalType": "address"
            },
            {
              "name": "newOwner",
              "type": "address",
              "indexed": true,
              "internalType": "address"
            }
          ],
          "anonymous": false
        },
        {
          "type": "event",
          "name": "Received",
          "inputs": [
            {
              "name": "value",
              "type": "uint256",
              "indexed": true,
              "internalType": "uint256"
            },
            {
              "name": "sender",
              "type": "address",
              "indexed": true,
              "internalType": "address"
            },
            {
              "name": "data",
              "type": "bytes",
              "indexed": false,
              "internalType": "bytes"
            }
          ],
          "anonymous": false
        },
        {
          "type": "event",
          "name": "ReleaseLock",
          "inputs": [
            {
              "name": "module",
              "type": "address",
              "indexed": true,
              "internalType": "address"
            }
          ],
          "anonymous": false
        },
        {
          "type": "event",
          "name": "RequestLock",
          "inputs": [
            {
              "name": "module",
              "type": "address",
              "indexed": true,
              "internalType": "address"
            },
            {
              "name": "duration",
              "type": "uint256",
              "indexed": false,
              "internalType": "uint256"
            }
          ],
          "anonymous": false
        },
        {
          "type": "event",
          "name": "SetModule",
          "inputs": [
            {
              "name": "module",
              "type": "address",
              "indexed": true,
              "internalType": "address"
            },
            {
              "name": "enabled",
              "type": "bool",
              "indexed": false,
              "internalType": "bool"
            }
          ],
          "anonymous": false
        },
        { "type": "error", "name": "LockActive", "inputs": [] },
        { "type": "error", "name": "LockDurationRequestTooLong", "inputs": [] },
        { "type": "error", "name": "ModuleAlreadyInitialized", "inputs": [] },
        { "type": "error", "name": "NotEnabled", "inputs": [] },
        { "type": "error", "name": "TransactionReverted", "inputs": [] }
      ],
      deployments: {
        mainnet: "0x"
      }
} as const