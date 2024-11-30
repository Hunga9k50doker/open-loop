import fetch from "node-fetch";
import fs from "fs";
import chalk from "chalk";
import { banner } from "./utils/banner.js";
import { logger } from "./utils/logger.js";
import { headers } from "./utils/header.js";
import settings from "./config/config.js";

class OpenLoop {
  constructor(queryId, accountIndex) {
    this.queryId = queryId;
    this.accountIndex = accountIndex;
  }

  getRandomQuality = () => {
    return Math.floor(Math.random() * (99 - 60 + 1)) + 60;
  };

  getTokens = () => {
    return fs
      .readFileSync("tokens.txt", "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  };

  shareBandwidth = async (token) => {
    try {
      const quality = this.getRandomQuality();
      const response = await fetch("https://api.openloop.so/bandwidth/share", {
        method: "POST",
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quality }),
      });

      if (!response.ok) {
        throw new Error(`Failed to share bandwidth! Status: ${response.statusText}`);
      }

      const data = await response.json();

      const logBandwidthShareResponse = (response) => {
        if (response && response.data && response.data.balances) {
          const balance = response.data.balances.POINT;
          logger(`[Account ${this.accountIndex + 1}] Bandwidth shared Message: ${chalk.yellow(response.message)} | Score: ${chalk.yellow(quality)} | Total Earnings: ${chalk.yellow(balance)}`);
        }
      };

      logBandwidthShareResponse(data);
    } catch (error) {
      logger("Error sharing bandwidth:", "error", error.message);
    }
  };

  shareBandwidthForAllTokens = async () => {
    const tokens = this.getTokens();

    if (!tokens.length) {
      logger("Don't have any token!", "error");
      return;
    }

    for (let i = 0; i < tokens.length; i++) {
      this.accountIndex = i;
      const token = tokens[i];
      try {
        await this.shareBandwidth(token);
      } catch (error) {
        logger(`Error processing token: ${token}, Error: ${error.message}`, "error");
      }
    }
  };

  main = async () => {
    logger(banner, "warn");

    await this.shareBandwidthForAllTokens();
    logger(`Completed all account wait ${settings.TIME_SLEEP} minutes to new loop | Don't stop process | Node running...`, "debug");
    setInterval(this.shareBandwidthForAllTokens, settings.TIME_SLEEP * 60 * 1000);
  };
}

const client = new OpenLoop();
client.main().catch((err) => {
  logger(err.message, "error");
  process.exit(1);
});
