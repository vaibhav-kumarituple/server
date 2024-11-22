"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server });
let waitingClient = null;
wss.on("connection", (ws) => {
    ws.on("message", (message) => {
        var _a, _b;
        try {
            const data = JSON.parse(message);
            // Handle signaling messages
            if (data.type === "offer") {
                if (waitingClient) {
                    // Match with waiting client
                    waitingClient.send(JSON.stringify({ type: "offer", offer: data.offer }));
                    ws.partner = waitingClient;
                    waitingClient.partner = ws;
                    waitingClient = null;
                }
                else {
                    // Put this client in waiting state
                    waitingClient = ws;
                }
            }
            else if (data.type === "answer") {
                // Forward answer to the partner
                (_a = ws.partner) === null || _a === void 0 ? void 0 : _a.send(JSON.stringify({ type: "answer", answer: data.answer }));
            }
            else if (data.type === "ice-candidate") {
                // Forward ICE candidate to the partner
                (_b = ws.partner) === null || _b === void 0 ? void 0 : _b.send(JSON.stringify({
                    type: "ice-candidate",
                    candidate: data.candidate,
                }));
            }
        }
        catch (error) {
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
// Serve static files
app.use(express_1.default.static("public"));
// Start the server
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
