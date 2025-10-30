import React, { useEffect, useRef, useState } from 'react';

export const CameraBubbleOverlay: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;

    // Start camera stream
    navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
      audio: false,
    })
      .then(cameraStream => {
        if (!mounted) {
          cameraStream.getTracks().forEach(track => track.stop());
          return;
        }

        console.log('[CameraBubbleOverlay] Camera stream started');
        streamRef.current = cameraStream;
        setStream(cameraStream);

        if (videoRef.current) {
          videoRef.current.srcObject = cameraStream;
          videoRef.current.play();
        }
      })
      .catch(err => {
        console.error('[CameraBubbleOverlay] Failed to start camera:', err);
      });

    // Handle window beforeunload event
    const handleBeforeUnload = () => {
      console.log('[CameraBubbleOverlay] Window closing, cleaning up camera stream');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log('[CameraBubbleOverlay] Stopping track:', track.label);
          track.stop();
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      mounted = false;
      console.log('[CameraBubbleOverlay] Component unmounting, cleaning up');
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          console.log('[CameraBubbleOverlay] Stopping track on unmount:', track.label);
          track.stop();
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  return (
    <div
      className="w-full h-full rounded-2xl overflow-hidden border-4 border-white shadow-2xl bg-gray-900"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform scale-x-[-1]"
      />
    </div>
  );
};
