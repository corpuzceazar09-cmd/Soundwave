import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { getEditorStats, EditorStats } from '@/lib/editorApi';
import { useEditorTheme } from '@/contexts/EditorThemeContext';
import { EditorThemeColors } from '@/constants/EditorTheme';

type PodcastWithCount = {
  id: string;
  title: string;
  author: string | null;
  featured: boolean;
  episode_count: number;
  latest_episode: string | null;
};

type DashboardStats = {
  totalPodcasts: number;
  totalEpisodes: number;
  draftEpisodes: number;
  publishedEpisodes: number;
};

export default function EditorDashboard() {
  const { colors } = useEditorTheme();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalPodcasts: 0, totalEpisodes: 0, draftEpisodes: 0, publishedEpisodes: 0,
  });
  const [podcasts, setPodcasts] = useState<PodcastWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorStats, setEditorStats] = useState<EditorStats>({ totalActions: 0, publishedThisWeek: 0, pendingReviews: 0, recentActions: [] });

  const fetchData = useCallback(async () => {
    try {
      const [podcastsRes, episodesRes, draftsRes, publishedRes, podcastsFull] = await Promise.all([
        supabase.from('podcasts').select('id', { count: 'exact', head: true }),
        supabase.from('episodes').select('id', { count: 'exact', head: true }),
        supabase.from('episodes').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('episodes').select('id', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('podcasts').select('id, title, author, featured, created_at').order('created_at', { ascending: false }).limit(50),
      ]);

      const totalPodcasts = podcastsRes.count ?? 0;
      const totalEpisodes = episodesRes.count ?? 0;
      const draftEpisodes = draftsRes.count ?? 0;
      const publishedEpisodes = publishedRes.count ?? 0;

      // Get episode counts per podcast
      const podcastIds = (podcastsFull.data ?? []).map(p => p.id);
      let episodeCounts: Record<string, { count: number; latest: string | null }> = {};

      if (podcastIds.length > 0) {
        const { data: counts } = await supabase
          .from('episodes')
          .select('podcast_id, created_at')
          .in('podcast_id', podcastIds)
          .order('created_at', { ascending: false });

        if (counts) {
          const seen = new Set<string>();
          counts.forEach(ep => {
            if (!episodeCounts[ep.podcast_id]) {
              episodeCounts[ep.podcast_id] = { count: 0, latest: null };
            }
            episodeCounts[ep.podcast_id].count++;
            if (!seen.has(ep.podcast_id)) {
              episodeCounts[ep.podcast_id].latest = ep.created_at;
              seen.add(ep.podcast_id);
            }
          });
        }
      }

      setStats({ totalPodcasts, totalEpisodes, draftEpisodes, publishedEpisodes });
      setPodcasts(
        (podcastsFull.data ?? []).map(p => ({
          id: p.id,
          title: p.title,
          author: p.author,
          featured: p.featured,
          episode_count: episodeCounts[p.id]?.count ?? 0,
          latest_episode: episodeCounts[p.id]?.latest ?? null,
        }))
      );

      // Editor stats from MongoDB (non-blocking)
      try {
        const stats = await getEditorStats();
        setEditorStats(stats);
      } catch (_) {
        // Editor API unavailable — non-blocking
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchData(); }, [fetchData])
  );

  if (loading) {
    const styles = makeStyles(colors);
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const styles = makeStyles(colors);
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>TOTAL PODCASTS</Text>
          <Text style={styles.statValue}>{stats.totalPodcasts}</Text>
          <Text style={styles.statSubtext}>In the directory</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>TOTAL EPISODES</Text>
          <Text style={styles.statValue}>{stats.totalEpisodes}</Text>
          <Text style={styles.statSubtext}>Across all podcasts</Text>
        </View>
        <View style={[styles.statCard, stats.draftEpisodes > 0 && styles.statCardWarning]}>
          <Text style={[styles.statTitle, stats.draftEpisodes > 0 && { color: colors.warning }]}>
            DRAFTS
          </Text>
          <Text style={[styles.statValue, stats.draftEpisodes > 0 && { color: colors.warning }]}>
            {stats.draftEpisodes}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(editor)/drafts' as any)}>
            <Text style={[styles.statSubtext, { color: colors.primary, textDecorationLine: 'underline' }]}>
              {stats.draftEpisodes > 0 ? 'Needs review →' : 'No pending drafts'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>PUBLISHED</Text>
          <Text style={styles.statValue}>{stats.publishedEpisodes}</Text>
          <Text style={styles.statSubtext}>Live episodes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>PUBLISHED THIS WEEK</Text>
          <Text style={styles.statValue}>{editorStats.publishedThisWeek}</Text>
          <Text style={styles.statSubtext}>Editor actions</Text>
        </View>
        <View style={[styles.statCard, editorStats.pendingReviews > 0 && styles.statCardWarning]}>
          <Text style={[styles.statTitle, editorStats.pendingReviews > 0 && { color: colors.warning }]}>
            PENDING REVIEWS
          </Text>
          <Text style={[styles.statValue, editorStats.pendingReviews > 0 && { color: colors.warning }]}>
            {editorStats.pendingReviews}
          </Text>
          <Text style={styles.statSubtext}>Actions awaiting review</Text>
        </View>
      </View>

      {/* Podcast List */}
      <View style={styles.tableSection}>
        <View style={styles.tableHeader}>
          <Text style={styles.sectionTitle}>Podcasts</Text>
          <TouchableOpacity
            style={styles.viewAllBtn}
            onPress={() => router.push('/(editor)/podcasts' as any)}
          >
            <Text style={styles.viewAllBtnText}>Manage Podcasts →</Text>
          </TouchableOpacity>
        </View>

        {podcasts.length === 0 ? (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>
              No podcasts yet. Feeds need to be ingested first.
            </Text>
          </View>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 2.5 }]}>TITLE</Text>
              <Text style={[styles.th, { flex: 1.5 }]}>AUTHOR</Text>
              <Text style={[styles.th, { flex: 1 }]}>EPISODES</Text>
              <Text style={[styles.th, { flex: 1 }]}>STATUS</Text>
              <Text style={[styles.th, { width: 80, textAlign: 'center' as const }]}>ACTION</Text>
            </View>
            {podcasts.map((p) => (
              <View key={p.id} style={styles.tr}>
                <Text style={[styles.td, { flex: 2.5, fontWeight: '500' }]} numberOfLines={1}>
                  {p.title}
                </Text>
                <Text style={[styles.td, { flex: 1.5 }]} numberOfLines={1}>
                  {p.author || 'Unknown'}
                </Text>
                <Text style={[styles.td, { flex: 1 }]}>{p.episode_count}</Text>
                <View style={{ flex: 1 }}>
                  <View style={[styles.badge, p.featured ? styles.badgeSuccess : styles.badgeDraft]}>
                    <Text style={[styles.badgeText, p.featured ? styles.badgeSuccessText : styles.badgeDraftText]}>
                      {p.featured ? 'FEATURED' : 'STANDARD'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={{ width: 80, alignItems: 'center' as const }}
                  onPress={() => router.push('/(editor)/podcasts' as any)}
                >
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => router.push('/(editor)/episodes' as any)}
        >
          <Text style={styles.quickActionIcon}>🎙️</Text>
          <Text style={styles.quickActionTitle}>All Episodes</Text>
          <Text style={styles.quickActionDesc}>Browse and manage episodes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => router.push('/(editor)/drafts' as any)}
        >
          <Text style={styles.quickActionIcon}>📝</Text>
          <Text style={styles.quickActionTitle}>Drafts</Text>
          <Text style={styles.quickActionDesc}>Review pending drafts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => router.push('/(editor)/podcasts' as any)}
        >
          <Text style={styles.quickActionIcon}>📚</Text>
          <Text style={styles.quickActionTitle}>Podcasts</Text>
          <Text style={styles.quickActionDesc}>Manage podcast metadata</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: EditorThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { gap: 24, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  statCard: {
    flex: 1, minWidth: 160, backgroundColor: colors.surface, padding: 20, borderRadius: 8,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  statCardWarning: { borderColor: colors.warningBg },
  statTitle: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, marginBottom: 12, letterSpacing: 0.5 },
  statValue: { fontSize: 30, fontWeight: '700', color: colors.text, marginBottom: 6 },
  statSubtext: { fontSize: 13, fontWeight: '500', color: colors.textSecondary },
  tableSection: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8,
  },
  tableHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 24, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  viewAllBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  viewAllBtnText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  table: { width: '100%' },
  tableHead: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight, backgroundColor: colors.tableHeadBg,
  },
  th: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.5 },
  tr: {
    flexDirection: 'row', paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.tableRowBorder, alignItems: 'center',
  },
  td: { fontSize: 14, color: colors.textSecondary },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeSuccess: { backgroundColor: colors.badgeSuccess },
  badgeSuccessText: { color: colors.badgeSuccessText },
  badgeDraft: { backgroundColor: colors.badgeNeutral },
  badgeDraftText: { color: colors.badgeNeutralText },
  actionText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  quickActionsRow: { flexDirection: 'row', gap: 16 },
  quickAction: {
    flex: 1, backgroundColor: colors.surface, padding: 20, borderRadius: 8, borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickActionIcon: { fontSize: 24, marginBottom: 8 },
  quickActionTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  quickActionDesc: { fontSize: 12, color: colors.textSecondary },
  emptyRow: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
