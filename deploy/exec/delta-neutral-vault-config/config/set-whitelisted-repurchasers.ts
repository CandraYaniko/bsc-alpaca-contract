import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getDeployer, isFork } from "../../../../utils/deployer-helper";
import { DeltaNeutralVaultConfig02__factory } from "../../../../typechain/factories/DeltaNeutralVaultConfig02__factory";
import { Converter } from "../../../helper";

interface WhitelistedParamsInput {
  TARGET_ADDRESS: string[];
  OK: boolean;
}

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

  const DELTA_VAULT_SYMBOL = ["n3x-BNBUSDT-PCS1", "n8x-BNBUSDT-PCS1", "L3x-USDTETH-BSW1"];
  const inputParams: WhitelistedParamsInput = {
    TARGET_ADDRESS: [""],
    OK: true,
  };

  const deployer = await getDeployer();

  // VALIDATING ALL DLTA_VAULT_SYMBOL
  const converter = new Converter();
  const configs = converter.convertDeltaSymbolToAddress(DELTA_VAULT_SYMBOL, "config");

  console.log(">> SetwhitelistedRepurchasers to DeltaNeutralVaultConfig contract");
  let nonce = await deployer.getTransactionCount();
  const ops = isFork() ? { gasLimit: 2000000 } : {};

  for (const config of configs) {
    console.log(`>> Set SetwhitelistedRepurchasers for config : ${config}`);
    const deltaVaultConfig = DeltaNeutralVaultConfig02__factory.connect(config, deployer);

    await deltaVaultConfig.setwhitelistedRepurchasers(inputParams.TARGET_ADDRESS, inputParams.OK, {
      ...ops,
      nonce: nonce++,
    });
  }
  console.log("✅ Done");
};

export default func;
func.tags = ["DeltaNeutralVaultConfigSetWhitelistedRepurchasers"];