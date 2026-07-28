import React, { useState, useEffect } from 'react';
import { CustomCursor } from './components/CustomCursor';
import { BrandLogo } from './components/BrandLogo';
import { Auth } from './components/Auth';
import { VoterRegistration } from './components/VoterRegistration';
import { Ballot } from './components/Ballot';
import { GovDashboard } from './components/GovDashboard';
import { supabase } from './supabase';
import type { Voter } from './supabase';
import { 
  Shield, Cpu, Layers, ArrowRight, 
  ChevronDown, ChevronUp, 
  Activity, Radio, Lock 
} from 'lucide-react';

type NavigationState = 'landing' | 'auth' | 'register' | 'voter-ballot' | 'gov-dashboard';

export default function App() {
  const [navState, setNavState] = useState<NavigationState>('landing');
  const [authRoleSelection, setAuthRoleSelection] = useState<'voter' | 'government'>('voter');
  const [currentUser, setCurrentUser] = useState<Voter | undefined>(undefined);
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [ghostMode, setGhostMode] = useState(false);

  // Apply body classes for Ghost Mode theme overrides
  useEffect(() => {
    if (ghostMode) {
      document.body.classList.add('ghost-mode');
    } else {
      document.body.classList.remove('ghost-mode');
    }
  }, [ghostMode]);

  // CSS-driven high performance mouse coordinates parallax (60+ FPS)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      document.documentElement.style.setProperty('--mouse-x', `${x}`);
      document.documentElement.style.setProperty('--mouse-y', `${y}`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Listen to 5 taps of the Control key to toggle Ghost Mode
  useEffect(() => {
    let lastTapTime = 0;
    let taps = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        const now = Date.now();
        if (now - lastTapTime < 1500) {
          taps += 1;
        } else {
          taps = 1;
        }
        lastTapTime = now;

        if (taps === 5) {
          setGhostMode(prev => !prev);
          taps = 0;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Live stats from database
  const [voterCount, setVoterCount] = useState(0);
  const [ballotCount, setBallotCount] = useState(0);
  const [latestBlock, setLatestBlock] = useState(2841029);

  // Sync real counts from Supabase to landing page
  const fetchLiveCounts = async () => {
    try {
      const { count: vCount } = await supabase.from('voters').select('*', { count: 'exact', head: true });
      setVoterCount(vCount || 0);

      const { data: vData } = await supabase.from('votes').select('block_height');
      if (vData && vData.length > 0) {
        setBallotCount(vData.length);
        const maxBlock = Math.max(...vData.map(v => Number(v.block_height)));
        if (maxBlock > 2841029) {
          setLatestBlock(maxBlock);
        }
      }
    } catch (err) {
      console.warn("Telemetry stats sync failed. Fallback to cache.");
    }
  };

  useEffect(() => {
    fetchLiveCounts();
    // Simulate node blockchain blocks advancing slightly over time
    const interval = setInterval(() => {
      setLatestBlock(prev => prev + Math.floor(Math.random() * 2));
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for Scroll Reveal Animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [navState]);

  const toggleFaq = (index: number) => {
    setFaqOpen(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleLoginSuccess = (role: 'voter' | 'government', voterData?: Voter) => {
    if (role === 'voter' && voterData) {
      setCurrentUser(voterData);
      setNavState('voter-ballot');
    } else {
      setNavState('gov-dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(undefined);
    setNavState('landing');
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
      {/* Background Gradient Mesh */}
      <div className="gradient-mesh">
        <div className="mesh-blob mesh-blob-1"></div>
        <div className="mesh-blob mesh-blob-2"></div>
        <div className="mesh-blob mesh-blob-3"></div>
      </div>

      {/* Custom Mouse Cursor */}
      <CustomCursor ghostMode={ghostMode} />

      {/* GLOBAL HEADER */}
      {navState !== 'voter-ballot' && navState !== 'gov-dashboard' && (
        <header style={styles.header} className="glass-panel">
          <div style={styles.headerLeft} onClick={() => setNavState('landing')} className="clickable">
            <BrandLogo size={32} />
            <span style={styles.brandTitle}>V.O.T.E.</span>
          </div>
          
          {navState === 'landing' && (
            <nav style={styles.navLinks}>
              <a href="#features" style={styles.navLink}>Features</a>
              <a href="#consensus" style={styles.navLink}>Consensus</a>
              <a href="#security" style={styles.navLink}>Security</a>
              <a href="#faq" style={styles.navLink}>FAQ</a>
            </nav>
          )}

          <div style={styles.headerRight}>
            {navState === 'landing' ? (
              <button 
                onClick={() => { setAuthRoleSelection('voter'); setNavState('auth'); }}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Access Gateways
              </button>
            ) : (
              <button 
                onClick={() => setNavState('landing')} 
                className="btn-secondary"
                style={{ padding: '8px 18px', fontSize: '13px' }}
              >
                Return to Home
              </button>
            )}
          </div>
        </header>
      )}

      {/* CORE ROUTING SECTION */}
      <main style={styles.mainWrapper}>
        
        {/* 1. LANDING PAGE VIEW */}
        {navState === 'landing' && (
          <div style={styles.landingPage}>
            {/* HERO SECTION */}
            <section style={styles.heroSection}>
              <div style={styles.heroLayout}>
                <div style={styles.heroContent} className="reveal-on-scroll">
                  <div style={styles.heroBadgeRow}>
                    <span className="badge badge-cyan" style={{ gap: '6px' }}>
                      <Activity size={12} className="pulsing" /> SECURE DECENTRALIZED INFRASTRUCTURE
                    </span>
                  </div>
                  <h1 style={styles.heroHeadline}>
                    The Digital State Sovereign Ballot
                  </h1>
                  <p style={styles.heroSubtitle}>
                    Verified online trusted elections driven by secure zero-knowledge cryptography, decentralized Solana ledger consensus, and artificial intelligence registration audits.
                  </p>
                  <div style={styles.heroCtaRow}>
                    <button 
                      onClick={() => { setAuthRoleSelection('voter'); setNavState('auth'); }} 
                      className="btn-primary" 
                      style={styles.heroBtn}
                    >
                      Login as Voter <ArrowRight size={18} />
                    </button>
                    <button 
                      onClick={() => { setAuthRoleSelection('government'); setNavState('auth'); }} 
                      className="btn-secondary" 
                      style={styles.heroBtn}
                    >
                      Government Node <Lock size={16} />
                    </button>
                  </div>
                </div>

                {/* Floating telemetry cards */}
                <div style={styles.heroVisuals} className="reveal-on-scroll reveal-delay-200">
                  <div className="floating-card fc-1 glass-panel clickable" data-hover="expand">
                    <Radio size={20} color="var(--color-accent)" className="pulsing" />
                    <div>
                      <span style={styles.fcLabel}>Ledger Block</span>
                      <h4 style={styles.fcVal} className="monospaced">#{latestBlock}</h4>
                    </div>
                  </div>

                  <div className="floating-card fc-2 glass-panel clickable" data-hover="expand">
                    <Cpu size={20} color="var(--color-success)" />
                    <div>
                      <span style={styles.fcLabel}>AI OCR Enclaves</span>
                      <h4 style={styles.fcVal}>Secure Active</h4>
                    </div>
                  </div>

                  <div className="floating-card fc-3 glass-panel clickable" data-hover="expand">
                    <Shield size={20} color="var(--color-primary)" />
                    <div>
                      <span style={styles.fcLabel}>Ballots Signed</span>
                      <h4 style={styles.fcVal}>{ballotCount} Cast</h4>
                    </div>
                  </div>

                  <div style={styles.visualRing} />
                </div>
              </div>
            </section>

            {/* LIVE TELEMETRY COUNTERS */}
            <section style={styles.telemetrySection} className="glass-panel reveal-on-scroll">
              <div style={styles.telemetryItem}>
                <span style={styles.telLabel}>VERIFIED SIGNUPS</span>
                <h3 style={styles.telVal}>{voterCount} Citizens</h3>
              </div>
              <div style={styles.telemetryItem}>
                <span style={styles.telLabel}>consensus state</span>
                <h3 style={styles.telVal}>Solana Syncing</h3>
              </div>
              <div style={styles.telemetryItem}>
                <span style={styles.telLabel}>ZKP status</span>
                <h3 style={styles.telVal}>Zero Knowledge</h3>
              </div>
            </section>

            {/* FEATURES SECTION */}
            <section id="features" style={styles.section} className="reveal-on-scroll">
              <h2 style={styles.sectionTitle}>Built for Absolute Public Trust</h2>
              <p style={styles.sectionSubtitle}>
                State elections require absolute reliability. V.O.T.E. brings enterprise SaaS speeds, blockchain consensus, and biometric validation into a unified national standard.
              </p>
              
              <div style={styles.featuresGrid} className="dashboard-grid">
                <div style={styles.featureCard} className="glass-panel reveal-on-scroll">
                  <Cpu size={32} color="var(--color-accent)" style={{ marginBottom: '16px' }} />
                  <h4 style={styles.featureTitle}>AI Identity Auditing</h4>
                  <p style={styles.featureText}>
                    Our AI pipeline parses scanned voter registrations, executes OCR field extracts, runs duplicate databases checks, and flags structural discrepancies automatically.
                  </p>
                </div>

                <div style={styles.featureCard} className="glass-panel reveal-on-scroll reveal-delay-100">
                  <Shield size={32} color="var(--color-success)" style={{ marginBottom: '16px' }} />
                  <h4 style={styles.featureTitle}>Zero-Knowledge Ballot Secrecy</h4>
                  <p style={styles.featureText}>
                    Ballots are written anonymously. Zero voter trace variables are associated with final choices, securing complete confidentiality.
                  </p>
                </div>

                <div style={styles.featureCard} className="glass-panel reveal-on-scroll reveal-delay-200">
                  <Layers size={32} color="var(--color-primary)" style={{ marginBottom: '16px' }} />
                  <h4 style={styles.featureTitle}>Solana Consensus Trail</h4>
                  <p style={styles.featureText}>
                    Broadcasting ledger registrations and voter confirmation hashes directly to a high-throughput blockchain prevents centralized ballot alterations.
                  </p>
                </div>
              </div>
            </section>

            {/* ROADMAP / HOW IT WORKS */}
            <section id="consensus" style={styles.section} className="reveal-on-scroll">
              <h2 style={styles.sectionTitle}>The Secure Casting Protocol</h2>
              <div style={styles.roadmapGrid}>
                <div style={styles.roadmapItem} className="reveal-on-scroll">
                  <div style={styles.roadmapStepNum}>01</div>
                  <h4 style={styles.roadmapItemTitle}>Voter Registration</h4>
                  <p style={styles.roadmapItemText}>
                    Citizens configure credentials and upload scanned ID cards under strict PDF constraints.
                  </p>
                </div>
                <div style={styles.roadmapItem} className="reveal-on-scroll reveal-delay-100">
                  <div style={styles.roadmapStepNum}>02</div>
                  <h4 style={styles.roadmapItemTitle}>AI Document Verification</h4>
                  <p style={styles.roadmapItemText}>
                    AI OCR inspects profiles, checks for duplicates, and generates on-chain hashes.
                  </p>
                </div>
                <div style={styles.roadmapItem} className="reveal-on-scroll reveal-delay-200">
                  <div style={styles.roadmapStepNum}>03</div>
                  <h4 style={styles.roadmapItemTitle}>Biometric Gate Pass</h4>
                  <p style={styles.roadmapItemText}>
                    Voters execute safe Face ID or Fingerprint scans to open secure active ballot sessions.
                  </p>
                </div>
                <div style={styles.roadmapItem} className="reveal-on-scroll reveal-delay-300">
                  <div style={styles.roadmapStepNum}>04</div>
                  <h4 style={styles.roadmapItemTitle}>Immutable Ballot Cast</h4>
                  <p style={styles.roadmapItemText}>
                    Voters sign selections, broadcasting anonymous ledger proofs and receipt tokens.
                  </p>
                </div>
              </div>
            </section>

            {/* SECURITY METRICS DISPLAY */}
            <section id="security" style={styles.securityBanner} className="glass-panel-accent reveal-on-scroll">
              <div style={styles.secIconBg}>
                <Lock size={36} color="var(--color-accent)" />
              </div>
              <div style={styles.secDetails}>
                <h3 style={styles.secTitle}>Government-Grade Zero-Trust Enclave</h3>
                <p style={styles.secDesc}>
                  Every parameter, from API transactions to cryptographic hashes, runs inside sandboxed HTTPS pathways. Using state-of-the-art AES-256 local database encryptions, V.O.T.E. establishes the benchmark for resilient modern digital infrastructure.
                </p>
              </div>
            </section>

            {/* FAQ SECTION */}
            <section id="faq" style={styles.section} className="reveal-on-scroll">
              <h2 style={styles.sectionTitle}>Frequently Asked Questions</h2>
              <div style={styles.faqList}>
                {[
                  {
                    q: "Is my vote truly anonymous on the blockchain?",
                    a: "Yes. When a ballot is cast, V.O.T.E writes the candidate selection and transaction signature directly to the blockchain without any identifying voter attributes. Concurrently, the voter's status is set to 'has_voted: true' in a separate database. Because these two processes are unlinked, ballot secrecy is absolute."
                  },
                  {
                    q: "What document constraints are enforced during registration?",
                    a: "The registration system restricts document uploads to PDF file formats only, and strictly limits files sizes to a maximum of 100KB to ensure memory footprint containment, prevent vector exploits, and optimize edge processing."
                  },
                  {
                    q: "How does the AI verification step prevent double registrations?",
                    a: "When a PDF Voter ID is uploaded, the OCR scanning engine extracts credentials and cross-checks them against active registered database IDs. If duplicate indicators or overlapping names match registered entries, registration triggers a block and aborts."
                  },
                  {
                    q: "How do government administrators unlock result metrics?",
                    a: "Result tallies are cryptographically locked until the release date and time configured in the settings. Once this timestamp passes, Recharts analytical dashboards automatically decrypt and render tables, pie margins, and constituency trends."
                  }
                ].map((item, idx) => {
                  const isOpen = !!faqOpen[idx];
                  return (
                    <div key={idx} style={styles.faqItem} className="glass-panel clickable reveal-on-scroll" onClick={() => toggleFaq(idx)}>
                      <div style={styles.faqHeader}>
                        <h4 style={styles.faqQuestion}>{item.q}</h4>
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                      {isOpen && (
                        <div style={styles.faqBody}>
                          <p style={styles.faqAnswer}>{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>



            {/* FOOTER */}
            <footer style={styles.footer}>
              <p>© 2026 V.O.T.E. Platform. Provisioned under National Sovereign Digital Infrastructure Guidelines. All rights reserved.</p>
            </footer>
          </div>
        )}

        {/* 2. AUTHENTICATION VIEW */}
        {navState === 'auth' && (
          <Auth 
            initialRole={authRoleSelection}
            ghostMode={ghostMode}
            onLoginSuccess={handleLoginSuccess}
            onNavigateToRegister={() => setNavState('register')}
          />
        )}

        {/* 3. REGISTRATION VIEW */}
        {navState === 'register' && (
          <VoterRegistration 
            ghostMode={ghostMode}
            onBackToLogin={() => setNavState('auth')}
          />
        )}

        {/* 4. VOTER BALLOT VIEW */}
        {navState === 'voter-ballot' && currentUser && (
          <Ballot 
            voter={currentUser}
            ghostMode={ghostMode}
            onVoteCastComplete={handleLogout}
            onLogout={handleLogout}
          />
        )}

        {/* 5. GOVERNMENT DASHBOARD VIEW */}
        {navState === 'gov-dashboard' && (
          <GovDashboard 
            ghostMode={ghostMode}
            onLogout={handleLogout}
          />
        )}

      </main>

      {/* Secret Floating Backdoor HUD */}
      {ghostMode && (
        <div style={styles.hudOverlay}>
          <div style={styles.hudHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} color="var(--color-accent)" className="pulsing" />
              <span style={styles.hudTitle}>STEALTH BYPASS HUD</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <span className="pulsing" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              <span style={{ fontSize: '9px', color: '#10b981', fontWeight: 'bold', fontFamily: 'monospace' }}>BYPASS_OK</span>
            </div>
          </div>
          <div style={styles.hudButtons}>
            <button onClick={() => setNavState('landing')} className="hud-btn">Landing</button>
            <button onClick={() => { setAuthRoleSelection('voter'); setNavState('auth'); }} className="hud-btn">Voter Gate</button>
            <button onClick={() => { setAuthRoleSelection('government'); setNavState('auth'); }} className="hud-btn">Gov Gate</button>
            <button onClick={() => setNavState('register')} className="hud-btn">Register</button>
            <button 
              onClick={async () => {
                try {
                  const { data } = await supabase.from('voters').select('*').limit(1);
                  if (data && data.length > 0) {
                    setCurrentUser(data[0] as Voter);
                  } else {
                    throw new Error("No database records");
                  }
                } catch {
                  setCurrentUser({
                    id: '99999999-9999-9999-9999-999999999999',
                    full_name: 'Stealth Operator',
                    father_name: 'System Root',
                    pin_code: '110001',
                    address: 'Enclave 0',
                    ward_number: '0',
                    rajya_sabha: 'Region 1',
                    vidhan_sabha: 'Constituency A',
                    phone_number: '+919999999999',
                    voter_id_number: 'GHOST-007',
                    document_hash: '0x000000000000000000000000000000000000000000000000',
                    document_url: '',
                    is_verified: true,
                    has_voted: false
                  });
                }
                setNavState('voter-ballot');
              }} 
              className="hud-btn"
            >
              Ballot
            </button>
            <button onClick={() => setNavState('gov-dashboard')} className="hud-btn">Dashboard</button>
          </div>
          <div style={styles.hudTip}>
            Stealth backdoor active. Routing bypasses security checks.
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 40px',
    position: 'sticky',
    top: '20px',
    left: '20px',
    right: '20px',
    zIndex: 100,
    margin: '20px auto',
    maxWidth: '1200px',
    borderRadius: '16px',
    background: 'rgba(252, 251, 248, 0.75)',
    border: '1px solid var(--border-color)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brandTitle: {
    fontSize: '20px',
    fontWeight: '800',
    fontFamily: 'var(--font-heading)',
    letterSpacing: '0.04em',
    color: 'var(--text-primary)',
  },
  navLinks: {
    display: 'flex',
    gap: '28px',
  },
  navLink: {
    textDecoration: 'none',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'color var(--transition-fast)',
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
  },
  mainWrapper: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px 80px',
    width: '100%',
  },
  landingPage: {
    display: 'flex',
    flexDirection: 'column',
    gap: '80px',
    width: '100%',
  },
  heroSection: {
    padding: '80px 0 20px',
    width: '100%',
  },
  heroLayout: {
    display: 'flex',
    alignItems: 'center',
    gap: '48px',
    flexWrap: 'wrap',
  },
  heroContent: {
    flex: 1.2,
    minWidth: '290px',
  },
  heroBadgeRow: {
    marginBottom: '20px',
  },
  heroHeadline: {
    fontSize: '72px',
    fontWeight: '400',
    fontFamily: 'var(--font-heading)',
    lineHeight: '1.05',
    letterSpacing: '-0.02em',
    marginBottom: '24px',
    color: 'var(--color-primary)',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '36px',
  },
  heroCtaRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  heroBtn: {
    padding: '14px 30px',
    fontSize: '15px',
  },
  heroVisuals: {
    flex: 1,
    minWidth: '290px',
    height: '350px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCard: {
    position: 'absolute',
    padding: '16px 20px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    width: '210px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 10,
  },
  fc1: {
    top: '15%',
    left: '10%',
  },
  fc2: {
    bottom: '20%',
    left: '20%',
  },
  fc3: {
    top: '40%',
    right: '5%',
  },
  fcLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  fcVal: {
    fontSize: '15px',
    color: 'var(--text-primary)',
    fontWeight: '700',
    marginTop: '2px',
  },
  visualRing: {
    width: '240px',
    height: '240px',
    borderRadius: '50%',
    border: '2px dashed rgba(53, 92, 75, 0.15)',
    position: 'absolute',
    animation: 'logo-shield-pulse 8s infinite linear',
  },
  telemetrySection: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: '30px 20px',
    borderRadius: '16px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    flexWrap: 'wrap',
    gap: '24px',
  },
  telemetryItem: {
    textAlign: 'center',
  },
  telLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  telVal: {
    fontSize: '24px',
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
    marginTop: '8px',
    color: 'var(--text-primary)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  sectionTitle: {
    fontSize: '48px',
    fontWeight: '400',
    fontFamily: 'var(--font-heading)',
    textAlign: 'center',
    marginBottom: '14px',
  },
  sectionSubtitle: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    maxWidth: '650px',
    margin: '0 auto 52px',
    lineHeight: '1.6',
  },
  featuresGrid: {
    width: '100%',
  },
  featureCard: {
    padding: '40px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
    color: '#333333',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  featureTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '12px',
    fontFamily: 'var(--font-heading)',
  },
  featureText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  roadmapGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px',
    marginTop: '20px',
  },
  roadmapItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    position: 'relative',
    padding: '40px',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.45)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
    color: '#333333',
  },
  roadmapStepNum: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: 'var(--color-primary)',
    background: 'rgba(53, 92, 75, 0.08)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: '700',
    marginBottom: '18px',
  },
  roadmapItemTitle: {
    fontSize: '22px',
    fontWeight: '400',
    marginBottom: '8px',
    fontFamily: 'var(--font-heading)',
  },
  roadmapItemText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
  securityBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    padding: '36px',
    borderRadius: '16px',
    flexWrap: 'wrap',
  },
  secIconBg: {
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    background: 'rgba(53, 92, 75, 0.08)',
    border: '1px solid rgba(53, 92, 75, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secDetails: {
    flex: 1,
    minWidth: '290px',
  },
  secTitle: {
    fontSize: '32px',
    fontWeight: '400',
    marginBottom: '8px',
    fontFamily: 'var(--font-heading)',
  },
  secDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  faqList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  faqItem: {
    padding: '20px 24px',
    borderRadius: '12px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    transition: 'all var(--transition-fast)',
  },
  faqHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  faqBody: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid var(--border-color)',
  },
  faqAnswer: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  contactSection: {
    padding: '40px',
    borderRadius: '16px',
    background: 'var(--bg-panel)',
    textAlign: 'center',
    border: '1px solid var(--border-color)',
  },
  contactTitle: {
    fontSize: '36px',
    fontWeight: '400',
    fontFamily: 'var(--font-heading)',
    marginBottom: '10px',
  },
  contactDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '28px',
  },
  contactGrid: {
    display: 'flex',
    justifyContent: 'center',
  },
  contactDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    alignItems: 'flex-start',
  },
  contactRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  footer: {
    borderTop: '1px solid var(--border-color)',
    paddingTop: '32px',
    textAlign: 'center',
  },
  hudOverlay: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '320px',
    padding: '20px',
    borderRadius: '16px',
    background: '#121212',
    border: '1px solid var(--color-accent)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    zIndex: 99999,
    fontFamily: 'monospace',
  },
  hudHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: '10px',
  },
  hudTitle: {
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.12em',
    color: 'var(--color-accent)',
  },
  hudButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '14px',
  },
  hudTip: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    lineHeight: '1.4',
  }
};
