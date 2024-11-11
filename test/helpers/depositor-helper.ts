import { ethers, zkit } from "hardhat";

import { Groth16Proof } from "@solarity/zkit";

import { Poseidon } from "@iden3/js-crypto";

import { PrivateWithdraw } from "@zkit";
import { VerifierHelper } from "@/generated-types/ethers/contracts/Depositor";
import { PoseidonSMT } from "@ethers-v6";

export interface SecretPair {
  secret: string;
  nullifier: string;
}

export function generateSecrets(): SecretPair {
  const secret = ethers.randomBytes(28);
  const nullifier = ethers.randomBytes(28);

  return {
    secret: ethers.hexlify(secret),
    nullifier: ethers.hexlify(nullifier),
  };
}

export function getCommitment(pair: SecretPair): string {
  return ethers.toBeHex(Poseidon.hash([BigInt(pair.secret), BigInt(pair.nullifier)]), 32);
}

export function getCommitmentKey(pair: SecretPair): string {
  return ethers.toBeHex(Poseidon.hash([BigInt(getCommitment(pair))]), 32);
}

export function getNullifierHash(pair: SecretPair): string {
  return ethers.toBeHex(Poseidon.hash([BigInt(pair.nullifier)]), 32);
}

export async function getZKP(pair: SecretPair, receiverAddress: string, state: PoseidonSMT) {
  const circuit = await zkit.getCircuit("Withdraw");

  const smtProof = await state.getProof(getCommitmentKey(pair));

  const inputs: PrivateWithdraw = {
    root: BigInt(smtProof.root),
    recipient: BigInt(receiverAddress),
    secret: BigInt(pair.secret),
    nullifier: BigInt(pair.nullifier),
    siblings: smtProof.siblings.map((sibling) => BigInt(sibling)),
    auxKey: BigInt(smtProof.auxKey),
    auxValue: BigInt(smtProof.auxValue),
    auxIsEmpty: BigInt(smtProof.auxExistence),
    isExclusion: BigInt(0),
  };

  return { proofWithdraw: await circuit.generateProof(inputs), root: smtProof.root };
}

export function getFormattedProof(proof: Groth16Proof): VerifierHelper.ProofPointsStruct {
  swap(proof.pi_b[0], 0, 1);
  swap(proof.pi_b[1], 0, 1);

  return {
    a: proof.pi_a.slice(0, 2).map((x: any) => ethers.toBeHex(BigInt(x)), 32) as any,
    b: proof.pi_b.slice(0, 2).map((x: any[]) => x.map((y: any) => ethers.toBeHex(BigInt(y))), 32) as any,
    c: proof.pi_c.slice(0, 2).map((x: any) => ethers.toBeHex(BigInt(x)), 32) as any,
  };
}

export function swap(arr: any, i: number, j: number) {
  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;
}
