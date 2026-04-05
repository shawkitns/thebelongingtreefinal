import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const server = createServer(app);
  const io = new Server(server, {
    maxHttpBufferSize: 1e8, // 100 MB
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  app.use(express.json({ limit: "50mb" }));

  // State
  let totalTravellers = 0;
  let paths: { id: string; countries: string[]; leafPath: string; color: string; leafScale: number; timestamp: number }[] = [];

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Send existing state to newly connected client
    socket.emit("initial_state", { totalTravellers, paths });

    // User submits their drawn leaf + selected countries
    socket.on("submit_leaf", (data: { id: string; countries: string[]; leafPath: string; color: string; leafScale: number }) => {
      totalTravellers++;
      const newPath = {
        id: data.id,
        countries: data.countries,
        leafPath: data.leafPath,
        color: data.color || '#5ecf3e',
        leafScale: data.leafScale ?? 1,
        timestamp: Date.now(),
      };
      paths.push(newPath);

      io.emit("new_path_added", { totalTravellers, newPath });
    });

    socket.on("status_update", (data: { status: string }) => {
      io.emit("status_update", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
