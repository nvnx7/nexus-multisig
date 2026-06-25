import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { dkgRouter } from "./routes/dkg";
import { groupsRouter } from "./routes/groups";
import { signSessionsRouter } from "./routes/sign-sessions";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/api/status", (c) => c.text("OK"));

app.route("/api/dkg", dkgRouter);
app.route("/api/groups", groupsRouter);
app.route("/api/sign-sessions", signSessionsRouter);

export default {
  port: parseInt(process.env.PORT ?? "4000"),
  fetch: app.fetch,
};
