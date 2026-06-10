import { db } from './firebase';
import {
  doc, setDoc, getDoc, getDocs, deleteDoc, collection, query, where,
  orderBy, limit, Timestamp,
} from 'firebase/firestore';

// --- User Profile ---
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

// --- Listening History ---
export async function savePlayProgress(
  uid: string,
  episodeId: string,
  podcastId: string,
  listenedSeconds: number,
  duration: number
) {
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
  const q = query(
    collection(db, 'users', uid, 'history'),
    orderBy('last_listened', 'desc'),
    limit(maxItems)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

export async function getPlayProgress(uid: string, episodeId: string) {
  const snap = await getDoc(doc(db, 'users', uid, 'history', episodeId));
  return snap.exists() ? snap.data() : null;
}

// --- Favorites ---
export async function toggleFavorite(uid: string, podcastId: string, isFavorite: boolean) {
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
  const q = query(collection(db, 'users', uid, 'favorites'), orderBy('added_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().podcast_id as string);
}

export async function isFavorite(uid: string, podcastId: string) {
  const snap = await getDoc(doc(db, 'users', uid, 'favorites', podcastId));
  return snap.exists();
}

// --- Subscriptions ---
export async function toggleSubscription(uid: string, podcastId: string, isSubscribing: boolean) {
  if (isSubscribing) {
    await setDoc(doc(db, 'users', uid, 'subscriptions', podcastId), {
      podcast_id: podcastId,
      subscribed_at: Timestamp.now(),
    });
  } else {
    await deleteDoc(doc(db, 'users', uid, 'subscriptions', podcastId));
  }
}

export async function getSubscriptions(uid: string) {
  const q = query(collection(db, 'users', uid, 'subscriptions'), orderBy('subscribed_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data().podcast_id as string);
}

export async function isSubscribed(uid: string, podcastId: string) {
  const snap = await getDoc(doc(db, 'users', uid, 'subscriptions', podcastId));
  return snap.exists();
}
