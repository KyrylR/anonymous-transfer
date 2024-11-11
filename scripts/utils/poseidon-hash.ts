import { ethers } from "hardhat";
import { BaseContract } from "ethers";

// @ts-ignore
import { poseidonContract } from "circomlibjs";

export async function getPoseidon(num: number): Promise<BaseContract> {
  if (num < 1 || num > 6) {
    throw new Error("Poseidon Hash: Invalid number");
  }

  const [deployer] = await ethers.getSigners();
  const PoseidonHasher = new ethers.ContractFactory(
    poseidonContract.generateABI(num),
    poseidonContract.createCode(num),
    deployer,
  );
  const poseidonHasher = await PoseidonHasher.deploy();
  await poseidonHasher.waitForDeployment();

  return poseidonHasher;
}
