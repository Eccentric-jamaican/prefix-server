const DEFAULT_TIMEOUT_MS = Number.parseInt(process.env.FETCH_TIMEOUT_MS ?? "7000", 10);
const DEFAULT_USER_AGENT = "PrefixValidator/0.1 (+https://prefix)";

export class FetchError extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "FetchError";
    this.status = status;
  }
}

interface FetchWithTimeoutInit extends RequestInit {
  timeoutMs?: number;
}

export async function fetchWithTimeout(
  url: string,
  init: FetchWithTimeoutInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = init.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const headers = new Headers(init.headers ?? {});
    if (!headers.has("user-agent")) {
      headers.set("user-agent", DEFAULT_USER_AGENT);
    }

    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchError(`Request timed out after ${timeout}ms`);
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchHtml(url: string, init?: FetchWithTimeoutInit): Promise<string> {
  const response = await fetchWithTimeout(url, init);
  if (!response.ok) {
    throw new FetchError(`Failed to fetch ${url}`, response.status);
  }

  return await response.text();
}
