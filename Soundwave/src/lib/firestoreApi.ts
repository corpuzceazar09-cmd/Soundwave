import { db } from './firebase';
import {
  doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where,
  orderBy, limit, Timestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUBSCRIPTIONS_KEY = 'soundwave_subscriptions';
const RATINGS_KEY = 'soundwave_ratings';
const LOCAL_USER_KEY = 'soundwave_local_user_id';

// ---------------------------------------------------------------------------
// Local (AsyncStorage) helpers for mock-mode persistence
// ---------------------------------------------------------------------------

async function getLocalUserId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(LOCAL_USER_KEY);
    if (!id) {
      id = 'local_' + Math.random().toString(36).substring(2, 15);
      await AsyncStorage.setItem(LOCAL_USER_KEY, id);
    }
    return id;
  } catch {
    return 'local_default';
  }
}

async function getLocalSubscriptions(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setLocalSubscriptions(ids: string[]) {
  await AsyncStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(ids));
}

async function getLocalRatings(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(RATINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function setLocalRatings(ratings: Record<string, number>) {
  await AsyncStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
}

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

export async function createUserProfile(
  uid: string,
  { displayName, email }: { displayName?: string; email: string }
) {
  await setDoc(doc(db, 'users', uid), {
    display_name: displayName || email.split('@')[0] || 'User',
    email,
    created_at: Timestamp.now(),
    avatar_url: '',
  });
}

export async function getUserProfile(uid: string) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid: string, updates: Record<string, any>) {
  await setDoc(doc(db, 'users', uid), updates, { merge: true });
}

// ---------------------------------------------------------------------------
// Listening History
// ---------------------------------------------------------------------------

export async function savePlayProgress(
  uid: string,
  episodeId: string,
  podcastId: string,
  listenedSeconds: number,
  duration: number
) {
  if (!uid) return;
  await setDoc(
    doc(db, 'users', uid, 'history', episodeId),
    {
      episode_id: episodeId,
      podcast_id: podcastId,
      listened_seconds: listenedSeconds,
      duration,
      completed: listenedSeconds >= duration * 0.95,
      last_listened: Timestamp.now(),
    },
    { merge: true }
  );
}

export async function getListeningHistory(uid: string, maxItems = 50) {
  if (!uid) return [];
  const q = query(
    collection(db, 'users', uid, 'history'),
    orderBy('last_listened', 'desc'),
    limit(maxItems)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getPlayProgress(uid: string, episodeId: string) {
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid, 'history', episodeId));
  return snap.exists() ? snap.data() : null;
}

// ---------------------------------------------------------------------------
// Favorites (Firestore only)
// ---------------------------------------------------------------------------

export async function toggleFavorite(uid: string, podcastId: string, isFavorite: boolean) {
  if (!uid) return;
  if (isFavorite) {
    await setDoc(doc(db, 'users', uid, 'favorites', podcastId), {
      podcast_id: podcastId,
      added_at: Timestamp.now(),
    });
  } else {
    await deleteDoc(doc(db, 'users', uid, 'favorites', podcastId));
  }
}

export async function getFavorites(uid: string) {
  if (!uid) return [];
  const q = query(collection(db, 'users', uid, 'favorites'), orderBy('added_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().podcast_id as string);
}

export async function isFavorite(uid: string, podcastId: string) {
  if (!uid) return false;
  const snap = await getDoc(doc(db, 'users', uid, 'favorites', podcastId));
  return snap.exists();
}

// ---------------------------------------------------------------------------
// Subscriptions (dual persistence: Firestore + AsyncStorage fallback)
// ---------------------------------------------------------------------------

export async function toggleSubscription(uid: string, podcastId: string, isSubscribing: boolean) {
  if (uid) {
    // Real Firebase user — save to Firestore
    if (isSubscribing) {
      await setDoc(doc(db, 'users', uid, 'subscriptions', podcastId), {
        podcast_id: podcastId,
        subscribed_at: Timestamp.now(),
      });
    } else {
      await deleteDoc(doc(db, 'users', uid, 'subscriptions', podcastId));
    }
  }

  // Always save locally too (works in mock mode and as backup)
  const ids = await getLocalSubscriptions();
  const updated = isSubscribing
    ? (ids.includes(podcastId) ? ids : [...ids, podcastId])
    : ids.filter(id => id !== podcastId);
  await setLocalSubscriptions(updated);
}

export async function getSubscriptions(uid: string): Promise<string[]> {
  if (uid) {
    try {
      const q = query(collection(db, 'users', uid, 'subscriptions'), orderBy('subscribed_at', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data().podcast_id as string);
    } catch {
      // Firestore failed — fall back to local
      return getLocalSubscriptions();
    }
  }
  return getLocalSubscriptions();
}

export async function isSubscribed(uid: string, podcastId: string): Promise<boolean> {
  if (uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'subscriptions', podcastId));
      return snap.exists();
    } catch {
      // fallback
    }
  }
  const ids = await getLocalSubscriptions();
  return ids.includes(podcastId);
}

// ---------------------------------------------------------------------------
// Ratings (dual persistence: Firestore + AsyncStorage fallback)
// ---------------------------------------------------------------------------

export async function toggleRating(uid: string, podcastId: string, rating: number) {
  if (rating < 1 || rating > 5) rating = 0;

  if (uid) {
    if (rating > 0) {
      await setDoc(doc(db, 'users', uid, 'ratings', podcastId), {
        podcast_id: podcastId,
        rating,
        rated_at: Timestamp.now(),
      });
    } else {
      await deleteDoc(doc(db, 'users', uid, 'ratings', podcastId));
    }
  }

  // Always save locally
  const ratings = await getLocalRatings();
  if (rating > 0) {
    ratings[podcastId] = rating;
  } else {
    delete ratings[podcastId];
  }
  await setLocalRatings(ratings);
}

export async function getRating(uid: string, podcastId: string): Promise<number | null> {
  if (uid) {
    try {
      const snap = await getDoc(doc(db, 'users', uid, 'ratings', podcastId));
      if (snap.exists()) return snap.data().rating as number;
    } catch {
      // fallback
    }
  }
  const ratings = await getLocalRatings();
  return ratings[podcastId] ?? null;
}
