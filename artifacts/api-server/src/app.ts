import { existsSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pinoHttp } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    username?: string;
  }
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: IncomingMessage) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res: ServerResponse) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PgStore = connectPg(session);
app.use(
  session({
    store: new PgStore({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "dev-fallback-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use("/api", router);

const appDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDistCandidates = [
  process.env.FRONTEND_DIST_DIR ? path.resolve(process.env.FRONTEND_DIST_DIR) : undefined,
  path.resolve(appDir, "../../../dist"),
  path.resolve(appDir, "../../weather-news-hub/dist/public"),
].filter((candidate): candidate is string => Boolean(candidate));

const frontendDistDir = frontendDistCandidates.find((candidate) =>
  existsSync(path.join(candidate, "index.html")),
);

if (frontendDistDir) {
  app.use(express.static(frontendDistDir, { index: false }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api")) {
      return next();
    }

    res.sendFile(path.join(frontendDistDir, "index.html"));
  });
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const asRecord = typeof err === "object" && err !== null ? (err as Record<string, unknown>) : {};
  const status = typeof asRecord.status === "number" ? asRecord.status
    : typeof asRecord.statusCode === "number" ? asRecord.statusCode
    : 500;
  const message = err instanceof Error ? err.message : "Internal Server Error";
  logger.error({ err }, "Unhandled error");
  if (!res.headersSent) res.status(status).json({ message });
});

export default app;
