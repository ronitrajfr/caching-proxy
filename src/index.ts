#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { isValidUrl } from "./utils";
import express from "express";
import axios from "axios";
import { redis } from "./utils/redis";

const app = express();

const program = new Command();

program
  .name("caching-proxy")
  .description("CLI caching proxy server")
  .version("1.0.0")
  .option("--clear-cache", "Clear all cached responses")
  .option("-p, --port <port>", "Port number")
  .option("-o, --origin <origin_url>", "Origin URL")
  .action(async (options) => {
    if (options.clearCache) {
      try {
        await redis.flushall();
        console.log(chalk.green("✅ Cache cleared successfully"));
        await redis.quit();

        process.exit(0);
      } catch (err) {
        console.error(chalk.red("❌ Failed to clear cache:"), err);
        await redis.quit();
        process.exit(1);
      }
    }
    console.log(options);
    const port = options.port;
    const origin = options.origin;

    if (!port) {
      console.log(chalk.red("Required Argument --port <port_number>"));
      return;
    }

    if (!origin) {
      console.log(chalk.red("Required Argument --origin <origin_url>"));
      return;
    }

    if (isNaN(parseInt(port))) {
      console.log(chalk.red("Error: Port number should be a Number"));
      return;
    }

    if (!isValidUrl(origin)) {
      console.log(chalk.red("Error: Origin is not a Valid URL"));
      return;
    }

    app.use(async (req, res) => {
      const cacheKey = `${origin}${req.originalUrl}`;
      try {
        const isCached = !!(await redis.get(cacheKey));

        if (isCached) {
          try {
            const cached = await redis.get(cacheKey);
            const cachedData = JSON.parse(cached as string);
            res.set("X-Cache", "HIT");
            console.log("HIT");
            return res.status(cachedData.status).send(cachedData.data);
          } catch (error) {
            console.error(chalk.red("Redis error:"), error);
            res.status(500).json({ error: "Redis error" });
          }
        }
        // Build full URL with query parameters
        const targetUrl = `${origin}${req.path}${
          req.url.includes("?") ? "?" + req.url.split("?")[1] : ""
        }`;

        console.log(chalk.blue(`${req.method} ${req.url}`));
        console.log(chalk.gray(`Proxying to: ${targetUrl}`));

        const response = await axios.get(targetUrl);

        await redis.set(
          cacheKey,
          JSON.stringify({ status: response.status, data: response.data })
        );
        console.log("MISS");
        res.set("X-Cache", "MISS");

        return res.status(response.status).send(response.data);
      } catch (error) {
        console.error(chalk.red("Proxy error:"), error);
        return res.status(500).json({ error: "Proxy error" });
      }
    });

    app.listen(port, () => {
      console.log(`server started on port ${port}`);
    });
  });

program.parse();
