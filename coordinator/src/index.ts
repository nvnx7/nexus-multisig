import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { dkgRouter } from "./routes/dkg";
import { groupsRouter } from "./routes/groups";
import { sessionsRouter } from "./routes/sessions";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/api/status", (c) => c.text("OK"));

app.route("/api/dkg", dkgRouter);
app.route("/api/groups", groupsRouter);
app.route("/api/sessions", sessionsRouter);

export default {
  port: parseInt(process.env.PORT ?? "4000"),
  fetch: app.fetch,
};
