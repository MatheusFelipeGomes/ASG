// Efí (Gerencianet) Pix client.
// Uses OAuth2 client_credentials + mTLS (P12 certificate).
//
// Required env vars (Supabase secrets):
//   EFI_BASE_URL          e.g. https://pix.api.efipay.com.br  (prod)
//                         or  https://pix-h.api.efipay.com.br (sandbox)
//   EFI_CLIENT_ID
//   EFI_CLIENT_SECRET
//   EFI_CERT_BASE64       base64-encoded .p12 certificate
//   EFI_CERT_PASSWORD     password for the .p12 (optional, often empty)
//   EFI_PIX_KEY           your registered Pix key (chave) at Efí
//
// NOTE on mTLS in Supabase Edge Functions:
//   Deno on Supabase supports `Deno.createHttpClient({ caCerts, certChain, privateKey })`.
//   We accept the .p12 as base64 and let the user split it into PEM pieces if needed.
//   For convenience we also accept EFI_CERT_PEM and EFI_KEY_PEM as alternative env vars.

interface EfiToken {
  access_token: string;
  expires_at: number; // epoch ms
}

let cachedToken: EfiToken | null = null;
let cachedClient: Deno.HttpClient | null = null;

function getHttpClient(): Deno.HttpClient {
  if (cachedClient) return cachedClient;

  const certPem = Deno.env.get("EFI_CERT_PEM");
  const keyPem = Deno.env.get("EFI_KEY_PEM");

  if (!certPem || !keyPem) {
    throw new Error(
      "Missing EFI_CERT_PEM / EFI_KEY_PEM. Convert your Efí .p12 to PEM (cert + key) and set as secrets.",
    );
  }

  // @ts-ignore - Deno.createHttpClient is available on Supabase Edge runtime
  cachedClient = Deno.createHttpClient({
    cert: certPem,
    key: keyPem,
  });
  return cachedClient;
}

function efiBaseUrl(): string {
  const url = Deno.env.get("EFI_BASE_URL");
  if (!url) throw new Error("EFI_BASE_URL not set");
  return url.replace(/\/$/, "");
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 3,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init);
      // Retry on 5xx and 429
      if (res.status >= 500 || res.status === 429) {
        lastErr = new Error(`Efí HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (e) {
      lastErr = e;
    }
    // exponential backoff: 200ms, 600ms, 1.4s
    await new Promise((r) => setTimeout(r, 200 * Math.pow(3, attempt - 1)));
  }
  throw lastErr ?? new Error("Efí request failed after retries");
}

export async function getEfiAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires_at > Date.now() + 30_000) {
    return cachedToken.access_token;
  }

  const clientId = Deno.env.get("EFI_CLIENT_ID");
  const clientSecret = Deno.env.get("EFI_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("EFI_CLIENT_ID / EFI_CLIENT_SECRET not set");
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetchWithRetry(`${efiBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
    // @ts-ignore - client option supported on Supabase Edge runtime
    client: getHttpClient(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Efí OAuth failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.access_token;
}

export interface CreatePixCobrancaInput {
  txid: string; // 26-35 chars [a-zA-Z0-9]
  amountCents: number;
  expiresInSeconds: number;
  payerName?: string;
  payerDocument?: string; // CPF
  description?: string;
}

export interface EfiCobrancaResponse {
  txid: string;
  pixCopiaECola: string;
  qrCodeImage: string; // data:image/png;base64,...
  locId: number;
  expiresAt: string;
}

export async function createPixCobranca(
  input: CreatePixCobrancaInput,
): Promise<EfiCobrancaResponse> {
  const token = await getEfiAccessToken();
  const pixKey = Deno.env.get("EFI_PIX_KEY");
  if (!pixKey) throw new Error("EFI_PIX_KEY not set");

  const valor = (input.amountCents / 100).toFixed(2);

  const body: Record<string, unknown> = {
    calendario: { expiracao: input.expiresInSeconds },
    valor: { original: valor },
    chave: pixKey,
    solicitacaoPagador: input.description ?? "Pagamento",
  };
  if (input.payerName && input.payerDocument) {
    body.devedor = { nome: input.payerName, cpf: input.payerDocument };
  }

  // 1) PUT cobrança
  const cobRes = await fetchWithRetry(
    `${efiBaseUrl()}/v2/cob/${input.txid}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      // @ts-ignore
      client: getHttpClient(),
    },
  );
  if (!cobRes.ok) {
    const t = await cobRes.text();
    throw new Error(`Efí PUT cob failed: ${cobRes.status} ${t}`);
  }
  const cob = (await cobRes.json()) as {
    loc: { id: number };
    pixCopiaECola: string;
    calendario: { criacao: string; expiracao: number };
  };

  // 2) GET QR Code image
  const qrRes = await fetchWithRetry(
    `${efiBaseUrl()}/v2/loc/${cob.loc.id}/qrcode`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      // @ts-ignore
      client: getHttpClient(),
    },
  );
  if (!qrRes.ok) {
    const t = await qrRes.text();
    throw new Error(`Efí GET qrcode failed: ${qrRes.status} ${t}`);
  }
  const qr = (await qrRes.json()) as { imagemQrcode: string };

  const expiresAt = new Date(
    new Date(cob.calendario.criacao).getTime() +
      cob.calendario.expiracao * 1000,
  ).toISOString();

  return {
    txid: input.txid,
    pixCopiaECola: cob.pixCopiaECola,
    qrCodeImage: qr.imagemQrcode,
    locId: cob.loc.id,
    expiresAt,
  };
}

export function generateTxid(): string {
  // 26 hex chars, [a-zA-Z0-9], BCB compliant
  return crypto.randomUUID().replace(/-/g, "").slice(0, 26);
}
