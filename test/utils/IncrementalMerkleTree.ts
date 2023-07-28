import { expect } from "chai";
import { ethers } from "hardhat";

import { MerkleTree } from "merkletreejs";

import { getPoseidon, poseidonHash } from "@/test/helpers/poseidon-hash";
import { buildSparseMerkleTree, getRoot } from "@/test/helpers/merkle-tree-helper";

import { IncrementalMerkleTree, PoseidonIMT } from "@ethers-v5";

describe.only("IncrementalMerkleTree", () => {
  let poseidonIMT: PoseidonIMT;
  let merkleTree: IncrementalMerkleTree;

  let localMerkleTree: MerkleTree;
  let poseidonMerkleTree: MerkleTree;

  let treeHeight = 15;
  let poseidonTreeHeight = 6;

  beforeEach(async () => {
    const incrementalMerkleTree = await ethers.getContractFactory("IncrementalMerkleTree");
    merkleTree = await incrementalMerkleTree.deploy(treeHeight);

    localMerkleTree = buildSparseMerkleTree(ethers.utils.keccak256, [], treeHeight);
    poseidonMerkleTree = buildSparseMerkleTree(poseidonHash, [], poseidonTreeHeight);

    const poseidonIMTFactory = await ethers.getContractFactory("PoseidonIMT", {
      libraries: {
        PoseidonUnit1L: (await getPoseidon(1)).address,
        PoseidonUnit2L: (await getPoseidon(2)).address,
      },
    });

    poseidonIMT = await poseidonIMTFactory.deploy(poseidonTreeHeight);
  });

  function getBytes32Element(element: string) {
    return ethers.utils.hexZeroPad(element, 32);
  }

  function getBytes32ElementHash(element: string) {
    return ethers.utils.keccak256(ethers.utils.hexZeroPad(element, 32));
  }

  function getBytes32PoseidonHash(element: string) {
    return poseidonHash(ethers.utils.hexZeroPad(element, 32));
  }

  describe("Basic IMT", () => {
    it("should add element to tree", async () => {
      const element = getBytes32Element("0x1234");

      await merkleTree.add(element);

      const elementHash = getBytes32ElementHash("0x1234");

      localMerkleTree = buildSparseMerkleTree(
        ethers.utils.keccak256,
        [elementHash],
        (await merkleTree.getHeight()).toNumber()
      );

      expect(await merkleTree.getRoot()).to.eq(getRoot(localMerkleTree));

      expect(await merkleTree.getLength()).to.eq(1);
    });

    it("should add elements to tree", async () => {
      const elements = [];

      for (let i = 1; i < 33; i++) {
        const element = getBytes32Element(`0x${i}234`);

        await merkleTree.add(element);

        const elementHash = getBytes32ElementHash(element);

        elements.push(elementHash);

        localMerkleTree = buildSparseMerkleTree(
          ethers.utils.keccak256,
          elements,
          (await merkleTree.getHeight()).toNumber()
        );

        expect(await merkleTree.getRoot()).to.eq(getRoot(localMerkleTree));

        expect(await merkleTree.getLength()).to.eq(i);
      }
    });

    it("should return zeroHash if tree is empty", async () => {
      expect(await merkleTree.getRoot()).to.eq(getRoot(localMerkleTree));
    });
  });

  describe("Poseidon IMT", () => {
    it("should add element to tree", async () => {
      const element = getBytes32Element("0x1234");

      await poseidonIMT.add(element);

      const elementHash = getBytes32PoseidonHash("0x1234");

      poseidonMerkleTree = buildSparseMerkleTree(
        poseidonHash,
        [elementHash],
        (await poseidonIMT.getHeight()).toNumber()
      );

      expect(await poseidonIMT.getRoot()).to.eq(getRoot(poseidonMerkleTree));

      expect(await poseidonIMT.getLength()).to.eq(1);
    });

    it("should add elements to tree", async () => {
      const elements = [];

      for (let i = 1; i < 33; i++) {
        const element = getBytes32Element(`0x${i}234`);

        await poseidonIMT.add(element);

        const elementHash = getBytes32PoseidonHash(element);

        elements.push(elementHash);

        poseidonMerkleTree = buildSparseMerkleTree(poseidonHash, elements, (await poseidonIMT.getHeight()).toNumber());

        expect(await poseidonIMT.getRoot()).to.eq(getRoot(poseidonMerkleTree));

        expect(await poseidonIMT.getLength()).to.eq(i);
      }
    });

    it("should return zeroHash if tree is empty", async () => {
      expect(await poseidonIMT.getRoot()).to.eq(getRoot(poseidonMerkleTree));
    });
  });
});
