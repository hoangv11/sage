import { httpRouter } from "convex/server";

const http = httpRouter();

// Log that routes are configured
console.log("HTTP routes configured");

// Convex expects the router to be the default export of `convex/http.js`.
export default http;