import { resolve } from "node:path";
import { access } from "node:fs/promises";
import { loadOrCreateWallet, saveLaunchRecord } from "../lib/wallet.js";
import { uploadImage, launchMemecoin, pollLaunchStatus } from "../lib/flaunch-api.js";
import { generateTokenLogo } from "../lib/generate-logo.js";
import { printSuccess, printError } from "../lib/output.js";
import { CHAIN } from "../lib/config.js";
import { YukaError, EXIT_CODES } from "../lib/errors.js";
import type { LaunchParams, Network } from "@yuka/shared";

export async function launch(opts: LaunchParams): Promise<void> {
  const { name, symbol, description, website, testnet, json } = opts;
  const network: Network = testnet ? "testnet" : "mainnet";
  const chain = testnet ? CHAIN.testnet : CHAIN.mainnet;

  try {
    let imageSource: string | { buffer: Buffer; mime: string };

    if (opts.imagePath) {
      const resolvedImage = resolve(opts.imagePath);
      try {
        await access(resolvedImage);
      } catch {
        printError("launch", `Image not found: ${resolvedImage}`, "INVALID_INPUT", json);
        process.exit(EXIT_CODES.INVALID_INPUT);
      }
      imageSource = resolvedImage;
    } else {
      if (!json) console.log("Generating logo from token name...");
      imageSource = { buffer: generateTokenLogo(name, symbol), mime: "image/png" };
    }

    const { wallet, isNew } = await loadOrCreateWallet();

    if (!json) {
      if (isNew) {
        console.log(`\nWallet created: ${wallet.address}`);
        console.log(`Saved to ~/.yuka/wallet.json — never share this file\n`);
      } else {
        console.log(`\nUsing wallet: ${wallet.address}`);
      }
    }

    if (!json) process.stdout.write("Uploading image...");
    const imageIpfs = await uploadImage(imageSource);
    if (!json) console.log(` done`);

    if (!json) process.stdout.write("Submitting launch...");
    const jobId = await launchMemecoin({
      name,
      symbol,
      description,
      imageIpfs,
      creatorAddress: wallet.address,
      websiteUrl: website,
      network,
    });
    if (!json) console.log(` queued (job ${jobId})`);

    if (!json) process.stdout.write("Deploying on-chain");
    const result = await pollLaunchStatus(jobId, (_state, position) => {
      if (!json) {
        if (position > 0) process.stdout.write(` [queue: ${position}]`);
        else process.stdout.write(".");
      }
    });
    if (!json) console.log(" done");

    if (!result.collectionToken?.address || !result.transactionHash) {
      throw new YukaError("Launch completed but missing token address or tx hash", EXIT_CODES.GENERIC, "LAUNCH_FAIL");
    }

    const tokenAddress = result.collectionToken.address;
    const flaunchUrl = `${chain.flaunchUrl}/coin/${tokenAddress}`;

    await saveLaunchRecord({
      name, symbol, tokenAddress,
      transactionHash: result.transactionHash,
      network, walletAddress: wallet.address,
      launchedAt: new Date().toISOString(),
      flaunchUrl,
    });

    printSuccess("launch", {
      tokenAddress,
      transactionHash: result.transactionHash,
      name,
      symbol,
      network: chain.name,
      explorer: `${chain.explorer}/token/${tokenAddress}`,
      flaunch: flaunchUrl,
      wallet: wallet.address,
      ...(isNew ? { walletPath: "~/.yuka/wallet.json" } : {}),
    }, json, "Token launched!");
  } catch (error) {
    if (error instanceof YukaError) {
      printError("launch", error.message, error.code, json);
      process.exit(error.exitCode);
    }
    const message = error instanceof Error ? error.message : String(error);
    printError("launch", message, "GENERIC", json);
    process.exit(EXIT_CODES.GENERIC);
  }
}
