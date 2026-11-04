import express from "express";
import cors from "cors";

export function createApp(frontendUrl: string) {
  const app = express();

  app.use(cors({ origin: frontendUrl }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "shiftflow-api"
    });
  });

  return app;
}