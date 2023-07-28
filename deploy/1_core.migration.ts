import { artifacts } from "hardhat";

import { Deployer, Logger } from "@dlsl/hardhat-migrate";

import { getPoseidon } from "@/test/helpers/poseidon-hash";

const Depositor = artifacts.require("Depositor");
const Groth16Verifier = artifacts.require("Groth16Verifier");

const PoseidonUnit1L = artifacts.require("PoseidonUnit1L");
const PoseidonUnit2L = artifacts.require("PoseidonUnit2L");

export = async (deployer: Deployer, logger: Logger) => {
  const poseidon1 = await getPoseidon(1);
  const poseidon2 = await getPoseidon(2);

  const poseidonUnit2L = await PoseidonUnit1L.at(poseidon1.address);
  const poseidonUnit3L = await PoseidonUnit2L.at(poseidon2.address);

  await deployer.link(poseidonUnit2L, Depositor);
  await deployer.link(poseidonUnit3L, Depositor);

  const verifier = await deployer.deploy(Groth16Verifier);

  const depositor = await deployer.deploy(Depositor, 6, verifier.address);

  logger.logContracts(["Depositor", depositor.address], ["Groth16Verifier", verifier.address]);
};
