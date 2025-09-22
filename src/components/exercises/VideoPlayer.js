"use client";

import React, { useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

const VideoPlayer = ({
  title,
  videoUrl,
  description,
  className = ""
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
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
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-white dark:bg-primary-900/20 rounded-xl p-6 ${className}`}>
      {title && (
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {title}
        </h3>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden mb-4">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full aspect-video"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max="100"
            value={duration ? (currentTime / duration) * 100 : 0}
            onChange={handleSeek}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${duration ? (currentTime / duration) * 100 : 0}%, #e5e7eb ${duration ? (currentTime / duration) * 100 : 0}%, #e5e7eb 100%)`
            }}
          />
          <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[80px] text-right">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleRewind}
            className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Rewind"
          >
            <RotateCcw className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
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
            className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            ) : (
              <Volume2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>

      {description && (
        <p className="mt-4 text-gray-700 dark:text-gray-300">
          {description}
        </p>
      )}
    </div>
  );
};

export default VideoPlayer;