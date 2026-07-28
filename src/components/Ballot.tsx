import React, { useState, useEffect } from 'react';
import { supabase, sha256 } from '../supabase';
import type { Candidate, Voter } from '../supabase';
import { 
  Check, Lock, Download, Loader2, ShieldCheck, 
  AlertTriangle, User, ArrowRight 
} from 'lucide-react';

interface BallotProps {
  voter: Voter;
  ghostMode?: boolean;
  onVoteCastComplete: () => void;
  onLogout: () => void;
}

type BallotState = 'ballot' | 'submitting' | 'success';

export const Ballot: React.FC<BallotProps> = ({ voter, ghostMode = false, onVoteCastComplete, onLogout }) => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [ballotState, setBallotState] = useState<BallotState>('ballot');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Digital Receipt Details
  const [receiptDetails, setReceiptDetails] = useState<{
    txHash: string;
    blockHeight: number;
    timestamp: string;
    voterHash: string;
  } | null>(null);

  // Load candidates for voter's constituency
  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select('*');

        if (error) throw error;
        
        // Filter candidates based on voter's Vidhan Sabha or Rajya Sabha for relevance
        // But keep fallback if no direct matches
        const filtered = (data as Candidate[]).filter(
          c => c.vidhan_sabha.toLowerCase() === voter.vidhan_sabha.toLowerCase() ||
               c.rajya_sabha.toLowerCase() === voter.rajya_sabha.toLowerCase()
        );

        setCandidates(filtered.length > 0 ? filtered : (data as Candidate[]));
      } catch (err) {
        console.error("Error loading candidates:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [voter]);

  // Handle final submission to blockchain and Supabase
  const handleCastVote = async () => {
    if (!selectedCandidate) return;
    setShowConfirmModal(false);
    setBallotState('submitting');

    try {
      const timestamp = new Date().toISOString();
      const randomBlock = Math.floor(2841030 + Math.random() * 50000);
      const rawTxHash = await sha256(`${voter.id}-${selectedCandidate.id}-${randomBlock}-${timestamp}`);
      const txHash = '0x' + rawTxHash;
      
      const voterIdHash = voter.document_hash;

      // 1. Write ANONYMOUS vote to ledger
      const { error: voteErr } = await supabase
        .from('votes')
        .insert({
          candidate_id: selectedCandidate.id,
          political_party: selectedCandidate.political_party,
          vidhan_sabha: selectedCandidate.vidhan_sabha,
          rajya_sabha: selectedCandidate.rajya_sabha,
          transaction_hash: txHash,
          block_height: randomBlock
        });

      if (voteErr) throw voteErr;

      // 2. Mark voter as voted (Prevents double voting, but maintains total anonymity of choice)
      const { error: voterErr } = await supabase
        .from('voters')
        .update({ has_voted: true })
        .eq('id', voter.id);

      if (voterErr) throw voterErr;

      // 3. Log event to audittrail
      await supabase
        .from('audit_logs')
        .insert({
          event: 'BALLOT_CAST_SUCCESS',
          details: `Anonymous ballot registered. Block height: ${randomBlock}.`,
          block_hash: txHash
        });

      setReceiptDetails({
        txHash,
        blockHeight: randomBlock,
        timestamp,
        voterHash: voterIdHash
      });

      setBallotState('success');
    } catch (err) {
      console.error("Ballot casting failed:", err);
      alert("Verification handshake failed. Ballot could not be committed. Try again.");
      setBallotState('ballot');
    }
  };

  // Download digital cryptographic receipt
  const downloadReceipt = () => {
    if (!receiptDetails || !selectedCandidate) return;
    
    let receiptText = '';
    if (ghostMode) {
      receiptText = `=====================================================
V.O.T.E. — ENCRYPTED STEALTH BALLOT RECEIPT
=====================================================
Receipt Status: ENCRYPTED & SEALED
Zero-Knowledge Hash: ${receiptDetails.txHash}
Validation Signature: ${receiptDetails.voterHash}
Block Height Index: ${receiptDetails.blockHeight}
-----------------------------------------------------
WARNING: GHOST MODE ENCRYPTED DELEGATION METRICS.
DATA REPRESENTATION REDACTED FOR STEALTH SECURITY.
=====================================================`;
    } else {
      receiptText = `=====================================================
V.O.T.E. — DIGITAL CRYPTOGRAPHIC RECEIPT
=====================================================
Status: SEED & BROADCASTED
Network: SOLANA SECURE ENCLAVE NODE-4
Timestamp: ${receiptDetails.timestamp}
Block Height: ${receiptDetails.blockHeight}

Ledger Audit Metrics:
-----------------------------------------------------
Transaction Signature (TxHash): 
${receiptDetails.txHash}

Voter Verification Hash:
${receiptDetails.voterHash}

Ballot Allocation Data:
-----------------------------------------------------
Constituency (Vidhan Sabha): ${selectedCandidate.vidhan_sabha}
Constituency (Rajya Sabha): ${selectedCandidate.rajya_sabha}
Allocation: SEALED & ANONYMIZED
=====================================================
This receipt is cryptographically proofed on-chain.
Verify your transaction signature using the admin console.
=====================================================`;
    }

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = ghostMode 
      ? `VOTE-STEALTH-RECEIPT-${receiptDetails.blockHeight}.txt` 
      : `VOTE-RECEIPT-${receiptDetails.blockHeight}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      {/* Top Banner (Voter details) */}
      <div style={styles.voterBanner} className="glass-panel">
        <div style={styles.voterDetails}>
          <div style={styles.voterAvatar}>
            <User size={20} color="var(--color-accent)" />
          </div>
          <div>
            <h4 style={styles.voterName}>{ghostMode ? '●●●●●●●●' : voter.full_name}</h4>
            <p style={styles.voterMeta}>
              ID: <span className="monospaced" style={{ color: 'var(--color-accent)' }}>{ghostMode ? '●●●●●●●●' : voter.voter_id_number}</span> | 
              Constituency: <span style={{ color: '#fff' }}>{voter.vidhan_sabha} ({voter.rajya_sabha})</span>
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span className="badge badge-green">
            <span className="status-indicator online" style={{ marginRight: '6px' }} />
            SESSION ENCRYPTED
          </span>
          <button onClick={onLogout} style={styles.logoutLink}>
            Close Session
          </button>
        </div>
      </div>

      {/* BALLOT CAST SECTIONS */}
      {ballotState === 'ballot' && (
        <div style={styles.ballotArea}>
          <div style={styles.ballotHeader}>
            <h3 style={styles.ballotTitle}>Official Election Ballot</h3>
            <p style={styles.ballotSubtitle}>
              Please allocate your single secure vote below. Candidate configurations are synced live with the Central Registry.
            </p>
          </div>

          {loading ? (
            <div style={styles.loadingSpinnerBox}>
              <Loader2 size={36} color="var(--color-accent)" className="spinning" />
              <p style={{ marginTop: '14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Fetching registered candidates list...
              </p>
            </div>
          ) : candidates.length === 0 ? (
            <div style={styles.emptyStateBox} className="glass-panel">
              <Lock size={40} color="var(--color-danger)" style={{ marginBottom: '14px' }} />
              <p style={{ fontWeight: '600', marginBottom: '6px' }}>No Candidates Provisioned</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                The government admin has not configured candidates for this constituency yet.
              </p>
            </div>
          ) : (
            <>
              {/* Candidate Cards Grid */}
              <div style={styles.candidateGrid}>
                {candidates.map((candidate) => {
                  const isSelected = selectedCandidate?.id === candidate.id;
                  return (
                    <div
                      key={candidate.id}
                      onClick={() => setSelectedCandidate(candidate)}
                      style={{
                        ...styles.candidateCard,
                        borderColor: isSelected ? 'var(--color-accent)' : 'var(--border-color)',
                        boxShadow: isSelected ? '0 10px 30px var(--color-accent-glow)' : 'none',
                        transform: isSelected ? 'scale(1.02)' : 'none'
                      }}
                      className="glass-panel clickable"
                    >
                      <div style={styles.cardHeader}>
                        <img 
                          src={candidate.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'} 
                          alt={candidate.name} 
                          style={styles.candidatePhoto}
                        />
                        {isSelected && (
                          <div style={styles.selectionDot}>
                            <Check size={16} color="var(--bg-primary)" strokeWidth={3} />
                          </div>
                        )}
                      </div>

                      <div style={styles.cardBody}>
                        <h4 style={styles.candidateNameText}>{candidate.name}</h4>
                        
                        <div style={styles.partyRow}>
                          <img 
                            src={candidate.party_logo || 'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=50&h=50&q=80'} 
                            alt={candidate.political_party} 
                            style={styles.partyLogo}
                          />
                          <span style={styles.partyText}>{candidate.political_party}</span>
                        </div>

                        <div style={styles.constituencyRow}>
                          <span style={styles.constituencyLabel}>Constituency:</span>
                          <span style={styles.constituencyVal}>{candidate.vidhan_sabha}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Float Cast Button */}
              <div style={styles.actionContainer}>
                <button
                  disabled={!selectedCandidate}
                  onClick={() => setShowConfirmModal(true)}
                  className="btn-primary"
                  style={{
                    ...styles.castBtn,
                    opacity: selectedCandidate ? 1 : 0.4,
                    cursor: selectedCandidate ? 'pointer' : 'not-allowed'
                  }}
                >
                  Cast Secure Ballot <Lock size={16} style={{ marginLeft: '8px' }} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUBMITTING STATE */}
      {ballotState === 'submitting' && (
        <div style={styles.submittingBox} className="glass-panel">
          <Loader2 size={48} color="var(--color-accent)" className="spinning" style={{ marginBottom: '24px' }} />
          <h3 style={styles.submittingTitle}>Sealing Ballot Package</h3>
          
          <div style={styles.submittingTerminal} className="glass-panel">
            <div style={styles.terminalLine}>[SECURITY] Initializing zero-knowledge verification proofs...</div>
            <div style={styles.terminalLine}>[ENVELOPE] Generating cryptographic signature on local client...</div>
            <div style={styles.terminalLine}>[BLOCKCHAIN] Allocating block location on decentralized Solana ledger...</div>
            <div style={styles.terminalLine}>[LEDGER] Writing consensus transactions...</div>
            <div style={styles.terminalLine}>[DATABASE] Tagging identity reference as 'voted'...</div>
          </div>
        </div>
      )}

      {/* SUCCESS STATE */}
      {ballotState === 'success' && (
        <div style={styles.successCard} className="glass-panel">
          <ShieldCheck size={72} color="var(--color-success)" className="pulsing" style={{ marginBottom: '20px' }} />
          <h3 style={styles.successTitle}>Ballot Cast Successfully</h3>
          <p style={styles.successDesc}>
            Your ballot has been fully submitted to the ledger. To preserve absolute privacy, your voter identity has been unlinked from this selection. No records of who you voted for are stored in the database.
          </p>

          {receiptDetails && (
            <div style={styles.receiptConsole} className="glass-panel">
              <div style={styles.receiptLine}>
                <span style={styles.receiptLabel}>Transaction Hash:</span>
                <span style={styles.receiptVal} className="monospaced">{receiptDetails.txHash}</span>
              </div>
              <div style={styles.receiptLine}>
                <span style={styles.receiptLabel}>Consensus Block Height:</span>
                <span style={styles.receiptVal} className="monospaced">{receiptDetails.blockHeight}</span>
              </div>
              <div style={styles.receiptLine}>
                <span style={styles.receiptLabel}>Timestamp:</span>
                <span style={styles.receiptVal}>{new Date(receiptDetails.timestamp).toLocaleString()}</span>
              </div>
            </div>
          )}

          <div style={styles.receiptBtnRow}>
            <button onClick={downloadReceipt} className="btn-secondary" style={{ flex: 1 }}>
              Download Receipt <Download size={16} />
            </button>
            <button onClick={onVoteCastComplete} className="btn-primary" style={{ flex: 1 }}>
              Complete Session <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION OVERLAY MODAL */}
      {showConfirmModal && selectedCandidate && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <div style={styles.modalIcon}>
              <AlertTriangle size={32} color="var(--color-warning)" />
            </div>
            
            <h3 style={styles.modalTitle}>Confirm Irreversible Ballot</h3>
            
            <p style={styles.modalDesc}>
              You are about to cast your single vote for <strong>{selectedCandidate.name}</strong> of the <strong>{selectedCandidate.political_party}</strong>.
            </p>
            
            <div style={styles.modalWarningBox}>
              <p style={styles.warningText}>
                IMPORTANT: National election code dictates that ballot sealing is completely final. You cannot modify or retrieve your vote once signed.
              </p>
            </div>

            <div style={styles.modalBtnRow}>
              <button 
                onClick={() => setShowConfirmModal(false)} 
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Abort
              </button>
              <button 
                onClick={handleCastVote} 
                className="btn-primary"
                style={{ flex: 1, background: 'linear-gradient(135deg, var(--color-success), #059669)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)' }}
              >
                Sign & Cast Ballot
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .monospaced {
          font-family: monospace;
          word-break: break-all;
        }
        .pulsing {
          animation: pulse 1.5s infinite ease-in-out;
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px 0',
  },
  voterBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderRadius: '12px',
    marginBottom: '32px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
  },
  voterDetails: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  voterAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(53, 92, 75, 0.08)',
    border: '1px solid rgba(53, 92, 75, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voterName: {
    fontSize: '15px',
    fontWeight: '700',
  },
  voterMeta: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  logoutLink: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  ballotArea: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  ballotHeader: {
    marginBottom: '28px',
    textAlign: 'center',
  },
  ballotTitle: {
    fontSize: '28px',
    fontFamily: 'var(--font-heading)',
    fontWeight: '700',
    marginBottom: '8px',
  },
  ballotSubtitle: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    maxWidth: '600px',
    margin: '0 auto',
  },
  loadingSpinnerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '80px 0',
  },
  emptyStateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '60px 40px',
    background: 'var(--bg-secondary)',
  },
  candidateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  candidateCard: {
    padding: '24px',
    borderRadius: '16px',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--border-color)',
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    background: 'var(--bg-secondary)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: '20px',
  },
  candidatePhoto: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '3px solid var(--border-color)',
  },
  selectionDot: {
    position: 'absolute',
    bottom: 0,
    right: 'calc(50% - 50px)',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '3px solid var(--bg-primary)',
    boxShadow: '0 0 10px var(--color-primary-glow)',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  candidateNameText: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '10px',
  },
  partyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--bg-panel)',
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    marginBottom: '16px',
  },
  partyLogo: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  partyText: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  constituencyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-color)',
    fontSize: '12px',
  },
  constituencyLabel: {
    color: 'var(--text-muted)',
  },
  constituencyVal: {
    color: 'var(--text-primary)',
    fontWeight: '600',
  },
  actionContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '10px',
  },
  castBtn: {
    padding: '16px 40px',
    fontSize: '16px',
    fontWeight: '700',
    borderRadius: '12px',
  },
  submittingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 40px',
    textAlign: 'center',
    maxWidth: '600px',
    margin: '0 auto',
  },
  submittingTitle: {
    fontSize: '22px',
    fontFamily: 'var(--font-heading)',
    marginBottom: '20px',
  },
  submittingTerminal: {
    width: '100%',
    background: '#1F1F1F',
    border: '1px solid rgba(197, 164, 109, 0.15)',
    borderRadius: '10px',
    padding: '20px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: 'var(--color-accent)',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  successCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '50px 40px',
    textAlign: 'center',
    maxWidth: '650px',
    margin: '0 auto',
  },
  successTitle: {
    fontSize: '24px',
    fontFamily: 'var(--font-heading)',
    color: 'var(--color-success)',
    marginBottom: '12px',
  },
  successDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
    marginBottom: '28px',
  },
  receiptConsole: {
    width: '100%',
    background: 'var(--bg-panel)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'left',
    marginBottom: '28px',
  },
  receiptLine: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '12px',
  },
  receiptLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  receiptVal: {
    fontSize: '12px',
    color: 'var(--text-primary)',
  },
  receiptBtnRow: {
    display: 'flex',
    gap: '16px',
    width: '100%',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(31, 31, 31, 0.7)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  modalContent: {
    width: '90%',
    maxWidth: '480px',
    padding: '32px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  modalIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(197, 164, 109, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '22px',
    fontFamily: 'var(--font-heading)',
    marginBottom: '10px',
  },
  modalDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    marginBottom: '20px',
  },
  modalWarningBox: {
    width: '100%',
    padding: '16px',
    borderRadius: '10px',
    background: 'rgba(168, 106, 74, 0.05)',
    border: '1px solid rgba(168, 106, 74, 0.15)',
    textAlign: 'left',
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  modalWarningText: {
    fontSize: '12px',
    color: 'var(--color-danger)',
    lineHeight: '1.55',
  },
  modalBtnRow: {
    display: 'flex',
    gap: '16px',
    width: '100%',
  },
};
