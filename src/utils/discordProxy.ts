/**
 * Proxy fallback for Discord.
 *
 * Discord's Cloudflare sometimes bans the IP of a Railway region (error 1015,
 * an HTTP 429 with a Cloudflare body) for hours. Then every route fails, the
 * gateway too. With DISCORD_PROXY set (an HTTP CONNECT proxy in another region,
 * `http://user:pass@host:port`), the bot switches REST and the gateway to the
 * proxy on the first ban and stays on it until the next start. Every start
 * tries direct first.
 *
 * Import this module before discord.js: it swaps the `ws` WebSocket class that
 * @discordjs/ws captures when it loads.
 */

import { HttpsProxyAgent } from 'https-proxy-agent';
import { fetch as undiciFetch, ProxyAgent, type RequestInit } from 'undici';

/** True when the body says Cloudflare banned this IP, not one route's rate limit. */
export const isIpBan = (status: number, body: string) =>
  status === 429 && (/error code: 1015/i.test(body) || (/<html/i.test(body) && /cloudflare/i.test(body)));

// Read late: index.ts loads .env after its imports.
const proxyUrl = () => process.env.DISCORD_PROXY?.trim() || undefined;
const log = (m: string) => console.log(`[discord-proxy] ${m}`);

let restAgent: ProxyAgent | undefined;
let wsAgent: HttpsProxyAgent<string> | undefined;
let switching: Promise<boolean> | undefined;

/** `http://user:pass@host:port` to a ProxyAgent that sends the credentials as Basic auth. */
const makeProxyAgent = (raw: string) => {
  const url = new URL(raw);
  const user = decodeURIComponent(url.username);
  const pass = decodeURIComponent(url.password);
  url.username = '';
  url.password = '';
  return new ProxyAgent({
    uri: url.href,
    ...(user || pass ? { token: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}` } : {}),
  });
};

export const viaProxy = () => !!restAgent;

/**
 * Switches to the proxy. The proxy sleeps when idle, so this retries until it
 * answers (then uses it anyway). False when there is no proxy or it is already on.
 */
export const fallBack = async (): Promise<boolean> => {
  const raw = proxyUrl();
  if (!raw || restAgent) return false;
  switching ??= (async () => {
    log('this IP is banned (Cloudflare 1015); connecting through DISCORD_PROXY');
    const agent = makeProxyAgent(raw);
    const tries = 6;
    for (let i = 0; ; i++) {
      try {
        const res = await undiciFetch('https://discord.com/api/v10/gateway', {
          dispatcher: agent,
          signal: AbortSignal.timeout(15_000),
        });
        await res.body?.cancel();
        break;
      } catch (e) {
        if (i + 1 >= tries) {
          log(`proxy did not answer after ${tries} tries (${e instanceof Error ? e.message : String(e)}); using it anyway`);
          break;
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
    wsAgent = new HttpsProxyAgent(raw);
    restAgent = agent;
    return true;
  })();
  return switching;
};

/** REST `makeRequest` for discord.js: direct, or through the proxy after a ban. */
export const makeRequest = async (url: string, init: RequestInit) => {
  for (;;) {
    const res = await undiciFetch(url, restAgent ? { ...init, dispatcher: restAgent } : init);
    if (res.status === 429 && isIpBan(429, await res.clone().text()) && (await fallBack())) continue;
    return res;
  }
};

// Gateway: give each new socket the proxy agent once the proxy is on. A ban
// during the handshake ("Unexpected server response: 429") also switches, so
// the next reconnect goes through the proxy.
{
  const ws = require('ws');
  const Base = ws.WebSocket;
  class ProxiedWebSocket extends Base {
    constructor(address: unknown, protocols?: unknown, options?: Record<string, unknown>) {
      super(address, protocols, wsAgent ? { ...(options ?? {}), agent: wsAgent } : options);
      this.once('error', (e: Error) => {
        if (/Unexpected server response: 429/.test(e.message)) void fallBack();
      });
    }
  }
  ws.WebSocket = ProxiedWebSocket;
}
