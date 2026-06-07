import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
  TextInput, Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useEditorTheme } from '@/contexts/EditorThemeContext';
import { EditorThemeColors } from '@/constants/EditorTheme';

type Podcast = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  image_url: string | null;
  language: string | null;
  featured: boolean;
  feed_url: string | null;
  created_at: string;
};

type EditForm = {
  title: string;
  author: string;
  description: string;
  language: string;
};

export default function PodcastsPage() {
  const { colors } = useEditorTheme();
  const router = useRouter();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editPodcast, setEditPodcast] = useState<Podcast | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', author: '', description: '', language: '' });
  const [saving, setSaving] = useState(false);

  const fetchPodcasts = useCallback(async () => {
    try {
      let query = supabase.from('podcasts').select('*').order('created_at', { ascending: false });
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }
      const { data } = await query;
      setPodcasts(data || []);
    } catch (err) {
      console.error('Podcasts fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => { fetchPodcasts(); }, [fetchPodcasts])
  );

  const openEdit = (podcast: Podcast) => {
    setEditPodcast(podcast);
    setEditForm({
      title: podcast.title,
      author: podcast.author || '',
      description: podcast.description || '',
      language: podcast.language || 'en',
    });
  };

  const handleSave = async () => {
    if (!editPodcast) return;
    if (!editForm.title.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('podcasts')
        .update({
          title: editForm.title.trim(),
          author: editForm.author.trim() || null,
          description: editForm.description.trim() || null,
          language: editForm.language.trim() || 'en',
        })
        .eq('id', editPodcast.id);
      if (error) throw error;
      setPodcasts(prev =>
        prev.map(p => p.id === editPodcast.id ? { ...p, ...editForm, author: editForm.author.trim() || null, description: editForm.description.trim() || null, language: editForm.language.trim() || 'en' } : p)
      );
      setEditPodcast(null);
      Alert.alert('Saved', 'Podcast metadata updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (podcast: Podcast) => {
    const newFeatured = !podcast.featured;
    Alert.alert(
      newFeatured ? 'Feature Podcast' : 'Unfeature Podcast',
      newFeatured
        ? `Mark "${podcast.title}" as featured? It will appear in the featured section.`
        : `Remove "${podcast.title}" from featured?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('podcasts')
                .update({ featured: newFeatured })
                .eq('id', podcast.id);
              if (error) throw error;
              setPodcasts(prev =>
                prev.map(p => p.id === podcast.id ? { ...p, featured: newFeatured } : p)
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to update featured status');
            }
          },
        },
      ]
    );
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
        <Text style={styles.pageTitle}>Podcasts</Text>
        <Text style={styles.pageSubtitle}>{podcasts.length} podcast{podcasts.length !== 1 ? 's' : ''} in directory</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search podcasts by title..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Podcast List */}
      {podcasts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>
            {search ? 'No podcasts match your search' : 'No podcasts yet'}
          </Text>
          <Text style={styles.emptyDesc}>
            {search ? 'Try a different search term.' : 'Podcasts appear here once RSS feeds are ingested.'}
          </Text>
        </View>
      ) : (
        <View style={styles.podcastList}>
          {podcasts.map((podcast) => (
            <View key={podcast.id} style={styles.podcastCard}>
              <View style={styles.podcastCardLeft}>
                <View style={styles.podcastAvatar}>
                  <Text style={styles.podcastAvatarText}>
                    {podcast.title.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.podcastInfo}>
                  <Text style={styles.podcastTitle} numberOfLines={1}>{podcast.title}</Text>
                  <Text style={styles.podcastAuthor} numberOfLines={1}>
                    {podcast.author || 'Unknown author'}
                  </Text>
                  <View style={styles.podcastMeta}>
                    <Text style={styles.metaLang}>{podcast.language || 'en'}</Text>
                    <View style={[styles.featuredBadge, podcast.featured && styles.featuredBadgeActive]}>
                      <Text style={[styles.featuredBadgeText, podcast.featured && styles.featuredBadgeTextActive]}>
                        {podcast.featured ? 'FEATURED' : 'STANDARD'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.podcastActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(podcast)}>
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, podcast.featured ? styles.actionBtnWarning : styles.actionBtnOutline]}
                  onPress={() => toggleFeatured(podcast)}
                >
                  <Text style={[styles.actionBtnText, podcast.featured && { color: colors.warning }]}>
                    {podcast.featured ? 'Unfeature' : 'Feature'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Edit Modal */}
      <Modal visible={!!editPodcast} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Podcast</Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={editForm.title}
                onChangeText={(v) => setEditForm(f => ({ ...f, title: v }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Author</Text>
              <TextInput
                style={styles.input}
                value={editForm.author}
                onChangeText={(v) => setEditForm(f => ({ ...f, author: v }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editForm.description}
                onChangeText={(v) => setEditForm(f => ({ ...f, description: v }))}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Language</Text>
              <TextInput
                style={styles.input}
                value={editForm.language}
                onChangeText={(v) => setEditForm(f => ({ ...f, language: v }))}
                placeholder="en"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditPodcast(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 10, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  clearBtn: { fontSize: 16, color: colors.textMuted, paddingHorizontal: 4 },
  podcastList: { gap: 12 },
  podcastCard: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface,
    padding: 16, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
  },
  podcastCardLeft: { flexDirection: 'row', flex: 1, gap: 14 },
  podcastAvatar: {
    width: 48, height: 48, borderRadius: 8, backgroundColor: colors.sidebarIconActiveBg,
    justifyContent: 'center', alignItems: 'center',
  },
  podcastAvatarText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  podcastInfo: { flex: 1, justifyContent: 'center' },
  podcastTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  podcastAuthor: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  podcastMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLang: {
    fontSize: 11, color: colors.textSecondary, backgroundColor: colors.badgeNeutral,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  featuredBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.badgeNeutral,
  },
  featuredBadgeActive: { backgroundColor: colors.badgeSuccess },
  featuredBadgeText: { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  featuredBadgeTextActive: { color: colors.badgeSuccessText },
  podcastActions: { justifyContent: 'center', gap: 8, marginLeft: 12 },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, backgroundColor: colors.borderLight,
    alignItems: 'center',
  },
  actionBtnOutline: { backgroundColor: colors.borderLight },
  actionBtnWarning: { backgroundColor: colors.warningBg },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  emptyDesc: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: colors.modalOverlay, justifyContent: 'center',
    alignItems: 'center', padding: 24,
  },
  modalContent: {
    width: '100%', maxWidth: 500, backgroundColor: colors.surface, borderRadius: 12,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 6, padding: 12,
    fontSize: 14, color: colors.text, backgroundColor: colors.background,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center',
    backgroundColor: colors.badgeNeutral,
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center',
    backgroundColor: colors.primary,
  },
  saveBtnDisabled: { backgroundColor: colors.primaryMuted },
  saveBtnText: { color: colors.textInverse, fontWeight: '600', fontSize: 14 },
});
