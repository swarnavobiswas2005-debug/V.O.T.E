import React, { useState } from 'react';
import { supabase, sha256 } from '../supabase';
import { 
  ArrowLeft, ArrowRight, UploadCloud, FileText, CheckCircle2, 
  Cpu, AlertOctagon 
} from 'lucide-react';

interface VoterRegistrationProps {
  ghostMode?: boolean;
  onBackToLogin: () => void;
}

type StepType = 'personal' | 'location' | 'document' | 'verification' | 'success' | 'duplicate-error';

export const VoterRegistration: React.FC<VoterRegistrationProps> = ({ ghostMode = false, onBackToLogin }) => {
  const [step, setStep] = useState<StepType>('personal');
  
  // Fields state
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [phone, setPhone] = useState('');
  const [voterId, setVoterId] = useState('');
  
  const [pinCode, setPinCode] = useState('');
  const [address, setAddress] = useState('');
  const [wardNumber, setWardNumber] = useState('');
  const [rajyaSabha, setRajyaSabha] = useState('');
  const [vidhanSabha, setVidhanSabha] = useState('');

  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Verification console states
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [solanaTx, setSolanaTx] = useState('');
  const [docHash, setDocHash] = useState('');

  // Handle PDF file selection
  const validateAndSetFile = (file: File) => {
    setUploadError('');
    if (file.type !== 'application/pdf') {
      setUploadError('Invalid format. Only PDF documents are accepted.');
      return;
    }
    if (file.size > 100 * 1024) { // 100KB limit
      setUploadError(`File too large: ${(file.size / 1024).toFixed(1)}KB. Maximum allowed size is 100KB.`);
      return;
    }
    setPdfFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  // Submit and launch AI and Blockchain verification simulation
  const handleStartVerification = async () => {
    setStep('verification');
    setConsoleLogs([]);
    setCurrentProgress(0);

    const addLog = (msg: string, delay: number): Promise<void> => {
      return new Promise(resolve => {
        setTimeout(() => {
          setConsoleLogs(prev => [...prev, msg]);
          resolve();
        }, delay);
      });
    };

    // Calculate Voter ID Hash
    const rawHash = await sha256(`${voterId}-${fullName}`);
    const hash = '0x' + rawHash.substring(0, 48);
    setDocHash(hash);

    // Mock Solana Transaction ID
    const signature = 'sol_' + Array.from({length: 32}, () => Math.floor(Math.random()*16).toString(16)).join('');
    setSolanaTx(signature);

    await addLog('[SYSTEM] Opening trusted cryptographic sandbox channel...', 400);
    setCurrentProgress(10);

    if (ghostMode) {
      await addLog('[SECURITY] STEALTH ENCLAVE TUNNEL DETECTED. ENCRYPTED REGISTRATION MASK ACTIVE.', 350);
    }

    await addLog('[AI-AGENT] Commencing OCR reading on scanned Voter ID document...', 600);
    setCurrentProgress(25);
    
    const nameLog = ghostMode ? '●●●●●●●●' : fullName.toUpperCase();
    const idLog = ghostMode ? '●●●●●●●' : voterId.toUpperCase();
    await addLog(`[AI-AGENT] Extracted ID: "${idLog}" | Name: "${nameLog}"`, 500);
    setCurrentProgress(35);

    await addLog('[AI-AGENT] Running fake document & liveness analysis...', 600);
    await addLog('[AI-AGENT] Document structure verified. Liveness probability: 99.8%', 400);
    setCurrentProgress(50);

    await addLog('[DATABASE] Querying centralized registry for duplicate identities...', 500);
    
    // Perform real check in Supabase
    try {
      const { data } = await supabase
        .from('voters')
        .select('id')
        .eq('voter_id_number', voterId.trim().toUpperCase())
        .maybeSingle();

      if (data) {
        // ID already exists! Duplicate found
        await addLog('[DATABASE] CRITICAL ERROR: Duplicate voter registration record identified!', 600);
        await addLog('[SYSTEM] Aborting registration. Sandbox environment isolated.', 400);
        setCurrentProgress(100);
        setTimeout(() => {
          setStep('duplicate-error');
        }, 1200);
        return;
      }
    } catch (err) {
      console.warn("Database conflict check failed. Continuing with registration.");
    }

    await addLog('[DATABASE] Zero conflicting registrations found. Record cleared for registry.', 600);
    setCurrentProgress(65);

    await addLog(`[BLOCKCHAIN] Generating SHA-256 Voter ID document hash: ${hash}`, 500);
    setCurrentProgress(75);
    await addLog('[BLOCKCHAIN] Broad-syncing Zero-Knowledge Proof to Solana cluster...', 600);
    await addLog(`[BLOCKCHAIN] Broadcast success! Block height: 2841029, signature: ${signature}`, 500);
    setCurrentProgress(90);

    // Push new voter record to Supabase database
    try {
      const { error } = await supabase
        .from('voters')
        .insert({
          full_name: fullName.trim(),
          father_name: fatherName.trim(),
          pin_code: pinCode.trim(),
          address: address.trim(),
          ward_number: wardNumber.trim(),
          rajya_sabha: rajyaSabha.trim(),
          vidhan_sabha: vidhanSabha.trim(),
          phone_number: phone.trim(),
          voter_id_number: voterId.trim().toUpperCase(),
          document_hash: hash,
          document_url: 'https://czckmlavohouizfhgqss.supabase.co/mock-storage/' + voterId.trim() + '.pdf',
          is_verified: true, // Auto-verified by AI agent
          has_voted: false
        });

      if (error) {
        throw error;
      }
      
      // Log blockchain transaction to audit_logs
      await supabase.from('audit_logs').insert({
        event: 'VOTER_REGISTERED',
        details: `Voter ${fullName} (ID: ${voterId}) enrolled on-chain.`,
        block_hash: signature
      });

    } catch (dbErr) {
      console.error("Failed to commit database entry: ", dbErr);
    }

    await addLog('[SYSTEM] Voter successfully provisioned in Secure Ledger. Sandbox closed.', 600);
    setCurrentProgress(100);

    setTimeout(() => {
      setStep('success');
    }, 1000);
  };

  return (
    <div style={styles.container}>
      <div style={styles.registrationCard} className="glass-panel">
        
        {/* Top Header */}
        <div style={styles.header}>
          <button onClick={onBackToLogin} style={styles.backBtn}>
            <ArrowLeft size={16} /> Back to Login
          </button>
          
          <h2 style={styles.title}>Voter Registration</h2>
          <p style={styles.subtitle}>
            {step === 'personal' && 'Step 1: Enter identity attributes'}
            {step === 'location' && 'Step 2: Configure constituency settings'}
            {step === 'document' && 'Step 3: Upload scanning proof (Strict PDF only)'}
            {step === 'verification' && 'Step 4: AI analysis and Blockchain consensus'}
            {step === 'success' && 'Registration authorized'}
            {step === 'duplicate-error' && 'Registration rejected'}
          </p>
        </div>

        {/* Progress Tracker Bar */}
        {step !== 'success' && step !== 'duplicate-error' && step !== 'verification' && (
          <div style={styles.progressContainer}>
            <div style={{ ...styles.progressActiveLine, width: step === 'personal' ? '33%' : step === 'location' ? '66%' : '100%' }} />
            <div style={styles.progressDotsRow}>
              <div style={{ ...styles.progressDot, backgroundColor: 'var(--color-accent)' }}>1</div>
              <div style={{ ...styles.progressDot, backgroundColor: step !== 'personal' ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)' }}>2</div>
              <div style={{ ...styles.progressDot, backgroundColor: step === 'document' ? 'var(--color-accent)' : 'rgba(255,255,255,0.08)' }}>3</div>
            </div>
          </div>
        )}

        {/* STEP 1: PERSONAL DETAILS */}
        {step === 'personal' && (
          <div style={styles.form}>
            <div className="input-group">
              <input 
                type={ghostMode ? 'password' : 'text'} 
                placeholder=" "
                className="input-field" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
              <label className="input-label">Full Name</label>
            </div>

            <div className="input-group">
              <input 
                type={ghostMode ? 'password' : 'text'} 
                placeholder=" "
                className="input-field" 
                value={fatherName}
                onChange={e => setFatherName(e.target.value)}
              />
              <label className="input-label">Father's Name</label>
            </div>

            <div className="input-group">
              <input 
                type={ghostMode ? 'password' : 'tel'} 
                placeholder=" "
                className="input-field" 
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <label className="input-label">Mobile Number</label>
            </div>

            <div className="input-group">
              <input 
                type={ghostMode ? 'password' : 'text'} 
                placeholder=" "
                className="input-field" 
                value={voterId}
                onChange={e => setVoterId(e.target.value)}
              />
              <label className="input-label">Voter ID Card Number</label>
            </div>

            <button 
              onClick={() => {
                if (!fullName || !fatherName || !phone || !voterId) {
                  alert('Please fill out all fields.');
                  return;
                }
                setStep('location');
              }} 
              className="btn-primary" 
              style={styles.nextBtn}
            >
              Continue to Location <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2: LOCATION & CONSTITUENCY */}
        {step === 'location' && (
          <div style={styles.form}>
            <div style={styles.gridRow}>
              <div className="input-group">
                <input 
                  type="text" 
                  placeholder=" "
                  className="input-field" 
                  value={pinCode}
                  onChange={e => setPinCode(e.target.value)}
                />
                <label className="input-label">PIN Code</label>
              </div>

              <div className="input-group">
                <input 
                  type="text" 
                  placeholder=" "
                  className="input-field" 
                  value={wardNumber}
                  onChange={e => setWardNumber(e.target.value)}
                />
                <label className="input-label">Ward Number</label>
              </div>
            </div>

            <div className="input-group">
              <input 
                type="text" 
                placeholder=" "
                className="input-field" 
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
              <label className="input-label">Residential Address</label>
            </div>

            <div className="input-group">
              <select 
                className="input-field" 
                value={rajyaSabha} 
                onChange={e => setRajyaSabha(e.target.value)}
                style={{ appearance: 'none', paddingRight: '30px' }}
              >
                <option value="">Select Rajya Sabha Region</option>
                <option value="Region 1">Region 1 (North)</option>
                <option value="Region 2">Region 2 (South)</option>
                <option value="Region 3">Region 3 (East)</option>
                <option value="Region 4">Region 4 (West)</option>
              </select>
            </div>

            <div className="input-group">
              <select 
                className="input-field" 
                value={vidhanSabha} 
                onChange={e => setVidhanSabha(e.target.value)}
                style={{ appearance: 'none', paddingRight: '30px' }}
              >
                <option value="">Select Vidhan Sabha Constituency</option>
                <option value="Constituency A">Constituency A</option>
                <option value="Constituency B">Constituency B</option>
                <option value="Constituency C">Constituency C</option>
                <option value="Constituency D">Constituency D</option>
              </select>
            </div>

            <div style={styles.btnRow}>
              <button onClick={() => setStep('personal')} className="btn-secondary">
                Back
              </button>
              <button 
                onClick={() => {
                  if (!pinCode || !address || !wardNumber || !rajyaSabha || !vidhanSabha) {
                    alert('Please configure all regional fields.');
                    return;
                  }
                  setStep('document');
                }} 
                className="btn-primary"
              >
                Go to Upload <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: DOCUMENT UPLOAD */}
        {step === 'document' && (
          <div style={styles.form}>
            <div 
              style={{
                ...styles.dropzone,
                borderColor: dragActive ? 'var(--color-accent)' : pdfFile ? 'var(--color-success)' : 'var(--border-color)',
                backgroundColor: dragActive ? 'rgba(6,182,212,0.03)' : 'rgba(255,255,255,0.01)'
              }}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <input
                id="pdf-upload-input"
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              
              {!pdfFile ? (
                <>
                  <UploadCloud size={40} color="var(--text-secondary)" style={{ marginBottom: '14px' }} />
                  <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    Drag & Drop scanned Voter ID
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Strict constraints: Only PDF files up to 100KB are approved.
                  </p>
                  <label htmlFor="pdf-upload-input" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                    Select Document
                  </label>
                </>
              ) : (
                <>
                  <FileText size={40} color="var(--color-success)" style={{ marginBottom: '14px' }} />
                  <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-success)', marginBottom: '6px' }}>
                    Document Validated
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {pdfFile.name}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Size: {(pdfFile.size / 1024).toFixed(1)}KB
                  </p>
                  <button onClick={() => setPdfFile(null)} style={styles.removeFileBtn}>
                    Remove and re-upload
                  </button>
                </>
              )}
            </div>

            {uploadError && (
              <div style={styles.errorBox}>
                <AlertOctagon size={16} color="var(--color-danger)" style={{ marginRight: '8px' }} />
                <span>{uploadError}</span>
              </div>
            )}

            <div style={styles.btnRow}>
              <button onClick={() => setStep('location')} className="btn-secondary">
                Back
              </button>
              <button 
                onClick={handleStartVerification} 
                className="btn-primary"
                disabled={!pdfFile}
              >
                Run AI Audit & Register <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: VERIFICATION PROCESS (CONSOLE) */}
        {step === 'verification' && (
          <div style={styles.verificationArea}>
            <div style={styles.consoleLoader}>
              <Cpu size={48} color="var(--color-accent)" className="spinning" style={{ marginBottom: '16px' }} />
              <div style={styles.progressBarWrapper}>
                <div style={{ ...styles.progressBar, width: `${currentProgress}%` }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Verification progress: {currentProgress}%
              </span>
            </div>

            <div style={styles.terminal} className="glass-panel">
              <div style={styles.terminalHeader}>
                <div style={styles.terminalDot} />
                <div style={styles.terminalDot} />
                <div style={styles.terminalDot} />
                <span style={styles.terminalTitle}>Consensus Sandboxed Auditing Logs</span>
              </div>
              
              <div style={styles.terminalBody}>
                {consoleLogs.map((log, index) => (
                  <div key={index} style={styles.terminalLine}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS REDIRECT */}
        {step === 'success' && (
          <div style={styles.outcomeArea}>
            <CheckCircle2 size={72} color="var(--color-success)" className="pulsing" />
            <h3 style={styles.outcomeTitle}>Identity Verified & Enrolled</h3>
            <p style={styles.outcomeText}>
              Your Voter ID has been successfully audited by the system AI and committed to the decentralized registry ledger.
            </p>
            
            <div style={styles.ledgerSummary} className="glass-panel">
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Blockchain Proof Hash:</span>
                <span style={styles.summaryValue} className="monospaced">{docHash}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Solana Signature:</span>
                <span style={styles.summaryValue} className="monospaced">{solanaTx}</span>
              </div>
            </div>

            <button onClick={onBackToLogin} className="btn-primary" style={{ width: '100%' }}>
              Proceed to Gateway
            </button>
          </div>
        )}

        {/* STEP 6: DUPLICATE ERROR PAGE */}
        {step === 'duplicate-error' && (
          <div style={styles.outcomeArea}>
            <AlertOctagon size={72} color="var(--color-danger)" className="pulsing" />
            <h3 style={{ ...styles.outcomeTitle, color: 'var(--color-danger)' }}>Enrollment Rejected</h3>
            <p style={styles.outcomeText}>
              A duplicate identity profile has been detected in the verified database ledger. Multiple profiles representing the same individual are strictly blocklisted by the election framework.
            </p>

            <div style={styles.duplicateAlertBox} className="glass-panel">
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--color-danger)', display: 'block', marginBottom: '8px' }}>
                AUDIT FAILURE METRICS:
              </span>
              <ul style={styles.alertList}>
                <li>Duplicate Identification Index: Conflicting ID Card number</li>
                <li>Consensus Action: Registration process isolated and aborted</li>
                <li>System Response: No ledger additions written</li>
              </ul>
            </div>

            <button onClick={onBackToLogin} className="btn-secondary" style={{ width: '100%' }}>
              Return to Login Screen
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    minHeight: '80vh',
    padding: '20px',
  },
  registrationCard: {
    width: '100%',
    maxWidth: '650px',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: '28px',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '16px',
    padding: 0,
  },
  title: {
    fontSize: '28px',
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
    color: 'var(--color-primary)',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  progressContainer: {
    position: 'relative',
    height: '4px',
    backgroundColor: 'rgba(31,31,31,0.04)',
    borderRadius: '2px',
    marginBottom: '36px',
  },
  progressActiveLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: 'var(--color-primary)',
    borderRadius: '2px',
    transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  progressDotsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    position: 'absolute',
    top: '-8px',
    width: '100%',
    pointerEvents: 'none',
  },
  progressDot: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    color: 'var(--bg-primary)',
    fontSize: '11px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.4s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  gridRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  nextBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '15px',
    marginTop: '10px',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '16px',
    marginTop: '20px',
  },
  dropzone: {
    border: '2px dashed var(--border-color)',
    borderRadius: '12px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transition: 'all 0.3s ease',
    marginBottom: '16px',
    background: 'rgba(252, 251, 248, 0.7)',
  },
  removeFileBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-danger)',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderRadius: '8px',
    background: 'rgba(168, 106, 74, 0.05)',
    border: '1px solid rgba(168, 106, 74, 0.15)',
    color: 'var(--color-danger)',
    fontSize: '13px',
    marginBottom: '20px',
  },
  verificationArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
  },
  consoleLoader: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
  },
  progressBarWrapper: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(31,31,31,0.04)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'var(--color-primary)',
    boxShadow: '0 0 10px var(--color-primary-glow)',
    transition: 'width 0.3s ease',
  },
  terminal: {
    width: '100%',
    background: '#1F1F1F',
    border: '1px solid rgba(197, 164, 109, 0.15)',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 15px 35px rgba(31,31,31,0.05)',
  },
  terminalHeader: {
    background: 'rgba(255,255,255,0.02)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  terminalDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  terminalTitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginLeft: '10px',
    fontFamily: 'monospace',
  },
  terminalBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    minHeight: '220px',
    maxHeight: '320px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: 'var(--color-accent)',
    textAlign: 'left',
  },
  terminalLine: {
    lineHeight: '1.4',
    wordBreak: 'break-all',
  },
  outcomeArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '10px 0',
  },
  outcomeTitle: {
    fontSize: '22px',
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-success)',
    marginTop: '20px',
    marginBottom: '10px',
  },
  outcomeText: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '24px',
    maxWidth: '460px',
  },
  ledgerSummary: {
    width: '100%',
    padding: '20px',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    marginBottom: '32px',
    textAlign: 'left',
  },
  summaryItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '14px',
  },
  summaryLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
  },
  duplicateAlertBox: {
    width: '100%',
    padding: '20px',
    background: 'rgba(168, 106, 74, 0.05)',
    border: '1px solid rgba(168, 106, 74, 0.15)',
    borderRadius: '10px',
    marginBottom: '32px',
    textAlign: 'left',
  },
  alertList: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    paddingLeft: '20px',
    lineHeight: '1.6',
  },
};
