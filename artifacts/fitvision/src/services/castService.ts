/**
 * Wireless TV Casting & Screen Sharing Service
 * Supports:
 * 1. HTMLMediaElement Remote Playback API (Chromecast / Google Cast without login)
 * 2. Apple AirPlay (webkitShowPlaybackTargetPicker)
 * 3. Web Screen Capture (getDisplayMedia for 1-tap TV tab/screen mirroring)
 * 4. Fullscreen API (for Smart TV browsers)
 */

export interface CastCapabilities {
  supportsAirPlay: boolean;
  supportsRemotePlayback: boolean;
  supportsScreenShare: boolean;
  supportsFullscreen: boolean;
}

export function detectCastCapabilities(videoEl?: HTMLVideoElement | null): CastCapabilities {
  if (typeof window === "undefined") {
    return {
      supportsAirPlay: false,
      supportsRemotePlayback: false,
      supportsScreenShare: false,
      supportsFullscreen: false,
    };
  }

  const v = videoEl || document.createElement("video");
  const proto = v as unknown as Record<string, unknown>;

  const supportsAirPlay = typeof proto.webkitShowPlaybackTargetPicker === "function";
  const supportsRemotePlayback = "remote" in proto && Boolean(proto.remote);
  const supportsScreenShare =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function";
  const supportsFullscreen =
    typeof document !== "undefined" &&
    Boolean(
      document.fullscreenEnabled ||
        (document as unknown as { webkitFullscreenEnabled?: boolean }).webkitFullscreenEnabled
    );

  return {
    supportsAirPlay,
    supportsRemotePlayback,
    supportsScreenShare,
    supportsFullscreen,
  };
}

/**
 * 1. Stream video directly to TV via AirPlay or Google Cast (no login needed)
 */
export async function startDirectVideoCast(videoEl: HTMLVideoElement): Promise<"connected" | "prompted" | "failed"> {
  const proto = videoEl as unknown as {
    webkitShowPlaybackTargetPicker?: () => void;
    remote?: {
      prompt: () => Promise<void>;
      state: string;
    };
  };

  // Try Chromium Remote Playback (Chromecast / Android TV / Smart TV)
  if (proto.remote && typeof proto.remote.prompt === "function") {
    try {
      await proto.remote.prompt();
      return proto.remote.state === "connected" ? "connected" : "prompted";
    } catch {
      // User cancelled or aborted picker
    }
  }

  // Try Apple AirPlay (Apple TV / AirPlay 2 Smart TVs)
  if (typeof proto.webkitShowPlaybackTargetPicker === "function") {
    try {
      proto.webkitShowPlaybackTargetPicker();
      return "prompted";
    } catch {
      // User cancelled or unsupported
    }
  }

  return "failed";
}

/**
 * 2. Share browser screen/tab directly to a TV or wireless display
 */
export async function startScreenShare(): Promise<MediaStream | null> {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.mediaDevices?.getDisplayMedia !== "function"
  ) {
    return null;
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: "browser",
      } as MediaTrackConstraints,
      audio: false,
    });
    return stream;
  } catch {
    return null;
  }
}

/**
 * 3. Toggle fullscreen for Smart TV browsers or connected displays
 */
export async function toggleFullscreen(): Promise<boolean> {
  if (typeof document === "undefined") return false;

  const doc = document as unknown as {
    fullscreenElement?: Element;
    webkitFullscreenElement?: Element;
    exitFullscreen?: () => Promise<void>;
    webkitExitFullscreen?: () => Promise<void>;
  };

  const isFs = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);

  try {
    if (isFs) {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      return false;
    } else {
      const el = document.documentElement as unknown as {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      return true;
    }
  } catch {
    return false;
  }
}
