import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/firebase';
import { getSubscriptions } from '@/lib/firestoreApi';

export default function LibraryScreen() {
  const [library, setLibrary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }
      const subIds = await getSubscriptions(user.uid);
      if (subIds.length > 0) {
        const { data } = await supabase
          .from('podcasts')
          .select('*')
          .in('id', subIds);
        setLibrary(data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#38BDF8" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.pageTitle}>Your Library</Text>
        <TouchableOpacity style={styles.editBtn}>
          <Ionicons name="create-outline" size={18} color="#38BDF8" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsRow}
      >
        {['Playlists', 'Podcasts', 'Episodes', 'Downloads'].map((label) => (
          <TouchableOpacity key={label} style={[styles.pill, label === 'Playlists' && styles.pillActive]}>
            <Text style={[styles.pillText, label === 'Playlists' && styles.pillTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Subscriptions Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Subscriptions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.playlistsRow}
        >
          {library.length === 0 ? (
            <View style={{ width: 200 }}>
              <Text style={{ color: '#94A3B8', fontSize: 14 }}>No subscriptions yet.</Text>
            </View>
          ) : (
            library.map((item: any) => (
              <TouchableOpacity key={item.id} style={styles.playlistCard}>
                <LinearGradient
                  colors={['#1E293B', '#0F172A']}
                  style={styles.playlistGradient}
                >
                  <Ionicons name="radio" size={32} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.playlistTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.playlistMeta}>{item.author || 'Unknown'}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* All Subscriptions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Subscriptions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {library.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>Subscribe to podcasts to see them here.</Text>
          </View>
        ) : (
          library.map((item: any) => (
            <TouchableOpacity key={item.id} style={styles.episodeRow}>
              <View style={styles.episodeArt}>
                <Ionicons name="radio" size={20} color="#38BDF8" />
              </View>
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.episodeMeta}>{item.author || 'Unknown author'}</Text>
              </View>
              <View style={styles.episodeRight}>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#38BDF8',
  },
  pillsRow: {
    gap: 10,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  pillActive: {
    backgroundColor: '#38BDF8',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  seeAllText: {
    fontSize: 13,
    color: '#38BDF8',
    fontWeight: '600',
  },
  playlistsRow: {
    gap: 16,
    paddingRight: 24,
  },
  playlistCard: {
    width: 150,
  },
  playlistGradient: {
    width: 150,
    height: 150,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  playlistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  playlistMeta: {
    fontSize: 12,
    color: '#94A3B8',
  },
  episodeRow: {
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
  episodeArt: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(56,189,248,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 3,
  },
  episodeMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  episodeRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  savedLabel: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
