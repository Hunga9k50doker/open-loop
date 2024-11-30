import fetch from "node-fetch";
import fs from "fs";
import chalk from "chalk";
import { HttpsProxyAgent } from "https-proxy-agent";
import { banner } from "./utils/banner.js";
import { logger } from "./utils/logger.js";
import { headers } from "./utils/header.js";
import settings from "./config/config.js";

class OpenLoop {
  constructor(queryId, accountIndex, proxy) {
    this.queryId = queryId;
    this.accountIndex = accountIndex;
    this.proxy = proxy;
    this.proxyIp = "Unknown IP";
  }

  getRandomQuality = () => {
    return Math.floor(Math.random() * (99 - 60 + 1)) + 60;
  };

  getProxies = () => {
    return fs
      .readFileSync("proxy.txt", "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  };

  getTokens = () => {
    return fs
      .readFileSync("tokens.txt", "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  };

  shareBandwidth = async (token, proxy) => {
    try {
      const quality = this.getRandomQuality();
      const proxyAgent = new HttpsProxyAgent(proxy);

      const response = await fetch("https://api.openloop.so/bandwidth/share", {
        method: "POST",
        headers: {
          ...headers,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quality }),
        agent: proxyAgent,
      });

      if (!response.ok) {
        throw new Error(`Failed to share bandwidth! Status: ${response.statusText}`);
      }

      const data = await response.json();

      const logBandwidthShareResponse = (response) => {
        if (response && response.data && response.data.balances) {
          const balance = response.data.balances.POINT;
          logger(
            `[Account ${this.accountIndex + 1}][${this.proxyIp}] Bandwidth shared Message: ${chalk.yellow(response.message)} | Score: ${chalk.yellow(quality)} | Total Earnings: ${chalk.yellow(
              balance
            )}`
          );
        }
      };

      logBandwidthShareResponse(data);
    } catch (error) {
      logger("Error sharing bandwidth:", "error", error.message);
    }
  };

  shareBandwidthForAllTokens = async () => {
    const tokens = this.getTokens();
    const proxies = this.getProxies();

    if (tokens.length !== proxies.length) {
      logger("The number of tokens and proxies do not match!", "error");
      return;
    }

    for (let i = 0; i < tokens.length; i++) {
      this.accountIndex = i;
      const token = tokens[i];
      const proxy = proxies[i];
      let proxyIP = "No Proxy";
      if (proxy) {
        try {
          proxyIP = await this.checkProxyIP(proxy);
          this.proxyIp = proxyIP;
        } catch (proxyError) {
          logger(`[Acount ${i + 1}]Proxy error: ${proxyError.message}`, "error");
          logger(`[Acount ${i + 1}]Moving to next account...`, "warn");
          continue;
        }
      }
      try {
        await this.shareBandwidth(token, proxy);
      } catch (error) {
        logger(`Error processing token: ${token}, Error: ${error.message}`, "error");
      }
    }
  };

  async checkProxyIP(proxy) {
    try {
      const proxyAgent = new HttpsProxyAgent(proxy);
      const response = await fetch("https://api.ipify.org?format=json", {
        agent: proxyAgent,
      });

      if (response.ok) {
        const data = await response.json();
        return data.ip;
      } else {
        throw new Error(`Unable to check proxy IP. Status code: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Error checking proxy IP: ${error.message}`);
    }
  }

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
