const API_URL = process.env.API_ENDPOINT;
import * as fs from "node:fs";

const API_ENDPOINTS = [
    {
        url: "/ping",
        method: "GET",

        async handler(req, res) {
            return ({
                pong: Date.now()
            });
        }
    }
]

/**
 * The handle for the admin api
 * @param {import("node:http").Server} http
 */
export function handle(http) {
    http.on("request", async (req, res) => {
        if (!req.url.startsWith(`${API_URL}/`)) return;

        const fetchURL = req.url.slice(API_URL.length);
        const endpoint = API_ENDPOINTS.find(e => e.url === fetchURL && e.method === req.method);

        if (!endpoint) {
            res.writeHead(404);
            res.end(JSON.stringify({
                error: "Endpoint not found",
                code: 404
            }));
            return;
        }

        res.setHeader("Content-Type", "application/json");

        const data = await endpoint.handler(req, res);
        if (res.closed) return;
        res.end(JSON.stringify(data));
    });
}