// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4 <0.9.0;

import { BaseTest, DeltaNeutralVault04Like, MockErc20Like, MockLpErc20Like, console } from "../../base/BaseTest.sol";
import { mocking } from "../../utils/mocking.sol";
import { MockContract } from "../../utils/MockContract.sol";

import { DeltaNeutralVault04HealthChecker } from "../../../contracts/8.13/DeltaNeutralVault04HealthChecker.sol";
import { FakeDeltaWorker } from "../../fake/FakeDeltaWorker.sol";
import { FakeAutomateVaultController } from "../../fake/FakeAutomateVaultController.sol";
import { FakeDeltaNeutralOracle } from "../../fake/FakeDeltaNeutralOracle.sol";
import { FakeVault } from "../../fake/FakeVault.sol";
import { FakeDeltaNeutralVaultConfig02 } from "../../fake/FakeDeltaNeutralVaultConfig02.sol";
import { FakeDeltaNeutralDepositExecutor } from "../../fake/FakeDeltaNeutralDepositExecutor.sol";
import { FakeDeltaNeutralWithdrawExecutor } from "../../fake/FakeDeltaNeutralWithdrawExecutor.sol";
import { FakeDeltaNeutralRebalanceExecutor } from "../../fake/FakeDeltaNeutralRebalanceExecutor.sol";
import { FakeDeltaNeutralReinvestExecutor } from "../../fake/FakeDeltaNeutralReinvestExecutor.sol";
import { FakeRouter } from "../../fake/FakeRouter.sol";
import { FakeFairLaunch } from "../../fake/FakeFairLaunch.sol";

// solhint-disable func-name-mixedcase
// solhint-disable contract-name-camelcase
contract DeltaNeutralVault04_Test is BaseTest {
  using mocking for *;
  DeltaNeutralVault04Like private _deltaNeutralVault;
  DeltaNeutralVault04HealthChecker private _checker;

  FakeAutomateVaultController private _controller;
  FakeVault private _stableVault;
  FakeVault private _assetVault;
  FakeDeltaWorker private _stableVaultWorker;
  FakeDeltaWorker private _assetVaultWorker;
  FakeDeltaNeutralOracle private _priceOracle;
  FakeDeltaNeutralVaultConfig02 private _config;
  FakeDeltaNeutralDepositExecutor private _depositExecutor;
  FakeDeltaNeutralWithdrawExecutor private _withdrawExecutor;
  FakeDeltaNeutralRebalanceExecutor private _rebalanceExecutor;
  FakeDeltaNeutralReinvestExecutor private _reinvestExecutor;
  FakeRouter private _router;
  FakeFairLaunch private _fairLaunch;

  MockLpErc20Like private _lpToken;
  MockErc20Like private _alpacaToken;
  MockErc20Like private _stableToken;
  MockErc20Like private _assetToken;

  function setUp() external {
    _priceOracle = new FakeDeltaNeutralOracle();
    _config = new FakeDeltaNeutralVaultConfig02();
    _controller = new FakeAutomateVaultController();
    _checker = new DeltaNeutralVault04HealthChecker();

    _lpToken = _setupLpToken("LP TOKEN", "LP", 18);
    _alpacaToken = _setupToken("ALPACA", "ALPACA", 18);
    _stableToken = _setupToken("USDT", "USDT", 18);
    _assetToken = _setupToken("WNATIVE", "WNATIVE", 18);

    (uint256 _lpPrice, ) = _priceOracle.lpToDollar(1e18, address(_lpToken));

    // Setup Fake
    _stableVault = new FakeVault(address(_stableToken), _lpPrice);
    _assetVault = new FakeVault(address(_assetToken), _lpPrice);

    _stableVaultWorker = new FakeDeltaWorker(address(_lpToken));
    _assetVaultWorker = new FakeDeltaWorker(address(_lpToken));

    _depositExecutor = new FakeDeltaNeutralDepositExecutor(
      address(_stableVault),
      address(_assetVault),
      address(_stableVaultWorker),
      address(_assetVaultWorker),
      _lpPrice
    );

    _withdrawExecutor = new FakeDeltaNeutralWithdrawExecutor(
      address(_stableVault),
      address(_assetVault),
      address(_stableVaultWorker),
      address(_assetVaultWorker),
      _lpPrice,
      address(_stableToken),
      address(_assetToken)
    );

    _rebalanceExecutor = new FakeDeltaNeutralRebalanceExecutor(
      address(_stableVault),
      address(_assetVault),
      address(_stableVaultWorker),
      address(_assetVaultWorker),
      _lpPrice
    );
    _reinvestExecutor = new FakeDeltaNeutralReinvestExecutor(
      address(_stableVault),
      address(_assetVault),
      address(_stableVaultWorker),
      address(_assetVaultWorker),
      _lpPrice
    );

    _router = new FakeRouter();

    _fairLaunch = new FakeFairLaunch();
    // Setup DeltaNeutralVault04 Vault
    _deltaNeutralVault = _setupDeltaNeutralVault04(
      "TEST VAULT",
      "TV",
      address(_stableVault),
      address(_assetVault),
      address(_stableVaultWorker),
      address(_assetVaultWorker),
      address(_lpToken),
      address(_alpacaToken),
      address(_priceOracle),
      address(_config)
    );

    _deltaNeutralVault.setDeltaNeutralVaultHealthChecker(address(_checker));

    assertEq(_deltaNeutralVault.stableToken(), address(_stableToken));
    assertEq(_deltaNeutralVault.assetToken(), address(_assetToken));

    // Mint tokens
    _stableToken.mint(address(this), 10000 ether);
    _assetToken.mint(address(this), 10000 ether);
    _stableToken.mint(address(_deltaNeutralVault), 10000 ether);
    _assetToken.mint(address(_deltaNeutralVault), 10000 ether);

    _stableToken.mint(address(_router), 10000 ether);
    _assetToken.mint(address(_router), 10000 ether);
    _alpacaToken.mint(address(_router), 10000 ether);

    _stableToken.mint(address(_withdrawExecutor), 10000 ether);

    _stableToken.approve(address(_deltaNeutralVault), 10000 ether);
    _assetToken.approve(address(_deltaNeutralVault), 10000 ether);

    // Config: set important config
    _config.setLeverageLevel(3);
    _config.setParams(address(1), address(2), address(_fairLaunch), 6800, 100, 100);
    _config.setFees(address(this), 0, address(this), 0, address(this), 0);
    _config.setSwapRouter(address(_router));
    _config.setAlpacaBountyConfig(address(this), 0);

    address[] memory _reinvestPath = new address[](2);
    _reinvestPath[0] = address(_alpacaToken);
    _reinvestPath[1] = address(_stableToken);

    _config.setReinvestPath(_reinvestPath);
    // _config.setController(address(_controller));
    _config.setExecutor(
      address(_depositExecutor),
      address(_withdrawExecutor),
      address(_rebalanceExecutor),
      address(_reinvestExecutor)
    );

    _initPosition();
  }

  function testCorrectness_depositShouldWorkIfBorrowAmountIsCorrect() external {
    _depositForAlice();
  }

  function testRevert_depositShouldRevertIfBorrowValueIsOff() external {
    uint256 _depositValue = 100 ether;
    uint256 _borrowValue = _depositValue * 3; // 4x leverage

    _depositExecutor.setExecutionValue(_depositValue, _borrowValue);

    vm.expectRevert(abi.encodeWithSignature("DeltaNeutralVault04HealthChecker_UnsafeDebtValue()"));
    _deltaNeutralVault.deposit(100 ether, 0, ALICE, 100 ether, abi.encode(0));

    _borrowValue = _depositValue * 1; // 1x leverage
    _depositExecutor.setExecutionValue(_depositValue, _borrowValue);

    vm.expectRevert(abi.encodeWithSignature("DeltaNeutralVault04HealthChecker_UnsafeDebtValue()"));
    _deltaNeutralVault.deposit(100 ether, 0, ALICE, 100 ether, abi.encode(0));
  }

  function testCorrectness_withdrawShouldWork() external {
    _depositForAlice();

    uint256 _withdrawValue = 100 ether;
    uint256 _repayDebtValue = _withdrawValue * 2; // 3x leverage

    _withdrawExecutor.setExecutionValue(_withdrawValue, _repayDebtValue);

    vm.prank(ALICE);
    // Withdraw executor will always return stable
    _deltaNeutralVault.withdraw(100 ether, 100, 0, abi.encode(0));

    assertEq(_deltaNeutralVault.balanceOf(ALICE), 0 ether);
    assertEq(_stableToken.balanceOf(ALICE), 100 ether);
  }

  function testRevert_withdrawShouldRevertIfDebtRatioIsOff() external {
    _depositForAlice();

    uint256 _withdrawValue = 100 ether;
    uint256 _repayDebtValue = _withdrawValue * 1; // 3x leverage

    _withdrawExecutor.setExecutionValue(_withdrawValue, _repayDebtValue);

    vm.prank(ALICE);
    // Withdraw executor will always return stable
    vm.expectRevert(abi.encodeWithSignature("DeltaNeutralVault04HealthChecker_UnsafeDebtRatio()"));
    _deltaNeutralVault.withdraw(100 ether, 100, 0, abi.encode(0));
  }

  function testCorrectness_RebalanceShouldWorkIfEquityIsNotLost() external {
    _stableVault.setDebt(60 ether, 60 ether);
    _rebalanceExecutor.setExecutionValue(90 ether, 180 ether);
    _deltaNeutralVault.rebalance(abi.encode(0));
  }

  function testRevert_RebalanceShouldRevertIfEquityIsLost() external {
    _stableVault.setDebt(100 ether, 100 ether);

    _rebalanceExecutor.setExecutionValue(500 ether, 400 ether);
    vm.expectRevert(abi.encodeWithSignature("DeltaNeutralVault04_UnsafePositionValue()"));
    _deltaNeutralVault.rebalance(abi.encode(0));
  }

  function testCorrectness_ReinvestShouldWorkIfEquityIsNotLost() external {
    _alpacaToken.mint(address(_deltaNeutralVault), 100 ether);
    _reinvestExecutor.setExecutionValue(200 ether, 400 ether);

    _deltaNeutralVault.reinvest(abi.encode(0), 0);
  }

  function testCorrectness_GetPositiveExposureShouldWork() external {
    _assetVault.setDebt(20 ether, 20 ether);
    _lpToken.totalSupply.mockv(200 ether);
    _lpToken.getReserves.mockv(100 ether, 100 ether, uint32(block.timestamp));
    _lpToken.token0.mockv(address(_stableToken));
    int256 _exposure = _deltaNeutralVault.getExposure();
    assertEq(_exposure, 55 ether);
  }

  function testCorrectness_GetNegativeExposureShouldWork() external {
    _assetVault.setDebt(100 ether, 100 ether);
    _lpToken.totalSupply.mockv(200 ether);
    _lpToken.getReserves.mockv(100 ether, 100 ether, uint32(block.timestamp));
    _lpToken.token0.mockv(address(_stableToken));
    int256 _exposure = _deltaNeutralVault.getExposure();
    assertEq(_exposure, -25 ether);
  }

  function testCorrectness_GetZeroExposureShouldWork() external {
    _assetVault.setDebt(75 ether, 75 ether);
    _lpToken.totalSupply.mockv(200 ether);
    _lpToken.getReserves.mockv(100 ether, 100 ether, uint32(block.timestamp));
    _lpToken.token0.mockv(address(_stableToken));
    int256 _exposure = _deltaNeutralVault.getExposure();
    assertEq(_exposure, 0 ether);
  }

  function testRevert_RepurchaseWithStableTokenWhileExposureIsNegativeShouldRevert() external {
    _assetVault.setDebt(100 ether, 100 ether);
    _lpToken.totalSupply.mockv(200 ether);
    _lpToken.getReserves.mockv(100 ether, 100 ether, uint32(block.timestamp));
    _lpToken.token0.mockv(address(_stableToken));

    uint256 _amountToPurchase = 100 ether;
    uint256 _minReceiveAmount = 100 ether;
    vm.expectRevert(abi.encodeWithSignature("DeltaNeutralVault04_InvalidRepurchaseTokenIn()"));
    _deltaNeutralVault.repurchase(address(_stableToken), _amountToPurchase, _minReceiveAmount);
  }

  function testRevert_RepurchaseWithAssetTokenWhileExposureIsPositiveShouldRevert() external {
    _assetVault.setDebt(25 ether, 25 ether);
    _lpToken.totalSupply.mockv(200 ether);
    _lpToken.getReserves.mockv(100 ether, 100 ether, uint32(block.timestamp));
    _lpToken.token0.mockv(address(_stableToken));

    uint256 _amountToPurchase = 100 ether;
    uint256 _minReceiveAmount = 100 ether;
    vm.expectRevert(abi.encodeWithSignature("DeltaNeutralVault04_InvalidRepurchaseTokenIn()"));
    _deltaNeutralVault.repurchase(address(_assetToken), _amountToPurchase, _minReceiveAmount);
  }

  function testCorrectness_RepurchaseWithStableTokenWhileExposureIsPositiveShouldWork() external {
    _assetVault.setDebt(25 ether, 25 ether);
    _lpToken.totalSupply.mockv(200 ether);
    _lpToken.getReserves.mockv(100 ether, 100 ether, uint32(block.timestamp));
    _lpToken.token0.mockv(address(_stableToken));

    uint256 _amountToPurchase = 100 ether;
    uint256 _minReceiveAmount = 100 ether;
    _deltaNeutralVault.repurchase(address(_stableToken), _amountToPurchase, _minReceiveAmount);
  }

  function testCorrectness_RepurchaseWithAssetTokenWhileExposureIsNegativeShouldWork() external {
    _assetVault.setDebt(100 ether, 100 ether);
    _lpToken.totalSupply.mockv(200 ether);
    _lpToken.getReserves.mockv(100 ether, 100 ether, uint32(block.timestamp));
    _lpToken.token0.mockv(address(_stableToken));

    uint256 _amountToPurchase = 100 ether;
    uint256 _minReceiveAmount = 100 ether;
    _deltaNeutralVault.repurchase(address(_assetToken), _amountToPurchase, _minReceiveAmount);
  }

  function testRevert_ReinvestShouldRevertIfEquityIsLost() external {
    _alpacaToken.mint(address(_deltaNeutralVault), 100 ether);
    _reinvestExecutor.setExecutionValue(100 ether, 200 ether);

    vm.expectRevert(abi.encodeWithSignature("DeltaNeutralVault04_UnsafePositionEquity()"));
    _deltaNeutralVault.reinvest(abi.encode(0), 0);
  }

  function _initPosition() internal {
    _depositExecutor.setExecutionValue(100 ether, 200 ether);
    // 3x Position
    _deltaNeutralVault.initPositions(25 ether, 75 ether, 0, abi.encode(0));

    (
      uint256 stablePositionEquity,
      uint256 stablePositionDebtValue,
      uint256 stableLpAmount,
      uint256 assetPositionEquity,
      uint256 assetPositionDebtValue,
      uint256 assetLpAmount
    ) = _deltaNeutralVault.positionInfo();

    assertEq(stablePositionEquity, 25 ether);
    assertEq(assetPositionEquity, 75 ether);
    assertEq(stablePositionDebtValue, 50 ether);
    assertEq(assetPositionDebtValue, 150 ether);
    assertEq(stableLpAmount, 37.5 ether);
    assertEq(assetLpAmount, 112.5 ether);
    assertEq(_deltaNeutralVault.balanceOf(address(this)), 100 ether);
  }

  function _depositForAlice() internal {
    uint256 _depositValue = 100 ether;
    uint256 _borrowValue = _depositValue * 2; // 3x leverage

    _depositExecutor.setExecutionValue(_depositValue, _borrowValue);
    _deltaNeutralVault.deposit(100 ether, 0, ALICE, 100 ether, abi.encode(0));

    assertEq(_deltaNeutralVault.balanceOf(ALICE), 100 ether);
  }
}
