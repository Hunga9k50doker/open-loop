import { banner } from "./utils/banner.js";
import { logger } from "./utils/logger.js";
import { headers } from "./utils/header.js";
import fetch from "node-fetch";
import readline from "readline";
import fs from "fs";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function saveTokenToFile(token) {
  try {
    fs.appendFileSync("tokens.txt", token + "\n");
    console.log("Access token saved to tokens.txt");
  } catch (error) {
    console.error("Error saving token to file:", error.message);
  }
}

const loginUser = async (email, password) => {
  try {
    const loginPayload = { username: email, password };
    const loginResponse = await fetch("https://api.openloop.so/users/login", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(loginPayload),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed ${email}! Status: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.data.accessToken;
    logger(`Login successful ${email} get Token:`, "success", accessToken);
    saveTokenToFile(accessToken);
    logger("Access token saved to tokens.txt");
  } catch (error) {
    logger(`Error during login ${email}:`, "error", error.message);
  }
};

const registerUser = async (email, password) => {
  try {
    const inviteCode = "olb623a000";

    const registrationPayload = { name: email, username: email, password, inviteCode };
    const registerResponse = await fetch("https://api.openloop.so/users/register", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(registrationPayload),
    });

    if (registerResponse.status === 401) {
      logger(`Email ${email} already exist. Attempting to login...`);
      await loginUser(email, password);
      return;
    }

    if (!registerResponse.ok) {
      throw new Error(`Registration ${email} failed! Status: ${registerResponse.status}`);
    }
    const registerData = await registerResponse.json();
    logger(`Registration ${email} successful:`, "success", registerData.message);
    await loginUser(email, password);
  } catch (error) {
    logger(`Error during ${email} registration:`, "error", error.message);
  } finally {
    rl.close();
  }
};

async function processAllUsers() {
  try {
    logger(banner, "warn");
    const data = fs
      .readFileSync("data.txt", "utf-8")
      .split("\n")
      .filter((data) => data.trim() !== "");
    if (data.length <= 0) {
      logger("No data found in data.txt", "warn");
      process.exit(0);
    }

    for (const item of data) {
      const res = item.trim().split("|");
      const email = res[0];
      const password = res[1];
      logger(`Authenticating for ${email}.....`, "warn");

      await registerUser(email, password);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } catch (error) {
    console.error("Error reading data.txt file:", error.message);
  }
  await new Promise((resolve) => setTimeout(resolve, 2000));
  logger("Completed auth | You can start bot with comand: node main", "success");
  process.exit(0);
}

processAllUsers();
