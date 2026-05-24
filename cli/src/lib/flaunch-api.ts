import { readFile, stat } from "node:fs/promises";
import {
  FLAUNCH_API_BASE,
  FLAUNCH_DATA_API_BASE,
  CHAIN,
  MAX_IMAGE_SIZE_BYTES,
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
} from "./config.js";
import { UploadError, LaunchError, TimeoutError } from "./errors.js";
import type {
  Network,
  FlaunchUploadResponse,
  FlaunchLaunchResponse,
  FlaunchStatusResponse,
  FlaunchTokenListResponse,
  FlaunchTokenDetails,
  FlaunchHolder,
} from "@yuka/shared";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      await sleep(retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000 * (attempt + 1));
      continue;
    }
    return response;
  }
  throw new Error("Max retries exceeded (429 rate limit)");
}

export async function uploadImage(
  source: string | { buffer: Buffer; mime: string },
): Promise<string> {
  let base64: string;
  let mime: string;

  if (typeof source === "string") {
    const fileStat = await stat(source);
    if (fileStat.size > MAX_IMAGE_SIZE_BYTES) {
      throw new UploadError(`Image exceeds 5MB limit (${(fileStat.size / 1024 / 1024).toFixed(1)}MB)`);
    }
    const imageBuffer = await readFile(source);
    base64 = imageBuffer.toString("base64");
    const ext = source.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
      gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    };
    mime = mimeMap[ext ?? ""] ?? "image/png";
  } else {
    base64 = source.buffer.toString("base64");
    mime = source.mime;
  }

  const response = await fetchWithRetry(`${FLAUNCH_API_BASE}/api/v1/upload-image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Image: `data:${mime};base64,${base64}` }),
  });

  if (!response.ok) throw new UploadError(`${response.status} — ${await response.text()}`);

  const data = (await response.json()) as FlaunchUploadResponse;
  return data.ipfsHash;
}

export async function launchMemecoin(params: {
  name: string;
  symbol: string;
  description: string;
  imageIpfs: string;
  creatorAddress: string;
  websiteUrl?: string;
  network: Network;
}): Promise<string> {
  const chain = params.network === "testnet" ? CHAIN.testnet : CHAIN.mainnet;

  const body: Record<string, string | number | undefined> = {
    name: params.name,
    symbol: params.symbol,
    description: params.description,
    imageIpfs: params.imageIpfs,
    creatorAddress: params.creatorAddress,
    websiteUrl: params.websiteUrl,
    flaunchAt: 0,
  };

  for (const key of Object.keys(body)) {
    if (body[key] === undefined) delete body[key];
  }

  const response = await fetchWithRetry(
    `${FLAUNCH_API_BASE}/api/v1/${chain.network}/launch-memecoin`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!response.ok) throw new LaunchError(`${response.status} — ${await response.text()}`);

  const data = (await response.json()) as FlaunchLaunchResponse;
  return data.jobId;
}

export async function pollLaunchStatus(
  jobId: string,
  onPoll?: (state: string, position: number) => void,
): Promise<FlaunchStatusResponse> {
  const startTime = Date.now();
  let consecutiveErrors = 0;

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    let response: Response;
    try {
      response = await fetch(`${FLAUNCH_API_BASE}/api/v1/launch-status/${jobId}`);
    } catch {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) throw new LaunchError("Lost connection to Flaunch API");
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (response.status === 429 || response.status >= 500) {
      consecutiveErrors++;
      if (consecutiveErrors >= 5) throw new LaunchError(`Status check failed: ${response.status}`);
      await sleep(POLL_INTERVAL_MS * (consecutiveErrors + 1));
      continue;
    }

    if (!response.ok) throw new LaunchError(`Status check failed: ${response.status} — ${await response.text()}`);

    consecutiveErrors = 0;
    const data = (await response.json()) as FlaunchStatusResponse;
    onPoll?.(data.state, data.queuePosition);

    if (data.state === "completed") return data;
    if (data.state === "failed") throw new LaunchError(data.error ?? "Launch failed");

    await sleep(POLL_INTERVAL_MS);
  }

  throw new TimeoutError();
}

export async function fetchTokensByOwner(
  ownerAddress: string,
  network: Network,
): Promise<FlaunchTokenListResponse> {
  const chain = network === "testnet" ? CHAIN.testnet : CHAIN.mainnet;
  const url = `${FLAUNCH_DATA_API_BASE}/v1/${chain.network}/tokens?ownerAddress=${ownerAddress}&limit=100`;
  const response = await fetchWithRetry(url, { method: "GET" });
  if (!response.ok) throw new Error(`Flaunch API error: ${response.status}`);
  return (await response.json()) as FlaunchTokenListResponse;
}

export async function fetchTokenDetails(
  tokenAddress: string,
  network: Network,
): Promise<FlaunchTokenDetails> {
  const chain = network === "testnet" ? CHAIN.testnet : CHAIN.mainnet;
  const url = `${FLAUNCH_DATA_API_BASE}/v1/${chain.network}/tokens/${tokenAddress}/details`;
  const response = await fetchWithRetry(url, { method: "GET" });
  if (!response.ok) throw new Error(`Flaunch API error: ${response.status}`);
  return (await response.json()) as FlaunchTokenDetails;
}

export async function fetchTokenHolderCount(
  tokenAddress: string,
  network: Network,
): Promise<number> {
  const chain = network === "testnet" ? CHAIN.testnet : CHAIN.mainnet;
  const url = `${FLAUNCH_DATA_API_BASE}/v1/${chain.network}/tokens/${tokenAddress}/holders?limit=1&offset=0`;
  const response = await fetchWithRetry(url, { method: "GET" });
  if (!response.ok) throw new Error(`Flaunch API error: ${response.status}`);
  const data = (await response.json()) as { data: FlaunchHolder[]; pagination: { total?: number } };
  if (typeof data.pagination?.total === "number") return data.pagination.total;
  throw new Error("Holder count unavailable");
}
