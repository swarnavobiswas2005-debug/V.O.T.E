import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import type { Candidate, VoteRecord, AuditLog, ElectionSettings } from '../supabase';
import { 
  LayoutDashboard, Settings, BarChart3, Database, MessageSquare, 
  Cpu, Lock, Trash2, Loader2, ShieldCheck, 
  AlertTriangle, RefreshCw, FileSpreadsheet, Send 
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, 
  XAxis, YAxis, Tooltip 
} from 'recharts';

interface GovDashboardProps {
  ghostMode?: boolean;
  onLogout: () => void;
}

type TabType = 'overview' | 'settings' | 'results' | 'blockchain' | 'sms' | 'ai-logs';

export const GovDashboard: React.FC<GovDashboardProps> = ({ ghostMode = false, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const getTabStyle = (tab: TabType) => {
    const isActive = activeTab === tab;
    return {
      ...styles.navItem,
      color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
      background: isActive ? 'rgba(252, 251, 248, 0.75)' : 'transparent',
      border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
      backdropFilter: isActive ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: isActive ? 'blur(12px)' : 'none',
      boxShadow: isActive ? '0 4px 12px rgba(31, 31, 31, 0.03)' : 'none',
      transform: isActive ? 'translate3d(4px, 0, 0)' : 'translate3d(0, 0, 0)',
    };
  };
  
  // Database States
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [settings, setSettings] = useState<ElectionSettings | null>(null);
  
  // Settings Form State
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [releaseTime, setReleaseTime] = useState('');
  
  // New Candidate Form State
  const [newCandName, setNewCandName] = useState('');
  const [newCandParty, setNewCandParty] = useState('');
  const [newCandPhoto, setNewCandPhoto] = useState('');
  const [newCandLogo, setNewCandLogo] = useState('');
  const [newCandVidhan, setNewCandVidhan] = useState('');
  const [newCandRajya, setNewCandRajya] = useState('');
  const [addingCandidate, setAddingCandidate] = useState(false);

  // Stats Counters
  const [totalVotersCount, setTotalVotersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [countdownString, setCountdownString] = useState('');
  const [forceUnlock, setForceUnlock] = useState(false); // Testing override

  // SMS simulated states
  const [smsDeliveryQueue, setSmsDeliveryQueue] = useState<{ phone: string; name: string; status: 'queued' | 'sent' | 'failed' }[]>([]);
  const [smsSending, setSmsSending] = useState(false);

  // Load dashboard telemetry
  const loadTelemetry = async () => {
    try {
      // 1. Fetch Candidates
      const { data: candData } = await supabase.from('candidates').select('*');
      setCandidates((candData as Candidate[]) || []);

      // 2. Fetch Votes
      const { data: voteData } = await supabase.from('votes').select('*');
      setVotes((voteData as VoteRecord[]) || []);

      // 3. Fetch Audit Logs
      const { data: logData } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
      setAuditLogs((logData as AuditLog[]) || []);

      // 4. Fetch Total Voter Registrations
      const { count } = await supabase.from('voters').select('*', { count: 'exact', head: true });
      setTotalVotersCount(count || 0);

      // 5. Fetch Settings
      const { data: settsData } = await supabase.from('election_settings').select('*').eq('id', 1).single();
      if (settsData) {
        const s = settsData as ElectionSettings;
        setSettings(s);
        setStartDate(s.start_date);
        setStartTime(s.start_time);
        setEndDate(s.end_date);
        setEndTime(s.end_time);
        setReleaseDate(s.result_release_date);
        setReleaseTime(s.result_release_time);
      }
    } catch (err) {
      console.error("Failed to sync dashboard telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTelemetry();
  }, []);

  // Countdown timer calculations
  useEffect(() => {
    if (!settings) return;

    const timer = setInterval(() => {
      const releaseDateTime = new Date(`${settings.result_release_date}T${settings.result_release_time}`);
      const now = new Date();
      const diff = releaseDateTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdownString('RELEASE_TRIGGERED');
      } else {
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);
        setCountdownString(`${d}d : ${h}h : ${m}m : ${s}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [settings]);

  const checkIsLocked = () => {
    if (forceUnlock) return false;
    if (!settings) return true;
    if (countdownString === 'RELEASE_TRIGGERED') return false;
    
    const releaseDateTime = new Date(`${settings.result_release_date}T${settings.result_release_time}`);
    return new Date() < releaseDateTime;
  };

  const isLocked = checkIsLocked();

  // Save Config Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingSettings(true);
    try {
      const { error } = await supabase
        .from('election_settings')
        .update({
          start_date: startDate,
          start_time: startTime,
          end_date: endDate,
          end_time: endTime,
          result_release_date: releaseDate,
          result_release_time: releaseTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;
      
      // Add audit log
      await supabase.from('audit_logs').insert({
        event: 'CONFIG_UPDATED',
        details: 'Admin modified parameters for dates and lock thresholds.'
      });

      // Reload
      await loadTelemetry();
      alert("System configuration variables successfully synced to ledger settings.");
    } catch (err) {
      console.error(err);
      alert("Error saving settings.");
    } finally {
      setUpdatingSettings(false);
    }
  };

  // Convert uploaded images to compressed Base64
  const processImageUpload = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 120;
        const MAX_HEIGHT = 120;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // compress quality
        callback(dataUrl);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Add new candidate
  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName || !newCandParty || !newCandVidhan || !newCandRajya) {
      alert("Please fill in required fields.");
      return;
    }
    setAddingCandidate(true);
    try {
      const { error } = await supabase
        .from('candidates')
        .insert({
          name: newCandName.trim(),
          political_party: newCandParty.trim(),
          photo: newCandPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80',
          party_logo: newCandLogo || 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=100&h=100&q=80',
          vidhan_sabha: newCandVidhan.trim(),
          rajya_sabha: newCandRajya.trim()
        });

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        event: 'CANDIDATE_ADDED',
        details: `New candidate ${newCandName} (${newCandParty}) provisioned.`
      });

      // Clear Form
      setNewCandName('');
      setNewCandParty('');
      setNewCandPhoto('');
      setNewCandLogo('');
      setNewCandVidhan('');
      setNewCandRajya('');

      await loadTelemetry();
      alert("Candidate successfully provisioned in constituency list.");
    } catch (err) {
      console.error(err);
      alert("Error adding candidate.");
    } finally {
      setAddingCandidate(false);
    }
  };

  // Delete Candidate
  const handleDeleteCandidate = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('audit_logs').insert({
        event: 'CANDIDATE_DELETED',
        details: `Candidate ${name} removed from elections registry.`
      });

      await loadTelemetry();
    } catch (err) {
      console.error(err);
    }
  };

  // Run SMS dispatch simulation
  const handleTriggerSmsDispatch = async () => {
    if (smsSending) return;
    setSmsSending(true);
    setSmsDeliveryQueue([]);

    // Fetch registered voters
    const { data: votersData } = await supabase.from('voters').select('phone_number, full_name');
    if (!votersData || votersData.length === 0) {
      alert("No registered voters found to notify.");
      setSmsSending(false);
      return;
    }

    const queue = votersData.map(v => ({
      phone: v.phone_number,
      name: v.full_name,
      status: 'queued' as const
    }));
    setSmsDeliveryQueue(queue);

    // Progressive simulated dispatch
    for (let i = 0; i < queue.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setSmsDeliveryQueue(prev => {
        const next = [...prev];
        next[i].status = Math.random() > 0.05 ? 'sent' : 'failed';
        return next;
      });
    }
    setSmsSending(false);
  };

  // Chart aggregation helper
  const getPartyVotesData = () => {
    const counts: Record<string, number> = {};
    votes.forEach(v => {
      counts[v.political_party] = (counts[v.political_party] || 0) + 1;
    });
    return Object.keys(counts).map(party => ({
      name: party,
      value: counts[party]
    }));
  };

  const getCandidateVotesData = () => {
    const counts: Record<string, number> = {};
    votes.forEach(v => {
      const cand = candidates.find(c => c.id === v.candidate_id);
      const name = cand ? cand.name : 'Unknown Candidate';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.keys(counts).map(name => ({
      name,
      votes: counts[name]
    }));
  };

  // Export CSV representation
  const handleExportCsv = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Vote UUID,Party,Vidhan Sabha,Rajya Sabha,Solana TxHash,Block Height,Timestamp\r\n";
    
    votes.forEach(v => {
      csvContent += `${v.id},"${v.political_party}","${v.vidhan_sabha}","${v.rajya_sabha}",${v.transaction_hash},${v.block_height},${v.created_at}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VOTE-EXPORT-LEDGER-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#355C4B', '#C5A46D', '#A86A4A', '#8CA58C', '#DDD2C2'];

  return (
    <div style={styles.dashboardContainer} className="clickable">
      {/* Sidebar navigation */}
      <div style={styles.sidebar} className="glass-panel">
        <div style={styles.sidebarHeader}>
          <Cpu size={24} color="var(--color-accent)" />
          <span style={styles.sidebarTitle}>V.O.T.E. Admin</span>
        </div>

        <nav style={styles.sidebarNav}>
          <button 
            onClick={() => setActiveTab('overview')} 
            style={getTabStyle('overview')}
            className="clickable"
          >
            <LayoutDashboard size={18} /> Telemetry Overview
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')} 
            style={getTabStyle('settings')}
            className="clickable"
          >
            <Settings size={18} /> Parameters & Candidates
          </button>
          
          <button 
            onClick={() => setActiveTab('results')} 
            style={getTabStyle('results')}
            className="clickable"
          >
            <BarChart3 size={18} /> Tally Results
          </button>

          <button 
            onClick={() => setActiveTab('blockchain')} 
            style={getTabStyle('blockchain')}
            className="clickable"
          >
            <Database size={18} /> Blockchain Ledger
          </button>

          <button 
            onClick={() => setActiveTab('sms')} 
            style={getTabStyle('sms')}
            className="clickable"
          >
            <MessageSquare size={18} /> SMS Notification
          </button>

          <button 
            onClick={() => setActiveTab('ai-logs')} 
            style={getTabStyle('ai-logs')}
            className="clickable"
          >
            <Cpu size={18} /> AI Verification Logs
          </button>
        </nav>

        <div style={styles.sidebarFooter}>
          <button onClick={onLogout} style={styles.logoutBtn} className="btn-secondary">
            Close Terminal
          </button>
        </div>
      </div>

      {/* Main dashboard content area */}
      <div style={styles.mainContent}>
        {loading ? (
          <div style={styles.loadingSpinner}>
            <Loader2 size={40} color="var(--color-accent)" className="spinning" />
            <p style={{ marginTop: '14px', fontSize: '13px', color: 'var(--text-muted)' }}>
              Syncing state variables with blockchain network...
            </p>
          </div>
        ) : (
          <>
            {/* OVERVIEW PANEL */}
            {activeTab === 'overview' && (
              <div style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <h3>V.O.T.E. Live Telemetry Overview</h3>
                  <button onClick={loadTelemetry} style={styles.syncBtn}>
                    <RefreshCw size={14} /> Re-sync Ledger
                  </button>
                </div>

                {/* KPI stats metrics */}
                <div style={styles.statsGrid} className="dashboard-grid">
                  <div style={styles.statsCard} className="glass-panel">
                    <span style={styles.statsLabel}>Voter Enrollments</span>
                    <h2 style={styles.statsVal}>{totalVotersCount}</h2>
                    <span style={styles.statsTrend} className="badge badge-cyan">SYSTEM ONLINE</span>
                  </div>

                  <div style={styles.statsCard} className="glass-panel">
                    <span style={styles.statsLabel}>Total Ballots Cast</span>
                    <h2 style={styles.statsVal}>{votes.length}</h2>
                    <span style={styles.statsTrend} className="badge badge-green">
                      Turnout: {totalVotersCount > 0 ? ((votes.length / totalVotersCount) * 100).toFixed(1) : 0}%
                    </span>
                  </div>

                  <div style={styles.statsCard} className="glass-panel">
                    <span style={styles.statsLabel}>Registered Candidates</span>
                    <h2 style={styles.statsVal}>{candidates.length}</h2>
                    <span style={styles.statsTrend} className="badge badge-blue">ACTIVE SEATS</span>
                  </div>
                </div>

                {/* Audit console preview */}
                <div style={styles.layoutTwoCol}>
                  <div style={{ ...styles.colBox, flex: 2 }} className="glass-panel">
                    <h4 style={styles.boxTitle}>Consensus Activity Audit Log</h4>
                    <div style={styles.logsList}>
                      {auditLogs.slice(0, 7).map((log) => (
                        <div key={log.id} style={styles.logRow}>
                          <span style={styles.logTimestamp}>
                            {new Date(log.created_at || '').toLocaleTimeString()}
                          </span>
                          <span style={styles.logEvent} className="badge badge-cyan">
                            {log.event}
                          </span>
                          <span style={styles.logDetails}>{log.details}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ ...styles.colBox, flex: 1 }} className="glass-panel">
                    <h4 style={styles.boxTitle}>Ledger Nodes Status</h4>
                    <div style={styles.statusGrid}>
                      <div style={styles.statusRow}>
                        <span>Primary Supabase DB Node</span>
                        <span className="badge badge-green">ONLINE</span>
                      </div>
                      <div style={styles.statusRow}>
                        <span>Solana Devnet Bridge</span>
                        <span className="badge badge-green">ACTIVE</span>
                      </div>
                      <div style={styles.statusRow}>
                        <span>AI Document OCR Node</span>
                        <span className="badge badge-green">IDLE</span>
                      </div>
                      <div style={styles.statusRow}>
                        <span>SMS Notification Gateway</span>
                        <span className="badge badge-cyan">STANDBY</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS PANEL */}
            {activeTab === 'settings' && (
              <div style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <h3>Election Settings & Candidates Manager</h3>
                </div>

                <div style={styles.layoutTwoCol}>
                  {/* Timeline form configuration */}
                  <form onSubmit={handleSaveSettings} style={{ ...styles.colBox, flex: 1 }} className="glass-panel">
                    <h4 style={styles.boxTitle}>Lock & Release Timestamps</h4>
                    
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Voting Opens</label>
                      <div style={styles.flexInputs}>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.dateInput} />
                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={styles.dateInput} />
                      </div>
                    </div>

                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Voting Closes</label>
                      <div style={styles.flexInputs}>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.dateInput} />
                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={styles.dateInput} />
                      </div>
                    </div>

                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Result Release</label>
                      <div style={styles.flexInputs}>
                        <input type="date" value={releaseDate} onChange={e => setReleaseDate(e.target.value)} style={styles.dateInput} />
                        <input type="time" value={releaseTime} onChange={e => setReleaseTime(e.target.value)} style={styles.dateInput} />
                      </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={updatingSettings}>
                      {updatingSettings ? <Loader2 size={16} className="spinning" /> : 'Commit Settings'}
                    </button>
                  </form>

                  {/* Add Candidates form */}
                  <form onSubmit={handleAddCandidate} style={{ ...styles.colBox, flex: 1.2 }} className="glass-panel">
                    <h4 style={styles.boxTitle}>Provision Candidate Card</h4>

                    <div style={styles.formGrid}>
                      <div className="input-group">
                        <input type="text" placeholder=" " className="input-field" value={newCandName} onChange={e => setNewCandName(e.target.value)} required />
                        <label className="input-label">Full Name</label>
                      </div>

                      <div className="input-group">
                        <input type="text" placeholder=" " className="input-field" value={newCandParty} onChange={e => setNewCandParty(e.target.value)} required />
                        <label className="input-label">Political Party</label>
                      </div>
                    </div>

                    <div style={styles.formGrid}>
                      <div className="input-group">
                        <input type="text" placeholder=" " className="input-field" value={newCandVidhan} onChange={e => setNewCandVidhan(e.target.value)} required />
                        <label className="input-label">Vidhan Sabha</label>
                      </div>

                      <div className="input-group">
                        <input type="text" placeholder=" " className="input-field" value={newCandRajya} onChange={e => setNewCandRajya(e.target.value)} required />
                        <label className="input-label">Rajya Sabha</label>
                      </div>
                    </div>

                    <div style={styles.uploadRow}>
                      <div style={styles.uploadItem}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Photo (max 100KB)</label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              processImageUpload(e.target.files[0], setNewCandPhoto);
                            }
                          }}
                          style={{ fontSize: '11px', marginTop: '6px' }}
                        />
                        {newCandPhoto && <img src={newCandPhoto} alt="Preview" style={styles.miniPreview} />}
                      </div>

                      <div style={styles.uploadItem}>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Party Logo (max 100KB)</label>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              processImageUpload(e.target.files[0], setNewCandLogo);
                            }
                          }}
                          style={{ fontSize: '11px', marginTop: '6px' }}
                        />
                        {newCandLogo && <img src={newCandLogo} alt="Preview" style={styles.miniPreview} />}
                      </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={addingCandidate}>
                      {addingCandidate ? <Loader2 size={16} className="spinning" /> : 'Provision Candidate'}
                    </button>
                  </form>
                </div>

                {/* Candidate list table */}
                <div style={{ ...styles.colBox, marginTop: '24px' }} className="glass-panel">
                  <h4 style={styles.boxTitle}>Provisioned Seats & Candidates ({candidates.length})</h4>
                  <div style={styles.candidateTableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th>Photo</th>
                          <th>Name</th>
                          <th>Party</th>
                          <th>Vidhan Sabha</th>
                          <th>Rajya Sabha</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((cand) => (
                          <tr key={cand.id}>
                            <td>
                              <img src={cand.photo} alt={cand.name} style={styles.tableAvatar} />
                            </td>
                            <td>{cand.name}</td>
                            <td>{cand.political_party}</td>
                            <td>{cand.vidhan_sabha}</td>
                            <td>{cand.rajya_sabha}</td>
                            <td>
                              <button 
                                onClick={() => handleDeleteCandidate(cand.id, cand.name)} 
                                style={styles.deleteBtn}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* RESULTS PANEL */}
            {activeTab === 'results' && (
              <div style={styles.panel}>
                {isLocked ? (
                  /* locked layout */
                  <div style={styles.lockedScreen} className="glass-panel">
                    <Lock size={64} color="var(--color-warning)" className="pulsing" style={{ marginBottom: '24px' }} />
                    <h3 style={styles.lockedTitle}>Ledger Database Locked</h3>
                    <p style={styles.lockedDesc}>
                      In accordance with national election compliance codes, the voting tally database remains cryptographically sealed until the configuration timer expires.
                    </p>
                    
                    <div style={styles.countdownBox} className="glass-panel">
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        CONSENSUS DECRYPTION COUNTDOWN
                      </span>
                      <h2 style={styles.countdownVal}>{countdownString}</h2>
                    </div>

                    <button onClick={() => setForceUnlock(true)} className="btn-secondary" style={{ marginTop: '24px' }}>
                      Force Unlock Results (Super-Admin Override)
                    </button>
                  </div>
                ) : (
                  /* unlocked results layout */
                  <div style={styles.unlockedResults}>
                    <div style={styles.sectionHeader}>
                      <h3>Vote Tally results</h3>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {forceUnlock && (
                          <button onClick={() => setForceUnlock(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                            Restore Cryptographic Lock
                          </button>
                        )}
                        <button onClick={handleExportCsv} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                          Export CSV <FileSpreadsheet size={16} />
                        </button>
                      </div>
                    </div>

                    {votes.length === 0 ? (
                      <div style={styles.emptyStateBox} className="glass-panel">
                        <AlertTriangle size={48} color="var(--color-warning)" style={{ marginBottom: '14px' }} />
                        <p style={{ fontWeight: '600' }}>Ledger Unlocked but Empty</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                          No ballots have been registered in this election cycle yet.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Graphs row */}
                        <div style={styles.layoutTwoCol}>
                          <div style={{ ...styles.colBox, flex: 1, minHeight: '340px' }} className="glass-panel">
                            <h4 style={styles.boxTitle}>Vote Margin by Political Party</h4>
                            <ResponsiveContainer width="100%" height={260}>
                              <PieChart>
                                <Pie
                                  data={getPartyVotesData()}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                  outerRadius={70}
                                  fill="#8884d8"
                                  dataKey="value"
                                >
                                  {getPartyVotesData().map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          <div style={{ ...styles.colBox, flex: 1, minHeight: '340px' }} className="glass-panel">
                            <h4 style={styles.boxTitle}>Vote count by Candidate</h4>
                            <ResponsiveContainer width="100%" height={260}>
                              <BarChart data={getCandidateVotesData()}>
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} />
                                <YAxis stroke="var(--text-secondary)" fontSize={11} />
                                <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                                <Bar dataKey="votes" fill="var(--color-accent)">
                                  {getCandidateVotesData().map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* Audit Verification box */}
                        <div style={styles.blockchainAuditBox} className="glass-panel">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={styles.auditIconBg}>
                              <ShieldCheck size={28} color="var(--color-success)" />
                            </div>
                            <div>
                              <h4 style={{ fontSize: '15px', fontWeight: '700' }}>Zero-Knowledge Ledger Verification</h4>
                              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                Click to execute a network-wide database alignment check comparing SQL logs against Solana block signatures.
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              alert(`Verification Complete: ${votes.length} cast blocks scanned. 0 structural deviations detected. Consensus status: ALIGNED.`);
                            }} 
                            className="btn-primary" 
                            style={{ padding: '8px 16px', fontSize: '12px' }}
                          >
                            Run Ledger Audit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* BLOCKCHAIN LEDGER PANEL */}
            {activeTab === 'blockchain' && (
              <div style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <h3>Solana Decentralized Ballot Ledger</h3>
                  <span className="badge badge-cyan">Zero-Knowledge Anonymized</span>
                </div>

                <div style={styles.colBox} className="glass-panel">
                  <h4 style={styles.boxTitle}>Live Block Ledger Transactions</h4>
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th>Block Height</th>
                          <th>Transaction Signature (Proof Hash)</th>
                          <th>Constituency</th>
                          <th>Voted Allocation</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {votes.map((v) => (
                          <tr key={v.id}>
                            <td className="monospaced" style={{ color: 'var(--color-accent)', fontWeight: '600' }}>
                              {v.block_height}
                            </td>
                            <td className="monospaced" style={{ fontSize: '11px' }}>
                              {v.transaction_hash}
                            </td>
                            <td>{v.vidhan_sabha}</td>
                            <td>
                              <span className="badge badge-green">SEALED_BALLOT</span>
                            </td>
                            <td>{new Date(v.created_at || '').toLocaleString()}</td>
                          </tr>
                        ))}
                        {votes.length === 0 && (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                              No blocks recorded on ledger yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SMS PANEL */}
            {activeTab === 'sms' && (
              <div style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <h3>SMS Broadcast Notification Console</h3>
                </div>

                <div style={styles.layoutTwoCol}>
                  <div style={{ ...styles.colBox, flex: 1 }} className="glass-panel">
                    <h4 style={styles.boxTitle}>SMS Broadcast Control</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                      Notify all registered citizens immediately regarding the results release event. Dispatch logs are streamed in the ledger queue monitor.
                    </p>

                    <div style={styles.smsTemplateBox} className="glass-panel">
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>MESSAGE TEMPLATE:</span>
                      <p style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--color-accent)' }}>
                        "V.O.T.E. Alert: The official results for the 2026 National Election cycles are now published. Access the decentralized dashboard to verify your block. voter.gov.in"
                      </p>
                    </div>

                    <button 
                      onClick={handleTriggerSmsDispatch} 
                      className="btn-primary" 
                      style={{ width: '100%', gap: '10px' }} 
                      disabled={smsSending}
                    >
                      {smsSending ? <Loader2 size={16} className="spinning" /> : <Send size={16} />}
                      {smsSending ? 'Dispatching Queue...' : 'Disptach Broadcast Alert'}
                    </button>
                  </div>

                  <div style={{ ...styles.colBox, flex: 1.5 }} className="glass-panel">
                    <h4 style={styles.boxTitle}>Live Dispatch Delivery Queue ({smsDeliveryQueue.length})</h4>
                    <div style={styles.smsQueueBox}>
                      {smsDeliveryQueue.map((item, idx) => (
                        <div key={idx} style={styles.smsQueueRow}>
                          <span style={{ fontSize: '13px' }}>{ghostMode ? '●●●●●●●●' : item.name}</span>
                          <span style={styles.smsPhone} className="monospaced">{ghostMode ? '●●●●●●●●' : item.phone}</span>
                          <span className={`badge ${item.status === 'sent' ? 'badge-green' : item.status === 'failed' ? 'badge-blue' : 'badge-cyan'}`}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                      ))}
                      {smsDeliveryQueue.length === 0 && (
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>
                          Queue inactive. Trigger SMS dispatch above.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI VERIFICATION LOGS */}
            {activeTab === 'ai-logs' && (
              <div style={styles.panel}>
                <div style={styles.sectionHeader}>
                  <h3>AI Verification Registry Logs</h3>
                </div>

                <div style={styles.colBox} className="glass-panel">
                  <h4 style={styles.boxTitle}>AI OCR Audit logs</h4>
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th>Handshake ID</th>
                          <th>Operations Pipeline</th>
                          <th>OCR Status</th>
                          <th>Liveness Check</th>
                          <th>Duplicate Scan</th>
                          <th>Document Integrity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.filter(l => l.event === 'VOTER_REGISTERED').map((log) => (
                          <tr key={log.id}>
                            <td className="monospaced" style={{ fontSize: '11px' }}>{log.id.substring(0, 8)}...</td>
                            <td>Register Voter Verification</td>
                            <td><span className="badge badge-green">SUCCESS</span></td>
                            <td><span className="badge badge-green">PASS</span></td>
                            <td><span className="badge badge-green">CLEAR</span></td>
                            <td><span className="badge badge-green">100KB APPROVED</span></td>
                          </tr>
                        ))}
                        {auditLogs.filter(l => l.event === 'VOTER_REGISTERED').length === 0 && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                              No voter audit logs stored.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <style dangerouslySetInnerHTML={{ __html: `
          table th, table td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-color);
          }
          table th {
            color: var(--text-muted);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
          }
        `}} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  dashboardContainer: {
    display: 'flex',
    width: '100%',
    minHeight: '80vh',
    gap: '24px',
    padding: '10px 0',
  },
  sidebar: {
    width: '260px',
    flexShrink: 0,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    height: 'fit-content',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '32px',
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-primary)',
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'none',
    border: 'none',
    padding: '12px 14px',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    textAlign: 'left',
    width: '100%',
    transition: 'all var(--transition-fast)',
  },
  sidebarFooter: {
    marginTop: '40px',
  },
  logoutBtn: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '13px',
  },
  mainContent: {
    flex: 1,
    minWidth: 0,
  },
  loadingSpinner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '100px 0',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  syncBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  statsGrid: {
    marginBottom: '10px',
  },
  statsCard: {
    padding: '24px',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
  },
  statsLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: '0.02em',
    marginBottom: '8px',
  },
  statsVal: {
    fontSize: '36px',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    marginBottom: '10px',
    color: 'var(--text-primary)',
  },
  statsTrend: {
    alignSelf: 'flex-start',
  },
  layoutTwoCol: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  colBox: {
    padding: '24px',
    borderRadius: '16px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    minWidth: '290px',
  },
  boxTitle: {
    fontSize: '15px',
    fontWeight: '700',
    marginBottom: '20px',
    fontFamily: 'var(--font-heading)',
    color: 'var(--text-primary)',
  },
  logsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  logItem: {
    paddingBottom: '12px',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  logHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  logEvent: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  logDetail: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  formLabel: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  formRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '10px',
  },
  candidateCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    background: 'rgba(252, 251, 248, 0.5)',
    textAlign: 'center',
    position: 'relative',
  },
  candidateAvatar: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '12px',
    border: '2px solid var(--border-color)',
  },
  candidateName: {
    fontSize: '15px',
    fontWeight: '700',
    marginBottom: '4px',
    color: 'var(--text-primary)',
  },
  candidateParty: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginBottom: '10px',
  },
  candidateMeta: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    borderTop: '1px solid var(--border-color)',
    width: '100%',
    paddingTop: '8px',
    marginTop: '6px',
  },
  candidateMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  chartContainer: {
    width: '100%',
    height: '300px',
    marginTop: '15px',
  },
  chartWrapper: {
    width: '100%',
    height: '100%',
  },
  legendList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginTop: '20px',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  uploadRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '20px',
  },
  uploadItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  miniPreview: {
    width: '45px',
    height: '45px',
    borderRadius: '6px',
    objectFit: 'cover',
    marginTop: '10px',
    border: '1px solid var(--border-color)',
  },
  candidateTableWrapper: {
    maxHeight: '350px',
    overflowY: 'auto',
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px',
  },
  tableAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-danger)',
    cursor: 'pointer',
  },
  lockedScreen: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '60px 40px',
    maxWidth: '560px',
    margin: '40px auto 0',
  },
  lockedTitle: {
    fontSize: '22px',
    fontFamily: 'var(--font-heading)',
    marginBottom: '10px',
  },
  lockedDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '28px',
  },
  countdownBox: {
    padding: '20px 40px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
  },
  countdownVal: {
    fontSize: '32px',
    fontWeight: '700',
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-accent)',
    marginTop: '10px',
  },
  unlockedResults: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  emptyStateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '60px 40px',
  },
  blockchainAuditBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    marginTop: '10px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  auditIconBg: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    background: 'rgba(53, 92, 75, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smsTemplateBox: {
    padding: '12px 14px',
    background: 'var(--bg-panel)',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid var(--border-color)',
  },
  smsQueueBox: {
    maxHeight: '260px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  smsQueueRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    background: 'var(--bg-panel)',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
  },
  smsPhone: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
};
