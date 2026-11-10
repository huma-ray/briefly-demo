// Outbound requests to a model endpoint a person typed into the UI. The server makes
// the request, so this is an SSRF boundary: only public addresses, checked at connect
// time (DNS rebinding cannot swap in an internal address after a pre-check), no redirects.
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { BlockList, isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

const blocked = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // CGNAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, cloud metadata
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4], // multicast and reserved above
] as const)
  blocked.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7], // unique local
  ["fe80::", 10], // link-local
  ["ff00::", 8],
] as const)
  blocked.addSubnet(net, bits, "ipv6");

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPrivateAddress(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return blocked.check(ip, "ipv4");
  if (v === 6) {
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
    if (mapped) return blocked.check(mapped[1], "ipv4");
    return blocked.check(ip, "ipv6");
  }
  return true; // not an IP at all: refuse
}

export const allowPrivate = () => process.env.ALLOW_PRIVATE_AI_ENDPOINTS === "true";

/** Normalizes a base URL or returns a reason it is not acceptable. */
export function checkBaseUrl(input: string, opts = { allowPrivate: allowPrivate() }): { ok: true; url: string } | { ok: false; error: string } {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return { ok: false, error: "Enter a full URL such as https://llm.example.com/v1." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, error: "Only http(s) URLs are supported." };
  if (u.username || u.password) return { ok: false, error: "Put credentials in the API key field, not in the URL." };
  if (!opts.allowPrivate) {
    if (u.protocol !== "https:") return { ok: false, error: "Use an https:// URL." };
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || (isIP(host) && isPrivateAddress(host)))
      return { ok: false, error: "This address is on a private network. Use a public https endpoint." };
  }
  u.hash = "";
  u.search = "";
  return { ok: true, url: u.toString().replace(/\/+$/, "") };
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

function guardedLookup(hostname: string, options: object, cb: LookupCb) {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return cb(err, "");
    const list = addresses as LookupAddress[];
    const bad = list.find((a) => isPrivateAddress(a.address));
    if (bad) return cb(Object.assign(new Error(`${hostname} resolves to a private address`), { code: "EPRIVATE" }), "");
    if ((options as { all?: boolean }).all) return cb(null, list);
    cb(null, list[0].address, list[0].family);
  });
}

const publicOnly = new Agent({ connect: { lookup: guardedLookup as never }, headersTimeout: 60_000, bodyTimeout: 120_000 });
const anyAddress = new Agent({ headersTimeout: 60_000, bodyTimeout: 120_000 });

/** fetch for custom endpoints: refuses redirects and (unless allowed) non-public addresses. */
export const endpointFetch = ((input: string | URL | Request, init?: RequestInit) =>
  undiciFetch(input as never, {
    ...(init as object),
    redirect: "error",
    dispatcher: allowPrivate() ? anyAddress : publicOnly,
  })) as unknown as typeof fetch;
