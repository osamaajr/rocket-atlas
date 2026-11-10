import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildSystemPrompt, offlineAnswer, type ChatMessage } from "@/lib/atlas";
import { ROCKET_BY_ID, type RocketId } from "@/lib/rockets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/** Key comes from OPENAI_API_KEY (.env.local) or, as a convenience, an openai.txt in the project root. Server-only. */
async function getKey(): Promise<string | null> {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim();
  try {
    const txt = (await readFile(path.join(process.cwd(), "openai.txt"), "utf8")).trim();
    const match = txt.match(/sk-[A-Za-z0-9_\-]+/);
    return match ? match[0] : txt || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const key = await getKey();
  return Response.json({ mode: key ? "openai" : "offline", model: key ? MODEL : null });
}

function textStream(text: string, headers: Record<string, string>) {
  const enc = new TextEncoder();
  const words = text.split(/(\s+)/);
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < words.length; i += 3) {
        controller.enqueue(enc.encode(words.slice(i, i + 3).join("")));
        await new Promise((r) => setTimeout(r, 18));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", ...headers } });
}

export async function POST(req: Request) {
  let body: { messages?: ChatMessage[]; selectedId?: string | null };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const selectedId = body.selectedId && body.selectedId in ROCKET_BY_ID ? (body.selectedId as RocketId) : null;
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  if (!messages.length) return new Response("No messages", { status: 400 });

  const key = await getKey();
  if (!key) return textStream(offlineAnswer(messages, selectedId), { "X-Atlas-Mode": "offline" });

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        temperature: 0.4,
        messages: [{ role: "system", content: buildSystemPrompt(selectedId) }, ...messages],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      console.error("[atlas] OpenAI error", upstream.status, detail.slice(0, 300));
      const note = upstream.status === 401 ? "the API key was rejected" : `OpenAI returned ${upstream.status}`;
      return textStream(
        `${offlineAnswer(messages, selectedId)}\n\n_(Answered from the exhibit archive — ${note}.)_`,
        { "X-Atlas-Mode": "offline" },
      );
    }

    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const reader = upstream.body.getReader();
    let buffer = "";
    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.replace(/^data:\s*/, "").trim();
          if (!data || data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(enc.encode(delta));
          } catch {
            /* partial line — ignore */
          }
        }
      },
      cancel() {
        reader.cancel();
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "X-Atlas-Mode": "openai" },
    });
  } catch (err) {
    console.error("[atlas] network error", err);
    return textStream(
      `${offlineAnswer(messages, selectedId)}\n\n_(Answered from the exhibit archive — OpenAI could not be reached.)_`,
      { "X-Atlas-Mode": "offline" },
    );
  }
}
