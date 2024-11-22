import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";

// Extend WebSocket to include partner property
interface ExtendedWebSocket extends WebSocket {
    partner?: ExtendedWebSocket;
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let waitingClient: ExtendedWebSocket | null = null;

wss.on("connection", (ws: ExtendedWebSocket) => {
    ws.on("message", (message: string) => {
        try {
            const data = JSON.parse(message);

            // Handle signaling messages
            if (data.type === "offer") {
                if (waitingClient) {
                    // Match with waiting client
                    waitingClient.send(
                        JSON.stringify({ type: "offer", offer: data.offer }),
                    );
                    ws.partner = waitingClient;
                    waitingClient.partner = ws;
                    waitingClient = null;
                } else {
                    // Put this client in waiting state
                    waitingClient = ws;
                }
            } else if (data.type === "answer") {
                // Forward answer to the partner
                ws.partner?.send(
                    JSON.stringify({ type: "answer", answer: data.answer }),
                );
            } else if (data.type === "ice-candidate") {
                // Forward ICE candidate to the partner
                ws.partner?.send(
                    JSON.stringify({
                        type: "ice-candidate",
                        candidate: data.candidate,
                    }),
                );
            }
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });

    ws.on("close", () => {
        if (ws.partner) {
            ws.partner.partner = undefined;
            ws.partner.close();
        }
        if (waitingClient === ws) {
            waitingClient = null;
        }
    });
});

// Root route to indicate server is running (for testing purposes)
app.get("/", (req, res) => {
    res.send("WebSocket server is running.");
});

// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
