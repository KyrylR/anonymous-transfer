import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

export async function accounts(index: number): Promise<SignerWithAddress> {
  return (await ethers.getSigners())[index];
}
