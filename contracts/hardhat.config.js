require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    // Cronos zkEVM Testnet
    cronosZkEvmTestnet: {
      url: process.env.CRONOS_ZKEVM_TESTNET_RPC || "https://testnet.zkevm.cronos.org",
      chainId: 240,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Cronos zkEVM Mainnet (for future use)
    cronosZkEvmMainnet: {
      url: process.env.CRONOS_ZKEVM_MAINNET_RPC || "https://rpc-zkevm.cronos.org",
      chainId: 388,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Cronos EVM Testnet (legacy)
    cronosTestnet: {
      url: "https://evm-t3.cronos.org",
      chainId: 338,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      cronosZkEvmTestnet: process.env.CRONOS_EXPLORER_API_KEY || "no-api-key-needed",
    },
    customChains: [
      {
        network: "cronosZkEvmTestnet",
        chainId: 240,
        urls: {
          apiURL: "https://explorer.zkevm.cronos.org/testnet/api",
          browserURL: "https://explorer.zkevm.cronos.org/testnet",
        },
      },
    ],
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
