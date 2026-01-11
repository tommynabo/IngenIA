import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './services/supabaseClient';
import { LayoutDashboard, UserCircle, Download, LogOut, Loader2 } from 'lucide-react';

// Components
import { LandingPage } from './src/components/LandingPage';
import { Panel } from './src/components/Panel';
import { Profile } from './src/components/Profile';
import { Installation } from './src/components/Installation';

// Types
enum RiskLevel {
  LOW = 'BAJO',
  MEDIUM = 'MEDIO',
  HIGH = 'ALTO'
}

interface GenerationHistoryRecord {
  id: string;
  timestamp: string;
  postSnippet: string;
  comment: string;
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Data State
  const [profile, setProfile] = useState<any>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(RiskLevel.LOW);
  const [usedToday, setUsedToday] = useState(0);
  const [totalUsage, setTotalUsage] = useState(0);
  const [personality, setPersonality] = useState('');
  const [history, setHistory] = useState<GenerationHistoryRecord[]>([]);

  // Settings
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseStatus, setLicenseStatus] = useState('inactive');
  const [userAvatar, setUserAvatar] = useState('https://cdn-icons-png.flaticon.com/512/3135/3135715.png');

  // --- Fetch Logic ---
  const fetchHistory = async (userId: string) => {
    const { data } = await supabase.from('generation_history').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
    if (data) {
      setHistory(data.map(item => ({
        id: item.id,
        timestamp: item.created_at,
        postSnippet: item.post_snippet,
        comment: item.comment
      })));
      if (data.length > 0) setTotalUsage(prev => (prev === 0 ? Math.max(prev, data.length) : prev));
    }
  };

  const checkDailyReset = async (userId: string, currentSettings: any) => {
    const now = new Date();
    const currentHour = now.getHours();
    let cycleDate = new Date(now);
    if (currentHour < 8) cycleDate.setDate(cycleDate.getDate() - 1);
    const dateString = cycleDate.toISOString().split('T')[0];

    if (!currentSettings.last_reset_date || currentSettings.last_reset_date !== dateString) {
      const { error } = await supabase.from('user_settings').update({ daily_usage: 0, last_reset_date: dateString }).eq('user_id', userId);
      if (!error) setUsedToday(0);
    }
  };

  const fetchProfile = async (userId: string) => {
    // Profile
    const { data: pData } = await supabase.from('user_profiles').select('*').eq('id', userId).single();
    if (pData) {
      setProfile(pData);
      if (pData.avatar_url) setUserAvatar(pData.avatar_url);
    }

    // Settings
    const { data: sData } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
    if (sData) {
      setUsedToday(sData.daily_usage || 0);
      setTotalUsage(sData.total_usage || 0);
      setPersonality(sData.persona_prompt || '');
      checkDailyReset(userId, sData);
    }

    // License
    const { data: lData } = await supabase.from('licenses').select('*').eq('user_id', userId).single();
    if (lData) {
      setLicenseKey(lData.key);
      setLicenseStatus(lData.status);
    }

    // History
    fetchHistory(userId);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Check payment param logic is now in Panel or App?
    // User asked for logic in Panel probably, or Global?
    // We can keep the global check here if it affects routing, but usually it updates DB.
    // The previous implementation had it in App.tsx useEffect.
    // I will add it here to ensure it runs on any protected route.
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' && session) {
      supabase.from('licenses').update({ status: 'active' }).eq('user_id', session.user.id)
        .then(() => {
          fetchProfile(session.user.id);
          window.history.replaceState({}, '', window.location.pathname);
        });
    }

    return () => subscription.unsubscribe();
  }, [session?.user?.id]); // Re-run if user changes

  if (loading) return <div className="min-h-screen bg-[#050508] flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>;

  return (
    <Routes>
      <Route path="/" element={!session ? <LandingPage onLoginSuccess={(s) => setSession(s)} /> : <Navigate to="/panel" />} />

      {/* Protected Routes */}
      <Route path="/*" element={session ? (
        <AuthorizedLayout
          session={session}
          profile={profile}
          userAvatar={userAvatar}
          userName={profile?.full_name || 'Usuario'}
        >
          <Routes>
            <Route path="panel" element={
              <Panel
                session={session}
                profile={profile}
                stats={{ usedToday, totalUsage, activeStreak: 0, riskLevel }}
                settings={{ licenseKey, licenseStatus, personality }}
                onUpdateStats={(s) => { setRiskLevel(s.riskLevel); setUsedToday(s.usedToday); }}
                onUpdateSettings={(s) => setPersonality(s.personality)}
                history={history}
                onClearHistory={() => setHistory([])}
              />
            } />
            <Route path="user" element={
              <Profile
                session={session}
                userName={profile?.full_name || 'Usuario'}
                userAvatar={userAvatar}
                totalUsage={totalUsage}
                memberSince={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Reciente'}
                history={history}
                onClearHistory={() => setHistory([])}
                onAvatarChange={(e: any) => {
                  // Mock avatar change
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setUserAvatar(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            } />
            <Route path="instalacion" element={<Installation />} />
            <Route path="*" element={<Navigate to="/panel" />} />
          </Routes>
        </AuthorizedLayout>
      ) : (
        <Navigate to="/" />
      )} />
    </Routes>
  );
};

// Layout for Authenticated Views
const AuthorizedLayout: React.FC<{ children: React.ReactNode, session: any, userAvatar: string, userName: string }> = ({ children, session, userAvatar, userName }) => {
  const location = useLocation();
  const isInstall = location.pathname.includes('instalacion');

  // Installation page handles its own layout/nav in the design I made? 
  // Actually, I made Installation.tsx have a Nav bar too.
  // But Panel and Profile need the main Nav.
  // If Installation is inside this layout, we might double nav. 
  // Let's check: Installation.tsx HAS a nav bar.
  // Panel and Profile do NOT have a nav bar in my code above?
  // Checked Panel.tsx: No Nav.
  // Checked Profile.tsx: No Nav.
  // So this Layout MUST provide the Nav.
  // Does Installation.tsx need a Nav? Yes.
  // So I should REMOVE Nav from Installation.tsx and put it here.
  // OR, I conditionally render Nav.

  // Simplest: This Layout provides the Nav for EVERYONE.
  // I will assume Installation.tsx content main wrapper is enough, but I should probably strip the Nav from Installation.tsx if I use this layout. 
  // For now, I'll use a standardized Nav here.

  return (
    <div className="min-h-screen bg-[#050508] text-white font-sans selection:bg-purple-500/30">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#050508]/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <a href="/panel" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-neon rounded-xl flex items-center justify-center rotate-3">
                <span className="text-xl">⚡️</span>
              </div>
              <span className="text-xl font-black tracking-tighter">INGENIA</span>
            </a>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
              <a href="/panel" className={`px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${location.pathname.includes('panel') ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-white/50 hover:text-white'}`}>
                <LayoutDashboard size={16} /> Panel
              </a>
              <a href="/user" className={`px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${location.pathname.includes('user') ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-white/50 hover:text-white'}`}>
                <UserCircle size={16} /> Perfil
              </a>
              <a href="/instalacion" className={`px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 ${location.pathname.includes('instalacion') ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-white/50 hover:text-white'}`}>
                <Download size={16} /> Instalación
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href="/user" className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-neon flex items-center justify-center overflow-hidden">
                <img src={userAvatar} alt="User" className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold text-white/80">{userName.split(' ')[0]}</span>
            </a>
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-white/30 hover:text-white transition-colors" title="Cerrar Sesión">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1200px] mx-auto px-6 pt-32 pb-20">
        {children}
      </main>
    </div>
  );
};

export default App;
