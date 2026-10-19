import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, ShieldAlert, Camera, Laptop, 
  Activity, Wifi, AlertTriangle, RefreshCw, 
  Volume2, ListTodo, Play, Minimize,
  Smartphone, UserX, Users, Check
} from 'lucide-react';
import GlassCard from '../ui/GlassCard';

// Event interface
interface ActivityLog {
  id: string;
  time: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  message: string;
}

interface ProctoringDashboardProps {
  candidateName?: string;
  examToken?: string;
}

export const ProctoringDashboard: React.FC<ProctoringDashboardProps> = ({
  candidateName = 'Jane Challenger',
  examToken = '#ALG-28491'
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'TC';
  };
  // ----------------------------------------------------
  // Proctoring States
  // ----------------------------------------------------
  const [warnings, setWarnings] = useState<number>(0);
  const [tabSwitches, setTabSwitches] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [score, setScore] = useState<number>(100);
  
  // AI Detection Simulation Flags
  const [cameraStatus, setCameraStatus] = useState<'connected' | 'disconnected'>('connected');
  const [faceDetected, setFaceDetected] = useState<boolean>(true);
  const [singleCandidate, setSingleCandidate] = useState<boolean>(true);
  const [suspiciousActivity, setSuspiciousActivity] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(15); // in db/percentage
  const [mobilePhoneDetected, setMobilePhoneDetected] = useState<boolean>(false);

  // Timeline Activity Logs
  const [logs, setLogs] = useState<ActivityLog[]>([
    { id: '1', time: '10:32 AM', type: 'success', message: 'Candidate verified via facial token credentials.' },
    { id: '2', time: '10:32 AM', type: 'info', message: 'Secure Exam session successfully initialized.' },
    { id: '3', time: '10:32 AM', type: 'info', message: 'Camera feed connected. Latency: 12ms.' }
  ]);

  // Warning Modals
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [lastWarningReason, setLastWarningReason] = useState<string>('');
  const [isAutoSubmitted, setIsAutoSubmitted] = useState<boolean>(false);

  // Face scanning mesh coordinates simulation
  const [faceMesh, setFaceMesh] = useState<{ x: number; y: number }[]>([]);
  const [scanningLine, setScanningLine] = useState<number>(0);

  // ----------------------------------------------------
  // Dynamic Facial Mesh Scanning Effect
  // ----------------------------------------------------
  useEffect(() => {
    if (cameraStatus === 'connected' && faceDetected) {
      const timer = setInterval(() => {
        const points = [];
        const baseOffset = Math.sin(Date.now() / 800) * 8;
        
        // Face boundaries
        points.push({ x: 50 + baseOffset * 0.1, y: 25 + Math.cos(Date.now() / 400) * 2 }); // Top
        points.push({ x: 30, y: 50 + baseOffset * 0.3 }); // Left eye
        points.push({ x: 70, y: 50 + baseOffset * 0.3 }); // Right eye
        points.push({ x: 50 + baseOffset * 0.2, y: 60 }); // Nose
        points.push({ x: 50 + baseOffset * 0.4, y: 78 + Math.sin(Date.now() / 200) * 1.5 }); // Mouth
        points.push({ x: 50, y: 92 }); // Chin
        
        setFaceMesh(points);
        setScanningLine(prev => (prev + 1.2) % 100);
      }, 100);
      return () => clearInterval(timer);
    }
  }, [cameraStatus, faceDetected]);

  // ----------------------------------------------------
  // Watch score limits
  // ----------------------------------------------------
  useEffect(() => {
    // Keep score clamped between 0 and 100
    setScore(prev => Math.max(0, Math.min(100, prev)));
  }, [score]);

  // ----------------------------------------------------
  // Simulated Log Actions
  // ----------------------------------------------------
  const addLog = (message: string, type: 'info' | 'warning' | 'alert' | 'success') => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newLog: ActivityLog = {
      id: Math.random().toString(),
      time: timeString,
      type,
      message
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const handleIssueWarning = (reason: string) => {
    setWarnings(prev => {
      const nextWarnings = prev + 1;
      setLastWarningReason(reason);
      
      if (nextWarnings >= 3) {
        setIsAutoSubmitted(true);
        addLog(`SESSION TERMINATED: Maximum warnings limit breached (${reason}).`, 'alert');
        return nextWarnings;
      }

      setShowWarningModal(true);
      addLog(`Warning issued (${nextWarnings}/3): ${reason}`, 'warning');
      return nextWarnings;
    });
  };

  // ----------------------------------------------------
  // Simulation Controller Handlers
  // ----------------------------------------------------
  const simulateTabSwitch = () => {
    if (isAutoSubmitted) return;
    setTabSwitches(prev => prev + 1);
    setScore(prev => prev - 12);
    addLog('Anomalous Event: Focus navigation switched away from terminal.', 'alert');
    handleIssueWarning('Tab switch detected. You are required to stay on the active exam tab.');
  };

  const simulateFaceLost = () => {
    if (isAutoSubmitted) return;
    setFaceDetected(false);
    setScore(prev => prev - 10);
    addLog('Anomalous Event: Face frame detection returned empty.', 'alert');
    handleIssueWarning('No face detected in camera viewport.');
    
    // Auto-restore after 3.5 seconds
    setTimeout(() => {
      setFaceDetected(true);
      addLog('Camera feed: Candidate face detected and locked.', 'info');
    }, 3500);
  };

  const simulateSecondPerson = () => {
    if (isAutoSubmitted) return;
    setSingleCandidate(false);
    setSuspiciousActivity(true);
    setScore(prev => prev - 25);
    addLog('Critical Event: Multiple faces detected in webcam feed.', 'alert');
    handleIssueWarning('Multiple candidates detected in the testing frame.');
    
    // Auto-restore after 4 seconds
    setTimeout(() => {
      setSingleCandidate(true);
      setSuspiciousActivity(false);
      addLog('Camera feed: Verification frame lock returned single candidate state.', 'success');
    }, 4000);
  };

  const simulateAudioSpike = () => {
    if (isAutoSubmitted) return;
    setAudioLevel(95);
    setScore(prev => prev - 8);
    addLog('Spike Event: High frequency secondary voice levels registered (95dB).', 'warning');
    
    setTimeout(() => {
      setAudioLevel(15);
      handleIssueWarning('Background speaking/audio detected.');
    }, 1500);
  };

  const simulateMobilePhone = () => {
    if (isAutoSubmitted) return;
    setMobilePhoneDetected(true);
    setSuspiciousActivity(true);
    setScore(prev => prev - 30);
    addLog('Critical Event: Object verification flagged candidate with a smartphone.', 'alert');
    handleIssueWarning('Unauthorized item (Mobile Device) identified.');

    setTimeout(() => {
      setMobilePhoneDetected(false);
      setSuspiciousActivity(false);
      addLog('Object verification state: Workspace clear.', 'success');
    }, 4000);
  };

  const simulateExitFullscreen = () => {
    if (isAutoSubmitted) return;
    setIsFullscreen(false);
    setScore(prev => prev - 15);
    addLog('Anomalous Event: Exited full screen layout context.', 'alert');
    handleIssueWarning('Fullscreen lock was deactivated.');
  };

  const handleResetSimulation = () => {
    setWarnings(0);
    setTabSwitches(0);
    setIsFullscreen(true);
    setScore(100);
    setCameraStatus('connected');
    setFaceDetected(true);
    setSingleCandidate(true);
    setSuspiciousActivity(false);
    setAudioLevel(15);
    setMobilePhoneDetected(false);
    setShowWarningModal(false);
    setIsAutoSubmitted(false);
    setLogs([
      { id: '1', time: '10:32 AM', type: 'success', message: 'Candidate verified via facial token credentials.' },
      { id: '2', time: '10:32 AM', type: 'info', message: 'Secure Exam session successfully initialized.' },
      { id: '3', time: '10:32 AM', type: 'info', message: 'Camera feed connected. Latency: 12ms.' }
    ]);
  };

  // ----------------------------------------------------
  // Calculations
  // ----------------------------------------------------
  const getScoreStatus = () => {
    if (score >= 90) return { label: 'Safe', color: 'text-emerald-500 border-emerald-500/25 bg-emerald-500/10', ring: 'stroke-emerald-500' };
    if (score >= 70) return { label: 'Warning', color: 'text-amber-500 border-amber-500/25 bg-amber-500/10', ring: 'stroke-amber-500' };
    return { label: 'Critical', color: 'text-red-500 border-red-500/25 bg-red-500/10', ring: 'stroke-red-500' };
  };

  const status = getScoreStatus();
  const radius = 40;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="w-full relative select-none">
      
      {/* Simulation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5.5 mb-6">
        <div>
          <h2 className="font-display font-black text-xl text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-lilac-600 animate-pulse" size={24} />
            <span>AI PROCTORING & EXAM SECURITY CONTROL</span>
          </h2>
          <p className="text-xs text-slate-400 font-semibold mt-1">
            Real-time candidate monitoring dashboard, behavioral assessment algorithms, and automated warning logs.
          </p>
        </div>

        <button
          onClick={handleResetSimulation}
          className="px-4 py-2 border border-slate-150 hover:border-slate-250 bg-white text-slate-500 hover:text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-97 shrink-0"
        >
          <RefreshCw size={13} />
          <span>Reset Simulation</span>
        </button>
      </div>

      {/* Grid Layout: left (4/12) and right (8/12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Camera feed, Score, and Candidate Info (4 grid cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* 1. Webcam Monitoring Card */}
          <GlassCard className="border-slate-100/60 p-5 flex flex-col gap-4 relative overflow-hidden" hoverEffect={false}>
            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-1">
                <Camera size={13} className="text-lilac-600" />
                <span>Webcam Surveillance</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cameraStatus === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-red-500'}`} />
                <span className={cameraStatus === 'connected' ? 'text-emerald-500' : 'text-red-500'}>
                  {cameraStatus.toUpperCase()}
                </span>
              </span>
            </div>

            {/* Webcam feed mockup */}
            <div className="w-full aspect-video bg-slate-950 border border-slate-850 rounded-2xl relative overflow-hidden flex items-center justify-center">
              
              {/* Camera disconnected overlay */}
              {cameraStatus === 'disconnected' ? (
                <div className="flex flex-col items-center gap-2 text-slate-500 font-display font-bold text-xs">
                  <UserX size={26} />
                  <span>Surveillance feed lost</span>
                </div>
              ) : (
                <>
                  {/* Video Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#130c17_1px,transparent_1px),linear-gradient(to_bottom,#130c17_1px,transparent_1px)] bg-[size:16px_16px] opacity-30" />
                  
                  {/* SVG Face scanning mesh layout */}
                  <svg className="absolute inset-0 w-full h-full">
                    {faceDetected && faceMesh.length > 0 && (
                      <>
                        {/* Dynamic skeletal link lines */}
                        <path
                          d={`M ${faceMesh[0].x * 2.5} ${faceMesh[0].y * 1.5} 
                              C ${faceMesh[1].x * 2.5} ${faceMesh[1].y * 1.5}, 
                                ${faceMesh[5].x * 2.5} ${faceMesh[5].y * 1.5}, 
                                ${faceMesh[5].x * 2.5} ${faceMesh[5].y * 1.5}
                              C ${faceMesh[5].x * 2.5} ${faceMesh[5].y * 1.5}, 
                                ${faceMesh[2].x * 2.5} ${faceMesh[2].y * 1.5}, 
                                ${faceMesh[0].x * 2.5} ${faceMesh[0].y * 1.5} Z`}
                          className={`fill-none ${singleCandidate ? 'stroke-lilac-500/25' : 'stroke-red-500/35'}`}
                          strokeWidth="2"
                        />
                        
                        {/* Eyes to nose */}
                        <line x1={faceMesh[1].x * 2.5} y1={faceMesh[1].y * 1.5} x2={faceMesh[3].x * 2.5} y2={faceMesh[3].y * 1.5} className="stroke-indigo-500/20" strokeWidth="1" />
                        <line x1={faceMesh[2].x * 2.5} y1={faceMesh[2].y * 1.5} x2={faceMesh[3].x * 2.5} y2={faceMesh[3].y * 1.5} className="stroke-indigo-500/20" strokeWidth="1" />
                        <line x1={faceMesh[3].x * 2.5} y1={faceMesh[3].y * 1.5} x2={faceMesh[4].x * 2.5} y2={faceMesh[4].y * 1.5} className="stroke-indigo-500/20" strokeWidth="1" />

                        {/* Plots */}
                        {faceMesh.map((pt, idx) => (
                          <circle
                            key={idx}
                            cx={pt.x * 2.5}
                            cy={pt.y * 1.5}
                            r={idx === 3 ? "3.5" : "2"}
                            className={!singleCandidate ? "fill-red-500" : idx === 3 ? "fill-rose-500" : "fill-lilac-400"}
                          />
                        ))}

                        {/* Text overlay near coordinates */}
                        <text x={faceMesh[0].x * 2.5 - 20} y={faceMesh[0].y * 1.5 - 8} className="text-[7px] font-mono fill-lilac-400 font-bold">
                          LOCK: 95%
                        </text>
                      </>
                    )}

                    {/* Secondary Face Mesh in case of multiple candidate simulation */}
                    {!singleCandidate && (
                      <>
                        <g transform="translate(60, 20)">
                          <circle cx="90" cy="80" r="15" className="fill-none stroke-red-500/40" strokeWidth="1.5" />
                          <circle cx="85" cy="76" r="1.5" className="fill-red-400" />
                          <circle cx="95" cy="76" r="1.5" className="fill-red-400" />
                          <path d="M 83 90 Q 90 85 97 90" className="fill-none stroke-red-400" strokeWidth="1" />
                          <text x="75" y="55" className="text-[6px] font-mono fill-red-400 font-bold">ID: SECOND_PERSON</text>
                        </g>
                      </>
                    )}

                    {/* Laser Scanner line */}
                    {faceDetected && (
                      <line x1="0" y1={scanningLine * 1.5} x2="350" y2={scanningLine * 1.5} className="stroke-lilac-500/45" strokeWidth="2" />
                    )}
                  </svg>

                  {/* Face missing flag overlay */}
                  {!faceDetected && (
                    <div className="absolute inset-0 bg-red-950/40 backdrop-blur-xs flex items-center justify-center animate-pulse">
                      <div className="px-3 py-1.5 bg-red-900 border border-red-700 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                        <AlertTriangle size={12} />
                        <span>FACE OUT OF FRAME</span>
                      </div>
                    </div>
                  )}

                  {/* Phone detected flag overlay */}
                  {mobilePhoneDetected && (
                    <div className="absolute inset-0 bg-rose-950/50 backdrop-blur-xs flex items-center justify-center">
                      <div className="px-3.5 py-1.5 bg-red-900 border border-red-700 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                        <Smartphone size={13} className="animate-bounce" />
                        <span>SMARTPHONE IDENTIFIED</span>
                      </div>
                    </div>
                  )}

                  {/* Multiple candidates flag overlay */}
                  {!singleCandidate && (
                    <div className="absolute inset-0 bg-red-950/40 backdrop-blur-xs flex items-center justify-center">
                      <div className="px-3 py-1.5 bg-red-900 border border-red-700 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                        <Users size={13} className="animate-pulse" />
                        <span>MULTIPLE FACES DETECTED</span>
                      </div>
                    </div>
                  )}

                  {/* Dynamic audio meter in corner */}
                  <div className="absolute bottom-2.5 right-2.5 w-16 bg-slate-900/80 p-1.5 border border-slate-800 rounded-lg flex items-center gap-1.5">
                    <Volume2 size={10} className={audioLevel > 60 ? 'text-red-500 animate-pulse' : 'text-slate-400'} />
                    <div className="flex-grow h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-350 ${audioLevel > 60 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${audioLevel}%` }} 
                      />
                    </div>
                  </div>

                  {/* System Lock Indicator */}
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-900/80 text-[7px] font-mono text-slate-400">
                    LATENCY: 14MS | FPS: 30
                  </div>
                </>
              )}

            </div>

            {/* Webcam info strip */}
            <div className="flex justify-between text-xs font-bold text-slate-500 border-t border-slate-50 pt-3 flex-wrap gap-2">
              <div>
                Camera: <span className={cameraStatus === 'connected' ? 'text-emerald-600 font-extrabold' : 'text-red-600 font-extrabold'}>
                  {cameraStatus === 'connected' ? 'Connected' : 'Offline'}
                </span>
              </div>
              <div>
                Face Detected: <span className={faceDetected && cameraStatus === 'connected' ? 'text-emerald-600 font-extrabold' : 'text-red-600 font-extrabold'}>
                  {faceDetected && cameraStatus === 'connected' ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* 2. Security Score Card */}
          <GlassCard className="border-slate-100/60 p-5 flex items-center justify-between gap-5 relative overflow-hidden" hoverEffect={false}>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                AI Behavior Evaluation
              </span>
              <h3 className="font-display font-black text-base text-slate-800">
                Security Score
              </h3>
              
              {/* Dynamic Status badge */}
              <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-bold inline-block uppercase tracking-wider mt-3 ${status.color}`}>
                Status: {status.label}
              </span>
            </div>

            {/* Circle progress gauge */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-slate-100 fill-none"
                  strokeWidth={strokeWidth}
                />
                {/* Foreground Progress */}
                <motion.circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className={`fill-none ${status.ring}`}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  strokeLinecap="round"
                />
              </svg>
              {/* Percentage label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-black text-slate-800 tracking-tighter leading-none">
                  {score}%
                </span>
              </div>
            </div>
          </GlassCard>

          {/* 3. Candidate Status Card */}
          <GlassCard className="border-slate-100/60 p-5 flex flex-col gap-3.5" hoverEffect={false}>
            <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider border-b border-slate-50 pb-2">
              Candidate Profile
            </h4>
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-lilac-500 to-indigo-500 text-white font-display font-black text-sm flex items-center justify-center shadow-sm">
                {getInitials(candidateName)}
              </div>
              <div>
                <span className="text-xs font-black text-slate-800 block">{candidateName}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Exam Token: {examToken}</span>
              </div>
            </div>

            {/* Detail states checklists */}
            <div className="flex flex-col gap-2 pt-1">
              {[
                { label: 'Face Detected', state: faceDetected && cameraStatus === 'connected' },
                { label: 'Single Candidate Validated', state: singleCandidate },
                { label: 'No Active Threat Flags', state: !suspiciousActivity && warnings < 2 }
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                  <span>{item.label}</span>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px] font-black ${
                    item.state 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                      : 'bg-red-50 border-red-200 text-red-600'
                  }`}>
                    {item.state ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

        </div>

        {/* RIGHT COLUMN: Stats Panel, Timeline, Checklist & Simulator Controls (8 grid cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Top Row: Monitoring Panel Widget */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { label: 'Tab Switches', value: tabSwitches, sub: `${tabSwitches} Event(s)`, icon: <Laptop size={15} className="text-blue-500" /> },
              { label: 'Fullscreen', value: isFullscreen ? 'Active' : 'Deactivated', sub: isFullscreen ? 'Secure Lock' : 'Alert Triggered', icon: <Minimize size={15} className={isFullscreen ? 'text-emerald-500' : 'text-red-500 animate-pulse'} /> },
              { label: 'Suspicious Activities', value: suspiciousActivity ? '1 Identified' : 'None', sub: suspiciousActivity ? 'Flagged anomaly' : 'All clear', icon: <Activity size={15} className={suspiciousActivity ? 'text-red-500 animate-ping' : 'text-slate-400'} /> },
              { label: 'Warnings', value: `${warnings} / 3`, sub: 'Threshold check', icon: <AlertTriangle size={15} className={warnings > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-400'} /> }
            ].map((stat, idx) => (
              <GlassCard key={idx} className="border-slate-100/50 p-4.5 flex flex-col justify-between hover:border-lilac-200/50" hoverEffect={true}>
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider line-clamp-1">{stat.label}</span>
                  <div className="w-6.5 h-6.5 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0">
                    {stat.icon}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-base font-black text-slate-800 block leading-tight">{stat.value}</span>
                  <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">{stat.sub}</span>
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Middle Row: Timeline + Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            
            {/* Live Activity Timeline (7/12 grid cols) */}
            <div className="md:col-span-7 flex">
              <GlassCard className="border-slate-100/60 p-5.5 flex flex-col w-full h-full relative" hoverEffect={false}>
                <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider mb-5 flex items-center gap-1.5">
                  <Activity size={15} className="text-lilac-600 animate-pulse" />
                  <span>Live Activity Timeline</span>
                </h4>

                <div className="flex-grow overflow-y-auto max-h-[260px] pr-1.5 flex flex-col gap-4">
                  <AnimatePresence initial={false}>
                    {logs.map((log) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-3 text-[11px] leading-relaxed relative pl-4 first:pt-0"
                      >
                        {/* Bullet points and line connectors */}
                        <div className="absolute left-0 top-1.5 bottom-0 w-px bg-slate-100" />
                        <div className={`absolute -left-1 top-1.5 w-2.5 h-2.5 rounded-full border border-white shrink-0 ${
                          log.type === 'success' ? 'bg-emerald-500' :
                          log.type === 'warning' ? 'bg-amber-500' :
                          log.type === 'alert' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                          'bg-indigo-400'
                        }`} />
                        
                        <div className="flex-grow pl-1">
                          <div className="flex justify-between items-center gap-2 mb-0.5">
                            <span className={`font-black uppercase text-[8px] ${
                              log.type === 'success' ? 'text-emerald-600' :
                              log.type === 'warning' ? 'text-amber-600' :
                              log.type === 'alert' ? 'text-red-600' :
                              'text-indigo-500'
                            }`}>
                              {log.type}
                            </span>
                            <span className="text-[8px] text-slate-400 font-mono font-medium">{log.time}</span>
                          </div>
                          <p className="text-slate-500 font-semibold">{log.message}</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </GlassCard>
            </div>

            {/* Exam Protection Checklist (5/12 grid cols) */}
            <div className="md:col-span-5 flex">
              <GlassCard className="border-slate-100/60 p-5.5 flex flex-col justify-between w-full h-full" hoverEffect={false}>
                <div>
                  <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider mb-4.5 flex items-center gap-1.5">
                    <ListTodo size={15} className="text-lilac-600" />
                    <span>Exam Shield Checklist</span>
                  </h4>

                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Fullscreen Verification', state: isFullscreen },
                      { label: 'Proctor Timer Connected', state: !isAutoSubmitted },
                      { label: 'Camera Diagnostics Active', state: cameraStatus === 'connected' },
                      { label: 'Exam Server Channel Secure', state: true },
                      { label: 'Candidate Identity Verified', state: true }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 text-[11px] font-bold text-slate-500">
                        <div className={`w-4 h-4 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                          item.state 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                            : 'bg-red-50 border-red-200 text-red-600'
                        }`}>
                          <Check size={10} strokeWidth={4} />
                        </div>
                        <span className="truncate leading-none">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center gap-2.5 mt-5">
                  <Wifi size={16} className="text-emerald-500 shrink-0" />
                  <div className="text-[10px] font-semibold text-slate-450 leading-snug">
                    Proctor Link latency is averaging <span className="font-extrabold text-slate-700">12ms</span>. Security packages are signed.
                  </div>
                </div>
              </GlassCard>
            </div>

          </div>

          {/* Bottom Row: Event Anomaly Simulator Controls */}
          <GlassCard className="border-slate-100/60 p-5 flex flex-col gap-4 bg-gradient-to-r from-lilac-50/10 to-indigo-50/10" hoverEffect={false}>
            <div>
              <h4 className="font-display font-black text-xs text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Play size={13} className="text-lilac-600 fill-lilac-600" />
                <span>Behavior Threat Simulator Panel</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Simulate candidate actions to observe proctor AI evaluation and warning responses in real time.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                onClick={simulateTabSwitch}
                disabled={isAutoSubmitted}
                className="py-2.5 px-3 border border-slate-150 hover:border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-extrabold text-slate-600 hover:text-slate-850 rounded-xl transition-all shadow-sm active:scale-97 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 justify-center"
              >
                <Laptop size={12} />
                <span>Trigger Tab Switch</span>
              </button>

              <button
                onClick={simulateFaceLost}
                disabled={isAutoSubmitted || !faceDetected}
                className="py-2.5 px-3 border border-slate-150 hover:border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-extrabold text-slate-600 hover:text-slate-850 rounded-xl transition-all shadow-sm active:scale-97 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 justify-center"
              >
                <UserX size={12} />
                <span>Simulate Face Lost</span>
              </button>

              <button
                onClick={simulateSecondPerson}
                disabled={isAutoSubmitted || !singleCandidate}
                className="py-2.5 px-3 border border-slate-150 hover:border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-extrabold text-slate-600 hover:text-slate-850 rounded-xl transition-all shadow-sm active:scale-97 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 justify-center"
              >
                <Users size={12} />
                <span>Simulate Second Person</span>
              </button>

              <button
                onClick={simulateAudioSpike}
                disabled={isAutoSubmitted || audioLevel > 50}
                className="py-2.5 px-3 border border-slate-150 hover:border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-extrabold text-slate-600 hover:text-slate-850 rounded-xl transition-all shadow-sm active:scale-97 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 justify-center"
              >
                <Volume2 size={12} />
                <span>Simulate Speech/Audio</span>
              </button>

              <button
                onClick={simulateMobilePhone}
                disabled={isAutoSubmitted || mobilePhoneDetected}
                className="py-2.5 px-3 border border-slate-150 hover:border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-extrabold text-slate-600 hover:text-slate-850 rounded-xl transition-all shadow-sm active:scale-97 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 justify-center"
              >
                <Smartphone size={12} />
                <span>Simulate Phone Usage</span>
              </button>

              <button
                onClick={simulateExitFullscreen}
                disabled={isAutoSubmitted || !isFullscreen}
                className="py-2.5 px-3 border border-slate-150 hover:border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-extrabold text-slate-600 hover:text-slate-850 rounded-xl transition-all shadow-sm active:scale-97 cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 justify-center"
              >
                <Minimize size={12} />
                <span>Trigger Exit Fullscreen</span>
              </button>
            </div>
          </GlassCard>

        </div>

      </div>

      {/* ----------------------------------------------------
          WARNING MODAL SYSTEM (Triggered on Anomaly)
      ------------------------------------------------------ */}
      <AnimatePresence>
        {showWarningModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-60 flex items-center justify-center p-6 text-slate-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6.5 text-center flex flex-col items-center gap-5 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-500 flex items-center justify-center animate-bounce">
                <AlertTriangle size={26} />
              </div>

              <div>
                <h3 className="font-display font-black text-base text-amber-500 uppercase tracking-wide">
                  ⚠️ WARNING {warnings} OF 3
                </h3>
                <p className="text-xs text-slate-350 font-semibold leading-relaxed mt-2.5">
                  Anomalous event flagged: <span className="text-white font-extrabold">{lastWarningReason}</span>
                </p>
                <p className="text-[11px] text-slate-450 leading-relaxed mt-2 border-t border-slate-800 pt-3">
                  Please stay focused on the exam environment. Navigating away, shifting focus, or speaking will result in immediate termination on the 3rd warning.
                </p>
              </div>

              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full py-3 bg-gradient-to-r from-lilac-500 to-indigo-500 text-white font-display font-black rounded-xl text-xs uppercase tracking-wider hover:from-lilac-600 hover:to-indigo-600 transition-all active:scale-97 cursor-pointer"
              >
                Acknowledge & Continue Exam
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------
          AUTO SUBMIT MODAL SYSTEM (Warnings = 3)
      ------------------------------------------------------ */}
      <AnimatePresence>
        {isAutoSubmitted && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-60 flex items-center justify-center p-6 text-slate-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-md w-full bg-slate-900 border border-red-500/50 rounded-3xl p-7 text-center flex flex-col items-center gap-6 shadow-2xl shadow-red-950/20"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/25 text-red-500 flex items-center justify-center animate-pulse shadow-glow">
                <ShieldAlert size={30} />
              </div>

              <div>
                <h3 className="font-display font-black text-lg text-red-500 uppercase tracking-wide">
                  🚫 Exam Auto Submitted
                </h3>
                <p className="text-xs text-slate-350 font-semibold leading-relaxed mt-2.5">
                  Your active assessment session has been terminated.
                </p>
                
                <div className="mt-4.5 p-3.5 bg-slate-950 border border-slate-850 rounded-xl text-left font-mono text-[10px] flex flex-col gap-1.5 text-slate-400">
                  <div className="flex justify-between">
                    <span>Reason Code:</span>
                    <span className="text-red-400 font-extrabold">WARNING_LIMIT_EXCEEDED</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Final Security Score:</span>
                    <span className="text-red-500 font-black">{score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trigger Warning:</span>
                    <span className="text-white">{lastWarningReason}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logged Tab Switches:</span>
                    <span className="text-white">{tabSwitches}</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-450 leading-relaxed mt-4">
                  The compiled security violation logs have been uploaded to the administrator console. Contact course proctors if this was a mistake.
                </p>
              </div>

              <button
                onClick={handleResetSimulation}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-display font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-97 cursor-pointer"
              >
                Reset Proctor Simulation
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ProctoringDashboard;
