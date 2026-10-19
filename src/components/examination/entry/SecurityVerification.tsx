import React, { useEffect, useState } from 'react';
import { ShieldCheck, Camera, Mic, Maximize } from 'lucide-react';


interface SecurityVerificationProps {
  settings: {
    require_webcam?: boolean;
    require_mic?: boolean;
    require_fullscreen?: boolean;
  };
  onComplete: (passed: boolean) => void;
}

export const SecurityVerification: React.FC<SecurityVerificationProps> = ({ settings, onComplete }) => {
  const [webcamStatus, setWebcamStatus] = useState<'pending' | 'granted' | 'denied'>(settings.require_webcam ? 'pending' : 'granted');
  const [micStatus, setMicStatus] = useState<'pending' | 'granted' | 'denied'>(settings.require_mic ? 'pending' : 'granted');
  const [fullscreenStatus, setFullscreenStatus] = useState<'pending' | 'granted' | 'denied'>(settings.require_fullscreen ? 'pending' : 'granted');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const allPassed = webcamStatus === 'granted' && micStatus === 'granted' && fullscreenStatus === 'granted';

  useEffect(() => {
    if (allPassed) {
      // Clean up the test stream before proceeding so ExaminationView can claim it
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      onComplete(true);
    } else {
      onComplete(false);
    }
  }, [allPassed, onComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const requestWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setWebcamStatus('granted');
    } catch (e) {
      setWebcamStatus('denied');
    }
  };

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicStatus('granted');
    } catch (e) {
      setMicStatus('denied');
    }
  };

  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setFullscreenStatus('granted');
    } catch (e) {
      setFullscreenStatus('denied');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        <ShieldCheck className="text-purple-600" />
        Security Verification
      </h3>
      <p className="text-sm text-slate-500 mb-2">The test creator has enabled strict security measures. Please grant the required permissions.</p>

      <div className="space-y-4">
        {settings.require_webcam && (
          <>
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <Camera className="text-slate-500" />
              <div>
                <p className="font-semibold text-slate-700">Webcam Access</p>
                <p className="text-xs text-slate-500">Required for live proctoring</p>
              </div>
            </div>
            {webcamStatus === 'granted' ? (
              <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full">Granted</span>
            ) : (
              <button onClick={requestWebcam} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800">
                Allow Access
              </button>
            )}
          </div>
          {webcamStatus === 'granted' && (
            <div className="bg-black rounded-xl overflow-hidden h-40 w-full flex items-center justify-center relative">
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover opacity-80" />
              <div className="absolute inset-0 border-2 border-emerald-500/30 rounded-xl pointer-events-none"></div>
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] text-white font-bold tracking-wider uppercase">Live Feed Confirmed</span>
              </div>
            </div>
          )}
          </>
        )}

        {settings.require_mic && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <Mic className="text-slate-500" />
              <div>
                <p className="font-semibold text-slate-700">Microphone Access</p>
                <p className="text-xs text-slate-500">Required for audio surveillance</p>
              </div>
            </div>
            {micStatus === 'granted' ? (
              <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full">Granted</span>
            ) : (
              <button onClick={requestMic} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800">
                Allow Access
              </button>
            )}
          </div>
        )}

        {settings.require_fullscreen && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <Maximize className="text-slate-500" />
              <div>
                <p className="font-semibold text-slate-700">Fullscreen Mode</p>
                <p className="text-xs text-slate-500">Prevents tab switching</p>
              </div>
            </div>
            {fullscreenStatus === 'granted' ? (
              <span className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1 rounded-full">Active</span>
            ) : (
              <button onClick={requestFullscreen} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800">
                Enter Fullscreen
              </button>
            )}
          </div>
        )}

        {!settings.require_webcam && !settings.require_mic && !settings.require_fullscreen && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold text-sm text-center">
            No special security permissions required for this test.
          </div>
        )}
      </div>
    </div>
  );
};
