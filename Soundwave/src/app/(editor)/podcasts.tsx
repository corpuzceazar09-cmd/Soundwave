import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
  TextInput, Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

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
        <Text style={styles.pageTitle}>Podcasts</Text>
        <Text style={styles.pageSubtitle}>{podcasts.length} podcast{podcasts.length !== 1 ? 's' : ''} in directory</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search podcasts by title..."
          placeholderTextColor="#94A3B8"
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
                  <Text style={[styles.actionBtnText, podcast.featured && { color: '#D97706' }]}>
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF9' },
  contentContainer: { gap: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAF9' },
  header: {},
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E9D5FF', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 10, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  clearBtn: { fontSize: 16, color: '#94A3B8', paddingHorizontal: 4 },
  podcastList: { gap: 12 },
  podcastCard: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFFFFF',
    padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E9D5FF',
  },
  podcastCardLeft: { flexDirection: 'row', flex: 1, gap: 14 },
  podcastAvatar: {
    width: 48, height: 48, borderRadius: 8, backgroundColor: '#EDE9FE',
    justifyContent: 'center', alignItems: 'center',
  },
  podcastAvatarText: { fontSize: 18, fontWeight: '700', color: '#7C3AED' },
  podcastInfo: { flex: 1, justifyContent: 'center' },
  podcastTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  podcastAuthor: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  podcastMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLang: {
    fontSize: 11, color: '#6B7280', backgroundColor: '#F3F4F6',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  featuredBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#F3F4F6',
  },
  featuredBadgeActive: { backgroundColor: '#D1FAE5' },
  featuredBadgeText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  featuredBadgeTextActive: { color: '#059669' },
  podcastActions: { justifyContent: 'center', gap: 8, marginLeft: 12 },
  actionBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, backgroundColor: '#F3E8FF',
    alignItems: 'center',
  },
  actionBtnOutline: { backgroundColor: '#F3E8FF' },
  actionBtnWarning: { backgroundColor: '#FEF3C7' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  emptyDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', maxWidth: 300 },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center',
    alignItems: 'center', padding: 24,
  },
  modalContent: {
    width: '100%', maxWidth: 500, backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1, borderColor: '#E9D5FF', borderRadius: 6, padding: 12,
    fontSize: 14, color: '#1F2937', backgroundColor: '#FAFAF9',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 6, alignItems: 'center',
    backgroundColor: '#7C3AED',
  },
  saveBtnDisabled: { backgroundColor: '#C4B5FD' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
});
