import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { publishDraft, deleteDraft } from '@/lib/editorApi';
import { useEditorTheme } from '@/contexts/EditorThemeContext';
import { EditorThemeColors } from '@/constants/EditorTheme';

type DraftEpisode = {
  id: string;
  podcast_id: string | null;
  title: string;
  description: string | null;
  audio_url: string;
  duration: number | null;
  episode_number: number | null;
  season_number: number | null;
  created_at: string;
  podcasts: { title: string } | null;
};

export default function DraftsPage() {
  const { colors } = useEditorTheme();
  const [drafts, setDrafts] = useState<DraftEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('episodes')
        .select('*, podcasts!inner(title)')
        .eq('status', 'draft')
        .order('created_at', { ascending: false });
      setDrafts(data || []);
    } catch (err) {
      console.error('Drafts fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => { fetchDrafts(); }, [fetchDrafts])
  );

  const handlePublishDraft = async (draft: DraftEpisode) => {
    Alert.alert(
      'Publish Episode',
      `Publish "${draft.title}"? It will be available to all listeners.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish', style: 'destructive',
          onPress: async () => {
            setActionLoading(draft.id);
            try {
              await publishDraft(draft.id);
              setDrafts(prev => prev.filter(d => d.id !== draft.id));
              Alert.alert('Published', `"${draft.title}" is now live.`);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to publish');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleDeleteDraft = async (draft: DraftEpisode) => {
    Alert.alert(
      'Delete Draft',
      `Permanently delete "${draft.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setActionLoading(draft.id);
            try {
              await deleteDraft(draft.id);
              setDrafts(prev => prev.filter(d => d.id !== draft.id));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete');
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
        <Text style={styles.pageTitle}>Drafts</Text>
        <Text style={styles.pageSubtitle}>
          {drafts.length} draft episode{drafts.length !== 1 ? 's' : ''} pending review
        </Text>
      </View>

      {/* Drafts List */}
      {drafts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>All Clear!</Text>
          <Text style={styles.emptyDesc}>There are no draft episodes pending review.</Text>
        </View>
      ) : (
        <>
          {drafts.map((draft) => (
            <View key={draft.id} style={styles.draftCard}>
              <View style={styles.draftCardLeft}>
                <View style={styles.draftIcon}>
                  <Text style={styles.draftIconText}>D</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.draftTitle}>{draft.title}</Text>
                  <Text style={styles.draftPodcast}>
                    {draft.podcasts?.title || 'Unknown Podcast'}
                  </Text>
                  <View style={styles.draftMeta}>
                    {draft.episode_number && (
                      <Text style={styles.metaItem}>
                        S{draft.season_number || 1} E{draft.episode_number}
                      </Text>
                    )}
                    <Text style={styles.metaItem}>{formatDuration(draft.duration)}</Text>
                    <Text style={styles.metaItem}>
                      Created: {new Date(draft.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  {draft.description && (
                    <Text style={styles.draftDesc} numberOfLines={2}>
                      {draft.description}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.draftActions}>
                <TouchableOpacity
                  style={styles.publishBtn}
                  onPress={() => handlePublishDraft(draft)}
                  disabled={actionLoading === draft.id}
                >
                  {actionLoading === draft.id ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <Text style={styles.publishBtnText}>Publish</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteDraft(draft)}
                  disabled={actionLoading === draft.id}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: EditorThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { gap: 12, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: {},
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  pageSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  draftCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  draftCardLeft: { flexDirection: 'row', flex: 1, gap: 12 },
  draftIcon: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: colors.sidebarIconActiveBg,
    justifyContent: 'center', alignItems: 'center',
  },
  draftIconText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  draftTitle: { fontSize: 14, fontWeight: '600', color: colors.text },
  draftPodcast: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  draftMeta: { flexDirection: 'row', gap: 12, marginTop: 4, flexWrap: 'wrap' },
  metaItem: { fontSize: 11, color: colors.textMuted },
  draftDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
  draftActions: { gap: 6, marginLeft: 12 },
  publishBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 4, minWidth: 70, alignItems: 'center',
  },
  publishBtnText: { color: colors.textInverse, fontWeight: '600', fontSize: 13 },
  deleteBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4,
    borderWidth: 1, borderColor: colors.danger, alignItems: 'center',
  },
  deleteBtnText: { color: colors.danger, fontWeight: '600', fontSize: 13 },
  emptyState: {
    alignItems: 'center', paddingVertical: 60, gap: 12,
    backgroundColor: colors.badgeSuccess, borderRadius: 8,
    borderWidth: 1, borderColor: colors.badgeSuccess,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.badgeSuccessText },
  emptyDesc: { fontSize: 14, color: colors.badgeSuccessText, textAlign: 'center', maxWidth: 300 },
});
