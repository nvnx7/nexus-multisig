#!/usr/bin/env bun
import { $ } from "bun";

const NETWORK = process.argv[2] ?? "local";

const ACCOUNTS = [
  "alice",
  "bob",
  "carol",
  "dave",
  "eve",
  "frank",
  "grace",
  "heidi",
  "ivan",
  "judy",
] as const;

async function main() {
  console.log(`Funding ${ACCOUNTS.length} accounts on "${NETWORK}"…\n`);

  for (const name of ACCOUNTS) {
    const existing = (
      await $`stellar keys address ${name}`.quiet().nothrow()
    ).stdout
      .toString()
      .trim();

    if (existing) {
      await $`stellar keys fund ${name} --network ${NETWORK}`.quiet().nothrow();
      const secret = (
        await $`stellar keys secret ${name}`.quiet().text()
      ).trim();
      console.log(`  funded  ${name.padEnd(8)} ${existing}  ${secret}`);
    } else {
      await $`stellar keys generate ${name} --network ${NETWORK} --fund`;
      const address = (
        await $`stellar keys address ${name}`.quiet().text()
      ).trim();
      const secret = (
        await $`stellar keys secret ${name}`.quiet().text()
      ).trim();
      console.log(`  created ${name.padEnd(8)} ${address}  ${secret}`);
    }
  }

  console.log("\nDone.");
}

main().then(() => process.exit(0));
