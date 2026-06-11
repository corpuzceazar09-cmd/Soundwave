import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/firebase';
import { getListeningHistory } from '@/lib/firestoreApi';

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={progressBarStyles.bg}>
      <View style={[progressBarStyles.fill, { width: `${progress * 100}%` }]} />
    </View>
  );
}

const progressBarStyles = StyleSheet.create({
  bg: {
    height: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 6,
  },
  fill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
});

function HistorySection({ title, items }: { title: string; items: any[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <Text style={{ color: '#94A3B8', fontSize: 14 }}>No listening history yet.</Text>
        </View>
      ) : (
        items.map((item, i) => (
          <TouchableOpacity key={i} style={styles.historyRow}>
            <View style={styles.historyArt}>
              {item.progress !== undefined && item.progress >= 1 ? (
                <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
              ) : (
                <Ionicons name="play-circle" size={22} color="#38BDF8" />
              )}
            </View>
            <View style={styles.historyInfo}>
              <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.historyMeta}>
                {item.duration ? `${item.duration}` : ''}
              </Text>
              {item.progress !== undefined && item.progress < 1 && <ProgressBar progress={item.progress} />}
            </View>
            <Text style={styles.historyTime}>{item.timestamp || ''}</Text>
          </TouchableOpacity>
        ))
      )}
    </View>
  );
}

export default function HistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const user = auth.currentUser;
        const userId = user?.uid || '';
        const items = await getListeningHistory(userId, 50);
        if (cancelled) return;
        if (items.length > 0) {
          const episodeIds = items.map((h: any) => h.episode_id);
          const { data: episodes } = await supabase
            .from('episodes')
            .select('id, title')
            .in('id', episodeIds);
          const titleMap: Record<string, string> = {};
          (episodes || []).forEach((ep: any) => { titleMap[ep.id] = ep.title; });
          if (!cancelled) setHistory(items.map((h: any) => ({ ...h, title: titleMap[h.episode_id] || 'Unknown Episode' })));
        }
      }
      load();
      return () => { cancelled = true; };
    }, [])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Listening History</Text>
        <TouchableOpacity style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text style={styles.clearBtnText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <HistorySection title="Recently Played" items={history} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    gap: 28,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  section: {},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyArt: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(56,189,248,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 3,
  },
  historyMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  historyTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 8,
  },
});
