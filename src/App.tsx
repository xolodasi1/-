/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Camera, 
  Mic, 
  Sun, 
  Scissors, 
  Cpu, 
  Play, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Settings, 
  BarChart3, 
  Video,
  Zap,
  Award,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Upgrade, ContentType, GameState } from './types';
import { INITIAL_UPGRADES, CONTENT_TYPES } from './constants';
import { cn } from './lib/utils';

const ICON_MAP: Record<string, React.ReactNode> = {
  Camera: <Camera className="w-5 h-5" />,
  Mic: <Mic className="w-5 h-5" />,
  Sun: <Sun className="w-5 h-5" />,
  Scissors: <Scissors className="w-5 h-5" />,
  Cpu: <Cpu className="w-5 h-5" />,
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('tube_sim_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    return {
      views: 0,
      subscribers: 0,
      money: 0,
      totalViews: 0,
      totalMoney: 0,
      upgrades: INITIAL_UPGRADES,
      unlockedContentTypes: ['vlog'],
      lastSaved: Date.now(),
    };
  });

  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    progress: number;
    startTime: number;
  } | null>(null);

  const [notifications, setNotifications] = useState<{ id: number; text: string }[]>([]);
  const nextNotificationId = useRef(0);

  const addNotification = useCallback((text: string) => {
    const id = nextNotificationId.current++;
    setNotifications(prev => [...prev, { id, text }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  // Save game state
  useEffect(() => {
    localStorage.setItem('tube_sim_state', JSON.stringify(gameState));
  }, [gameState]);

  // Passive income / stats calculation
  const getPassiveViews = useCallback(() => {
    return gameState.upgrades
      .filter(u => u.type === 'views')
      .reduce((acc, u) => acc + u.value * u.level, 0);
  }, [gameState.upgrades]);

  const getPassiveSubs = useCallback(() => {
    return gameState.upgrades
      .filter(u => u.type === 'subscribers')
      .reduce((acc, u) => acc + u.value * u.level, 0);
  }, [gameState.upgrades]);

  const getMoneyMultiplier = useCallback(() => {
    const base = gameState.upgrades
      .filter(u => u.type === 'money')
      .reduce((acc, u) => acc + u.value * u.level, 1);
    return base;
  }, [gameState.upgrades]);

  // Game loop for passive generation
  useEffect(() => {
    const interval = setInterval(() => {
      const passiveViews = getPassiveViews() / 10; // 100ms ticks
      const passiveSubs = getPassiveSubs() / 10;

      setGameState(prev => ({
        ...prev,
        views: prev.views + passiveViews,
        totalViews: prev.totalViews + passiveViews,
        subscribers: prev.subscribers + passiveSubs,
      }));
    }, 100);

    return () => clearInterval(interval);
  }, [getPassiveViews, getPassiveSubs]);

  const [isViral, setIsViral] = useState(false);
  const [viralTimer, setViralTimer] = useState(0);

  // Viral Event Logic
  useEffect(() => {
    const checkViral = setInterval(() => {
      if (!isViral && Math.random() < 0.01) { // 1% chance every 10s
        setIsViral(true);
        setViralTimer(15); // 15 seconds of viral boost
        addNotification("⚠️ VIRAL ALERT! 3x GAINS FOR 15s!");
      }
    }, 10000);

    return () => clearInterval(checkViral);
  }, [isViral, addNotification]);

  useEffect(() => {
    if (isViral && viralTimer > 0) {
      const timer = setTimeout(() => setViralTimer(v => v - 1), 1000);
      return () => clearTimeout(timer);
    } else if (viralTimer === 0) {
      setIsViral(false);
    }
  }, [isViral, viralTimer]);

  // Manual editing to speed up
  const manualEdit = () => {
    if (!activeVideo) return;
    setActiveVideo(prev => {
      if (!prev) return null;
      const contentType = CONTENT_TYPES.find(c => c.id === prev.id);
      if (!contentType) return prev;
      
      // Each click reduces 0.5s from the total duration
      const reductionPercent = (0.5 / contentType.duration) * 100;
      return { ...prev, progress: Math.min(prev.progress + reductionPercent, 99.9) };
    });
  };

  // Video production loop (Updated with viral boost)
  useEffect(() => {
    if (!activeVideo) return;

    const contentType = CONTENT_TYPES.find(c => c.id === activeVideo.id);
    if (!contentType) return;

    const interval = setInterval(() => {
      setActiveVideo(prev => {
        if (!prev) return null;
        const elapsed = (Date.now() - prev.startTime) / 1000;
        const progress = Math.min((elapsed / contentType.duration) * 100 + (prev.progress - (elapsed / contentType.duration) * 100), 100);
        
        // We need to handle the progress carefully because manual clicks also update it
        // A simpler way: just check if progress >= 100
        if (prev.progress >= 100) {
          const boost = isViral ? 3 : 1;
          const viewsGained = contentType.baseViews * (1 + getPassiveViews() * 0.1) * boost;
          const moneyGained = contentType.baseMoney * getMoneyMultiplier() * boost;
          const subsGained = Math.max(0, (viewsGained * 0.05) * (1 + getPassiveSubs() * 0.1));

          setGameState(prevGame => ({
            ...prevGame,
            views: prevGame.views + viewsGained,
            totalViews: prevGame.totalViews + viewsGained,
            money: prevGame.money + moneyGained,
            totalMoney: prevGame.totalMoney + moneyGained,
            subscribers: prevGame.subscribers + subsGained,
          }));

          addNotification(`${isViral ? '🔥 VIRAL ' : ''}Video published! +${Math.floor(viewsGained)} views`);
          return null;
        }

        // Normal time-based progress increment
        const timeStep = 0.1; // 100ms
        const autoIncrement = (timeStep / contentType.duration) * 100;
        return { ...prev, progress: Math.min(prev.progress + autoIncrement, 100) };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeVideo, getPassiveViews, getMoneyMultiplier, getPassiveSubs, addNotification, isViral]);

  const startVideo = (id: string) => {
    if (activeVideo) return;
    setActiveVideo({ id, progress: 0, startTime: Date.now() });
  };

  const buyUpgrade = (upgradeId: string) => {
    setGameState(prev => {
      const upgradeIndex = prev.upgrades.findIndex(u => u.id === upgradeId);
      const upgrade = prev.upgrades[upgradeIndex];
      const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, upgrade.level));

      if (prev.money >= cost) {
        const newUpgrades = [...prev.upgrades];
        newUpgrades[upgradeIndex] = { ...upgrade, level: upgrade.level + 1 };
        
        return {
          ...prev,
          money: prev.money - cost,
          upgrades: newUpgrades
        };
      }
      return prev;
    });
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return Math.floor(num).toString();
  };

  const [user, setUser] = useState<{ id: number; username: string } | null>(() => {
    const saved = localStorage.getItem('tube_sim_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [leaderboard, setLeaderboard] = useState<{ username: string; subscribers: number }[]>([]);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Sync score with server periodically
  useEffect(() => {
    if (!user) return;
    
    const syncInterval = setInterval(() => {
      fetch('/api/score/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          subscribers: gameState.subscribers,
          views: gameState.views
        })
      });
    }, 30000); // Sync every 30s

    return () => clearInterval(syncInterval);
  }, [user, gameState.subscribers, gameState.views]);

  const fetchLeaderboard = async () => {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    setLeaderboard(data);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      const endpoint = authMode === 'LOGIN' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error);
      
      setUser(data);
      localStorage.setItem('tube_sim_user', JSON.stringify(data));
      setScreen('MENU');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const [screen, setScreen] = useState<'AUTH' | 'MENU' | 'GAME' | 'LEADERBOARD'>(user ? 'MENU' : 'AUTH');

  // ... existing state ...

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#0A0A0B] text-zinc-100 overflow-hidden border-x border-zinc-800 shadow-2xl relative">
      
      {screen === 'AUTH' ? (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-8 relative z-10">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black tracking-tighter uppercase glitch-text">
              TubeSim Access
            </h1>
            <p className="text-xs font-mono text-zinc-500 tracking-[0.3em] uppercase">
              Authentication Required
            </p>
          </div>

          <form onSubmit={handleAuth} className="w-full space-y-4">
            <div className="space-y-2">
              <input
                type="text"
                placeholder="USERNAME"
                value={authForm.username}
                onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm font-mono focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
              <input
                type="password"
                placeholder="PASSWORD"
                value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm font-mono focus:border-blue-500 focus:outline-none transition-colors"
                required
              />
            </div>

            {authError && (
              <p className="text-red-500 text-xs font-mono text-center">{authError}</p>
            )}

            <button 
              type="submit"
              className="w-full py-4 btn-cold btn-primary rounded-xl font-bold text-sm tracking-widest uppercase"
            >
              {authMode === 'LOGIN' ? 'Login' : 'Register'}
            </button>
          </form>

          <button 
            onClick={() => setAuthMode(m => m === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
            className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4"
          >
            {authMode === 'LOGIN' ? 'Create New Account' : 'Back to Login'}
          </button>
        </div>
      ) : screen === 'LEADERBOARD' ? (
        <div className="flex flex-col h-full p-6 space-y-6 relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold uppercase tracking-widest">Top Creators</h2>
            <button onClick={() => setScreen('MENU')} className="p-2 rounded-full hover:bg-zinc-800">
              <ChevronRight className="w-6 h-6 rotate-180" />
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto pb-20">
            {leaderboard.map((entry, i) => (
              <div key={i} className="hardware-panel p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={cn(
                    "font-mono font-bold text-lg w-8",
                    i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-700" : "text-zinc-600"
                  )}>#{i + 1}</span>
                  <span className="font-bold">{entry.username}</span>
                </div>
                <span className="font-mono text-xs text-zinc-400">{formatNumber(entry.subscribers)} subs</span>
              </div>
            ))}
          </div>
        </div>
      ) : screen === 'MENU' ? (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-12 relative z-10">
          <div className="text-center space-y-2">
            <div className="w-24 h-24 mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/50 to-transparent" />
              <Video className="w-10 h-10 text-zinc-500 group-hover:text-blue-500 transition-colors duration-500" />
              <div className="absolute bottom-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase glitch-text">
              TubeSim
            </h1>
            <p className="text-xs font-mono text-zinc-500 tracking-[0.3em] uppercase">
              Cold Studio
            </p>
            {user && <p className="text-xs text-blue-400 pt-2">Logged in as {user.username}</p>}
          </div>

          <div className="w-full space-y-4">
            <button 
              onClick={() => setScreen('GAME')}
              className="w-full py-4 btn-cold btn-primary rounded-xl font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-3 group"
            >
              <Play className="w-4 h-4 fill-current" />
              Initialize
            </button>
            
            <button 
              onClick={() => { fetchLeaderboard(); setScreen('LEADERBOARD'); }}
              className="w-full py-4 btn-cold rounded-xl font-bold text-sm tracking-widest uppercase text-zinc-400 hover:text-white flex items-center justify-center gap-3"
            >
              <Award className="w-4 h-4" />
              Leaderboard
            </button>

            <button 
              onClick={() => {
                localStorage.removeItem('tube_sim_user');
                setUser(null);
                setScreen('AUTH');
              }}
              className="w-full py-4 btn-cold rounded-xl font-bold text-sm tracking-widest uppercase text-red-900/50 hover:text-red-500 flex items-center justify-center gap-3"
            >
              Logout
            </button>

            <div className="pt-8 text-center">
              <p className="text-[10px] text-zinc-600 font-mono">
                V 1.1.0 // ONLINE
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header / Stats Panel */}
          <header className={cn(
            "p-6 pt-8 space-y-4 hardware-panel border-t-0 rounded-b-3xl relative transition-all duration-500",
            isViral && "border-amber-500/50 viral-glow"
          )}>
            {/* ... existing header content ... */}
            {/* Hardware Screws */}
            <div className="absolute top-2 left-2 hardware-screw" />
            <div className="absolute top-2 right-2 hardware-screw" />
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className={cn(
                  "text-xs font-mono uppercase tracking-[0.2em] mb-1 transition-colors",
                  isViral ? "text-amber-500 glitch-text" : "text-zinc-500"
                )}>
                  {isViral ? "Viral Protocol Active" : "Studio Status"}
                </h1>
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    isViral ? "bg-amber-500" : "bg-emerald-500"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isViral ? "text-amber-500" : "text-emerald-500"
                  )}>
                    {isViral ? `BOOST: ${viralTimer}s` : "LIVE"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setScreen('MENU')}
                className="p-2 rounded-full hover:bg-zinc-800 transition-colors"
              >
                <Settings className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Views
                </span>
                <div className={cn(
                  "text-xl font-bold tracking-tight transition-colors",
                  isViral && "text-amber-400"
                )}>{formatNumber(gameState.views)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Subs
                </span>
                <div className="text-xl font-bold tracking-tight">{formatNumber(gameState.subscribers)}</div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-500 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Balance
                </span>
                <div className="text-xl font-bold tracking-tight text-emerald-400">${gameState.money.toFixed(2)}</div>
              </div>
            </div>

            {/* LCD Display for passive rates */}
            <div className="lcd-display p-2 rounded text-[10px] flex justify-between px-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
              <span>V/SEC: {(getPassiveViews() * (isViral ? 3 : 1)).toFixed(1)}</span>
              <span>S/SEC: {getPassiveSubs().toFixed(2)}</span>
              <span>MULT: x{(getMoneyMultiplier() * (isViral ? 3 : 1)).toFixed(1)}</span>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
            
            {/* Active Production Control */}
            {activeVideo && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-mono uppercase tracking-widest text-blue-400">Active Session</h2>
                  <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
                </div>
                <div className="hardware-panel p-6 rounded-3xl border-blue-500/30 bg-blue-500/5 flex flex-col items-center gap-4">
                  <div className="text-center">
                    <p className="text-[10px] font-mono uppercase text-blue-400 mb-1">Editing in progress...</p>
                    <h3 className="text-lg font-bold">{CONTENT_TYPES.find(c => c.id === activeVideo.id)?.name}</h3>
                  </div>
                  
                  <button 
                    onClick={manualEdit}
                    className="w-32 h-32 rounded-full btn-cold btn-primary flex flex-col items-center justify-center gap-2 border-4 border-blue-400/20"
                  >
                    <Scissors className="w-8 h-8" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">CLICK TO EDIT</span>
                  </button>

                  <div className="w-full space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>PROGRESS</span>
                      <span>{Math.floor(activeVideo.progress)}%</span>
                    </div>
                    <div className="h-2 w-full progress-bar-bg rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full progress-bar-fill bg-blue-400"
                        animate={{ width: `${activeVideo.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Production Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Content Library</h2>
                <Video className="w-4 h-4 text-zinc-600" />
              </div>

              <div className="space-y-3">
                {CONTENT_TYPES.map(type => {
                  const isLocked = gameState.subscribers < type.unlockedAtSubs;
                  const isActive = activeVideo?.id === type.id;
                  
                  return (
                    <div 
                      key={type.id}
                      className={cn(
                        "hardware-panel p-4 rounded-2xl transition-all relative overflow-hidden",
                        isLocked ? "opacity-40 grayscale" : "hover:border-zinc-600",
                        isActive && "border-blue-500/50 opacity-50 pointer-events-none"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-sm">{type.name}</h3>
                          <p className="text-[10px] text-zinc-500">
                            {isLocked ? `Unlocks at ${formatNumber(type.unlockedAtSubs)} subs` : `Base: ${formatNumber(type.baseViews)} views`}
                          </p>
                        </div>
                        {!isLocked && (
                          <button 
                            onClick={() => startVideo(type.id)}
                            disabled={!!activeVideo}
                            className="btn-cold px-6 py-2 rounded-xl text-xs font-bold text-white"
                          >
                            RECORD
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Upgrades Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-500">Hardware Upgrades</h2>
                <BarChart3 className="w-4 h-4 text-zinc-600" />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {gameState.upgrades.map(upgrade => {
                  const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, upgrade.level));
                  const canAfford = gameState.money >= cost;

                  return (
                    <button
                      key={upgrade.id}
                      onClick={() => buyUpgrade(upgrade.id)}
                      disabled={!canAfford}
                      className={cn(
                        "hardware-panel p-4 rounded-2xl flex items-center gap-4 text-left transition-all group",
                        !canAfford && "opacity-60"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                        canAfford ? "bg-zinc-800 text-blue-400 group-hover:bg-blue-500 group-hover:text-white" : "bg-zinc-900 text-zinc-600"
                      )}>
                        {ICON_MAP[upgrade.icon]}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-semibold text-sm">{upgrade.name}</h3>
                          <span className="text-[10px] font-mono text-zinc-500">LVL {upgrade.level}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 line-clamp-1 mb-1">{upgrade.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-xs font-bold",
                            canAfford ? "text-emerald-400" : "text-zinc-500"
                          )}>${cost}</span>
                          <ChevronRight className="w-3 h-3 text-zinc-700" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </main>

          {/* Footer Navigation */}
          <nav className="absolute bottom-0 left-0 right-0 p-4 hardware-panel border-b-0 rounded-t-3xl flex justify-around items-center">
            <button className="flex flex-col items-center gap-1 text-blue-500">
              <Video className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Studio</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
              <BarChart3 className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Stats</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
              <Award className="w-6 h-6" />
              <span className="text-[10px] font-bold uppercase">Awards</span>
            </button>
          </nav>

          {/* Notifications Overlay */}
          <div className="absolute top-24 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none z-50">
            <AnimatePresence>
              {notifications.map(n => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-zinc-900/90 backdrop-blur border border-zinc-800 px-4 py-2 rounded-full shadow-xl text-xs font-medium text-zinc-200"
                >
                  {n.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* CRT Scanline Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] overflow-hidden z-50">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>
    </div>
  );

}
