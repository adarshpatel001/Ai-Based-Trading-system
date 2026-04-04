const app = require("./app");
const { port } = require("./config/env");
const { connectDb } = require("./config/db");

async function startServer() {
  try {
    await connectDb();
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();
