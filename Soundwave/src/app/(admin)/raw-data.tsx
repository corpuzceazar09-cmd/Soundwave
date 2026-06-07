import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

type PodcastRecord = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  image_url: string | null;
  feed_url: string | null;
  language: string | null;
  featured: boolean;
  created_at: string;
};

export default function RawDataPage() {
  const [podcasts, setPodcasts] = useState<PodcastRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastRecord | null>(null);
  const [episodes, setEpisodes] = useState<any[]>([]);

  const fetchPodcasts = useCallback(async () => {
    try {
      let query = supabase.from('podcasts').select('*').order('created_at', { ascending: false }).limit(50);
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`);
      }
      const { data } = await query;
      setPodcasts(data || []);
    } catch (err) {
      console.error('Raw data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => { fetchPodcasts(); }, [search])
  );

  const selectPodcast = async (podcast: PodcastRecord) => {
    setSelectedPodcast(podcast);
    try {
      const { data } = await supabase
        .from('episodes')
        .select('*')
        .eq('podcast_id', podcast.id)
        .order('published_at', { ascending: false });
      setEpisodes(data || []);
    } catch (err) {
      console.error('Episodes fetch error:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Raw Podcast Data</Text>
        <Text style={styles.pageSubtitle}>{podcasts.length} podcasts in database</Text>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search podcasts by title..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.splitPane}>
        {/* Podcast List */}
        <View style={styles.listPane}>
          {podcasts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No podcasts found.</Text>
            </View>
          ) : (
            <ScrollView>
              {podcasts.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.podcastItem, selectedPodcast?.id === p.id && styles.podcastItemActive]}
                  onPress={() => selectPodcast(p)}
                >
                  <View style={styles.podcastAvatar}>
                    <Text style={styles.podcastAvatarText}>{p.title.charAt(0)}</Text>
                  </View>
                  <View style={styles.podcastItemInfo}>
                    <Text style={styles.podcastItemTitle} numberOfLines={1}>{p.title}</Text>
                    <Text style={styles.podcastItemAuthor} numberOfLines={1}>
                      {p.author || 'Unknown author'}
                    </Text>
                    <Text style={styles.podcastItemDate}>
                      Added: {new Date(p.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Detail Pane */}
        <View style={styles.detailPane}>
          {selectedPodcast ? (
            <ScrollView>
              <View style={styles.detailHeader}>
                <View style={styles.detailAvatar}>
                  <Text style={styles.detailAvatarText}>{selectedPodcast.title.charAt(0)}</Text>
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailTitle}>{selectedPodcast.title}</Text>
                  <Text style={styles.detailAuthor}>{selectedPodcast.author || 'Unknown'}</Text>
                  <View style={styles.detailMeta}>
                    <Text style={styles.detailMetaItem}>
                      Language: {selectedPodcast.language || 'en'}
                    </Text>
                    <Text style={styles.detailMetaItem}>
                      Featured: {selectedPodcast.featured ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Description</Text>
                <Text style={styles.detailDescription}>
                  {selectedPodcast.description || 'No description'}
                </Text>
              </View>

              {selectedPodcast.feed_url && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Feed URL</Text>
                  <Text style={styles.detailUrl} numberOfLines={2}>{selectedPodcast.feed_url}</Text>
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  Episodes ({episodes.length})
                </Text>
                {episodes.length === 0 ? (
                  <Text style={styles.emptyText}>No episodes found.</Text>
                ) : (
                  episodes.map((ep) => (
                    <View key={ep.id} style={styles.episodeItem}>
                      <Text style={styles.episodeTitle}>{ep.title}</Text>
                      <Text style={styles.episodeMeta}>
                        {ep.duration ? `${Math.floor(ep.duration / 60)} min` : 'Unknown duration'}
                        {ep.published_at ? ` · ${new Date(ep.published_at).toLocaleDateString()}` : ''}
                        {' · '}
                        <Text style={{ color: ep.status === 'published' ? '#059669' : '#D97706' }}>
                          {ep.status?.toUpperCase() || 'UNKNOWN'}
                        </Text>
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.noSelection}>
              <Text style={styles.noSelectionIcon}>🗃️</Text>
              <Text style={styles.noSelectionText}>Select a podcast to view raw data</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 16 },
  header: {},
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  pageSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 14,
    paddingVertical: 10, gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splitPane: { flex: 1, flexDirection: 'row', gap: 16 },
  listPane: {
    width: '40%', backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1,
    borderColor: '#E2E8F0', overflow: 'hidden',
  },
  podcastItem: {
    flexDirection: 'row', padding: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  podcastItemActive: { backgroundColor: '#EFF6FF' },
  podcastAvatar: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center',
  },
  podcastAvatarText: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  podcastItemInfo: { flex: 1 },
  podcastItemTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  podcastItemAuthor: { fontSize: 12, color: '#64748B', marginTop: 2 },
  podcastItemDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  detailPane: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', padding: 20,
  },
  detailHeader: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  detailAvatar: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: '#DBEAFE',
    justifyContent: 'center', alignItems: 'center',
  },
  detailAvatarText: { fontSize: 24, fontWeight: '700', color: '#2563EB' },
  detailInfo: { flex: 1, justifyContent: 'center' },
  detailTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  detailAuthor: { fontSize: 14, color: '#64748B', marginTop: 2 },
  detailMeta: { flexDirection: 'row', gap: 16, marginTop: 8 },
  detailMetaItem: { fontSize: 12, color: '#94A3B8' },
  detailSection: { marginBottom: 20 },
  detailSectionTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 8 },
  detailDescription: { fontSize: 13, color: '#475569', lineHeight: 20 },
  detailUrl: { fontSize: 12, color: '#2563EB' },
  episodeItem: {
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  episodeTitle: { fontSize: 14, fontWeight: '500', color: '#0F172A' },
  episodeMeta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  noSelection: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  noSelectionIcon: { fontSize: 48 },
  noSelectionText: { fontSize: 14, color: '#94A3B8' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});
