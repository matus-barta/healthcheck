import express from "express";
import dotenv from "dotenv";
import log from "./utils/logger";
import routes from "./routes";

// initialize configuration
dotenv.config();

const app = express();

const port = Number(process.env.PORT ?? 82);
const host = process.env.HOST ?? "localhost";

app.use(express.json());

app.listen(port, host, () => {
  log.info(`⚡️ : Server is running at http://${host}:${port}`);
  routes(app);
});
app.on("error", (error) => {
  log.error("❌ : Server error:", error);
});
