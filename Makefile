NETWORK ?= local

.PHONY: start-local run-local build-circuits build-contracts start-network stop-network wait-network wait-accounts setup-accounts deploy-contracts clean-db

# ── Composite ──────────────────────────────────────────────────────────────────

# Full setup from scratch: compile circuits, build contracts, start network, deploy
start-local: build-contracts run-local

# Start network + deploy (assumes circuits and contracts are already built)
run-local: start-network wait-network setup-accounts deploy-contracts

# ── Steps ──────────────────────────────────────────────────────────────────────

build-circuits:
	@echo "==> Compiling circuits..."
	bash circuits/scripts/compile.sh

build-contracts:
	@echo "==> Building contracts..."
	VERIFIER_VK_JSON=$(CURDIR)/circuits/build/verification_key.json \
		stellar contract build \
		--manifest-path contracts/Cargo.toml \
		--out-dir contracts/target/stellar \
		--package circom-groth16-verifier
	stellar contract build \
		--manifest-path contracts/Cargo.toml \
		--out-dir contracts/target/stellar \
		--package pool

start-network:
	@echo "==> Starting local Stellar network..."
	stellar container start local --protocol-version 27

wait-network:
	@echo "==> Waiting for RPC to be ready..."
	@until curl -sf http://localhost:8000/rpc \
		-H 'Content-Type: application/json' \
		-d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
		2>/dev/null | grep -q '"status":"healthy"'; do \
		printf '.'; sleep 1; \
	done
	@echo " ok"

wait-accounts:
	bun contracts/scripts/wait-account.ts alice http://localhost:8000/rpc

stop-network:
	@echo "==> Stopping local Stellar network..."
	stellar container stop local

setup-accounts:
	@echo "==> Setting up accounts on $(NETWORK)..."
	bun contracts/scripts/setup-accounts.ts $(NETWORK)

deploy-contracts:
	@echo "==> Deploying to $(NETWORK)..."
	bun contracts/scripts/deploy.ts $(NETWORK)

clean-db:
	@echo "==> Cleaning up coordinator database..."
	bun coordinator/scripts/reset.ts