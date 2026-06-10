import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { updateEpisodeStatus } from '@/lib/editorApi';
import { useEditorTheme } from '@/contexts/EditorThemeContext';
import { EditorThemeColors } from '@/constants/EditorTheme';

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
  const { colors } = useEditorTheme();
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
              await updateEpisodeStatus(episode.id, newStatus);
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
      case 'published': return { bg: colors.badgeSuccess, text: colors.badgeSuccessText, label: 'PUBLISHED' };
      case 'draft': return { bg: colors.badgeNeutral, text: colors.badgeNeutralText, label: 'DRAFT' };
      case 'hidden': return { bg: colors.badgeDanger, text: colors.badgeDangerText, label: 'HIDDEN' };
      default: return { bg: colors.badgeNeutral, text: colors.badgeNeutralText, label: status.toUpperCase() };
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

  const styles = makeStyles(colors);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
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
          <Text style={[styles.summaryLabel, { color: colors.badgeSuccessText }]}>Published</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.draft}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Drafts</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{counts.hidden}</Text>
          <Text style={[styles.summaryLabel, { color: colors.danger }]}>Hidden</Text>
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
                    <ActivityIndicator size="small" color={colors.primary} />
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

const makeStyles = (colors: EditorThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { gap: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {},
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  pageSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1, backgroundColor: colors.surface, padding: 16, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  summaryValue: { fontSize: 24, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.tabBg,
  },
  filterTabActive: { backgroundColor: colors.tabActiveBg },
  filterTabText: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  filterTabTextActive: { color: colors.primary, fontWeight: '600' },
  tableSection: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.tableHeadBg,
  },
  th: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5 },
  tr: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.tableRowBorder, alignItems: 'center',
  },
  td: { fontSize: 13, color: colors.textSecondary },
  tdSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actionGreen: { fontSize: 11, fontWeight: '600', color: colors.badgeSuccessText, paddingHorizontal: 4 },
  actionGray: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, paddingHorizontal: 4 },
  actionRed: { fontSize: 11, fontWeight: '600', color: colors.danger, paddingHorizontal: 4 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
