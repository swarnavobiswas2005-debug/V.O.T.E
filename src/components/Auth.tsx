import React, { useState } from 'react';
import { supabase } from '../supabase';
import type { Voter } from '../supabase';
import { 
  Fingerprint, Eye, EyeOff, CheckCircle2, 
  Loader2, ArrowRight, ShieldCheck, 
  Scan, AlertTriangle 
} from 'lucide-react';

interface AuthProps {
  initialRole?: 'voter' | 'government';
  ghostMode?: boolean;
  onLoginSuccess: (userRole: 'voter' | 'government', voterData?: Voter) => void;
  onNavigateToRegister: () => void;
}

type AuthMode = 'select' | 'voter-form' | 'gov-form' | 'otp' | 'biometric' | 'verifying' | 'success';

export const Auth: React.FC<AuthProps> = ({ initialRole, ghostMode = false, onLoginSuccess, onNavigateToRegister }) => {
  const [role, setRole] = useState<'voter' | 'government'>(initialRole || 'voter');
  const [mode, setMode] = useState<AuthMode>(initialRole ? (initialRole === 'voter' ? 'voter-form' : 'gov-form') : 'select');
  
  // Voter Inputs
  const [voterId, setVoterId] = useState('');
  const [phone, setPhone] = useState('');
  
  // Gov Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP Inputs
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  
  // Feedback States
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'faceid'>('fingerprint');
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [activeVoter, setActiveVoter] = useState<Voter | undefined>(undefined);

  // Initial Voter ID Lookup
  const handleVoterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterId || !phone) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      // Query voter from Supabase
      const { data, error } = await supabase
        .from('voters')
        .select('*')
        .eq('voter_id_number', voterId.trim().toUpperCase())
        .single();

      if (error || !data) {
        setErrorMsg('Voter ID not found. Please register first.');
        setLoading(false);
        return;
      }

      const voter = data as Voter;
      if (!voter.is_verified) {
        setErrorMsg('Your registration is pending AI/Government verification.');
        setLoading(false);
        return;
      }

      // Check if phone matches (mock comparison)
      const cleanPhone = phone.replace(/\D/g, '');
      const dbPhone = voter.phone_number.replace(/\D/g, '');
      if (cleanPhone && dbPhone && !dbPhone.includes(cleanPhone) && !cleanPhone.includes(dbPhone)) {
        setErrorMsg('Phone number does not match registered details.');
        setLoading(false);
        return;
      }

      setActiveVoter(voter);
      // Proceed to OTP step
      setMode('otp');
    } catch (err) {
      console.error(err);
      setErrorMsg('Database query error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Government Admin Submit
  const handleGovSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please fill in email and password.');
      return;
    }
    setErrorMsg('');
    
    // Simulate Admin Auth
    if (email === 'admin@vote.gov' && password === 'secure2026') {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setMode('otp');
      }, 1000);
    } else {
      setErrorMsg('Invalid government credentials.');
    }
  };

  // Handle OTP Inputs
  const handleOtpChange = (index: number, val: string) => {
    if (isNaN(Number(val))) return;
    const newOtp = [...otpCode];
    newOtp[index] = val.substring(val.length - 1);
    setOtpCode(newOtp);

    // Focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpCode.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter a 6-digit OTP.');
      return;
    }
    setErrorMsg('');
    
    if (role === 'voter') {
      // Voter goes to biometric setup
      setBiometricType(Math.random() > 0.5 ? 'faceid' : 'fingerprint');
      setMode('biometric');
    } else {
      // Gov dashboard doesn't need biometrics, goes to verification
      triggerVerifyingAnimation();
    }
  };

  // Biometric scanner execution
  const startBiometricScan = () => {
    if (biometricScanning) return;
    setErrorMsg('');
    setBiometricScanning(true);

    setTimeout(() => {
      setBiometricScanning(false);
      triggerVerifyingAnimation();
    }, 3000);
  };

  // AI & Blockchain verification animation
  const triggerVerifyingAnimation = () => {
    setMode('verifying');
    // Simulate verification delay
    setTimeout(() => {
      setMode('success');
      // Final delay to let user see success screen
      setTimeout(() => {
        onLoginSuccess(role, activeVoter);
      }, 1500);
    }, 3500);
  };

  return (
    <div style={styles.authContainer} className="clickable">
      {/* Aurora effects inside container */}
      <div style={styles.meshBlob} />
      
      <div style={styles.authCard} className="glass-panel">
        
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.badgeRow}>
            <span className="badge badge-cyan">
              <span className="status-indicator online" style={{ marginRight: '6px' }} />
              SECURE LEDGER CHANNEL
            </span>
          </div>
          <h2 style={styles.title}>
            {role === 'voter' ? 'Voter Gateway' : 'Government Terminal'}
          </h2>
          <p style={styles.subtitle}>
            {mode === 'select' && 'Verify your credentials to access the digital state ballot'}
            {mode === 'voter-form' && 'Enter your national identity and verified phone number'}
            {mode === 'gov-form' && 'Establish encrypted session connection'}
            {mode === 'otp' && `Secure SMS code sent to your registered endpoint`}
            {mode === 'biometric' && 'Verification requires active biometric confirmation'}
            {mode === 'verifying' && 'Syncing ledger hashes and validating zero-knowledge proofs'}
            {mode === 'success' && 'Encrypted session established successfully'}
          </p>
        </div>

        {errorMsg && (
          <div style={styles.errorAlert} className="glass-panel">
            <AlertTriangle size={18} color="var(--color-danger)" style={{ flexShrink: 0 }} />
            <span style={styles.errorText}>{errorMsg}</span>
          </div>
        )}

        {/* 1. SELECT ROLE SCREEN */}
        {mode === 'select' && (
          <div style={styles.selectionGrid}>
            <button 
              onClick={() => { setRole('voter'); setMode('voter-form'); }}
              style={styles.roleButton}
              className="glass-panel"
            >
              <div style={styles.roleIconBg}>
                <Fingerprint size={28} color="var(--color-accent)" />
              </div>
              <span style={styles.roleTitle}>Log in as Voter</span>
              <span style={styles.roleDesc}>Verify identity, scan biometrics & cast secure anonymous ballot</span>
            </button>

            <button 
              onClick={() => { setRole('government'); setMode('gov-form'); }}
              style={styles.roleButton}
              className="glass-panel"
            >
              <div style={styles.roleIconBg}>
                <ShieldCheck size={28} color="var(--color-primary)" />
              </div>
              <span style={styles.roleTitle}>Government Node</span>
              <span style={styles.roleDesc}>Access parameters, manage candidates & view audited results graphs</span>
            </button>
          </div>
        )}

        {/* 2. VOTER FORM */}
        {mode === 'voter-form' && (
          <form onSubmit={handleVoterSubmit} style={styles.form}>
            <div className="input-group">
              <input 
                type={ghostMode ? 'password' : 'text'} 
                placeholder=" "
                className="input-field" 
                value={voterId} 
                onChange={(e) => setVoterId(e.target.value)}
                required
              />
              <label className="input-label">Voter ID Card Number</label>
            </div>

            <div className="input-group">
              <input 
                type={ghostMode ? 'password' : 'tel'} 
                placeholder=" "
                className="input-field" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <label className="input-label">Registered Phone Number</label>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="spinning" size={20} />
              ) : (
                <>Request Access <ArrowRight size={18} /></>
              )}
            </button>

            <div style={styles.footerLinks}>
              <button 
                type="button" 
                onClick={onNavigateToRegister}
                style={styles.textLink}
              >
                Not registered? Enroll here
              </button>
              <button 
                type="button" 
                onClick={() => setMode('select')}
                style={styles.backBtn}
              >
                Back to gateway
              </button>
            </div>
          </form>
        )}

        {/* 3. GOVERN MENT FORM */}
        {mode === 'gov-form' && (
          <form onSubmit={handleGovSubmit} style={styles.form}>
            <div className="input-group">
              <input 
                type="email" 
                placeholder=" "
                className="input-field" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label className="input-label">Admin Email Address</label>
            </div>

            <div className="input-group" style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder=" "
                className="input-field" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <label className="input-label">Security Keyphrase</label>
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div style={styles.infoBox}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Demo Credentials: <strong>admin@vote.gov</strong> / <strong>secure2026</strong>
              </span>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="spinning" size={20} />
              ) : (
                <>Connect Terminal <ArrowRight size={18} /></>
              )}
            </button>

            <button 
              type="button" 
              onClick={() => setMode('select')}
              style={{ ...styles.backBtn, alignSelf: 'center', marginTop: '12px' }}
            >
              Back to gateway
            </button>
          </form>
        )}

        {/* 4. SMS OTP VERIFICATION */}
        {mode === 'otp' && (
          <form onSubmit={handleOtpSubmit} style={styles.form}>
            <div style={styles.otpGrid}>
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  style={styles.otpInput}
                  className="glass-panel"
                />
              ))}
            </div>
            
            <p style={styles.otpTip}>
              A 6-digit cryptographic verification pin was dispatched to registered endpoint.
            </p>

            <button type="submit" className="btn-primary" style={styles.submitBtn}>
              Verify Passcode <ArrowRight size={18} />
            </button>

            <button 
              type="button" 
              onClick={() => setMode(role === 'voter' ? 'voter-form' : 'gov-form')}
              style={{ ...styles.backBtn, alignSelf: 'center', marginTop: '12px' }}
            >
              Back
            </button>
          </form>
        )}

        {/* 5. BIOMETRICS SCREEN */}
        {mode === 'biometric' && (
          <div style={styles.biometricArea}>
            {biometricType === 'fingerprint' ? (
              <div 
                style={{ 
                  ...styles.scannerCircle, 
                  borderColor: biometricScanning ? 'var(--color-accent)' : 'var(--border-color)',
                  boxShadow: biometricScanning ? '0 0 30px var(--color-accent-glow)' : 'none'
                }}
                onClick={startBiometricScan}
              >
                <Fingerprint 
                  size={64} 
                  color={biometricScanning ? 'var(--color-accent)' : 'var(--text-secondary)'} 
                  className={biometricScanning ? 'pulsing' : ''}
                />
                {biometricScanning && <div style={styles.scanBar} />}
              </div>
            ) : (
              <div 
                style={{ 
                  ...styles.scannerCircle, 
                  borderColor: biometricScanning ? 'var(--color-accent)' : 'var(--border-color)',
                  boxShadow: biometricScanning ? '0 0 30px var(--color-accent-glow)' : 'none'
                }}
                onClick={startBiometricScan}
              >
                <Scan 
                  size={64} 
                  color={biometricScanning ? 'var(--color-accent)' : 'var(--text-secondary)'} 
                  className={biometricScanning ? 'pulsing' : ''}
                />
                {biometricScanning && <div style={styles.scanBar} />}
              </div>
            )}

            <button 
              type="button"
              className={biometricScanning ? 'btn-secondary' : 'btn-primary'}
              onClick={startBiometricScan}
              disabled={biometricScanning}
              style={{ minWidth: '200px' }}
            >
              {biometricScanning ? 'Scanning...' : `Initiate ${biometricType === 'fingerprint' ? 'Fingerprint Scan' : 'Face ID Scan'}`}
            </button>

            <p style={styles.biometricTip}>
              {biometricScanning 
                ? 'Keep device stationary. Reading local biometric attributes...'
                : 'Click to start scanner. Biometric coordinates remain secure within device sandbox.'
              }
            </p>
          </div>
        )}

        {/* 6. VERIFYING ANIMATION (OCR, CHAIN BLOCKCHECK) */}
        {mode === 'verifying' && (
          <div style={styles.verifyConsole}>
            <div style={styles.loaderArea}>
              <Loader2 size={48} color="var(--color-accent)" className="spinning" />
            </div>
            
            <div style={styles.consoleLogBox} className="glass-panel">
              <div style={styles.consoleLogLine}>[SYSTEM] Resolving voter access logs...</div>
              <div style={styles.consoleLogLine}>[SYSTEM] Opening encrypted handshake tunnel...</div>
              <div style={styles.consoleLogLine}>[BLOCKCHAIN] Pulling verified ledger hash index...</div>
              <div style={styles.consoleLogLine}>[AI-AGENT] Validating Face ID vectors & Liveness check...</div>
              <div style={styles.consoleLogLine}>[SECURITY] Zero-knowledge proof verified. Token signed.</div>
            </div>
          </div>
        )}

        {/* 7. SUCCESS SCREEN */}
        {mode === 'success' && (
          <div style={styles.successArea}>
            <CheckCircle2 size={72} color="var(--color-success)" className="pulsing" />
            <h3 style={styles.successHeading}>Handshake Authorized</h3>
            <p style={styles.successSubtext}>Session key generated. Redirecting to ballot...</p>
          </div>
        )}

      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .spinning {
          animation: spin 1s linear infinite;
        }
        .pulsing {
          animation: pulse 1.5s infinite ease-in-out;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.08); opacity: 1; }
        }
      `}} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  authContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    minHeight: '80vh',
    position: 'relative',
    padding: '20px',
  },
  meshBlob: {
    position: 'absolute',
    width: '350px',
    height: '350px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(53,92,75,0.08) 0%, transparent 70%)',
    top: '10%',
    left: '10%',
    zIndex: 0,
    filter: 'blur(50px)',
  },
  authCard: {
    width: '100%',
    maxWidth: '520px',
    padding: '40px',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  badgeRow: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '14px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '10px',
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-primary)',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
  },
  selectionGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '10px',
  },
  roleButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: '24px',
    textAlign: 'left',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  roleIconBg: {
    width: '50px',
    height: '50px',
    borderRadius: '10px',
    background: 'rgba(53, 92, 75, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    border: '1px solid rgba(53, 92, 75, 0.15)',
  },
  roleTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--color-primary)',
    marginBottom: '6px',
    fontFamily: 'var(--font-heading)',
  },
  roleDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    marginTop: '10px',
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
  },
  textLink: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '5px 0',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '5px 0',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    top: '18px',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  infoBox: {
    marginBottom: '20px',
    padding: '10px',
    background: 'rgba(53, 92, 75, 0.03)',
    borderRadius: '6px',
    borderLeft: '2px solid var(--color-primary)',
  },
  otpGrid: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '20px',
    marginTop: '10px',
  },
  otpInput: {
    width: '50px',
    height: '55px',
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    background: 'rgba(252, 251, 248, 0.7)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.2s',
  },
  otpTip: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginBottom: '24px',
    lineHeight: '1.4',
  },
  biometricArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 0',
  },
  scannerCircle: {
    width: '130px',
    height: '130px',
    borderRadius: '50%',
    border: '2px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    marginBottom: '28px',
    position: 'relative',
    overflow: 'hidden',
    background: 'var(--bg-secondary)',
    transition: 'all 0.3s ease',
  },
  scanBar: {
    position: 'absolute',
    left: 0,
    width: '100%',
    height: '3px',
    backgroundColor: 'var(--color-primary)',
    boxShadow: '0 0 10px var(--color-primary)',
    animation: 'scan-move 2.5s infinite linear',
  },
  biometricTip: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    marginTop: '20px',
    maxWidth: '320px',
  },
  verifyConsole: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 0',
  },
  loaderArea: {
    marginBottom: '24px',
  },
  consoleLogBox: {
    width: '100%',
    background: '#1F1F1F',
    padding: '20px',
    borderRadius: '10px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: 'var(--color-accent)',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    border: '1px solid rgba(197, 164, 109, 0.15)',
  },
  consoleLogLine: {
    lineHeight: '1.4',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    borderRight: '2px solid transparent',
    animation: 'type-line 3s steps(40, end) infinite',
  },
  successArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '30px 0',
    gap: '20px',
  },
  successHeading: {
    fontSize: '22px',
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-success)',
  },
  successSubtext: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px',
    marginBottom: '24px',
    borderRadius: '10px',
    border: '1px solid rgba(168, 106, 74, 0.2)',
    background: 'rgba(168, 106, 74, 0.05)',
  },
  errorText: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
};
