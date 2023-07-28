import { MerkleTree } from "merkletreejs";
import { ethers } from "hardhat";
import { poseidonHash } from "@/test/helpers/poseidon-hash";

export function getBytes32Element(element: string) {
  return ethers.utils.hexZeroPad(element, 32);
}

export function getBytes32ElementHash(element: string) {
  return ethers.utils.keccak256(ethers.utils.hexZeroPad(element, 32));
}

export function getBytes32PoseidonHash(element: string) {
  return poseidonHash(ethers.utils.hexZeroPad(element, 32));
}

export function getRoot(tree: MerkleTree) {
  return "0x" + tree.getRoot().toString("hex");
}

export function getProof(hashFunc: any, tree: MerkleTree, leaf: string) {
  return tree.getProof(hashFunc(leaf)).map((e) => "0x" + e.data.toString("hex"));
}

export function getPositionalProof(tree: MerkleTree, leaf: string): [number[], string[]] {
  const positionalProof = tree.getPositionalHexProof(leaf);
  const positions = positionalProof.map((e) => Number(e[0]));
  const data = positionalProof.map((e) => ethers.utils.hexZeroPad(ethers.utils.hexlify(e[1]), 32));
  return [positions, data];
}

export function buildTree(hashFunc: any, leaves: string[]) {
  return new MerkleTree(leaves, hashFunc, { hashLeaves: true, sortPairs: true });
}

export function buildSparseMerkleTree(hashFunc: any, leaves: string[], height: number) {
  const elementsToAdd = 2 ** height - leaves.length;
  const zeroHash = hashFunc("0x0000000000000000000000000000000000000000000000000000000000000000");
  const zeroElements = Array(elementsToAdd).fill(zeroHash);

  return new MerkleTree([...leaves, ...zeroElements], hashFunc, {
    hashLeaves: false,
    sortPairs: false,
  });
}

export function addElementToTree(hashFunc: any, tree: MerkleTree, element: string) {
  return new MerkleTree([...tree.getLeaves(), element], hashFunc, {
    hashLeaves: true,
    sortPairs: true,
  });
}

export const getLeafIndex = (tree: MerkleTree, leaf: string) => {
  return tree.getLeafIndex(Buffer.from(leaf.replace("0x", ""), "hex"));
};
