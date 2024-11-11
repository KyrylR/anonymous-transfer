import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

import { getPoseidon } from "@scripts";

import {
  generateSecrets,
  getCommitment,
  getFormattedProof,
  getNullifierHash,
  getZKP,
  Reverter,
  SecretPair,
} from "@test-helpers";

import { Depositor, PoseidonSMT } from "@ethers-v6";

describe("Depositor", () => {
  const reverter = new Reverter();

  let USER1: SignerWithAddress;

  let state: PoseidonSMT;
  let depositor: Depositor;

  let treeHeight = 80;

  before(async () => {
    [, USER1] = await ethers.getSigners();

    const withdrawVerifierFactory = await ethers.getContractFactory("WithdrawVerifier");
    const verifier = await withdrawVerifierFactory.deploy();

    const Sate = await ethers.getContractFactory("PoseidonSMT", {
      libraries: {
        PoseidonUnit2L: await (await getPoseidon(2)).getAddress(),
        PoseidonUnit3L: await (await getPoseidon(3)).getAddress(),
      },
    });
    state = await Sate.deploy();

    const depositorFactory = await ethers.getContractFactory("Depositor", {
      libraries: {
        PoseidonUnit1L: await (await getPoseidon(1)).getAddress(),
      },
    });
    depositor = await depositorFactory.deploy(await verifier.getAddress(), await state.getAddress());

    await state.__PoseidonSMT_init(await depositor.getAddress(), treeHeight);

    await reverter.snapshot();
  });

  afterEach(reverter.revert);

  describe("Deposit flow", () => {
    it("should deposit 1 ETH", async () => {
      const commitment = getCommitment(generateSecrets());

      await depositor.deposit(commitment, { value: ethers.parseEther("1") });

      expect(await depositor.commitments(commitment)).to.be.true;
      expect(await ethers.provider.getBalance(await depositor.getAddress())).to.equal(ethers.parseEther("1"));
    });

    it("should not deposit any number of ETH except 1", async () => {
      await expect(depositor.deposit(ethers.ZeroHash, { value: ethers.parseEther("10") })).to.be.revertedWith(
        "Depositor: value must be 1 ether",
      );
    });

    it("should not deposit with the same commitment", async () => {
      const commitment = getCommitment(generateSecrets());

      await depositor.deposit(commitment, { value: ethers.parseEther("1") });
      await expect(depositor.deposit(commitment, { value: ethers.parseEther("1") })).to.be.revertedWith(
        "Depositor: commitment already exists",
      );
    });
  });

  describe("Withdraw flow", () => {
    let pair: SecretPair;

    beforeEach(async () => {
      pair = generateSecrets();
      const commitment = getCommitment(pair);
      const commitment1 = getCommitment(generateSecrets());
      const commitment2 = getCommitment(generateSecrets());
      const commitment3 = getCommitment(generateSecrets());
      const commitment4 = getCommitment(generateSecrets());

      await depositor.deposit(commitment1, { value: ethers.parseEther("1") });
      await depositor.deposit(commitment2, { value: ethers.parseEther("1") });
      await depositor.deposit(commitment3, { value: ethers.parseEther("1") });
      await depositor.deposit(commitment, { value: ethers.parseEther("1") });
      await depositor.deposit(commitment4, { value: ethers.parseEther("1") });
    });

    it("should withdraw 1 ETH", async () => {
      const { proofWithdraw, root } = await getZKP(pair, USER1.address, state);

      await depositor.withdraw(getNullifierHash(pair), USER1.address, root, getFormattedProof(proofWithdraw.proof));
    });
  });
});
