import { Contract } from "ethers";
import { ethers } from "hardhat";

// @ts-ignore
import { poseidonContract } from "circomlibjs";

import { Poseidon } from "@iden3/js-crypto";

export async function getPoseidon(num: number): Promise<Contract> {
  if (num < 1 || num > 6) {
    throw new Error("Poseidon Hash: Invalid number");
  }

  const [deployer] = await ethers.getSigners();
  const PoseidonHasher = new ethers.ContractFactory(
    poseidonContract.generateABI(num),
    poseidonContract.createCode(num),
    deployer
  );
  const poseidonHasher = await PoseidonHasher.deploy();
  await poseidonHasher.deployed();

  return poseidonHasher;
}

export function poseidonHash(data: string): string {
  data = ethers.utils.hexlify(data);
  const chunks = splitHexIntoChunks(data.replace("0x", ""), 64);
  const inputs = chunks.map((v) => BigInt(v));
  return ethers.utils.hexZeroPad(ethers.utils.hexlify(Poseidon.hash(inputs)), 32);
}

function splitHexIntoChunks(hexString: string, chunkSize = 64) {
  const regex = new RegExp(`.{1,${chunkSize}}`, "g");
  const chunks = hexString.match(regex);

  if (!chunks) {
    throw new Error("Invalid hex string");
  }

  return chunks.map((chunk) => "0x" + chunk);
}
