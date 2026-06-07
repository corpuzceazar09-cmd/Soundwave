import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Episode = {
  id: string;
  podcast_id: string | null;
  title: string;
  description: string | null;
  audio_url: string;
  duration: number | null;
  episode_number: number | null;
  season_number: number | null;
  published_at: string | null;
  status: 'published' | 'draft' | 'hidden';
  created_at: string;
  podcasts: { title: string } | null;
};

type FilterKey = 'all' | 'published' | 'draft' | 'hidden';

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchEpisodes = useCallback(async () => {
    try {
      let query = supabase
        .from('episodes')
        .select('*, podcasts!inner(title)')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data } = await query;
      setEpisodes(data || []);
    } catch (err) {
      console.error('Episodes fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => { fetchEpisodes(); }, [fetchEpisodes])
  );

  const changeStatus = async (episode: Episode, newStatus: 'published' | 'draft' | 'hidden') => {
    const actionLabels: Record<string, string> = {
      published: 'publish',
      draft: 'move to draft',
      hidden: 'hide',
    };

    Alert.alert(
      `${actionLabels[newStatus].charAt(0).toUpperCase() + actionLabels[newStatus].slice(1)} Episode`,
      `Are you sure you want to ${actionLabels[newStatus]} "${episode.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', style: 'destructive',
          onPress: async () => {
            setActionLoading(episode.id);
            try {
              const { error } = await supabase
                .from('episodes')
                .update({ status: newStatus })
                .eq('id', episode.id);
              if (error) throw error;
              setEpisodes(prev =>
                prev.map(e => e.id === episode.id ? { ...e, status: newStatus } : e)
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update status');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs} hr ${mins} min`;
    return `${mins} min`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published': return { bg: '#D1FAE5', text: '#059669', label: 'PUBLISHED' };
      case 'draft': return { bg: '#F3F4F6', text: '#6B7280', label: 'DRAFT' };
      case 'hidden': return { bg: '#FEE2E2', text: '#DC2626', label: 'HIDDEN' };
      default: return { bg: '#F3F4F6', text: '#6B7280', label: status.toUpperCase() };
    }
  };

  const filterTabs = [
    { key: 'all' as const, label: 'All' },
    { key: 'published' as const, label: 'Published' },
    { key: 'draft' as const, label: 'Drafts' },
    { key: 'hidden' as const, label: 'Hidden' },
  ];

  const counts = {
    all: episodes.length,
    published: episodes.filter(e => e.status === 'published').length,
    draft: episodes.filter(e => e.status === 'draft').length,
    hidden: episodes.filter(e => e.status === 'hidden').length,
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Episodes</Text>
        <Text style={styles.pageSubtitle}>{episodes.length} episode{episodes.length !== 1 ? 's' : ''} total</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.published}</Text>
          <Text style={[styles.summaryLabel, { color: '#059669' }]}>Published</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.draft}</Text>
          <Text style={[styles.summaryLabel, { color: '#6B7280' }]}>Drafts</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.hidden}</Text>
          <Text style={[styles.summaryLabel, { color: '#DC2626' }]}>Hidden</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}>
              {tab.label} ({counts[tab.key]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Episodes Table */}
      {episodes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {filter === 'all' ? 'No episodes yet.' : `No ${filter} episodes found.`}
          </Text>
        </View>
      ) : (
        <View style={styles.tableSection}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, { flex: 2 }]}>EPISODE</Text>
            <Text style={[styles.th, { flex: 1.5 }]}>PODCAST</Text>
            <Text style={[styles.th, { flex: 1 }]}>DURATION</Text>
            <Text style={[styles.th, { flex: 1 }]}>STATUS</Text>
            <Text style={[styles.th, { width: 100 }]}>ACTION</Text>
          </View>
          {episodes.map((ep) => {
            const badge = getStatusBadge(ep.status);
            return (
              <View key={ep.id} style={styles.tr}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.td, { fontWeight: '500' }]} numberOfLines={1}>{ep.title}</Text>
                  {ep.episode_number && (
                    <Text style={styles.tdSub}>S{ep.season_number || 1} E{ep.episode_number}</Text>
                  )}
                </View>
                <Text style={[styles.td, { flex: 1.5 }]} numberOfLines={1}>
                  {ep.podcasts?.title || 'Unknown'}
                </Text>
                <Text style={[styles.td, { flex: 1 }]}>{formatDuration(ep.duration)}</Text>
                <View style={{ flex: 1 }}>
                  <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>
                <View style={{ width: 100, flexDirection: 'row', gap: 4 }}>
                  {actionLoading === ep.id ? (
                    <ActivityIndicator size="small" color="#7C3AED" />
                  ) : (
                    <>
                      {ep.status !== 'published' && (
                        <TouchableOpacity onPress={() => changeStatus(ep, 'published')}>
                          <Text style={styles.actionGreen}>Pub</Text>
                        </TouchableOpacity>
                      )}
                      {ep.status !== 'draft' && (
                        <TouchableOpacity onPress={() => changeStatus(ep, 'draft')}>
                          <Text style={styles.actionGray}>Draft</Text>
                        </TouchableOpacity>
                      )}
                      {ep.status !== 'hidden' && (
                        <TouchableOpacity onPress={() => changeStatus(ep, 'hidden')}>
                          <Text style={styles.actionRed}>Hide</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },
  contentContainer: { gap: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAF9' },
  header: {},
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8,
    borderWidth: 1, borderColor: '#E9D5FF', alignItems: 'center',
  },
  summaryValue: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6',
  },
  filterTabActive: { backgroundColor: '#EDE9FE' },
  filterTabText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  filterTabTextActive: { color: '#7C3AED', fontWeight: '600' },
  tableSection: {
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9D5FF', borderRadius: 8,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3E8FF', backgroundColor: '#FAFAF9',
  },
  th: { fontSize: 11, fontWeight: '600', color: '#6B7280', letterSpacing: 0.5 },
  tr: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F5F3FF', alignItems: 'center',
  },
  td: { fontSize: 13, color: '#374151' },
  tdSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actionGreen: { fontSize: 11, fontWeight: '600', color: '#059669', paddingHorizontal: 4 },
  actionGray: { fontSize: 11, fontWeight: '600', color: '#6B7280', paddingHorizontal: 4 },
  actionRed: { fontSize: 11, fontWeight: '600', color: '#DC2626', paddingHorizontal: 4 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
