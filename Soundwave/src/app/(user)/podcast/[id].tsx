import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/firebase';
import { savePlayProgress, getPlayProgress, isSubscribed, toggleSubscription, toggleRating, getRating } from '@/lib/firestoreApi';

type Podcast = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  image_url: string | null;
};

type Episode = {
  id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration: number | null;
  episode_number: number | null;
  season_number: number | null;
  transcript_text: string | null;
  image_url: string | null;
  published_at: string | null;
};

export default function PodcastDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [subscribed, setSubscribed] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const positionRef = useRef(0);
  const currentEpisodeRef = useRef<Episode | null>(null);
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync currentEpisode ref to avoid stale closure in interval
  useEffect(() => {
    currentEpisodeRef.current = currentEpisode;
  }, [currentEpisode]);

  useEffect(() => {
    loadPodcast();
    return () => {
      if (sound) sound.unloadAsync();
      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
    };
  }, [id]);

  async function loadPodcast() {
    try {
      const [podcastRes, episodesRes] = await Promise.all([
        supabase.from('podcasts').select('*').eq('id', id).single(),
        supabase.from('episodes')
          .select('*')
          .eq('podcast_id', id)
          .eq('status', 'published')
          .order('published_at', { ascending: false }),
      ]);
      setPodcast(podcastRes.data);
      setEpisodes(episodesRes.data || []);

      const user = auth.currentUser;
      const userId = user?.uid || '';
      const [sub, rating] = await Promise.all([
        isSubscribed(userId, id),
        getRating(userId, id),
      ]);
      setSubscribed(sub);
      if (rating) setUserRating(rating);
    } catch (err) {
      console.error('Podcast load error:', err);
      setLoadError(true);
    }
  }

  async function playEpisode(episode: Episode) {
    try {
      if (sound) await sound.unloadAsync();
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: episode.audio_url },
        { shouldPlay: true }
      );
      setSound(newSound);
      setCurrentEpisode(episode);
      setIsPlaying(true);

      const user = auth.currentUser;
      if (user) {
        const progress = await getPlayProgress(user.uid, episode.id);
        if (progress && !progress.completed) {
          await newSound.setPositionAsync(progress.listened_seconds * 1000);
        }
      }

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPosition(status.positionMillis / 1000);
          setDuration(status.durationMillis / 1000);
          positionRef.current = status.positionMillis / 1000;
        }
      });

      if (saveIntervalRef.current) clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = setInterval(() => {
        const ep = currentEpisodeRef.current;
        if (user && ep) {
          savePlayProgress(user.uid, ep.id, id, positionRef.current, duration);
        }
      }, 30000);
    } catch (err) {
      console.error('Play error:', err);
    }
  }

  function togglePlayPause() {
    if (sound) {
      if (isPlaying) {
        sound.pauseAsync();
        const user = auth.currentUser;
        if (user && currentEpisode) {
          savePlayProgress(user.uid, currentEpisode.id, id, positionRef.current, duration);
        }
      } else {
        sound.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  }

  function formatTime(seconds: number) {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function handleRate(rating: number) {
    const user = auth.currentUser;
    const newRating = userRating === rating ? 0 : rating;
    try {
      await toggleRating(user?.uid || '', id, newRating);
      setUserRating(newRating);
    } catch {
      console.warn('Failed to save rating');
    }
  }

  if (!podcast && loadError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Podcast not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          {!podcast ? (
            <>
              <View style={[styles.coverPlaceholder, { backgroundColor: '#1E293B' }]} />
              <View style={[styles.skeletonBlock, { width: '60%', height: 24, marginTop: 8 }]} />
              <View style={[styles.skeletonBlock, { width: '40%', height: 16, marginTop: 4 }]} />
            </>
          ) : (
            <>
              {podcast.image_url ? (
                <Image source={{ uri: podcast.image_url }} style={styles.coverImage} />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Text style={styles.coverPlaceholderText}>
                    {podcast.title.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.podcastTitle}>{podcast.title}</Text>
              <Text style={styles.podcastAuthor}>{podcast.author || 'Unknown'}</Text>
              {podcast.description && (
                <Text style={styles.description} numberOfLines={3}>{podcast.description}</Text>
              )}
              <TouchableOpacity
                style={[styles.subscribeBtn, subscribed && styles.subscribedBtn]}
                onPress={async () => {
                  const user = auth.currentUser;
                  try {
                    await toggleSubscription(user?.uid || '', id, !subscribed);
                    setSubscribed(!subscribed);
                  } catch {
                    console.warn('Failed to toggle subscription');
                  }
                }}
              >
                <Text style={[styles.subscribeBtnText, subscribed && styles.subscribedBtnText]}>
                  {subscribed ? 'Subscribed' : 'Subscribe'}
                </Text>
              </TouchableOpacity>

              {/* Rating Section */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingLabel}>Rate this podcast</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => handleRate(star)}>
                      <Text style={[styles.star, star <= userRating && styles.starActive]}>
                        {'\u2605'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Episodes</Text>
        {!podcast ? (
          <Text style={styles.emptyText}>Loading episodes...</Text>
        ) : episodes.length === 0 ? (
          <Text style={styles.emptyText}>No episodes yet.</Text>
        ) : (
          episodes.map((ep) => (
            <TouchableOpacity
              key={ep.id}
              style={[styles.episodeCard, currentEpisode?.id === ep.id && styles.activeEpisode]}
              onPress={() => playEpisode(ep)}
            >
              <View style={styles.episodeInfo}>
                <Text style={styles.episodeTitle} numberOfLines={1}>{ep.title}</Text>
                <Text style={styles.episodeMeta}>
                  {ep.duration ? formatTime(ep.duration) : '--'} · {new Date(ep.published_at || Date.now()).toLocaleDateString()}
                </Text>
                {ep.description && (
                  <Text style={styles.episodeDesc} numberOfLines={2}>{ep.description}</Text>
                )}
              </View>
              <View style={styles.playButton}>
                <Text style={styles.playButtonText}>
                  {isPlaying && currentEpisode?.id === ep.id ? '⏸' : '▶️'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {currentEpisode?.transcript_text && (
          <View style={styles.transcriptSection}>
            <Text style={styles.sectionTitle}>Transcript</Text>
            <Text style={styles.transcriptText}>{currentEpisode.transcript_text}</Text>
          </View>
        )}

        {currentEpisode?.image_url && (
          <View>
            <Text style={styles.sectionTitle}>Images</Text>
            <Image source={{ uri: currentEpisode.image_url }} style={styles.episodeImage} />
          </View>
        )}
      </ScrollView>

      {currentEpisode && (
        <View style={styles.playerBar}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: duration > 0 ? `${(position / duration) * 100}%` : '0%' }]} />
          </View>
          <View style={styles.playerControls}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <TouchableOpacity onPress={togglePlayPause} style={styles.playPauseBtn}>
              <Text style={styles.playPauseIcon}>{isPlaying ? '⏸' : '▶️'}</Text>
            </TouchableOpacity>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
          <Text style={styles.nowPlaying} numberOfLines={1}>{currentEpisode.title}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 24, gap: 24, paddingBottom: 140 },
  errorText: { fontSize: 18, color: '#94A3B8', marginBottom: 12 },
  backText: { fontSize: 14, color: '#38BDF8', fontWeight: '600' },
  header: { alignItems: 'center', gap: 12 },
  coverImage: { width: 200, height: 200, borderRadius: 16 },
  coverPlaceholder: {
    width: 200, height: 200, borderRadius: 16, backgroundColor: '#1E293B',
    justifyContent: 'center', alignItems: 'center',
  },
  coverPlaceholderText: { fontSize: 64, fontWeight: '700', color: '#38BDF8' },
  podcastTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  podcastAuthor: { fontSize: 16, color: '#94A3B8' },
  description: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  subscribeBtn: {
    backgroundColor: '#38BDF8', paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 8, marginTop: 8,
  },
  subscribedBtn: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#38BDF8' },
  subscribeBtnText: { color: '#0F172A', fontWeight: '700', fontSize: 14 },
  subscribedBtnText: { color: '#38BDF8' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  episodeCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B',
    padding: 16, borderRadius: 12, gap: 12,
  },
  activeEpisode: { borderWidth: 1, borderColor: '#38BDF8' },
  episodeInfo: { flex: 1 },
  episodeTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  episodeMeta: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  episodeDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 18 },
  playButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#38BDF8',
    justifyContent: 'center', alignItems: 'center',
  },
  playButtonText: { fontSize: 16 },
  transcriptSection: { gap: 12 },
  transcriptText: { fontSize: 14, color: '#94A3B8', lineHeight: 22 },
  episodeImage: { width: '100%', height: 200, borderRadius: 12, marginTop: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingVertical: 40 },
  playerBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1E293B', borderTopWidth: 1, borderTopColor: '#334155',
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24,
  },
  progressTrack: {
    height: 4, backgroundColor: '#334155', borderRadius: 2, marginBottom: 12,
  },
  progressFill: {
    height: 4, backgroundColor: '#38BDF8', borderRadius: 2,
  },
  playerControls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24,
  },
  timeText: { fontSize: 12, color: '#64748B', minWidth: 40, textAlign: 'center' },
  playPauseBtn: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#38BDF8',
    justifyContent: 'center', alignItems: 'center',
  },
  playPauseIcon: { fontSize: 20 },
  nowPlaying: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 8 },
  ratingSection: { alignItems: 'center', gap: 8, marginTop: 16 },
  ratingLabel: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  starsRow: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 32, color: '#334155' },
  starActive: { color: '#FBBF24' },
  skeletonBlock: { backgroundColor: '#1E293B', borderRadius: 6, alignSelf: 'center' },
});
