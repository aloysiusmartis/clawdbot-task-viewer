import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createPool, closePool, testConnection } from "./db/index.js";
import { getRedisClient, closeRedis, testRedisConnection } from "./redis/index.js";
import { initializeTunnel, closeTunnel, killAllTunnels, getTunnelUrl } from "./ngrok/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3456", 10);

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/api/health", async (_req, res) => {
  const dbConnected = await testConnection();
  const redisConnected = await testRedisConnection();
  const tunnelUrl = getTunnelUrl();

  res.json({
    status: dbConnected && redisConnected ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      database: dbConnected ? "connected" : "disconnected",
      redis: redisConnected ? "connected" : "disconnected",
    },
    tunnel: {
      url: tunnelUrl,
      active: tunnelUrl !== null,
    },
  });
});

// Import API routes
import sessionsRouter from "./routes/sessions.js";

// API routes
app.use("/api/v1/sessions", sessionsRouter);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientBuildPath));

  // Handle client-side routing
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

// Initialize services and start server
async function start(): Promise<void> {
  try {
    // Initialize database pool
    createPool();
    console.log("✅ Database pool created");

    // Initialize Redis client
    const redis = getRedisClient();
    await redis.connect();
    console.log("✅ Redis connected");

    // Start the server
    const server = app.listen(PORT, async () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
      
      // Initialize Ngrok tunnel
      try {
        const tunnelUrl = await initializeTunnel(PORT);
        console.log(`📡 Application is publicly accessible at: ${tunnelUrl}`);
      } catch (error) {
        console.warn("⚠️  Ngrok tunnel failed to start:", error);
        console.log("📍 Application is only accessible locally");
      }
    });

    // Handle server errors
    server.on("error", (error) => {
      console.error("Server error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log("🛑 Shutting down gracefully...");
  
  try {
    // Close Ngrok tunnel
    await closeTunnel();
    
    // Close database and Redis connections
    await closePool();
    await closeRedis();
    
    // Kill all Ngrok processes to ensure clean shutdown
    await killAllTunnels();
    
    console.log("✅ Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();
