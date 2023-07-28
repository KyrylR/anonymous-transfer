import { ethers } from "hardhat";
import { poseidonHash } from "@/test/helpers/poseidon-hash";
import { MerkleTree } from "merkletreejs";
import { getBytes32PoseidonHash, getLeafIndex, getPositionalProof, getProof } from "@/test/helpers/merkle-tree-helper";
import { Buffer } from "buffer";

export interface SecretPair {
  secret: string;
  nullifier: string;
}

export function generateSecrets(): SecretPair {
  const secret = ethers.utils.randomBytes(28);
  const nullifier = ethers.utils.randomBytes(28);

  return {
    secret: ethers.utils.hexZeroPad(ethers.utils.hexlify(secret), 32),
    nullifier: ethers.utils.hexZeroPad(ethers.utils.hexlify(nullifier), 32),
  };
}

export function getCommitment(pair: SecretPair): string {
  return poseidonHash(pair.secret + pair.nullifier.replace("0x", ""));
}

export function getNullifierHash(pair: SecretPair): string {
  return poseidonHash(pair.nullifier);
}

export function getZKP(pair: SecretPair, tree: MerkleTree) {
  const leaf = getBytes32PoseidonHash(getCommitment(pair));
  const nullifierHash = getNullifierHash(pair);

  const [pathIncidences, pathElements] = getPositionalProof(tree, leaf);
}
