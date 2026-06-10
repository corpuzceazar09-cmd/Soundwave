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
import { getSubscriptions, toggleSubscription } from '@/lib/firestoreApi';

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
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
        setSubscriptions(data || []);
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
        <Text style={styles.pageTitle}>Subscriptions</Text>
        <TouchableOpacity style={styles.sortBtn}>
          <Ionicons name="funnel-outline" size={18} color="#64748B" />
          <Text style={styles.sortBtnText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* New Releases / Your Subscriptions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Subscriptions</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {subscriptions.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ color: '#94A3B8', fontSize: 14 }}>No subscriptions yet.</Text>
          </View>
        ) : (
          subscriptions.map((item, i) => (
            <TouchableOpacity key={item.id || i} style={styles.releaseRow}>
              <View style={styles.releaseArt}>
                <Ionicons name="play-circle" size={24} color="#38BDF8" />
              </View>
              <View style={styles.releaseInfo}>
                <Text style={styles.releaseTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.releaseMeta}>{item.author || 'Unknown'}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* All Subscriptions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Subscriptions</Text>
          <Text style={styles.subCount}>{subscriptions.length} podcasts</Text>
        </View>
        <View style={styles.subGrid}>
          {subscriptions.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center', width: '100%' }}>
              <Text style={{ color: '#94A3B8', fontSize: 14 }}>No subscriptions yet.</Text>
            </View>
          ) : (
            subscriptions.map((sub) => (
              <TouchableOpacity key={sub.id} style={styles.subCard}>
                <LinearGradient
                  colors={['#2563EB', '#0F172A']}
                  style={styles.subGradient}
                >
                  <Ionicons name="radio" size={28} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.subTitle} numberOfLines={1}>{sub.title}</Text>
                <Text style={styles.subAuthor} numberOfLines={1}>{sub.author || 'Unknown'}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
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
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sortBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
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
  subCount: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  releaseRow: {
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
  releaseArt: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(56,189,248,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  releaseInfo: {
    flex: 1,
  },
  releaseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 3,
  },
  releaseMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  releaseDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  subGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  subCard: {
    width: 150,
  },
  subGradient: {
    width: 150,
    height: 150,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  subAuthor: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  subMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subBadge: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  subBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#38BDF8',
  },
  subEpisodes: {
    fontSize: 11,
    color: '#94A3B8',
  },
});
