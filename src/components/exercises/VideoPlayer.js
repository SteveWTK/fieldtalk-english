"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

const VideoPlayer = ({
  title,
  videoUrl,
  description,
  thumbnailUrl,
  isPortrait = true,
  className = "",
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
        setHasStarted(true);
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleRewind = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current) {
      const newTime = (e.target.value / 100) * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setHasStarted(false);
  };

  const getVideoContainerClass = () => {
    if (isPortrait && isMobile) {
      return "w-full max-w-sm mx-auto";
    } else if (isPortrait && !isMobile) {
      return "max-w-md mx-auto";
    }
    return "";
  };

  const getVideoClass = () => {
    if (isPortrait) {
      return "w-full h-auto max-h-[70vh] object-contain";
    }
    return "w-full aspect-video object-contain";
  };

  return (
    <div
      className={`bg-primary-panel rounded-panel p-6 ${className}`}
    >
      {title && (
        <h3 className="text-xl font-semibold text-primary-50 mb-4">
          {title}
        </h3>
      )}

      <div className={`${getVideoContainerClass()}`}>
        <div className="relative bg-black rounded-control overflow-hidden mb-4">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbnailUrl}
            className={getVideoClass()}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleVideoEnded}
            playsInline
            webkit-playsinline="true"
          />

          {!hasStarted && thumbnailUrl && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity hover:bg-black/40"
              onClick={handlePlayPause}
            >
              <div className="bg-primary-50/90 backdrop-blur-sm rounded-full p-6 transform transition-transform hover:scale-110">
                <Play
                  className="w-12 h-12 text-accent-600 ml-1"
                  fill="currentColor"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max="100"
            value={duration ? (currentTime / duration) * 100 : 0}
            onChange={handleSeek}
            className="flex-1 h-2 bg-primary-900 rounded-control appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #a3e635 0%, #a3e635 ${duration ? (currentTime / duration) * 100 : 0}%, #1e293b ${duration ? (currentTime / duration) * 100 : 0}%, #1e293b 100%)`,
            }}
          />
          <span className="text-sm text-primary-300 min-w-[80px] text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleRewind}
            className="p-3 bg-primary-800 hover:bg-primary-700 rounded-control transition-colors"
            aria-label="Rewind"
          >
            <RotateCcw className="w-5 h-5 text-accent-400" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-4 bg-accent-400 hover:bg-accent-300 text-primary-800 rounded-control transition-colors"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={handleMuteToggle}
            className="p-3 bg-primary-800 hover:bg-primary-700 rounded-control transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-accent-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-accent-400" />
            )}
          </button>
        </div>
      </div>

      {description && (
        <p className="mt-4 text-primary-100">{description}</p>
      )}
    </div>
  );
};

export default VideoPlayer;
