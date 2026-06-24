#!/usr/bin/env bun
/**
 * Deploy the Nexus contracts (Circom Groth16 verifier + pool) to local or testnet.
 *
 * Steps: build the wasm (embedding the circuit verification key), upload each
 * wasm, then instantiate — the verifier has no constructor, the pool takes
 * constructor args. Writes the resulting ids to deployments/<network>/deployments.json.
 *
 * Usage:
 *   bun contracts/scripts/deploy.ts            # local, deployer = alice
 *   bun contracts/scripts/deploy.ts testnet    # testnet
 *   (or: cd contracts && bun run deploy [network])
 *
 * Edit the CONFIG block below to change deployer, admin, levels, token, etc.
 */

import { $ } from "bun";
import {
  Address,
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  xdr,
} from "@stellar/stellar-sdk";
import { join } from "node:path";

// ── Config ────────────────────────────────────────────────────────────────────
const NETWORK = (process.argv[2] ?? "local") as "local" | "testnet";
/** Stellar CLI identity used to sign and pay for the deployment. */
const DEPLOYER = "alice";
/** Pool admin address (G… or C…). Empty string → defaults to the deployer. */
const ADMIN = "";
/** Token contract for the pool. Empty string → the network's native XLM SAC. */
const TOKEN = "";
/** Commitment Merkle tree depth. Must match the circuit (circuits/main.circom → Transact(2, 20)). */
const POOL_LEVELS = 20;
/** Maximum deposit per transaction (u256). */
const MAX_DEPOSIT = 18446744073709551615n;

// ── Derived constants ───────────────────────────────────────────────────────────
const RPC_URL =
  NETWORK === "local"
    ? "http://localhost:8000/rpc"
    : "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE =
  NETWORK === "local" ? Networks.STANDALONE : Networks.TESTNET;

const SCRIPT_DIR = import.meta.dir; // contracts/scripts
const CONTRACTS_DIR = join(SCRIPT_DIR, ".."); // contracts
const REPO_ROOT = join(CONTRACTS_DIR, ".."); // repo root
const MANIFEST_PATH = join(CONTRACTS_DIR, "Cargo.toml");
const WASM_DIR = join(CONTRACTS_DIR, "target", "stellar");
const VERIFIER_WASM = join(WASM_DIR, "circom_groth16_verifier.wasm");
const POOL_WASM = join(WASM_DIR, "pool.wasm");
const VK_JSON = join(REPO_ROOT, "circuits", "build", "verification_key.json");
const DEPLOYMENTS_FILE = join(
  CONTRACTS_DIR,
  "deployments",
  NETWORK,
  "deployments.json",
);

// ── Setup ───────────────────────────────────────────────────────────────────────
const server = new rpc.Server(RPC_URL, { allowHttp: NETWORK === "local" });
const deployer = Keypair.fromSecret(
  (await $`stellar keys secret ${DEPLOYER}`.text()).trim(),
);

if (NETWORK === "local") {
  // Ensure the deployer account is funded via friendbot (idempotent — safe to re-run).
  await $`stellar keys fund ${DEPLOYER} --network ${NETWORK}`.quiet().nothrow();

  // Wait until the account is visible on-chain before proceeding.
  process.stdout.write(`Waiting for ${DEPLOYER} account on-chain`);
  while (true) {
    try {
      await server.getAccount(deployer.publicKey());
      console.log(" ok");
      break;
    } catch {
      process.stdout.write(".");
      await Bun.sleep(1000);
    }
  }
}

// ── Transaction helpers ─────────────────────────────────────────────────────────

/** Build, simulate, sign, submit, and await confirmation of a single operation. */
async function sendOperation(operation: xdr.Operation) {
  const account = await server.getAccount(deployer.publicKey());
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(deployer);

  const sent = await server.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new Error(`submit failed: ${JSON.stringify(sent.errorResult)}`);
  }

  let result = await server.getTransaction(sent.hash);
  while (result.status === "NOT_FOUND") {
    await Bun.sleep(1000);
    result = await server.getTransaction(sent.hash);
  }
  if (result.status !== "SUCCESS") {
    throw new Error(`transaction ${sent.hash} failed: ${result.status}`);
  }
  if (!result.returnValue) {
    throw new Error(`transaction ${sent.hash} returned no value`);
  }
  return result.returnValue;
}

/** Upload a contract's wasm and return its hash. */
async function uploadWasm(wasmPath: string): Promise<Buffer> {
  const wasm = await Bun.file(wasmPath).bytes();
  const returnValue = await sendOperation(
    Operation.uploadContractWasm({ wasm }),
  );
  return returnValue.bytes();
}

/** Instantiate a contract from an uploaded wasm hash; returns the contract id. */
async function deployContract(
  wasmHash: Buffer,
  constructorArgs: xdr.ScVal[] = [],
): Promise<string> {
  const operation = Operation.createCustomContract({
    address: Address.fromString(deployer.publicKey()),
    wasmHash,
    salt: Buffer.from(crypto.getRandomValues(new Uint8Array(32))),
    ...(constructorArgs.length > 0 ? { constructorArgs } : {}),
  });
  const returnValue = await sendOperation(operation);
  return StrKey.encodeContract(
    Address.fromScAddress(returnValue.address()).toBuffer(),
  );
}

// ── Deploy ───────────────────────────────────────────────────────────────────────

async function main() {
  if (!(await Bun.file(VK_JSON).exists())) {
    throw new Error(
      `verification key not found: ${VK_JSON}\nRun circuits/scripts/compile.sh first, or point VK_JSON elsewhere.`,
    );
  }

  console.log(`Network : ${NETWORK} (${RPC_URL})`);
  console.log(`Deployer: ${DEPLOYER} (${deployer.publicKey()})`);

  // 1. Build — the verifier's build.rs embeds the VK from VERIFIER_VK_JSON.
  process.env.VERIFIER_VK_JSON = VK_JSON;
  for (const pkg of ["circom-groth16-verifier", "pool"]) {
    console.log(`Building ${pkg}…`);
    await $`stellar contract build --manifest-path ${MANIFEST_PATH} --out-dir ${WASM_DIR} --package ${pkg}`.quiet();
  }

  const admin = ADMIN || deployer.publicKey();
  const token =
    TOKEN ||
    (
      await $`stellar contract id asset --asset native --network ${NETWORK}`.text()
    ).trim();
  console.log(`Admin   : ${admin}`);
  console.log(`Token   : ${token}`);

  // 2. Deploy the verifier (no constructor).
  console.log("Deploying circom-groth16-verifier…");
  const verifierId = await deployContract(await uploadWasm(VERIFIER_WASM));
  console.log(`  verifier: ${verifierId}`);

  // 3. Deploy the pool (constructor: admin, token, verifier, max_deposit, levels).
  console.log("Deploying pool…");
  const poolId = await deployContract(await uploadWasm(POOL_WASM), [
    new Address(admin).toScVal(),
    new Address(token).toScVal(),
    new Address(verifierId).toScVal(),
    nativeToScVal(MAX_DEPOSIT, { type: "u256" }),
    nativeToScVal(POOL_LEVELS, { type: "u32" }),
  ]);
  console.log(`  pool: ${poolId}`);

  // 4. Record the deployment.
  const deployment = {
    network: NETWORK,
    deployer: deployer.publicKey(),
    admin,
    token,
    verifier: verifierId,
    pool: poolId,
  };
  await Bun.write(DEPLOYMENTS_FILE, `${JSON.stringify(deployment, null, 2)}\n`);

  // Write UI env so the frontend picks up the new contract IDs automatically.
  const uiEnvFile = join(REPO_ROOT, "ui", `.env.${NETWORK}.local`);
  await Bun.write(uiEnvFile, `NEXT_PUBLIC_POOL_CONTRACT_ID=${poolId}\n`);

  console.log(`\n✅ Deployed. Wrote ${DEPLOYMENTS_FILE} and ${uiEnvFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
