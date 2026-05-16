import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { router } from 'expo-router';

import { Screen } from '../../components/Screen';
import { BrandMark } from '../../components/BrandMark';
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
      setError('Agenten kunde inte läsa källor just nu.');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <Header agent={agent} isRunning={isRunning} />

      <View style={styles.commandPanel}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Klinisk fråga</Text>
            <Text style={styles.panelTitle}>Vad vill du kontrollera?</Text>
          </View>
          <Pressable style={styles.secondaryButton} onPress={() => router.push('/fakta' as never)}>
            <Text style={styles.secondaryButtonText}>Fakta</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Skriv situation, läkemedel, PM eller omvårdnadsfråga"
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
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.runButtonText}>Kör agent</Text>
          )}
        </Pressable>
      </View>

      <StatusStrip
        agent={agent}
        counts={counts}
        totalSources={totalSources}
      />

      {error ? (
        <View style={styles.errorPanel}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {agent ? (
        <>
          <AgentAnswer agent={agent} />
          <PlanList plan={agent.plan} />
          <ToolRuns tools={agent.tools} />
          <SourceList sources={agent.sources} />
          <NextActions agent={agent} />
        </>
      ) : null}
    </Screen>
  );
}

function Header({
  agent,
  isRunning
}: {
  agent: AgentResult | null;
  isRunning: boolean;
}) {
  const statusText = isRunning
    ? 'Kör verktyg'
    : agent?.backend?.mode === 'ai'
      ? 'AI-backend'
      : 'Fallback redo';

  return (
    <View style={styles.header}>
      <View style={styles.brandLockup}>
        <View style={styles.logoPlate}>
          <BrandMark size={62} />
        </View>
        <View style={styles.headerCopy}>
          <View style={styles.brandLine}>
            <Text style={styles.appLabel}>BASE</Text>
            <Text style={styles.contextLabel}>SSKHBG</Text>
          </View>
          <Text style={styles.title}>Kliniskt hjälpmedel</Text>
          <Text style={styles.subtitle}>Källbundet beslutsstöd för PM, läkemedel och omvårdnad.</Text>
        </View>
      </View>
      <View style={styles.statusBadge}>
        <View style={[styles.statusDot, isRunning && styles.statusDotRunning]} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    </View>
  );
}

function StatusStrip({
  agent,
  counts,
  totalSources
}: {
  agent: AgentResult | null;
  counts: Counts;
  totalSources: number;
}) {
  return (
    <View style={styles.statusStrip}>
      <Metric label="Källor" value={String(agent?.sources.length || totalSources)} />
      <Metric label="Läkemedel" value={String(counts.medications)} />
      <Metric label="Verktyg" value={String(agent?.tools.length ?? 5)} />
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function AgentAnswer({ agent }: { agent: AgentResult }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Svar</Text>
          <Text style={styles.answerTitle}>{agent.responseTitle}</Text>
        </View>
        <Text style={styles.timeStamp}>{agent.generatedAt}</Text>
      </View>

      <Text style={styles.answerSummary}>{agent.responseSummary}</Text>

      <View style={styles.tagRow}>
        <Tag label={agent.confidenceLabel} tone="green" />
        <Tag label={`${agent.sources.length} källor`} />
        <Tag label={agent.backend?.mode === 'ai' ? 'AI-backend' : 'Fallback'} tone="red" />
      </View>

      {agent.reasoning ? (
        <View style={styles.reasoningBox}>
          <Text style={styles.reasoningLabel}>Backend</Text>
          <Text style={styles.reasoningText}>{agent.reasoning}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Tag({
  label,
  tone = 'neutral'
}: {
  label: string;
  tone?: 'neutral' | 'green' | 'red';
}) {
  return (
    <View
      style={[
        styles.tag,
        tone === 'green' && styles.tagGreen,
        tone === 'red' && styles.tagRed
      ]}
    >
      <Text
        style={[
          styles.tagText,
          tone === 'green' && styles.tagTextGreen,
          tone === 'red' && styles.tagTextRed
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function PlanList({ plan }: { plan: AgentPlanStep[] }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Plan</Text>
        <Text style={styles.sectionHint}>agentens arbetsgång</Text>
      </View>

      <View style={styles.planList}>
        {plan.map((step, index) => (
          <PlanStep key={`${step.title}-${index}`} step={step} index={index} />
        ))}
      </View>
    </View>
  );
}

function PlanStep({ step, index }: { step: AgentPlanStep; index: number }) {
  return (
    <View style={styles.planStep}>
      <View
        style={[
          styles.stepNumber,
          step.status === 'säkring' && styles.stepNumberSafety,
          step.status === 'nästa' && styles.stepNumberNext
        ]}
      >
        <Text style={styles.stepNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.planTextBlock}>
        <Text style={styles.planTitle}>{step.title}</Text>
        <Text style={styles.planDetail}>{step.detail}</Text>
      </View>
    </View>
  );
}

function ToolRuns({ tools }: { tools: AgentToolRun[] }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Verktyg</Text>
        <Text style={styles.sectionHint}>körda kontroller</Text>
      </View>

      {tools.map((tool, index) => (
        <View key={`${tool.name}-${index}`} style={styles.toolRun}>
          <View
            style={[
              styles.toolStatus,
              tool.status === 'säkring' && styles.toolStatusSafety,
              tool.status === 'nästa' && styles.toolStatusNext
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
  function openSource(source: AgentSource) {
    if (/^https?:\/\//i.test(source.route)) {
      Linking.openURL(source.route).catch((linkError) => {
        console.log('SOURCE LINK ERROR', linkError);
      });
      return;
    }

    router.push(source.route as never);
  }

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Källor</Text>
        <Pressable onPress={() => router.push('/search' as never)}>
          <Text style={styles.linkText}>Sök allt</Text>
        </Pressable>
      </View>

      {sources.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Inga träffar</Text>
          <Text style={styles.emptyText}>Lägg till fakta eller skriv en mer specifik fråga.</Text>
        </View>
      ) : (
        sources.slice(0, 7).map((source) => (
          <Pressable
            key={`${source.kind}-${source.id}`}
            style={styles.sourceRow}
            onPress={() => openSource(source)}
          >
            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>{source.kind}</Text>
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
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

function NextActions({ agent }: { agent: AgentResult }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Nästa steg</Text>
      {agent.nextActions.map((action, index) => (
        <View key={`${action}-${index}`} style={styles.nextRow}>
          <Text style={styles.nextBullet}>•</Text>
          <Text style={styles.nextText}>{action}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 18
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between'
  },
  brandLockup: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 250
  },
  logoPlate: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderColor: Colors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    height: 70,
    justifyContent: 'center',
    width: 70
  },
  headerCopy: {
    flex: 1
  },
  brandLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  appLabel: {
    color: Colors.chrome,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  contextLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 560
  },
  statusBadge: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  statusDot: {
    backgroundColor: Colors.success,
    borderRadius: 5,
    height: 10,
    width: 10
  },
  statusDotRunning: {
    backgroundColor: Colors.warning
  },
  statusText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900'
  },
  commandPanel: {
    backgroundColor: Colors.surface,
    borderColor: Colors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  panel: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  sectionEyebrow: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  panelTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24
  },
  sectionHint: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  secondaryButton: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  secondaryButtonText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '900'
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 104,
    paddingHorizontal: 12,
    paddingVertical: 11,
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
    minHeight: 44,
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
    lineHeight: 16
  },
  promptTextActive: {
    color: Colors.primary
  },
  runButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  runButtonDisabled: {
    opacity: 0.7
  },
  runButtonText: {
    color: Colors.onPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  statusStrip: {
    flexDirection: 'row',
    gap: 8
  },
  metric: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 70,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  metricValue: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '900'
  },
  metricLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2
  },
  errorPanel: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12
  },
  errorText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '800'
  },
  answerTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tag: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  tagGreen: {
    backgroundColor: Colors.agentSoft
  },
  tagRed: {
    backgroundColor: Colors.primarySoft
  },
  tagText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '900'
  },
  tagTextGreen: {
    color: Colors.agentText
  },
  tagTextRed: {
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
    gap: 12
  },
  planStep: {
    flexDirection: 'row',
    gap: 10
  },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: Colors.agent,
    borderRadius: 8,
    height: 26,
    justifyContent: 'center',
    marginTop: 1,
    width: 26
  },
  stepNumberSafety: {
    backgroundColor: Colors.primary
  },
  stepNumberNext: {
    backgroundColor: Colors.warning
  },
  stepNumberText: {
    color: Colors.onPrimary,
    fontSize: 12,
    fontWeight: '900'
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
  toolRun: {
    alignItems: 'flex-start',
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10
  },
  toolStatus: {
    backgroundColor: Colors.agent,
    borderRadius: 5,
    height: 10,
    marginTop: 5,
    width: 10
  },
  toolStatusSafety: {
    backgroundColor: Colors.primary
  },
  toolStatusNext: {
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
  emptyState: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3
  },
  sourceRow: {
    alignItems: 'flex-start',
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10
  },
  sourceBadge: {
    backgroundColor: Colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  sourceBadgeText: {
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
  chevron: {
    color: Colors.textSecondary,
    fontSize: 24,
    fontWeight: '300',
    marginTop: 4
  },
  linkText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '900'
  },
  nextRow: {
    flexDirection: 'row',
    gap: 8
  },
  nextBullet: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20
  },
  nextText: {
    color: Colors.textPrimary,
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  }
});
