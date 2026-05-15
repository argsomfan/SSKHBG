import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { router } from 'expo-router';

import { Screen } from '../../components/Screen';
import { runSskhbgAiAgent } from '../../agent/aiBackend';
import {
  AgentPlanStep,
  AgentResult,
  AgentSource,
  AgentToolRun
} from '../../agent/sskhbgAgent';
import { getDb } from '../../db/database';
import { Colors } from '../../theme';

type Counts = {
  modules: number;
  medications: number;
  pm: number;
  nursing: number;
  cards: number;
};

const initialCounts: Counts = {
  modules: 0,
  medications: 0,
  pm: 0,
  nursing: 0,
  cards: 0
};

const promptSuggestions = [
  'Misstänkt sepsis med lågt blodtryck',
  'Hyperkalemi och EKG-påverkan',
  'Spädning antibiotika inför infusion',
  'Omvårdnad och kontroller vid PVK'
];

async function countRows(tableName: string) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${tableName}`
  );

  return row?.count ?? 0;
}

export default function HomeScreen() {
  const [counts, setCounts] = useState<Counts>(initialCounts);
  const [query, setQuery] = useState('');
  const [activePrompt, setActivePrompt] = useState(promptSuggestions[0]);
  const [agent, setAgent] = useState<AgentResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadCounts() {
      const [modules, medications, pm, nursing, cards] = await Promise.all([
        countRows('modules'),
        countRows('medications'),
        countRows('pm_modules'),
        countRows('nursing_modules'),
        countRows('cards')
      ]);

      setCounts({ modules, medications, pm, nursing, cards });
    }

    loadCounts().catch((loadError) => {
      console.log('HOME COUNT ERROR', loadError);
    });
  }, []);

  useEffect(() => {
    runAgent(promptSuggestions[0]);
  }, []);

  const totalSources = useMemo(
    () => counts.modules + counts.pm + counts.nursing + counts.cards,
    [counts]
  );

  async function runAgent(nextQuery = query) {
    const question = nextQuery.trim();
    setIsRunning(true);
    setError('');

    try {
      const result = await runSskhbgAiAgent(question);
      setAgent(result);
      setQuery(question);
      if (question) {
        setActivePrompt(question);
      }
    } catch (runError) {
      console.log('AGENT RUN ERROR', runError);
      setError('Agenten kunde inte läsa lokala källor just nu.');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <PostHeader />

      <View style={styles.hero}>
        <Text style={styles.heroTitle} selectable>
          RIKTIG AGENTIC AI
        </Text>
        <Text style={styles.heroSubtitle} selectable>
          SSKHBG-agenten planerar, söker i lokala källor, väljer verktyg och
          lämnar över till människa i loopen.
        </Text>
      </View>

      <View style={styles.agentCard}>
        <View style={styles.agentTopRow}>
          <View>
            <Text style={styles.agentEyebrow}>Agentuppdrag</Text>
            <Text style={styles.agentTitle}>Vad ska agenten lösa?</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>
              {isRunning ? 'Kör' : agent?.backend?.mode === 'ai' ? 'AI' : 'Redo'}
            </Text>
          </View>
        </View>

        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Beskriv situation, läkemedel eller PM-fråga"
          placeholderTextColor={Colors.textTertiary}
          multiline
          autoCorrect={false}
          returnKeyType="send"
        />

        <View style={styles.promptRow}>
          {promptSuggestions.map((prompt) => (
            <Pressable
              key={prompt}
              style={[
                styles.promptChip,
                activePrompt === prompt && styles.promptChipActive
              ]}
              onPress={() => runAgent(prompt)}
            >
              <Text
                style={[
                  styles.promptText,
                  activePrompt === prompt && styles.promptTextActive
                ]}
                numberOfLines={2}
              >
                {prompt}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.runButton, isRunning && styles.runButtonDisabled]}
          onPress={() => runAgent()}
          disabled={isRunning}
        >
          {isRunning ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.runButtonText}>Kör AI-agent</Text>
          )}
        </Pressable>
      </View>

      <AgentDiagram
        agent={agent}
        counts={counts}
        totalSources={totalSources}
      />

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {agent ? (
        <>
          <AgentAnswer agent={agent} />
          <ToolRuns tools={agent.tools} />
          <SourceList sources={agent.sources} />
          <ActionRow agent={agent} />
          <Caption agent={agent} />
        </>
      ) : null}
    </Screen>
  );
}

function PostHeader() {
  return (
    <View style={styles.postHeader}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>SS</Text>
      </View>
      <View style={styles.postIdentity}>
        <View style={styles.nameRow}>
          <Text style={styles.accountName}>SSKHBG Agent</Text>
          <View style={styles.verified}>
            <Text style={styles.verifiedText}>✓</Text>
          </View>
        </View>
        <Text style={styles.audioLine}>lokalt beslutsstöd · agentiskt läge</Text>
      </View>
      <Text style={styles.menuDots}>•••</Text>
    </View>
  );
}

function AgentDiagram({
  agent,
  counts,
  totalSources
}: {
  agent: AgentResult | null;
  counts: Counts;
  totalSources: number;
}) {
  const activeSources = agent?.sources.length ?? 0;

  return (
    <View style={styles.diagram}>
      <View style={styles.diagramHeader}>
        <Text style={styles.diagramTitle}>Så arbetar agenten</Text>
        <Text style={styles.diagramMeta}>
          {activeSources || totalSources} källor
        </Text>
      </View>

      <View style={styles.notAgenticBand}>
        <Text style={styles.bandTitle}>Inte bara sök</Text>
        <View style={styles.miniGrid}>
          <MiniBox title="Chat" detail="svar utan verktyg" muted />
          <MiniBox title="RAG" detail="hämta text" muted />
          <MiniBox title="Lista" detail="passiva träffar" muted />
        </View>
      </View>

      <View style={styles.agenticBand}>
        <Text style={styles.agenticTitle}>Det här är Agentic AI</Text>
        <View style={styles.flowRow}>
          <FlowNode title="Plan" detail={agent?.intentTitle ?? 'tolka mål'} />
          <Connector />
          <FlowNode title="Verktyg" detail="sök · läkemedel · PM" />
          <Connector />
          <FlowNode title="Loop" detail="källor + kontroll" />
        </View>

        <View style={styles.orchestrator}>
          <View style={styles.orchestratorCore}>
            <Text style={styles.orchestratorLabel}>Orchestrator</Text>
            <Text style={styles.orchestratorTitle}>SSKHBG Agent Core</Text>
            <Text style={styles.orchestratorText}>
              Planerar och kör verktyg mot lokala källor.
            </Text>
          </View>
          <View style={styles.toolColumn}>
            <ToolPill label={`${counts.modules} diagnoser`} />
            <ToolPill label={`${counts.medications} läkemedel`} />
            <ToolPill label={`${counts.pm + counts.nursing} PM/omvårdnad`} />
          </View>
        </View>
      </View>
    </View>
  );
}

function MiniBox({
  title,
  detail,
  muted = false
}: {
  title: string;
  detail: string;
  muted?: boolean;
}) {
  return (
    <View style={[styles.miniBox, muted && styles.miniBoxMuted]}>
      <Text style={styles.miniBoxTitle}>{title}</Text>
      <Text style={styles.miniBoxDetail}>{detail}</Text>
    </View>
  );
}

function FlowNode({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.flowNode}>
      <Text style={styles.flowTitle}>{title}</Text>
      <Text style={styles.flowDetail} numberOfLines={2}>
        {detail}
      </Text>
    </View>
  );
}

function Connector() {
  return (
    <View style={styles.connector}>
      <View style={styles.connectorLine} />
      <Text style={styles.connectorArrow}>›</Text>
    </View>
  );
}

function ToolPill({ label }: { label: string }) {
  return (
    <View style={styles.toolPill}>
      <View style={styles.toolPillDot} />
      <Text style={styles.toolPillText}>{label}</Text>
    </View>
  );
}

function AgentAnswer({ agent }: { agent: AgentResult }) {
  return (
    <View style={styles.answerCard}>
      <View style={styles.answerTopRow}>
        <View>
          <Text style={styles.answerLabel}>Agentens svar</Text>
          <Text style={styles.answerTitle}>{agent.responseTitle}</Text>
        </View>
        <Text style={styles.timeStamp}>{agent.generatedAt}</Text>
      </View>

      <Text style={styles.answerSummary}>{agent.responseSummary}</Text>

      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceText}>{agent.confidenceLabel}</Text>
        <Text style={styles.confidenceText}>{agent.sources.length} källor</Text>
        <Text
          style={[
            styles.confidenceText,
            agent.backend?.mode === 'ai' && styles.aiConfidenceText
          ]}
        >
          {agent.backend?.mode === 'ai' ? 'AI-backend' : 'Fallback'}
        </Text>
      </View>

      {agent.reasoning ? (
        <View style={styles.reasoningBox}>
          <Text style={styles.reasoningLabel}>Agentens resonemang</Text>
          <Text style={styles.reasoningText}>{agent.reasoning}</Text>
        </View>
      ) : null}

      <View style={styles.planList}>
        {agent.plan.map((step) => (
          <PlanStep key={step.title} step={step} />
        ))}
      </View>

      <View style={styles.guardrailBox}>
        {agent.guardrails.map((item) => (
          <Text key={item} style={styles.guardrailText}>
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

function PlanStep({ step }: { step: AgentPlanStep }) {
  return (
    <View style={styles.planStep}>
      <View
        style={[
          styles.planDot,
          step.status === 'säkring' && styles.planDotSafety,
          step.status === 'nästa' && styles.planDotNext
        ]}
      />
      <View style={styles.planTextBlock}>
        <Text style={styles.planTitle}>{step.title}</Text>
        <Text style={styles.planDetail}>{step.detail}</Text>
      </View>
    </View>
  );
}

function ToolRuns({ tools }: { tools: AgentToolRun[] }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Verktyg som körs</Text>
        <Text style={styles.sectionHint}>agent-loop</Text>
      </View>

      {tools.map((tool) => (
        <View key={tool.name} style={styles.toolRun}>
          <View
            style={[
              styles.toolRunStatus,
              tool.status === 'säkring' && styles.toolRunSafety,
              tool.status === 'nästa' && styles.toolRunNext
            ]}
          />
          <View style={styles.toolRunText}>
            <Text style={styles.toolRunName}>{tool.name}</Text>
            <Text style={styles.toolRunDetail}>{tool.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SourceList({ sources }: { sources: AgentSource[] }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Källor agenten hittade</Text>
        <Pressable onPress={() => router.push('/search' as never)}>
          <Text style={styles.sectionAction}>Sök allt</Text>
        </Pressable>
      </View>

      {sources.length === 0 ? (
        <View style={styles.emptySources}>
          <Text style={styles.emptyTitle}>Inga lokala träffar</Text>
          <Text style={styles.emptyText}>Agenten behöver mer kontext.</Text>
        </View>
      ) : (
        sources.slice(0, 5).map((source) => (
          <Pressable
            key={`${source.kind}-${source.id}`}
            style={styles.sourceCard}
            onPress={() => router.push(source.route as never)}
          >
            <View style={styles.sourceKind}>
              <Text style={styles.sourceKindText}>{source.kind}</Text>
            </View>
            <View style={styles.sourceText}>
              <Text style={styles.sourceTitle} numberOfLines={2}>
                {source.title}
              </Text>
              <Text style={styles.sourceSubtitle} numberOfLines={2}>
                {source.subtitle}
              </Text>
              {!!source.body && (
                <Text style={styles.sourceBody} numberOfLines={2}>
                  {source.body}
                </Text>
              )}
            </View>
            <Text style={styles.sourceArrow}>›</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

function ActionRow({ agent }: { agent: AgentResult }) {
  return (
    <View style={styles.socialRow}>
      <Text style={styles.socialItem}>♡ {agent.sources.length}</Text>
      <Text style={styles.socialItem}>◌ {agent.tools.length}</Text>
      <Text style={styles.socialItem}>↻ {agent.plan.length}</Text>
      <Text style={styles.socialItem}>⌁</Text>
      <Text style={styles.bookmark}>□</Text>
    </View>
  );
}

function Caption({ agent }: { agent: AgentResult }) {
  return (
    <View style={styles.captionBlock}>
      <Text style={styles.captionText}>
        <Text style={styles.captionName}>SSKHBG Agent </Text>
        {agent.nextActions.join(' · ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingHorizontal: 0,
    paddingTop: 8
  },
  postHeader: {
    alignItems: 'center',
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: Colors.agentSoft,
    borderColor: Colors.agent,
    borderRadius: 24,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  avatarText: {
    color: Colors.agentText,
    fontSize: 16,
    fontWeight: '900'
  },
  postIdentity: {
    flex: 1
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  accountName: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0
  },
  verified: {
    alignItems: 'center',
    backgroundColor: '#2b83d3',
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    width: 18
  },
  verifiedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14
  },
  audioLine: {
    color: Colors.textPrimary,
    fontSize: 15,
    marginTop: 2
  },
  menuDots: {
    color: Colors.textPrimary,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 1
  },
  hero: {
    paddingHorizontal: 16,
    paddingTop: 8
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: 33,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 37
  },
  heroSubtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    paddingTop: 6
  },
  agentCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 16,
    padding: 14
  },
  agentTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  agentEyebrow: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  agentTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 2
  },
  liveBadge: {
    alignItems: 'center',
    backgroundColor: Colors.agentSoft,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  liveDot: {
    backgroundColor: Colors.agent,
    borderRadius: 4,
    height: 8,
    width: 8
  },
  liveText: {
    color: Colors.agentText,
    fontSize: 12,
    fontWeight: '900'
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 21,
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top'
  },
  promptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  promptChip: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '48%',
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  promptChipActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary
  },
  promptText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 15
  },
  promptTextActive: {
    color: Colors.primary
  },
  runButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  runButtonDisabled: {
    opacity: 0.72
  },
  runButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900'
  },
  diagram: {
    borderColor: Colors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 16,
    padding: 10
  },
  diagramHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  diagramTitle: {
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '900'
  },
  diagramMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '800'
  },
  notAgenticBand: {
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 10
  },
  bandTitle: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center'
  },
  miniGrid: {
    flexDirection: 'row',
    gap: 6
  },
  miniBox: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 58,
    padding: 8
  },
  miniBoxMuted: {
    backgroundColor: Colors.surfaceMuted
  },
  miniBoxTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center'
  },
  miniBoxDetail: {
    color: Colors.textSecondary,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 4,
    textAlign: 'center'
  },
  agenticBand: {
    backgroundColor: Colors.agentCanvas,
    borderColor: Colors.agentBorder,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 10
  },
  agenticTitle: {
    color: Colors.agentText,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center'
  },
  flowRow: {
    alignItems: 'center',
    flexDirection: 'row'
  },
  flowNode: {
    backgroundColor: '#fff',
    borderColor: Colors.agentBorder,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 62,
    padding: 8
  },
  flowTitle: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center'
  },
  flowDetail: {
    color: Colors.textSecondary,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 4,
    textAlign: 'center'
  },
  connector: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 21
  },
  connectorLine: {
    backgroundColor: Colors.agent,
    height: 2,
    position: 'absolute',
    width: 18
  },
  connectorArrow: {
    color: Colors.agentText,
    fontSize: 18,
    fontWeight: '900'
  },
  orchestrator: {
    flexDirection: 'row',
    gap: 8
  },
  orchestratorCore: {
    backgroundColor: '#fff',
    borderColor: Colors.agentBorder,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10
  },
  orchestratorLabel: {
    color: Colors.agentText,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  orchestratorTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 3
  },
  orchestratorText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4
  },
  toolColumn: {
    flex: 1,
    gap: 6
  },
  toolPill: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: Colors.agentBorder,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 35,
    paddingHorizontal: 8
  },
  toolPillDot: {
    backgroundColor: Colors.agent,
    borderRadius: 4,
    height: 8,
    width: 8
  },
  toolPillText: {
    color: Colors.textPrimary,
    flex: 1,
    fontSize: 11,
    fontWeight: '800'
  },
  errorCard: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 16,
    padding: 12
  },
  errorText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800'
  },
  answerCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 16,
    padding: 14
  },
  answerTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  answerLabel: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  answerTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2
  },
  timeStamp: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '800'
  },
  answerSummary: {
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 23
  },
  confidenceRow: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    gap: 8
  },
  confidenceText: {
    backgroundColor: Colors.agentSoft,
    borderRadius: 8,
    color: Colors.agentText,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  aiConfidenceText: {
    backgroundColor: Colors.primarySoft,
    color: Colors.primary
  },
  reasoningBox: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 10
  },
  reasoningLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  reasoningText: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18
  },
  planList: {
    gap: 10
  },
  planStep: {
    flexDirection: 'row',
    gap: 10
  },
  planDot: {
    backgroundColor: Colors.agent,
    borderRadius: 6,
    height: 12,
    marginTop: 4,
    width: 12
  },
  planDotSafety: {
    backgroundColor: Colors.primary
  },
  planDotNext: {
    backgroundColor: Colors.warning
  },
  planTextBlock: {
    flex: 1,
    gap: 2
  },
  planTitle: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  planDetail: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  guardrailBox: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 10
  },
  guardrailText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17
  },
  section: {
    gap: 10,
    marginHorizontal: 16
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 19,
    fontWeight: '900'
  },
  sectionHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  sectionAction: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  toolRun: {
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  toolRunStatus: {
    backgroundColor: Colors.agent,
    borderRadius: 5,
    height: 10,
    marginTop: 5,
    width: 10
  },
  toolRunSafety: {
    backgroundColor: Colors.primary
  },
  toolRunNext: {
    backgroundColor: Colors.warning
  },
  toolRunText: {
    flex: 1
  },
  toolRunName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  toolRunDetail: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2
  },
  emptySources: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 18
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 3
  },
  sourceCard: {
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12
  },
  sourceKind: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  sourceKindText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '900'
  },
  sourceText: {
    flex: 1
  },
  sourceTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20
  },
  sourceSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2
  },
  sourceBody: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5
  },
  sourceArrow: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '300',
    marginTop: 4
  },
  socialRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
    marginHorizontal: 16,
    paddingTop: 2
  },
  socialItem: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '900'
  },
  bookmark: {
    color: Colors.textPrimary,
    flex: 1,
    fontSize: 27,
    fontWeight: '900',
    textAlign: 'right'
  },
  captionBlock: {
    marginHorizontal: 16,
    paddingBottom: 12
  },
  captionText: {
    color: Colors.textPrimary,
    fontSize: 18,
    lineHeight: 25
  },
  captionName: {
    fontWeight: '900'
  }
});
