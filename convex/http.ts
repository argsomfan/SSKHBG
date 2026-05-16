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

type OpenAiWebTool = {
  type: "web_search";
  user_location: {
    type: "approximate";
    country: string;
    city: string;
    region: string;
    timezone: string;
  };
  filters?: {
    allowed_domains: string[];
  };
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
        route: cleanString(record.route, 500),
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
        "Prioritera skickade SSKHBG-källor och säg när underlaget är otillräckligt.",
        "Om webbsökning används: använd den som kompletterande källa, visa citerade webbkällor och låt inte webben ersätta lokala PM.",
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
    ? `Jag hittade ${first.title}${second ? ` och ${second.title}` : ""}. Backend-agenten nåddes, men AI-svaret kunde inte skapas just nu, så jag visar den lokala agentplanen tills dess.`
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

function openAiErrorMessage(status: number, data: unknown) {
  const dataRecord = isRecord(data) ? data : {};
  const error = dataRecord.error;
  const errorRecord = isRecord(error) ? error : {};
  const rawMessage =
    cleanString(errorRecord.message, 500) ||
    cleanString(error, 500) ||
    `OpenAI svarade med ${status}`;
  const type = cleanString(errorRecord.type, 80);
  const code = cleanString(errorRecord.code, 80);
  const suffix = [type, code].filter(Boolean).join("/");

  if (status === 429) {
    return [
      `OpenAI svarade med 429${suffix ? ` (${suffix})` : ""}.`,
      "Convex-nyckeln är satt, men OpenAI-projektet stoppas av quota, billing, rate-limit eller modellkapacitet.",
      rawMessage,
    ].join(" ");
  }

  if (status === 401) {
    return [
      "OpenAI svarade med 401.",
      "OPENAI_API_KEY i Convex är ogiltig, saknar åtkomst eller pekar på fel projekt.",
      rawMessage,
    ].join(" ");
  }

  if (status === 403) {
    return [
      "OpenAI svarade med 403.",
      "Nyckeln är igenkänd, men projektet saknar åtkomst till vald modell eller funktion.",
      rawMessage,
    ].join(" ");
  }

  return `${rawMessage}${suffix ? ` (${suffix})` : ""}`;
}

function openAiFailureActions(message: string) {
  if (message.includes("OpenAI svarade med 429")) {
    return [
      "OPENAI_API_KEY är satt: kontrollera quota, billing och rate-limit i OpenAI-projektet",
      "Byt vid behov OPENAI_MODEL i Convex till en modell projektet har kapacitet för",
      "Kör npx convex dev --once efter ändrade Convex-miljövariabler",
    ];
  }

  if (message.includes("OpenAI svarade med 401")) {
    return [
      "Sätt om OPENAI_API_KEY i Convex utan att klistra nyckeln i chatten",
      "Kör npx convex dev --once efter ändringen",
    ];
  }

  if (message.includes("OpenAI svarade med 403")) {
    return [
      "Kontrollera att OpenAI-projektet har åtkomst till vald OPENAI_MODEL och web_search",
      "Byt OPENAI_MODEL i Convex om modellen inte är tillgänglig för projektet",
      "Kör npx convex dev --once efter ändringen",
    ];
  }

  return [
    "Kontrollera OpenAI-status, vald modell och Convex-miljövariabler",
    "Kör frågan igen efter åtgärd",
  ];
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

function mergeSources(primary: ClientSource[], secondary: ClientSource[], maxItems: number) {
  const seen = new Set<string>();

  return [...primary, ...secondary]
    .filter((source) => {
      const key = (source.route || `${source.kind}:${source.title}`)
        .toLocaleLowerCase("sv-SE");
      if (seen.has(key)) return false;
      seen.add(key);
      return Boolean(source.id && source.title);
    })
    .sort((a, b) => b.score - a.score)
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

function applyWebSearchResult(
  payload: AiAgentPayload,
  webSources: ClientSource[],
  attempted: boolean,
) {
  if (!attempted) return payload;

  const webTool: ClientStep = {
    title: "Web Search",
    detail:
      webSources.length > 0
        ? `${webSources.length} citerade webbkällor lades till som kompletterande källor.`
        : "Webbsökning var tillgänglig, men OpenAI returnerade inga citerade webbkällor.",
    status: webSources.length > 0 ? "klar" : "nästa",
  };

  const webGuardrails = [
    "Webbkällor är kompletterande: kontrollera datum, avsändare och lokal relevans före klinisk användning.",
  ];

  return {
    ...payload,
    tools: mergeSteps([webTool], payload.tools, 8),
    guardrails: mergeStrings(webGuardrails, payload.guardrails, 6),
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

const defaultWebDomains = [
  "1177.se",
  "fass.se",
  "folkhalsomyndigheten.se",
  "internetmedicin.se",
  "janusinfo.se",
  "lakemedelsverket.se",
  "pubmed.ncbi.nlm.nih.gov",
  "sbu.se",
  "socialstyrelsen.se",
  "vardhandboken.se",
  "who.int",
];

function parseAllowedWebDomains(): string[] {
  const configuredDomains = cleanString(
    process.env.AGENT_WEB_SEARCH_ALLOWED_DOMAINS,
    2000,
  );
  if (configuredDomains === "all") return [];

  const rawDomains = configuredDomains || defaultWebDomains.join(",");
  const domains = rawDomains
    .split(",")
    .map((domain: string) =>
      domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
    )
    .filter(Boolean);

  return Array.from(new Set(domains)).slice(0, 100);
}

function shouldUseWebSearch(request: AgentRequest) {
  if (process.env.AGENT_WEB_SEARCH_ENABLED === "false") return false;
  return Boolean(request.toolLayer?.toolContext.webSearch.enabled);
}

function buildWebSearchTool(): OpenAiWebTool {
  const allowedDomains = parseAllowedWebDomains();
  const tool: OpenAiWebTool = {
    type: "web_search",
    user_location: {
      type: "approximate",
      country: "SE",
      city: "Helsingborg",
      region: "Skåne",
      timezone: "Europe/Stockholm",
    },
  };

  if (allowedDomains.length > 0) {
    tool.filters = {
      allowed_domains: allowedDomains,
    };
  }

  return tool;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function titleFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function webSourceId(url: string, index: number) {
  const compactUrl = url.replace(/[^a-z0-9]+/gi, "-").slice(0, 52);
  return `web:${index}:${compactUrl}`;
}

function addWebCandidate(
  candidates: Array<{ url: string; title: string; body: string }>,
  record: Record<string, unknown>,
) {
  const url = cleanString(record.url, 500);
  if (!/^https?:\/\//i.test(url)) return;

  const title =
    cleanString(record.title, 140) ||
    cleanString(record.name, 140) ||
    titleFromUrl(url);
  const body =
    cleanString(record.text, 700) ||
    cleanString(record.snippet, 700) ||
    cleanString(record.summary, 700) ||
    cleanString(record.description, 700) ||
    url;

  candidates.push({ url, title, body });
}

function extractWebSources(value: unknown): ClientSource[] {
  const candidates: Array<{ url: string; title: string; body: string }> = [];

  function visit(item: unknown) {
    if (Array.isArray(item)) {
      for (const child of item) visit(child);
      return;
    }

    if (!isRecord(item)) return;

    const type = cleanString(item.type, 80);
    if (
      type === "url_citation" ||
      type === "source" ||
      (typeof item.url === "string" && ("title" in item || "snippet" in item))
    ) {
      addWebCandidate(candidates, item);
    }

    for (const child of Object.values(item)) {
      visit(child);
    }
  }

  visit(value);

  const seen = new Set<string>();
  return candidates
    .filter((candidate) => {
      const key = candidate.url.toLocaleLowerCase("sv-SE");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6)
    .map((candidate, index) => ({
      id: webSourceId(candidate.url, index),
      kind: "Webb",
      title: candidate.title,
      subtitle: candidate.url,
      body: candidate.body,
      route: candidate.url,
      score: 116 - index,
    }));
}

async function callOpenAi(request: AgentRequest, apiKey: string) {
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const useWebSearch = shouldUseWebSearch(request);
  const requestBody: Record<string, unknown> = {
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
  };

  if (useWebSearch) {
    requestBody.tools = [buildWebSearchTool()];
    requestBody.tool_choice = "auto";
    requestBody.include = ["web_search_call.action.sources"];
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    throw new Error(openAiErrorMessage(response.status, data));
  }

  const outputText = extractOutputText(data);
  if (!outputText) {
    throw new Error("OpenAI returnerade inget textinnehåll.");
  }

  return {
    model,
    payload: JSON.parse(outputText) as AiAgentPayload,
    webSources: useWebSearch ? extractWebSources(data) : [],
    webSearchAttempted: useWebSearch,
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
      const fallback = fallbackPayload(request, message);
      return jsonResponse({
        ...fallback,
        nextActions: [
          "Sätt OPENAI_API_KEY i Convex utan att klistra nyckeln i chatten",
          "Kör npx convex dev --once efter ändringen",
          "Kör frågan igen",
        ],
        sources: request.sources,
        backend: {
          mode: "fallback",
          configured: false,
          message,
        },
      });
    }

    try {
      const { model, payload, webSources, webSearchAttempted } = await callOpenAi(
        request,
        apiKey,
      );
      const enrichedPayload = applyWebSearchResult(
        applyToolLayer(payload, request.toolLayer),
        webSources,
        webSearchAttempted,
      );
      const responseSources = mergeSources(request.sources, webSources, 12);

      return jsonResponse({
        ...enrichedPayload,
        sources: responseSources,
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
      const fallback = fallbackPayload(request, message);
      return jsonResponse({
        ...fallback,
        nextActions: openAiFailureActions(message),
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
