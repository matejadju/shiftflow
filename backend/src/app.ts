import express from "express";
import type { ErrorRequestHandler } from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import shiftsRouter from "./routes/shifts.js";

export function createApp(frontendUrl: string) {
  const app = express();

  app.disable("x-powered-by");

  app.use(cors({ origin: frontendUrl }));
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "shiftflow-api"
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/shifts", shiftsRouter);

  app.use((_req, res) => {
    res.status(404).json({ message: "Pot ne obstaja." });
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    _req,
    res,
    _next
  ) => {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error
        ? error.status
        : undefined;

    if (status === 400) {
      res.status(400).json({ message: "Neveljavna zahteva JSON." });
      return;
    }

    if (status === 413) {
      res.status(413).json({ message: "Zahteva je prevelika." });
      return;
    }

    console.error("Obdelava zahteve ni uspela.");

    res.status(500).json({
      message: "Prišlo je do napake na strežniku."
    });
  };

  app.use(errorHandler);

  return app;
}