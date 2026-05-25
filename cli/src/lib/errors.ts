export const EXIT_CODES = {
  OK:                 0,
  GENERIC:            1,
  INSUFFICIENT_FUNDS: 10,
  SYMBOL_TAKEN:       11,
  NETWORK:            20,
  WALLET_MISSING:     30,
  WALLET_LOCKED:      31,
  INVALID_INPUT:      40,
} as const;

export class YukaError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number,
    public readonly code: string = "GENERIC",
  ) {
    super(message);
    this.name = "YukaError";
  }
}

export class NoWalletError extends YukaError {
  constructor() {
    super("No wallet found. Run `yuka wallet` to create one.", EXIT_CODES.WALLET_MISSING, "WALLET_MISSING");
  }
}

export class UploadError extends YukaError {
  constructor(detail: string) {
    super(`Image upload failed: ${detail}`, EXIT_CODES.NETWORK, "NETWORK");
  }
}

export class LaunchError extends YukaError {
  constructor(detail: string) {
    super(`Token launch failed: ${detail}`, EXIT_CODES.GENERIC, "LAUNCH_FAIL");
  }
}

export class TimeoutError extends YukaError {
  constructor() {
    super("Launch timed out waiting for confirmation.", EXIT_CODES.NETWORK, "TIMEOUT");
  }
}

export class NoGasError extends YukaError {
  constructor(address: string) {
    super(
      `Wallet ${address} has insufficient ETH for gas. Send Base ETH to this address and retry.`,
      EXIT_CODES.INSUFFICIENT_FUNDS,
      "INSUFFICIENT_FUNDS",
    );
  }
}
