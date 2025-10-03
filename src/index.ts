#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { isValidUrl } from "./utils";
import express from "express";
import axios from "axios";

const app = express();

const program = new Command();

program.name("caching-proxy").description("caching proxy!!").version("1.0.0");

program
  .description("start proxy server")
  .option("-p, --port <port>", "port number")
  .option("-o, --origin <origin_url>", "origin URL")
  .action((options) => {
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

    app.use(async (req, res, next) => {
      try {
        // Build full URL with query parameters
        const targetUrl = `${origin}${req.path}${
          req.url.includes("?") ? "?" + req.url.split("?")[1] : ""
        }`;

        console.log(chalk.blue(`${req.method} ${req.url}`));
        console.log(chalk.gray(`Proxying to: ${targetUrl}`));

        const response = await axios.get(targetUrl);

        // const response = await fetch(targetUrl, {
        //   method: req.method,
        //   headers: headers,
        //   body:
        //     req.method !== "GET" && req.method !== "HEAD"
        //       ? req.body
        //       : undefined,
        // });

        res.status(response.status).send(response.data);
      } catch (error) {
        console.error(chalk.red("Proxy error:"), error);
        res.status(500).json({ error: "Proxy error" });
      }
    });

    app.listen(port, () => {
      console.log(`server started on port ${port}`);
    });
  });

program.parse();
