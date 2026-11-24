import React, { useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  SkipForward,
  SkipBack,
  ListMusic,
  X,
} from 'lucide-react';

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          height?: string;
          width?: string;
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
            onError?: () => void;
          };
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (vol: number) => void;
  getPlayerState: () => number;
  destroy: () => void;
}

interface HomeVocalTrack {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
}

const HOME_VOCAL_PLAYLIST: HomeVocalTrack[] = [
  {
    id: 'baan_kong_huajai_nadia',
    title: 'บ้านของหัวใจ (Cover Version)',
    artist: 'นาเดีย · OST. Fast & Feel Love',
    youtubeId: 'Une0ZsFkxN0',
  },
  {
    id: 'home_thee_chaiyadej',
    title: 'Home (ใจของเธอคือบ้านของฉัน)',
    artist: 'ธีร์ ไชยเดช · บอย โกสิยพงษ์',
    youtubeId: 'Dx5s3OWvaAU',
  },
  {
    id: 'baan_kong_huajai_superbaker',
    title: 'บ้านของหัวใจ',
    artist: 'SUPERBAKER',
    youtubeId: 'R2nd53ctUQI',
  },
  {
    id: 'baan_kong_chan_tattoo',
    title: 'บ้านของฉัน',
    artist: 'TATTOO COLOUR',
    youtubeId: 'TGhsdO--pyE',
  },
  {
    id: 'wiman_din_nantida',
    title: 'วิมานดิน',
    artist: 'นันทิดา แก้วบัวสาย',
    youtubeId: 'eRLWxm2RWAo',
  },
  {
    id: 'baan_kong_rao_bird',
    title: 'บ้านของเรา',
    artist: 'ธงไชย แมคอินไตย์',
    youtubeId: 'C3sbVCdTumo',
  },
  {
    id: 'klab_baan_lomosonic',
    title: 'เพลงกลับบ้าน (Lullaby)',
    artist: 'LOMOSONIC X ป๊อด ธนชัย',
    youtubeId: 'jiQ1bqIHhqo',
  },
  {
    id: 'klab_baan_dgerrard',
    title: 'กลับบ้าน (Home)',
    artist: 'D GERRARD feat. KOB FLATBOY',
    youtubeId: 'jpByEkNllDU',
  },
  {
    id: 'kho_phiang_thi_phak_jai',
    title: 'ขอเพียงที่พักใจ',
    artist: 'มาลีวัลย์ เจมีน่า',
    youtubeId: 'GpWXxXTaWU4',
  },
  {
    id: 'home_michael_buble',
    title: 'Home',
    artist: 'Michael Bublé',
    youtubeId: 'uNntETX0EPs',
  },
];

export const BackgroundMusicBar: React.FC = () => {
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(55);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [ytReady, setYtReady] = useState(false);

  const trackIndexRef = useRef(0);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);
  const consecutiveErrorsRef = useRef(0);
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);

  volumeRef.current = volume;
  isMutedRef.current = isMuted;

  const currentTrack = HOME_VOCAL_PLAYLIST[trackIndex] || HOME_VOCAL_PLAYLIST[0];

  const playTrackByIndex = (idx: number, userTriggered = false) => {
    const safeIdx =
      ((idx % HOME_VOCAL_PLAYLIST.length) + HOME_VOCAL_PLAYLIST.length) %
      HOME_VOCAL_PLAYLIST.length;
    trackIndexRef.current = safeIdx;
    setTrackIndex(safeIdx);

    const player = ytPlayerRef.current;
    if (!player) return;

    const next = HOME_VOCAL_PLAYLIST[safeIdx];
    try {
      player.loadVideoById(next.youtubeId);
      if (isMutedRef.current && !userTriggered) {
        player.mute();
      } else {
        player.unMute();
        player.setVolume(volumeRef.current);
      }
      player.playVideo();
      if (userTriggered) {
        setIsMuted(false);
        setNeedsGesture(false);
      }
    } catch {
      // ignore transient iframe readiness issues
    }
  };

  useEffect(() => {
    let destroyed = false;
    let autoplayCheckTimer: number | null = null;

    const initYt = () => {
      if (destroyed || !ytContainerRef.current || !window.YT?.Player || ytPlayerRef.current) return;

      ytPlayerRef.current = new window.YT.Player(ytContainerRef.current, {
        height: '1',
        width: '1',
        videoId: HOME_VOCAL_PLAYLIST[0].youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (e) => {
            if (destroyed) return;
            setYtReady(true);
            try {
              e.target.unMute();
              e.target.setVolume(volumeRef.current);
              e.target.playVideo();
            } catch {
              setNeedsGesture(true);
            }

            // Check shortly if browser autoplay policy blocked unmuted playback
            autoplayCheckTimer = window.setTimeout(() => {
              if (destroyed || !ytPlayerRef.current) return;
              try {
                const state = ytPlayerRef.current.getPlayerState();
                // 1 = PLAYING, 3 = BUFFERING
                if (state !== 1 && state !== 3) {
                  setNeedsGesture(true);
                }
              } catch {
                setNeedsGesture(true);
              }
            }, 1200);
          },
          onStateChange: (e) => {
            if (destroyed) return;
            if (e.data === 1) {
              consecutiveErrorsRef.current = 0;
              setIsPlaying(true);
              setNeedsGesture(false);
            } else if (e.data === 2) {
              setIsPlaying(false);
            } else if (e.data === 0) {
              // Song finished -> automatically advance to the next home song
              playTrackByIndex(trackIndexRef.current + 1);
            }
          },
          onError: () => {
            if (destroyed) return;
            consecutiveErrorsRef.current += 1;
            if (consecutiveErrorsRef.current < HOME_VOCAL_PLAYLIST.length) {
              playTrackByIndex(trackIndexRef.current + 1);
            } else {
              setIsPlaying(false);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initYt();
    } else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.async = true;
        document.body.appendChild(tag);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        initYt();
      };
    }

    return () => {
      destroyed = true;
      if (autoplayCheckTimer) {
        window.clearTimeout(autoplayCheckTimer);
      }
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch {
          // ignore
        }
        ytPlayerRef.current = null;
      }
    };
  }, []);

  // Unlock autoplay immediately on first pointer/keyboard interaction if browser blocked initial sound
  useEffect(() => {
    if (!needsGesture || !ytReady) return;

    const unlock = () => {
      const player = ytPlayerRef.current;
      if (!player) return;
      try {
        player.unMute();
        player.setVolume(volumeRef.current);
        player.playVideo();
        setIsMuted(false);
        setNeedsGesture(false);
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [needsGesture, ytReady]);

  // Sync volume & mute to YouTube Player
  useEffect(() => {
    if (!ytPlayerRef.current || !ytReady) return;
    try {
      if (isMuted) {
        ytPlayerRef.current.mute();
      } else {
        ytPlayerRef.current.unMute();
        ytPlayerRef.current.setVolume(volume);
      }
    } catch {
      // ignore
    }
  }, [volume, isMuted, ytReady]);

  const handleTogglePlay = () => {
    const player = ytPlayerRef.current;
    if (!player || !ytReady) return;

    if (isPlaying) {
      player.pauseVideo();
      setIsPlaying(false);
    } else {
      player.unMute();
      player.setVolume(volume);
      player.playVideo();
      setIsMuted(false);
      setIsPlaying(true);
      setNeedsGesture(false);
    }
  };

  return (
    <>
      <div
        className="fixed -bottom-24 -left-24 w-1 h-1 opacity-0 pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        <div ref={ytContainerRef} />
      </div>

      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
        {showPlaylist && (
          <div className="w-72 sm:w-80 bg-[#111315]/96 text-white border border-[#2C3036] rounded-xl p-3 shadow-2xl backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-[#25282D]">
              <div>
                <p className="text-[11px] font-medium text-[#C9A875]">
                  เพลย์ลิสต์เพลงเกี่ยวกับบ้าน ({HOME_VOCAL_PLAYLIST.length} เพลง)
                </p>
                <p className="text-xs text-[#D6D3D1]">เล่นอัตโนมัติต่อเนื่องทุกบทเพลง</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlaylist(false)}
                aria-label="ปิดรายการเพลง"
                className="p-1 text-[#A8A29E] hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 pr-0.5">
              {HOME_VOCAL_PLAYLIST.map((item, idx) => {
                const active = idx === trackIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => playTrackByIndex(idx, true)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex items-center justify-between gap-2 ${
                      active
                        ? 'bg-[#9A7B4F]/25 border border-[#C9A875]/60 text-white'
                        : 'hover:bg-white/5 text-[#D6D3D1]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">
                        {String(idx + 1).padStart(2, '0')}. {item.title}
                      </p>
                      <p className="text-[10px] text-[#A8A29E] truncate">{item.artist}</p>
                    </div>
                    {active && (
                      <span className="text-[10px] font-medium text-[#C9A875] shrink-0">
                        {isPlaying ? 'กำลังเล่น' : 'เลือกไว้'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="max-w-sm bg-[#111315]/95 text-white border border-[#2C3036] rounded-xl px-3.5 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'หยุดเพลง' : 'เล่นเพลง'}
              className="w-9 h-9 rounded-lg bg-[#9A7B4F] hover:bg-[#B08E5D] text-white flex items-center justify-center transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {isPlaying && !isMuted ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </button>

            <div className="min-w-0 flex-1 max-w-[165px]">
              <div className="flex items-center gap-1.5">
                {isPlaying && !isMuted ? (
                  <span className="inline-flex items-end gap-0.5 h-3 shrink-0" aria-hidden="true">
                    <span className="w-0.5 h-3 bg-[#C9A875] animate-eq-1" />
                    <span className="w-0.5 h-3 bg-[#C9A875] animate-eq-2" />
                    <span className="w-0.5 h-3 bg-[#C9A875] animate-eq-3" />
                  </span>
                ) : (
                  <Music className="w-3 h-3 text-[#C9A875] shrink-0" />
                )}
                <p className="text-xs font-medium text-white truncate">{currentTrack.title}</p>
              </div>
              <p className="text-[11px] text-[#A8A29E] truncate">
                {needsGesture
                  ? 'แตะหน้าจอหรือกดเล่นเพื่อเปิดเสียง'
                  : `${trackIndex + 1}/${HOME_VOCAL_PLAYLIST.length} · ${currentTrack.artist}`}
              </p>
            </div>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => playTrackByIndex(trackIndex - 1, true)}
                title="เพลงก่อนหน้า"
                aria-label="เพลงก่อนหน้า"
                className="p-1.5 text-[#D6D3D1] hover:text-white transition-colors rounded"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => playTrackByIndex(trackIndex + 1, true)}
                title="เพลงถัดไป"
                aria-label="เพลงถัดไป"
                className="p-1.5 text-[#C9A875] hover:text-white transition-colors rounded"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowPlaylist((v) => !v)}
                title={`เลือกจากเพลย์ลิสต์ ${HOME_VOCAL_PLAYLIST.length} เพลง`}
                aria-label="เปิดเพลย์ลิสต์"
                className={`p-1.5 transition-colors rounded ${
                  showPlaylist ? 'text-[#C9A875]' : 'text-[#D6D3D1] hover:text-white'
                }`}
              >
                <ListMusic className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                aria-label={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
                className="hidden sm:inline-flex p-1.5 text-[#D6D3D1] hover:text-white transition-colors rounded"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  if (isMuted) setIsMuted(false);
                }}
                aria-label="ระดับเสียงเพลง"
                className="hidden sm:block w-12 accent-[#C9A875] cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
