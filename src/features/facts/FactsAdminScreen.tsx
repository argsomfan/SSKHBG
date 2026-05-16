import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useMutation, useQuery } from 'convex/react';

import { api } from '../../../convex/_generated/api';
import { Doc, Id } from '../../../convex/_generated/dataModel';
import { Screen } from '../../components/Screen';
import { Colors } from '../../theme';

type Fact = Doc<'facts'>;
type FactKind = Fact['kind'];
type FactStatus = Fact['status'];
type FilterKind = FactKind | 'all';

type FormState = {
  kind: FactKind;
  status: FactStatus;
  title: string;
  category: string;
  summary: string;
  body: string;
  source: string;
};

const emptyForm: FormState = {
  kind: 'pm',
  status: 'draft',
  title: '',
  category: '',
  summary: '',
  body: '',
  source: ''
};

const kindOptions: Array<{ label: string; value: FilterKind }> = [
  { label: 'Alla', value: 'all' },
  { label: 'Diagnos', value: 'diagnosis' },
  { label: 'PM', value: 'pm' },
  { label: 'Omvårdnad', value: 'nursing' },
  { label: 'Läkemedel', value: 'medication' },
  { label: 'Snabbkort', value: 'card' },
  { label: 'Övrigt', value: 'other' }
];

const formKindOptions = kindOptions.filter(
  (option): option is { label: string; value: FactKind } =>
    option.value !== 'all'
);

const statusOptions: Array<{ label: string; value: FactStatus }> = [
  { label: 'Utkast', value: 'draft' },
  { label: 'Publicerad', value: 'published' },
  { label: 'Arkiv', value: 'archived' }
];

function statusLabel(status: FactStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}

function kindLabel(kind: FactKind) {
  return formKindOptions.find((option) => option.value === kind)?.label ?? kind;
}

function formatDate(value: number) {
  return new Date(value).toLocaleDateString('sv-SE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
}

export default function FactsAdminScreen() {
  const [activeKind, setActiveKind] = useState<FilterKind>('all');
  const [editingId, setEditingId] = useState<Id<'facts'> | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const facts = useQuery(api.facts.listAdmin, {
    kind: activeKind,
    limit: 120
  });
  const saveFact = useMutation(api.facts.save);
  const setStatus = useMutation(api.facts.setStatus);

  const publishedCount = useMemo(
    () => (facts ?? []).filter((fact) => fact.status === 'published').length,
    [facts]
  );

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage('');
  }

  function startEdit(fact: Fact) {
    setEditingId(fact._id);
    setForm({
      kind: fact.kind,
      status: fact.status,
      title: fact.title,
      category: fact.category,
      summary: fact.summary,
      body: fact.body,
      source: fact.source
    });
    setMessage('');
  }

  async function save(nextStatus?: FactStatus) {
    setIsSaving(true);
    setMessage('');

    try {
      const payload = {
        ...form,
        status: nextStatus ?? form.status
      };

      const id = editingId
        ? await saveFact({ ...payload, id: editingId })
        : await saveFact(payload);

      setEditingId(id);
      setForm((current) => ({
        ...current,
        status: payload.status
      }));
      setMessage(
        payload.status === 'published'
          ? 'Fakta publicerad'
          : 'Fakta sparad'
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte spara');
    } finally {
      setIsSaving(false);
    }
  }

  async function togglePublished(fact: Fact) {
    const nextStatus = fact.status === 'published' ? 'draft' : 'published';
    setMessage('');

    try {
      await setStatus({ id: fact._id, status: nextStatus });
      if (editingId === fact._id) {
        updateForm('status', nextStatus);
      }
      setMessage(nextStatus === 'published' ? 'Publicerad' : 'Flyttad till utkast');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kunde inte ändra status');
    }
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Kunskapsbas</Text>
          <Text style={styles.title}>Fakta-admin</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeNumber}>{publishedCount}</Text>
          <Text style={styles.headerBadgeLabel}>publicerade</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {kindOptions.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.filterChip,
              activeKind === option.value && styles.filterChipActive
            ]}
            onPress={() => setActiveKind(option.value)}
          >
            <Text
              style={[
                styles.filterText,
                activeKind === option.value && styles.filterTextActive
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>
            {editingId ? 'Ändra fakta' : 'Ny fakta'}
          </Text>
          <Pressable style={styles.ghostButton} onPress={startNew}>
            <Text style={styles.ghostButtonText}>Ny</Text>
          </Pressable>
        </View>

        <View style={styles.segmentRow}>
          {formKindOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.segment,
                form.kind === option.value && styles.segmentActive
              ]}
              onPress={() => updateForm('kind', option.value)}
            >
              <Text
                style={[
                  styles.segmentText,
                  form.kind === option.value && styles.segmentTextActive
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.segmentRow}>
          {statusOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.statusSegment,
                form.status === option.value && styles.statusSegmentActive
              ]}
              onPress={() => updateForm('status', option.value)}
            >
              <Text
                style={[
                  styles.statusText,
                  form.status === option.value && styles.statusTextActive
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field
          label="Titel"
          value={form.title}
          onChangeText={(value) => updateForm('title', value)}
          placeholder="Sepsis, PVK, Adrenalin..."
        />
        <Field
          label="Kategori"
          value={form.category}
          onChangeText={(value) => updateForm('category', value)}
          placeholder="Infektion, Omvårdnad, Läkemedel..."
        />
        <Field
          label="Sammanfattning"
          value={form.summary}
          onChangeText={(value) => updateForm('summary', value)}
          placeholder="Kort ingress som visas i sök och agenten"
          multiline
        />
        <Field
          label="Faktatext"
          value={form.body}
          onChangeText={(value) => updateForm('body', value)}
          placeholder="Skriv kontrollerad fakta, punktlista eller PM-text"
          multiline
          tall
        />
        <Field
          label="Källa"
          value={form.source}
          onChangeText={(value) => updateForm('source', value)}
          placeholder="Lokalt PM, FASS, regional rutin..."
        />

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={() => save()}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={Colors.onPrimary} />
            ) : (
              <Text style={styles.saveButtonText}>Spara</Text>
            )}
          </Pressable>
          <Pressable
            style={[styles.publishButton, isSaving && styles.buttonDisabled]}
            onPress={() => save('published')}
            disabled={isSaving}
          >
            <Text style={styles.publishButtonText}>Publicera</Text>
          </Pressable>
        </View>

        {!!message && <Text style={styles.message}>{message}</Text>}
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Faktaposter</Text>
        <Text style={styles.listMeta}>
          {facts === undefined ? 'Laddar' : `${facts.length} st`}
        </Text>
      </View>

      {facts === undefined ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        facts.map((fact) => (
          <Pressable
            key={fact._id}
            style={[
              styles.factCard,
              editingId === fact._id && styles.factCardActive
            ]}
            onPress={() => startEdit(fact)}
          >
            <View style={styles.factTopRow}>
              <View style={styles.factKind}>
                <Text style={styles.factKindText}>{kindLabel(fact.kind)}</Text>
              </View>
              <Text
                style={[
                  styles.factStatus,
                  fact.status === 'published' && styles.factStatusPublished
                ]}
              >
                {statusLabel(fact.status)}
              </Text>
            </View>
            <Text style={styles.factTitle}>{fact.title}</Text>
            <Text style={styles.factSummary} numberOfLines={2}>
              {fact.summary || fact.body}
            </Text>
            <View style={styles.factBottomRow}>
              <Text style={styles.factDate}>Ändrad {formatDate(fact.updatedAt)}</Text>
              <Pressable
                style={styles.smallButton}
                onPress={() => togglePublished(fact)}
              >
                <Text style={styles.smallButtonText}>
                  {fact.status === 'published' ? 'Utkast' : 'Publicera'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  tall = false
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  tall?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline, tall && styles.inputTall]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingTop: 18
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  eyebrow: {
    color: Colors.agentText,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '900'
  },
  headerBadge: {
    alignItems: 'center',
    backgroundColor: Colors.agentCanvas,
    borderColor: Colors.agentBorder,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 82,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  headerBadgeNumber: {
    color: Colors.agentText,
    fontSize: 22,
    fontWeight: '900'
  },
  headerBadgeLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '800'
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  filterChip: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.chrome
  },
  filterText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '800'
  },
  filterTextActive: {
    color: Colors.onPrimary
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
    justifyContent: 'space-between'
  },
  panelTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  ghostButton: {
    borderColor: Colors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  ghostButtonText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '900'
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  segment: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  segmentActive: {
    backgroundColor: Colors.agent
  },
  segmentText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '900'
  },
  segmentTextActive: {
    color: Colors.onPrimary
  },
  statusSegment: {
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  statusSegmentActive: {
    backgroundColor: Colors.primarySoft,
    borderColor: Colors.primary
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '900'
  },
  statusTextActive: {
    color: Colors.primary
  },
  field: {
    gap: 6
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  input: {
    backgroundColor: Colors.surfaceLight,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  inputMultiline: {
    minHeight: 84
  },
  inputTall: {
    minHeight: 170
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48
  },
  saveButtonText: {
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  publishButton: {
    alignItems: 'center',
    backgroundColor: Colors.agent,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48
  },
  publishButtonText: {
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  message: {
    color: Colors.agentText,
    fontSize: 13,
    fontWeight: '800'
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  listTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  listMeta: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '800'
  },
  loadingBox: {
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center'
  },
  factCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  factCardActive: {
    borderColor: Colors.agent,
    borderWidth: 2
  },
  factTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  factKind: {
    backgroundColor: Colors.agentSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  factKindText: {
    color: Colors.agentText,
    fontSize: 11,
    fontWeight: '900'
  },
  factStatus: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '900'
  },
  factStatusPublished: {
    color: Colors.success
  },
  factTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  factSummary: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  factBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  factDate: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '700'
  },
  smallButton: {
    borderColor: Colors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  smallButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '900'
  }
});
