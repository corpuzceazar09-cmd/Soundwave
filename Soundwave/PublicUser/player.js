/**
 * SoundWave Global Audio Player
 * Works across home.html, podcast.html, browse.html, etc.
 * Provides Spotify-like controls: play/pause, seek, skip ±30s, prev/next, volume, speed.
 */

(function () {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  var audio = new Audio();
  audio.preload = 'metadata';

  var state = {
    episode: null,      // { id, title, audioUrl, podcastTitle, podcastId }
    playlist: [],       // array of episode objects for the current context
    playlistIdx: -1,    // index into playlist
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    volume: 1,
    speed: 1,
    isMuted: false,
  };

  // ── DOM helpers ────────────────────────────────────────────────────────────
  function $(id) { return document.getElementById(id); }

  // ── Time formatter ─────────────────────────────────────────────────────────
  function fmt(sec) {
    if (!isFinite(sec) || isNaN(sec)) return '0:00';
    sec = Math.floor(sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  window.SWPlayer = {

    /**
     * Load and play a single episode.
     * @param {object} ep  { id, title, audioUrl, podcastTitle, podcastId }
     * @param {array}  list  Optional playlist of episode objects (same shape)
     * @param {number} idx   Index of ep in list
     */
    play: function (ep, list, idx) {
      if (!ep || !ep.audioUrl) {
        showError('No audio available for this episode.');
        return;
      }

      state.episode = ep;
      state.playlist = list || [];
      state.playlistIdx = (idx !== undefined) ? idx : -1;

      audio.src = ep.audioUrl;
      audio.load();
      audio.play().then(function () {
        state.isPlaying = true;
        syncUI();
        updateNowPlaying(ep);
        logActivity(ep);
      }).catch(function (err) {
        console.warn('[SWPlayer] play() error:', err);
        showError('Could not play audio. The stream may be unavailable.');
      });
    },

    pause: function () {
      audio.pause();
      state.isPlaying = false;
      syncPlayBtn();
    },

    resume: function () {
      audio.play().then(function () {
        state.isPlaying = true;
        syncPlayBtn();
      });
    },

    togglePlay: function () {
      if (state.isPlaying) SWPlayer.pause();
      else SWPlayer.resume();
    },

    skipBack: function (sec) {
      audio.currentTime = Math.max(0, audio.currentTime - (sec || 15));
    },

    skipForward: function (sec) {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (sec || 30));
    },

    prev: function () {
      if (state.playlistIdx > 0) {
        state.playlistIdx--;
        SWPlayer.play(state.playlist[state.playlistIdx], state.playlist, state.playlistIdx);
      }
    },

    next: function () {
      if (state.playlistIdx < state.playlist.length - 1) {
        state.playlistIdx++;
        SWPlayer.play(state.playlist[state.playlistIdx], state.playlist, state.playlistIdx);
      }
    },

    setVolume: function (v) {
      state.volume = v;
      audio.volume = v;
      state.isMuted = (v === 0);
      syncVolumeUI();
    },

    toggleMute: function () {
      if (state.isMuted) {
        audio.volume = state.volume || 0.8;
        state.isMuted = false;
      } else {
        audio.volume = 0;
        state.isMuted = true;
      }
      syncVolumeUI();
    },

    setSpeed: function (s) {
      state.speed = s;
      audio.playbackRate = s;
      var btn = $('playerSpeedBtn');
      if (btn) btn.textContent = s + 'x';
    },

    seek: function (ratio) {
      if (audio.duration) {
        audio.currentTime = ratio * audio.duration;
      }
    },

    getState: function () { return state; },
  };

  // ── Audio event listeners ──────────────────────────────────────────────────
  audio.addEventListener('timeupdate', function () {
    state.currentTime = audio.currentTime;
    state.duration = audio.duration || 0;
    syncProgress();
  });

  audio.addEventListener('loadedmetadata', function () {
    state.duration = audio.duration;
    syncProgress();
  });

  audio.addEventListener('ended', function () {
    state.isPlaying = false;
    syncPlayBtn();
    SWPlayer.next(); // auto-advance
  });

  audio.addEventListener('play', function () {
    state.isPlaying = true;
    syncPlayBtn();
  });

  audio.addEventListener('pause', function () {
    state.isPlaying = false;
    syncPlayBtn();
  });

  audio.addEventListener('error', function () {
    console.error('[SWPlayer] Audio error', audio.error);
    showError('Audio stream error. Please try another episode.');
    state.isPlaying = false;
    syncPlayBtn();
  });

  // ── UI sync helpers ────────────────────────────────────────────────────────
  function syncUI() {
    syncPlayBtn();
    syncProgress();
    syncVolumeUI();
  }

  function syncPlayBtn() {
    var btn = $('playerPlayBtn');
    if (!btn) return;
    btn.innerHTML = state.isPlaying
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>';
    // also update any in-page play buttons
    document.querySelectorAll('.episode-play[data-episode-id="' + (state.episode && state.episode.id) + '"]').forEach(function (b) {
      b.innerHTML = state.isPlaying
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#475569"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="#475569"><polygon points="5,3 19,12 5,21"/></svg>';
    });
  }

  function syncProgress() {
    var fill = $('playerProgressFill');
    var bar = $('playerProgressBar');
    var cur = $('playerCurrentTime');
    var tot = $('playerDuration');
    var pct = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
    if (fill) fill.style.width = pct + '%';
    if (cur) cur.textContent = fmt(state.currentTime);
    if (tot) tot.textContent = fmt(state.duration);
  }

  function syncVolumeUI() {
    var fill = $('playerVolumeFill');
    var icon = $('playerVolumeIcon');
    var vol = state.isMuted ? 0 : audio.volume;
    if (fill) fill.style.width = (vol * 100) + '%';
    if (icon) {
      icon.innerHTML = vol === 0
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
        : vol < 0.5
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
    }
  }

  function updateNowPlaying(ep) {
    var title = $('playerTrackTitle');
    var author = $('playerTrackAuthor');
    if (title) title.textContent = ep.title || 'Unknown Episode';
    if (author) author.textContent = ep.podcastTitle || '';
    // Highlight the active episode row
    document.querySelectorAll('.episode-row').forEach(function (row) {
      row.classList.remove('playing');
    });
    var activeRow = document.querySelector('.episode-row[data-episode-id="' + ep.id + '"]');
    if (activeRow) activeRow.classList.add('playing');
  }

  function showError(msg) {
    var bar = document.querySelector('.player-bar');
    if (!bar) return;
    var old = bar.querySelector('.player-error');
    if (old) old.remove();
    var el = document.createElement('div');
    el.className = 'player-error';
    el.style.cssText = 'position:absolute;top:-36px;left:50%;transform:translateX(-50%);background:#EF4444;color:#fff;padding:6px 18px;border-radius:8px;font-size:13px;font-weight:600;white-space:nowrap;';
    el.textContent = msg;
    bar.style.position = 'fixed';
    bar.appendChild(el);
    setTimeout(function () { el.remove(); }, 4000);
  }

  function logActivity(ep) {
    if (typeof PUBLIC_API === 'undefined') return;
    PUBLIC_API.post('/api/activity', {
      episode_id: ep.id,
      podcast_id: ep.podcastId,
      episode_title: ep.title,
      podcast_title: ep.podcastTitle,
      audio_url: ep.audioUrl,
      duration: ep.duration,
      action: 'played',
    }).catch(function () {});
  }

  // ── Wire player bar controls after DOM is ready ────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    // Play/Pause
    var playBtn = $('playerPlayBtn');
    if (playBtn) playBtn.addEventListener('click', function () { SWPlayer.togglePlay(); });

    // Skip back 15s
    var skipBackBtn = $('playerSkipBack');
    if (skipBackBtn) skipBackBtn.addEventListener('click', function () { SWPlayer.skipBack(15); });

    // Skip forward 30s
    var skipFwdBtn = $('playerSkipForward');
    if (skipFwdBtn) skipFwdBtn.addEventListener('click', function () { SWPlayer.skipForward(30); });

    // Previous episode
    var prevBtn = $('playerPrev');
    if (prevBtn) prevBtn.addEventListener('click', function () { SWPlayer.prev(); });

    // Next episode
    var nextBtn = $('playerNext');
    if (nextBtn) nextBtn.addEventListener('click', function () { SWPlayer.next(); });

    // Progress bar seeking (click & drag)
    var progressBar = $('playerProgressBar');
    if (progressBar) {
      var seeking = false;

      function seekFromEvent(e) {
        var rect = progressBar.getBoundingClientRect();
        var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        SWPlayer.seek(ratio);
      }

      progressBar.addEventListener('mousedown', function (e) {
        seeking = true;
        seekFromEvent(e);
        e.preventDefault();
      });
      document.addEventListener('mousemove', function (e) {
        if (seeking) seekFromEvent(e);
      });
      document.addEventListener('mouseup', function () { seeking = false; });

      // Touch support
      progressBar.addEventListener('touchstart', function (e) {
        seekFromEvent(e.touches[0]);
        e.preventDefault();
      }, { passive: false });
      progressBar.addEventListener('touchmove', function (e) {
        seekFromEvent(e.touches[0]);
        e.preventDefault();
      }, { passive: false });
    }

    // Volume slider
    var volSlider = $('playerVolumeSlider');
    if (volSlider) {
      var volSeeking = false;
      function setVolFromEvent(e) {
        var rect = volSlider.getBoundingClientRect();
        var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        SWPlayer.setVolume(ratio);
      }
      volSlider.addEventListener('mousedown', function (e) { volSeeking = true; setVolFromEvent(e); e.preventDefault(); });
      document.addEventListener('mousemove', function (e) { if (volSeeking) setVolFromEvent(e); });
      document.addEventListener('mouseup', function () { volSeeking = false; });
    }

    // Volume icon (mute toggle)
    var volIcon = $('playerVolumeIcon');
    if (volIcon) volIcon.addEventListener('click', function () { SWPlayer.toggleMute(); });

    // Speed button
    var speedBtn = $('playerSpeedBtn');
    if (speedBtn) {
      var speeds = [0.75, 1, 1.25, 1.5, 2];
      var speedIdx = 1; // default 1x
      speedBtn.addEventListener('click', function () {
        speedIdx = (speedIdx + 1) % speeds.length;
        SWPlayer.setSpeed(speeds[speedIdx]);
      });
    }

    // Init UI at idle state
    syncUI();
  });

})();
