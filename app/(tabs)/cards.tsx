import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getDb } from '../../src/db/database';
import { Colors } from '../../src/theme';

type CardItem = {
  id: string;
  title: string;
  category: string;
  items: string[];
};

export default function CardsScreen() {
  const [cards, setCards] = useState<CardItem[]>([]);

  useEffect(() => {
    async function load() {
      const db = await getDb();

      const cardRows = await db.getAllAsync(
        `SELECT id, title, category FROM cards ORDER BY title ASC`
      ) as {
        id: string;
        title: string;
        category: string;
      }[];

      const nextCards: CardItem[] = [];

      for (const card of cardRows) {
        const itemRows = await db.getAllAsync(
          `SELECT content FROM card_items WHERE card_id = ? ORDER BY sort_order ASC`,
          [card.id]
        ) as { content: string }[];

        nextCards.push({
          id: card.id,
          title: card.title,
          category: card.category,
          items: itemRows.map((row) => row.content)
        });
      }

      setCards(nextCards);
    }

    load().catch((e) => {
      console.log('CARDS ERROR', e);
    });
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Snabbkort</Text>

      {cards.map((card) => (
        <View key={card.id} style={styles.card}>
          <Text style={styles.cardTitle}>{card.title}</Text>
          <Text style={styles.cardCategory}>{card.category}</Text>

          {card.items.map((item, index) => (
            <Text key={index} style={styles.cardText}>
              • {item}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 18
  },
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4
  },
  cardCategory: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textPrimary,
    marginBottom: 6
  }
});
