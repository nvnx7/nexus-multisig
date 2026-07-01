# Nexus

> Stellar Private Multisig

## Overview

Nexus is a privacy-preserving threshold multisig system built on [Stellar](https://stellar.org). It enables groups to collectively own and transact from a shielded vault without exposing balances or transfer amounts on the public ledger.

The core signing scheme is based on [FROST (Flexible Round-Optimised Schnorr Threshold Signatures)](https://eprint.iacr.org/2020/852.pdf) — a state-of-the-art threshold signature protocol that produces a single, compact Schnorr signature from a subset of signers without any trusted dealer. The implementation includes custom adaptations to make FROST compatible with ZK-friendly elliptic curves: key derivation, signature verification, and message construction are all designed to operate over the **Baby Jubjub** curve, which is natively efficient inside arithmetic circuits. This allows the Schnorr signature itself to be verified inside a zero-knowledge proof, binding threshold authorisation to private UTXO spends in a single, succinct on-chain proof.

Privacy is achieved through a shielded UTXO model: notes (UTXOs) are committed to an on-chain Merkle tree using **Poseidon** hashing, and spends are authorised by submitting a **Groth16** zero-knowledge proof that simultaneously proves note ownership, Merkle membership, and a valid FROST Schnorr signature — all without revealing which notes are being spent or how much is being transferred.

---

## Packages

This repository is a Bun monorepo managed with [Turborepo](https://turbo.build).

### `contracts/`

Soroban smart contracts written in Rust, deployed on Stellar.

- **pool** — The primary contract. Manages the on-chain shielded UTXO pool: maintains a Poseidon Merkle commitment tree, records spent nullifiers to prevent double-spends, and verifies Groth16 proofs submitted with each transaction.
- **circom-groth16-verifier** — On-chain Groth16 verifier for the BN254 curve, used by the pool contract to verify transaction proofs.
- **circuit-keys** — Stores the verification key for the transaction circuit, referenced by the pool contract during proof verification.
- **soroban-utils / types** — Shared utilities and type definitions across contracts.

### `circuits/`

Zero-knowledge circuits written in [Circom 2](https://docs.circom.io), compiled to Groth16 proofs over the BN254 curve.

- **transact** — The core private transaction circuit. Proves in zero knowledge that: (1) the input notes are committed in the Merkle tree, (2) the nullifiers are correctly derived, (3) the output commitments are correctly formed, and (4) a valid FROST Schnorr signature over the transaction message exists — without revealing any of the underlying values.
- **schnorr_verify** — Circuit gadget that verifies a Baby Jubjub Schnorr signature inside the arithmetic constraint system.
- **note_commitment / note_nullifier** — Gadgets for computing Poseidon-based note commitments and nullifiers.
- **merkle_proof** — Gadget for verifying Merkle inclusion proofs with depth 20.

### `crypto/`

TypeScript library (`nexus-crypto`) implementing all off-chain cryptographic primitives.

- **FROST DKG & signing** — Distributed key generation (rounds 1 and 2) and threshold signing protocol, adapted for the Baby Jubjub curve.
- **Schnorr signatures** — Baby Jubjub Schnorr sign/verify, compatible with the in-circuit verifier.
- **Note** — Shielded UTXO abstraction: encodes amount, randomness, and recipient public key; derives Poseidon commitments and nullifiers.
- **Poseidon** — Native Poseidon hash implementation compatible with the Circom circuit and on-chain contract.
- **ECIES** — Elliptic-curve integrated encryption for encrypting output notes to recipient public keys.
- **Merkle tree** — Incremental Merkle tree operations matching the on-chain tree.
- **Group view key** — Derived key that allows group members to scan the chain and decrypt incoming notes addressed to the vault.
- **ZK message derivation** — Constructs the canonical message that FROST signers commit to, binding Merkle root, nullifiers, output commitments, public amounts, and external data hash.

### `coordinator/`

A lightweight REST API server (Bun + [Hono](https://hono.dev), PostgreSQL + [Drizzle ORM](https://orm.drizzle.team)) that orchestrates the multi-round protocols between participants.

- **DKG sessions** (`/api/dkg`) — Manages the two-round FROST distributed key generation ceremony: collects round-1 commitments, distributes round-2 encrypted shares, and finalises the group public key.
- **Groups** (`/api/groups`) — Stores group membership, threshold parameters, and the resulting aggregate public key once DKG completes.
- **Sign sessions** (`/api/sign-sessions`) — Coordinates FROST signing rounds for proposed transactions: collects nonce commitments and partial signatures, aggregates them, and publishes the final signature for proof generation.

### `ui/`

Next.js 15 web application (React 19, Chakra UI) — the primary user interface for Nexus.

- Wallet connection via Freighter / Lobstr through `@creit-tech/stellar-wallets-kit`.
- Derives a deterministic shielded identity (Baby Jubjub keypair) from a single wallet signature — no extra key management for users.
- Vault creation through the FROST DKG ceremony, coordinated with the server.
- Deposit, withdrawal, and shielded transfer flows with in-browser Groth16 proof generation via [snarkjs](https://github.com/iden3/snarkjs).
- Real-time signing ceremony participation: submit nonce commitments and partial signatures as a co-signer.

### `bindings/`

Auto-generated TypeScript bindings for the Soroban pool contract, produced by `soroban contract bindings ts`. Consumed by `ui/` and `coordinator/` to invoke pool contract methods: deposit, withdraw, transfer, Merkle root queries, and nullifier checks.

---

## Architecture

```
  User (browser)
       │
       │  wallet sign · ZK proof generation (snarkjs)
       ▼
    ui/  ──────────────────────────────────────────►  coordinator/
  (Next.js)         DKG & signing sessions            (Hono + Postgres)
       │
       │  submit proof + aggregate signature
       ▼
  contracts/pool
  (Soroban / Stellar)
       │
       ├── verifies Groth16 proof (circom-groth16-verifier)
       ├── appends output commitments to Merkle tree
       └── records nullifiers to prevent double-spends
```

---

## Development

### Prerequisites

| Tool                                                                                     | Purpose                                                                |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [Bun](https://bun.sh) ≥ 1.3                                                              | Package manager and runtime for all TypeScript packages                |
| [Rust](https://rustup.rs) + `wasm32-unknown-unknown` target                              | Compiling Soroban smart contracts                                      |
| [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) | Building and deploying contracts, managing the local network container |
| [Docker](https://www.docker.com)                                                         | Running the local Stellar network container                            |
| [Circom 2](https://docs.circom.io/getting-started/installation/)                         | Compiling zero-knowledge circuits                                      |
| [snarkjs](https://github.com/iden3/snarkjs)                                              | Generating proving keys and verification keys from compiled circuits   |
| [PostgreSQL](https://www.postgresql.org)                                                 | Database for the coordinator server                                    |

### Local network setup

The `Makefile` provides targets for spinning up a full local environment.

```bash
# Full setup from scratch — compiles circuits, builds contracts,
# starts the local Stellar network, and deploys everything
make start-local

# Start network and deploy only (circuits and contracts already built)
make run-local

# Individual steps
make build-circuits       # Compile Circom circuits and generate proving/verification keys
make build-contracts      # Build Soroban contracts (embeds the verification key)
make start-network        # Start a local Stellar container (protocol version 27)
make stop-network         # Stop the local Stellar container
make setup-accounts       # Fund test accounts on the local network
make deploy-contracts     # Deploy pool and verifier contracts, write contract IDs to config
make clean-db             # Reset the coordinator Postgres database
```

By default `NETWORK=local`. Pass `NETWORK=testnet` to target the public testnet:

```bash
make setup-accounts NETWORK=testnet
make deploy-contracts NETWORK=testnet
```
