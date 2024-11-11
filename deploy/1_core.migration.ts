import { Deployer, Reporter } from "@solarity/hardhat-migrate";

import { deployPoseidons } from "@/deploy/helpers/poseidon";
import { Depositor__factory, PoseidonSMT__factory, WithdrawVerifier__factory } from "@ethers-v6";

export = async (deployer: Deployer) => {
  await deployPoseidons(deployer, [1, 2, 3]);

  const verifier = await deployer.deploy(WithdrawVerifier__factory);

  const state = await deployer.deploy(PoseidonSMT__factory, []);
  const depositor = await deployer.deploy(Depositor__factory, [await verifier.getAddress(), await state.getAddress()]);

  await state.__PoseidonSMT_init(await depositor.getAddress(), 80);

  Reporter.reportContracts(["Depositor", await depositor.getAddress()], ["PoseidonSMT", await state.getAddress()]);
};
