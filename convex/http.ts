import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import {
  AgentToolLayer,
  ClientSource,
  ClientStep,
  runAgentToolLayer,
} from "./agentTools";

type AgentStatus = "klar" | "nästa" | "säkring";

type AgentRequest = {
  query: string;
  toolLayer?: AgentToolLayer;
  localAgent?: {
    responseTitle?: string;
    responseSummary?: string;
    confidenceLabel?: string;
    plan?: ClientStep[];
    tools?: ClientStep[];
    nextActions?: string[];
    guardrails?: string[];
  };
  sources: ClientSource[];
};

type AiAgentPayload = {
  responseTitle: string;
  responseSummary: string;
  reasoning: string;
  confidenceLabel: string;
  plan: ClientStep[];
  tools: ClientStep[];
  nextActions: string[];
  guardrails: string[];
};

const http = httpRouter();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

const agentResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "responseTitle",
    "responseSummary",
    "reasoning",
    "confidenceLabel",
    "plan",
    "tools",
    "nextActions",
    "guardrails",
  ],
  properties: {
    responseTitle: { type: "string" },
    responseSummary: { type: "string" },
    reasoning: { type: "string" },
    confidenceLabel: { type: "string" },
    plan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "status"],
        properties: stepProperties(),
      },
    },
    tools: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "detail", "status"],
        properties: stepProperties(),
      },
    },
    nextActions: {
      type: "array",
      items: { type: "string" },
    },
    guardrails: {
      type: "array",
      items: { type: "string" },
    },
  },
};

function stepProperties() {
  return {
    title: { type: "string" },
    detail: { type: "string" },
    status: { type: "string", enum: ["klar", "nästa", "säkring"] },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function isStatus(value: string): value is AgentStatus {
  return value === "klar" || value === "nästa" || value === "säkring";
}

function cleanSteps(value: unknown, maxItems: number): ClientStep[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const status = cleanString(record.status, 20);
      const title = cleanString(record.title, 80) || cleanString(record.name, 80);
      return {
        title,
        detail: cleanString(record.detail, 260),
        status: isStatus(status) ? status : "nästa",
      };
    })
    .filter((item): item is ClientStep => Boolean(item?.title && item.detail))
    .slice(0, maxItems);
}

function cleanSources(value: unknown): ClientSource[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;

      return {
        id: cleanString(record.id, 80),
        kind: cleanString(record.kind, 40),
        title: cleanString(record.title, 140),
        subtitle: cleanString(record.subtitle, 160),
        body: cleanString(record.body, 700),
        route: cleanString(record.route, 120),
        score:
          typeof record.score === "number" && Number.isFinite(record.score)
            ? record.score
            : 0,
      };
    })
    .filter((item): item is ClientSource => Boolean(item?.id && item.title))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function parseAgentRequest(value: unknown): AgentRequest {
  const body = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const localAgent =
    body.localAgent && typeof body.localAgent === "object"
      ? body.localAgent as Record<string, unknown>
      : {};

  return {
    query: cleanString(body.query, 600),
    sources: cleanSources(body.sources),
    localAgent: {
      responseTitle: cleanString(localAgent.responseTitle, 120),
      responseSummary: cleanString(localAgent.responseSummary, 700),
      confidenceLabel: cleanString(localAgent.confidenceLabel, 80),
      plan: cleanSteps(localAgent.plan, 5),
      tools: cleanSteps(localAgent.tools, 8),
      nextActions: cleanStringArray(localAgent.nextActions, 5, 160),
      guardrails: cleanStringArray(localAgent.guardrails, 5, 180),
    },
  };
}

function buildPrompt(request: AgentRequest) {
  const compactSources = request.sources.map((source, index) => ({
    index: index + 1,
    kind: source.kind,
    title: source.title,
    subtitle: source.subtitle,
    body: source.body,
    route: source.route,
  }));

  return JSON.stringify(
    {
      userQuestion: request.query,
      retrievedSources: compactSources,
      localPlan: request.localAgent?.plan ?? [],
      localTools: request.localAgent?.tools ?? [],
      toolLayer: request.toolLayer?.toolContext ?? null,
      executedTools: request.toolLayer?.tools ?? [],
      requiredBehavior: [
        "Svara på svenska.",
        "Använd bara de skickade SSKHBG-källorna och säg när underlaget är otillräckligt.",
        "Var kliniskt försiktig: ge beslutsstöd, inte ordination.",
        "Utgå från executedTools som faktiskt körda verktyg. Hitta inte på extra verktygskörningar.",
        "Visa agentisk planering: uppdrag, verktyg, källor, nästa steg och människa-i-loopen.",
        "Hitta inte på lokala PM, doser eller källor som inte finns i underlaget.",
      ],
    },
    null,
    2,
  );
}

function fallbackPayload(request: AgentRequest, message: string): AiAgentPayload {
  const first = request.sources[0];
  const second = request.sources[1];
  const summary = first
    ? `Jag hittade ${first.title}${second ? ` och ${second.title}` : ""}. Backend-agenten behöver OpenAI-konfiguration för att formulera ett AI-svar, så jag visar den lokala agentplanen tills dess.`
    : "Backend-agenten är nådd, men inga lokala källor skickades med frågan.";

  return {
    responseTitle: request.localAgent?.responseTitle || "Backend-agent väntar",
    responseSummary: request.localAgent?.responseSummary || summary,
    reasoning: message,
    confidenceLabel:
      request.toolLayer?.confidenceLabel ||
      request.localAgent?.confidenceLabel ||
      "Lokal fallback",
    plan: request.toolLayer?.plan?.length
      ? request.toolLayer.plan
      : request.localAgent?.plan?.length
      ? request.localAgent.plan
      : [
          {
            title: "Ta emot fråga",
            detail: "Frågan togs emot av Convex endpointen.",
            status: "klar",
          },
          {
            title: "Anropa AI",
            detail: message,
            status: "säkring",
          },
        ],
    tools: [
      ...(request.toolLayer?.tools ?? []),
      ...(request.localAgent?.tools ?? []),
      {
        title: "OpenAI Backend",
        detail: message,
        status: "säkring",
      },
    ],
    nextActions: request.toolLayer?.nextActions?.length
      ? request.toolLayer.nextActions
      : request.localAgent?.nextActions?.length
      ? request.localAgent.nextActions
      : ["Konfigurera OPENAI_API_KEY i Convex", "Kör frågan igen"],
    guardrails: request.toolLayer?.guardrails?.length
      ? request.toolLayer.guardrails
      : request.localAgent?.guardrails?.length
      ? request.localAgent.guardrails
      : [
          "Beslutsstöd, inte ordination.",
          "Kontrollera alltid patientdata och lokala rutiner.",
        ],
  };
}

function mergeSteps(primary: ClientStep[], secondary: ClientStep[], maxItems: number) {
  const seen = new Set<string>();

  return [...primary, ...secondary]
    .filter((step) => {
      const key = step.title.toLocaleLowerCase("sv-SE");
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(step.title && step.detail);
    })
    .slice(0, maxItems);
}

function mergeStrings(primary: string[], secondary: string[], maxItems: number) {
  const seen = new Set<string>();

  return [...primary, ...secondary]
    .filter((item) => {
      const key = item.toLocaleLowerCase("sv-SE");
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(item);
    })
    .slice(0, maxItems);
}

function applyToolLayer(payload: AiAgentPayload, toolLayer: AgentToolLayer | undefined) {
  if (!toolLayer) return payload;

  return {
    ...payload,
    confidenceLabel: toolLayer.confidenceLabel || payload.confidenceLabel,
    plan: mergeSteps(toolLayer.plan, payload.plan, 6),
    tools: mergeSteps(toolLayer.tools, payload.tools, 8),
    nextActions: mergeStrings(toolLayer.nextActions, payload.nextActions, 5),
    guardrails: mergeStrings(toolLayer.guardrails, payload.guardrails, 6),
  };
}

function extractOutputText(value: unknown) {
  const response = value as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: unknown;
      }>;
    }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

async function callOpenAi(request: AgentRequest, apiKey: string) {
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions:
        "Du är SSKHBG Agent, ett kliniskt beslutsstöd för AVA/IMA. Du ska vara agentisk, källbunden, försiktig och tydlig med människa-i-loopen. Du får inte ersätta kliniskt ansvar, ordinera behandling eller hitta på doser/källor.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildPrompt(request),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "sskhbg_agent_response",
          strict: true,
          schema: agentResponseSchema,
        },
      },
      max_output_tokens: 1600,
    }),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    const errorRecord = data && typeof data === "object"
      ? data as Record<string, unknown>
      : {};
    throw new Error(
      typeof errorRecord.error === "string"
        ? errorRecord.error
        : `OpenAI svarade med ${response.status}`,
    );
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw new Error("OpenAI returnerade inget textinnehåll.");
  }

  return {
    model,
    payload: JSON.parse(outputText) as AiAgentPayload,
  };
}

http.route({
  path: "/api/agent",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }),
});

http.route({
  path: "/api/agent",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const rawBody = await req.text();
    if (rawBody.length > 100_000) {
      return jsonResponse({ error: "För stor agentförfrågan." }, 413);
    }

    let request: AgentRequest;
    try {
      request = parseAgentRequest(JSON.parse(rawBody));
    } catch {
      return jsonResponse({ error: "Ogiltig JSON." }, 400);
    }

    if (!request.query) {
      return jsonResponse({ error: "Fråga saknas." }, 400);
    }

    try {
      const facts = await ctx.runQuery(api.facts.searchForAgent, {
        query: request.query,
        limit: 6,
      });
      const toolLayer = runAgentToolLayer({
        query: request.query,
        localSources: request.sources,
        facts,
      });
      request = {
        ...request,
        sources: toolLayer.sources,
        toolLayer,
      };
    } catch (error) {
      console.log("FACT SEARCH ERROR", error);
      const toolLayer = runAgentToolLayer({
        query: request.query,
        localSources: request.sources,
        facts: [],
      });
      request = {
        ...request,
        sources: toolLayer.sources,
        toolLayer,
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const message = "OPENAI_API_KEY saknas i Convex miljövariabler.";
      return jsonResponse({
        ...fallbackPayload(request, message),
        sources: request.sources,
        backend: {
          mode: "fallback",
          configured: false,
          message,
        },
      });
    }

    try {
      const { model, payload } = await callOpenAi(request, apiKey);
      const enrichedPayload = applyToolLayer(payload, request.toolLayer);
      return jsonResponse({
        ...enrichedPayload,
        sources: request.sources,
        backend: {
          mode: "ai",
          configured: true,
          model,
          message: "AI-svar genererat på Convex backend.",
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Backend-agenten kunde inte skapa AI-svar.";
      return jsonResponse({
        ...fallbackPayload(request, message),
        sources: request.sources,
        backend: {
          mode: "fallback",
          configured: true,
          message,
        },
      });
    }
  }),
});

export default http;
