import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { ethers, upgrades, network } from 'hardhat';
import {
  WaultSwapRestrictedStrategyAddBaseTokenOnly__factory,
  WaultSwapRestrictedStrategyLiquidate__factory,
  WaultSwapWorker,
  WaultSwapWorker__factory,
  Timelock__factory,
  WaultSwapRestrictedStrategyAddTwoSidesOptimal__factory,
  WaultSwapRestrictedStrategyWithdrawMinimizeTrading__factory,
} from '../typechain';
import MainnetConfig from '../.mainnet.json'
import TestnetConfig from '../.testnet.json'

interface IWorkerInput {
  VAULT_SYMBOL: string
  WORKER_NAME: string
  REINVEST_BOT: string
  POOL_ID: number
  REINVEST_BOUNTY_BPS: string
  WORK_FACTOR: string
  KILL_FACTOR: string
  MAX_PRICE_DIFF: string
  EXACT_ETA: string
}

interface IWaultWorkerInfo {
  WORKER_NAME: string
  VAULT_CONFIG_ADDR: string
  WORKER_CONFIG_ADDR: string
  REINVEST_BOT: string
  POOL_ID: number
  VAULT_ADDR: string
  BASE_TOKEN_ADDR: string
  WEX_MASTER_ADDR: string
  WAULTSWAP_ROUTER_ADDR: string
  ADD_STRAT_ADDR: string
  LIQ_STRAT_ADDR: string
  TWO_SIDES_STRAT_ADDR: string
  MINIMIZE_TRADE_STRAT_ADDR: string
  REINVEST_BOUNTY_BPS: string
  WORK_FACTOR: string
  KILL_FACTOR: string
  MAX_PRICE_DIFF: string
  TIMELOCK: string
  EXACT_ETA: string
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
  const shortWorkerInfos: IWorkerInput[] = [{
    VAULT_SYMBOL: "ibETH",
    WORKER_NAME: "BETH-ETH WaultswapWorker",
    REINVEST_BOT: "0xe45216Ac4816A5Ec5378B1D13dE8aA9F262ce9De",
    POOL_ID: 42,
    REINVEST_BOUNTY_BPS: '300',
    WORK_FACTOR: '7800',
    KILL_FACTOR: '9000',
    MAX_PRICE_DIFF: '11000',
    EXACT_ETA: '1623754800'
  }, {
    VAULT_SYMBOL: "ibWBNB",
    WORKER_NAME: "WAULTx-WBNB WaultswapWorker",
    REINVEST_BOT: "0xe45216Ac4816A5Ec5378B1D13dE8aA9F262ce9De",
    POOL_ID: 4,
    REINVEST_BOUNTY_BPS: '300',
    WORK_FACTOR: '5200',
    KILL_FACTOR: '7000',
    MAX_PRICE_DIFF: '11000',
    EXACT_ETA: '1623754800'
  }, {
    VAULT_SYMBOL: "ibUSDT",
    WORKER_NAME: "BTCB-USDT WaultswapWorker",
    REINVEST_BOT: "0xe45216Ac4816A5Ec5378B1D13dE8aA9F262ce9De",
    POOL_ID: 41,
    REINVEST_BOUNTY_BPS: '300',
    WORK_FACTOR: '7000',
    KILL_FACTOR: '8333',
    MAX_PRICE_DIFF: '11000',
    EXACT_ETA: '1623754800'
  }, {
    VAULT_SYMBOL: "ibBTCB",
    WORKER_NAME: "USDT-BTCB WaultswapWorker",
    REINVEST_BOT: "0xe45216Ac4816A5Ec5378B1D13dE8aA9F262ce9De",
    POOL_ID: 41,
    REINVEST_BOUNTY_BPS: '300',
    WORK_FACTOR: '7000',
    KILL_FACTOR: '8333',
    MAX_PRICE_DIFF: '11000',
    EXACT_ETA: '1623754800'
  }]












  
  const config = network.name === "mainnet" ? MainnetConfig : TestnetConfig
  const workerInfos: IWaultWorkerInfo[] = shortWorkerInfos.map((n) => {
    const vault = config.Vaults.find((v) => v.symbol === n.VAULT_SYMBOL)
    if (vault === undefined) {
      throw('error: unable to find the given VAULT_SYMBOL')
    }

    return {
      WORKER_NAME: n.WORKER_NAME,
      VAULT_CONFIG_ADDR: vault.config,
      WORKER_CONFIG_ADDR: config.SharedConfig.WorkerConfig,
      REINVEST_BOT: n.REINVEST_BOT,
      POOL_ID: n.POOL_ID,
      VAULT_ADDR: vault.address,
      BASE_TOKEN_ADDR: vault.baseToken,
      WEX_MASTER_ADDR: config.Exchanges.Waultswap.WexMaster,
      WAULTSWAP_ROUTER_ADDR: config.Exchanges.Waultswap.WaultswapRouter,
      ADD_STRAT_ADDR: config.SharedStrategies.Waultswap.StrategyAddBaseTokenOnly,
      LIQ_STRAT_ADDR: config.SharedStrategies.Waultswap.StrategyLiquidate,
      TWO_SIDES_STRAT_ADDR: vault.StrategyAddTwoSidesOptimal.Waultswap,
      MINIMIZE_TRADE_STRAT_ADDR: config.SharedStrategies.Waultswap.StrategyWithdrawMinimizeTrading,
      REINVEST_BOUNTY_BPS: n.REINVEST_BOUNTY_BPS,
      WORK_FACTOR: n.WORK_FACTOR,
      KILL_FACTOR: n.KILL_FACTOR,
      MAX_PRICE_DIFF: n.MAX_PRICE_DIFF,
      TIMELOCK: config.Timelock,
      EXACT_ETA: n.EXACT_ETA,
    }
  })

  for(let i = 0; i < workerInfos.length; i++) {
    console.log("===================================================================================")
    console.log(`>> Deploying an upgradable WaultSwapWorker contract for ${workerInfos[i].WORKER_NAME}`);
    const WaultSwapWorker = (await ethers.getContractFactory(
      'WaultSwapWorker',
      (await ethers.getSigners())[0]
    )) as WaultSwapWorker__factory;
    const waultSwapWorker = await upgrades.deployProxy(
      WaultSwapWorker,[
        workerInfos[i].VAULT_ADDR,
        workerInfos[i].BASE_TOKEN_ADDR,
        workerInfos[i].WEX_MASTER_ADDR,
        workerInfos[i].WAULTSWAP_ROUTER_ADDR,
        workerInfos[i].POOL_ID,
        workerInfos[i].ADD_STRAT_ADDR,
        workerInfos[i].LIQ_STRAT_ADDR,
        workerInfos[i].REINVEST_BOUNTY_BPS
      ]
    ) as WaultSwapWorker;
    await waultSwapWorker.deployed();
    console.log(`>> Deployed at ${waultSwapWorker.address}`);

    console.log(`>> Adding REINVEST_BOT`);
    await waultSwapWorker.setReinvestorOk([workerInfos[i].REINVEST_BOT], true);
    console.log("✅ Done");

    console.log(`>> Adding Strategies`);
    await waultSwapWorker.setStrategyOk([workerInfos[i].TWO_SIDES_STRAT_ADDR, workerInfos[i].MINIMIZE_TRADE_STRAT_ADDR], true);
    console.log("✅ Done");

    console.log(`>> Whitelisting a worker on strats`);
    const addStrat = WaultSwapRestrictedStrategyAddBaseTokenOnly__factory.connect(workerInfos[i].ADD_STRAT_ADDR, (await ethers.getSigners())[0])
    await addStrat.setWorkersOk([waultSwapWorker.address], true)
    const liqStrat = WaultSwapRestrictedStrategyLiquidate__factory.connect(workerInfos[i].LIQ_STRAT_ADDR, (await ethers.getSigners())[0])
    await liqStrat.setWorkersOk([waultSwapWorker.address], true)
    const twoSidesStrat = WaultSwapRestrictedStrategyAddTwoSidesOptimal__factory.connect(workerInfos[i].TWO_SIDES_STRAT_ADDR, (await ethers.getSigners())[0])
    await twoSidesStrat.setWorkersOk([waultSwapWorker.address], true)
    const minimizeTradeStrat = WaultSwapRestrictedStrategyWithdrawMinimizeTrading__factory.connect(workerInfos[i].MINIMIZE_TRADE_STRAT_ADDR, (await ethers.getSigners())[0])
    await minimizeTradeStrat.setWorkersOk([waultSwapWorker.address], true)
    console.log("✅ Done");

    const timelock = Timelock__factory.connect(workerInfos[i].TIMELOCK, (await ethers.getSigners())[0]);

    console.log(">> Timelock: Setting WorkerConfig via Timelock");
    const setConfigsTx = await timelock.queueTransaction(
      workerInfos[i].WORKER_CONFIG_ADDR, '0',
      'setConfigs(address[],(bool,uint64,uint64,uint64)[])',
      ethers.utils.defaultAbiCoder.encode(
        ['address[]','(bool acceptDebt,uint64 workFactor,uint64 killFactor,uint64 maxPriceDiff)[]'],
        [
          [waultSwapWorker.address], [{acceptDebt: true, workFactor: workerInfos[i].WORK_FACTOR, killFactor: workerInfos[i].KILL_FACTOR, maxPriceDiff: workerInfos[i].MAX_PRICE_DIFF}]
        ]
      ), workerInfos[i].EXACT_ETA
    );
    console.log(`queue setConfigs at: ${setConfigsTx.hash}`)
    console.log("generate timelock.executeTransaction:")
    console.log(`await timelock.executeTransaction('${workerInfos[i].WORKER_CONFIG_ADDR}', '0', 'setConfigs(address[],(bool,uint64,uint64,uint64)[])', ethers.utils.defaultAbiCoder.encode(['address[]','(bool acceptDebt,uint64 workFactor,uint64 killFactor,uint64 maxPriceDiff)[]'],[['${waultSwapWorker.address}'], [{acceptDebt: true, workFactor: ${workerInfos[i].WORK_FACTOR}, killFactor: ${workerInfos[i].KILL_FACTOR}, maxPriceDiff: ${workerInfos[i].MAX_PRICE_DIFF}}]]), ${workerInfos[i].EXACT_ETA})`)
    console.log("✅ Done");

    console.log(">> Timelock: Linking VaultConfig with WorkerConfig via Timelock");
    const setWorkersTx = await timelock.queueTransaction(
      workerInfos[i].VAULT_CONFIG_ADDR, '0',
      'setWorkers(address[],address[])',
      ethers.utils.defaultAbiCoder.encode(
        ['address[]','address[]'],
        [
          [waultSwapWorker.address], [workerInfos[i].WORKER_CONFIG_ADDR]
        ]
      ), workerInfos[i].EXACT_ETA
    );
    console.log(`queue setWorkers at: ${setWorkersTx.hash}`)
    console.log("generate timelock.executeTransaction:")
    console.log(`await timelock.executeTransaction('${workerInfos[i].VAULT_CONFIG_ADDR}', '0','setWorkers(address[],address[])', ethers.utils.defaultAbiCoder.encode(['address[]','address[]'],[['${waultSwapWorker.address}'], ['${workerInfos[i].WORKER_CONFIG_ADDR}']]), ${workerInfos[i].EXACT_ETA})`)
    console.log("✅ Done");
  }
};

export default func;
func.tags = ['WaultSwapWorkers'];