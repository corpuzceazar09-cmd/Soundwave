const EDITOR_API_URL = 'http://localhost:8080/api/editor';

async function getToken(): Promise<string> {
  const { supabase } = await import('@/lib/supabase');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
}

async function fetchAPI<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${EDITOR_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Editor API request failed (${res.status})`);
  }
  return res.json();
}

export interface EditorStats {
  totalActions: number;
  publishedThisWeek: number;
  pendingReviews: number;
  recentActions: Array<{
    _id: string;
    action: string;
    editor_name: string;
    episode_title: string;
    timestamp: string;
  }>;
}

export function getEditorStats(): Promise<EditorStats> {
  return fetchAPI('/stats');
}

export function updateEpisodeStatus(
  episodeId: string,
  status: 'published' | 'draft' | 'hidden',
  notes = ''
): Promise<{ success: boolean; status: string; previous_status: string }> {
  return fetchAPI(`/episodes/${episodeId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status, notes }),
  });
}

export function updatePodcast(
  podcastId: string,
  updates: Record<string, any>
): Promise<{ success: boolean; updated: Record<string, any> }> {
  return fetchAPI(`/podcasts/${podcastId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export function toggleFeatured(
  podcastId: string,
  featured: boolean
): Promise<{ success: boolean; featured: boolean }> {
  return fetchAPI(`/podcasts/${podcastId}/feature`, {
    method: 'POST',
    body: JSON.stringify({ featured }),
  });
}

export function publishDraft(
  draftId: string,
  notes = ''
): Promise<{ success: boolean; message: string }> {
  return fetchAPI(`/drafts/${draftId}/publish`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export function deleteDraft(
  draftId: string
): Promise<{ success: boolean }> {
  return fetchAPI(`/drafts/${draftId}`, {
    method: 'DELETE',
  });
}
