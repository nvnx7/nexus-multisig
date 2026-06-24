#!/usr/bin/env bun
import { rpc } from "@stellar/stellar-sdk";
import { $ } from "bun";

const DEPLOYER = process.argv[2] ?? "alice";
const RPC_URL = process.argv[3] ?? "http://localhost:8000/rpc";

const address = (await $`stellar keys address ${DEPLOYER}`.text()).trim();
const server = new rpc.Server(RPC_URL, { allowHttp: true });

process.stdout.write(`Waiting for ${DEPLOYER} (${address}) on-chain`);

while (true) {
  try {
    await server.getAccount(address);
    console.log(" ok");
    break;
  } catch (err) {
    // throw err;
    process.stdout.write(".");
    await Bun.sleep(1000);
  }
}
