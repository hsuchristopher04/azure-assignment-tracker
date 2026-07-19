const { app } = require("@azure/functions");

app.http("ping", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "ping",
  handler: async () => {
    return {
      status: 200,
      jsonBody: { ok: true, message: "API is alive" }
    };
  }
});