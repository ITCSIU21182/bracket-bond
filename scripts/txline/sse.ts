// Minimal Server-Sent-Events reader over `fetch` (Node 18+ / browser).
// TxLINE streams odds and scores as SSE (Accept: text/event-stream).

export interface SseMessage {
  id?: string;
  event?: string;
  data: string;
}

/**
 * Async-iterate SSE messages from a URL. Reconnect handling is intentionally
 * left to the caller (the replay harness reads cached fixtures instead).
 */
export async function* sseStream(
  url: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
): AsyncGenerator<SseMessage> {
  const res = await fetch(url, {
    headers: { Accept: "text/event-stream", "Accept-Encoding": "gzip", ...headers },
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`SSE ${url} failed: ${res.status} ${res.statusText}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let msg: SseMessage = { data: "" };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).replace(/\r$/, "");
      buffer = buffer.slice(nl + 1);

      if (line === "") {
        if (msg.data !== "") yield msg;
        msg = { data: "" };
        continue;
      }
      if (line.startsWith(":")) continue; // comment / keep-alive
      const idx = line.indexOf(":");
      const field = idx === -1 ? line : line.slice(0, idx);
      const val = idx === -1 ? "" : line.slice(idx + 1).replace(/^ /, "");
      if (field === "id") msg.id = val;
      else if (field === "event") msg.event = val;
      else if (field === "data") msg.data += (msg.data ? "\n" : "") + val;
    }
  }
}
