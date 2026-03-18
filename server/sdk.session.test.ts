import { afterEach, describe, expect, it, vi } from "vitest";

async function loadSdkWithEnv(env: { appId?: string; cookieSecret?: string }) {
  vi.resetModules();
  vi.doMock("./_core/env", () => ({
    ENV: {
      appId: env.appId ?? "",
      cookieSecret: env.cookieSecret ?? "",
      databaseUrl: "",
      oAuthServerUrl: "",
      ownerOpenId: "",
      isProduction: false,
      forgeApiUrl: "",
      forgeApiKey: "",
    },
  }));
  vi.doMock("./db", () => ({
    getUserByOpenId: vi.fn(),
    upsertUser: vi.fn(),
  }));

  return import("./_core/sdk");
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("SDK session security", () => {
  it("fails fast when JWT_SECRET is missing", async () => {
    const { SDKServer } = await loadSdkWithEnv({ appId: "app-a", cookieSecret: "" });
    const sdk = new SDKServer();

    await expect(sdk.createSessionToken("user-1")).rejects.toThrow(
      "JWT_SECRET is required for session signing and verification"
    );
  });

  it("rejects cookies minted for another appId", async () => {
    const { SDKServer } = await loadSdkWithEnv({ appId: "app-a", cookieSecret: "secret-123" });
    const sdk = new SDKServer();
    const foreignToken = await sdk.signSession({
      openId: "user-1",
      appId: "app-b",
      name: "User One",
    });

    await expect(sdk.verifySession(foreignToken)).resolves.toBeNull();
  });

  it("accepts cookies bound to the current appId", async () => {
    const { SDKServer } = await loadSdkWithEnv({ appId: "app-a", cookieSecret: "secret-123" });
    const sdk = new SDKServer();
    const token = await sdk.signSession({
      openId: "user-1",
      appId: "app-a",
      name: "User One",
    });

    await expect(sdk.verifySession(token)).resolves.toEqual({
      openId: "user-1",
      appId: "app-a",
      name: "User One",
    });
  });
});
