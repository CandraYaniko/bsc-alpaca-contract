import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers, network } from "hardhat";
import { ChainLinkPriceOracle__factory } from "../../../../typechain";
import TestnetConfig from "../../../../.testnet.json";
import MainnetConfig from "../../../../.mainnet.json";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  /*
  ░██╗░░░░░░░██╗░█████╗░██████╗░███╗░░██╗██╗███╗░░██╗░██████╗░
  ░██║░░██╗░░██║██╔══██╗██╔══██╗████╗░██║██║████╗░██║██╔════╝░
  ░╚██╗████╗██╔╝███████║██████╔╝██╔██╗██║██║██╔██╗██║██║░░██╗░
  ░░████╔═████║░██╔══██║██╔══██╗██║╚████║██║██║╚████║██║░░╚██╗
  ░░╚██╔╝░╚██╔╝░██║░░██║██║░░██║██║░╚███║██║██║░╚███║╚██████╔╝
  ░░░╚═╝░░░╚═╝░░╚═╝░░╚═╝╚═╝░░╚═╝╚═╝░░╚══╝╚═╝╚═╝░░╚══╝░╚═════╝░
  Check all variables below before execute the deployment script
  */
  const TOKEN0_SYMBOLS = ["TRX"];
  const TOKEN1_SYMBOLS = ["BUSD"];
  const AGGREGATORV3S = ["0xF4C5e535756D11994fCBB12Ba8adD0192D9b88be"];

  const config = network.name === "mainnet" ? MainnetConfig : TestnetConfig;
  const tokenList: any = config.Tokens;
  const token0Addrs: Array<string> = TOKEN0_SYMBOLS.map((t) => {
    const addr = tokenList[t];
    if (addr === undefined) {
      throw `error: token: unable to find address of ${t}`;
    }
    return addr;
  });
  const token1Addrs: Array<string> = TOKEN1_SYMBOLS.map((t) => {
    const addr = tokenList[t];
    if (addr === undefined) {
      throw `error: token: unable to find address of ${t}`;
    }
    return addr;
  });

  const chainLinkPriceOracle = ChainLinkPriceOracle__factory.connect(
    config.Oracle.ChainLinkOracle,
    (await ethers.getSigners())[0]
  );
  console.log(">> Adding price source to chain link price oracle");
  await chainLinkPriceOracle.setPriceFeeds(token0Addrs, token1Addrs, AGGREGATORV3S, { gasLimit: "10000000" });
  console.log("✅ Done");
};

export default func;
func.tags = ["AddSourceChainLinkPriceOracle"];