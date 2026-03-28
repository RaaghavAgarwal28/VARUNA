import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  Lock,
  CheckCircle,
  XCircle,
  ShieldAlert,
  Fingerprint,
  Link as LinkIcon,
  RefreshCw,
  Clock
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getApiBase } from "../../lib/api";

export function AuditLedgerPanel() {
  const { authFetch, isAdmin } = useAuth();
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); 

  const fetchLedger = useCallback(async () => {
    try {
      const res = await authFetch(`${getApiBase()}/audit-ledger`);
      if (!res.ok) {
        throw new Error(res.status === 403 ? "Insufficient permissions" : "Failed to load audit ledger");
      }
      const data = await res.json();
      setLedger(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchLedger();
    const interval = setInterval(fetchLedger, 5000); // refresh every 5s
    return () => clearInterval(interval);
  }, [fetchLedger]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await authFetch(`${getApiBase()}/audit-ledger/verify`);
      const data = await res.json();
      setVerifyResult(data);
    } catch (err) {
      setVerifyResult({ status: "error", message: err.message });
    } finally {
      setTimeout(() => setVerifying(false), 800);
    }
  };

  if (!isAdmin) {
    return (
      <div className="panel p-8 text-center animate-pulse border-red/30 bg-red/10">
        <Lock size={40} className="mx-auto mb-3 text-red/60" />
        <div className="font-display text-xl text-white">Cryptographic Access Denied</div>
        <div className="mt-2 text-sm text-slate-400">
          Viewing the immutable audit ledger requires strict ADMIN clearance.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="panel flex items-center justify-center p-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        >
          <Fingerprint size={28} className="text-emerald-500/60" />
        </motion.div>
        <span className="ml-3 font-mono text-slate-400">Decrypting ledger blocks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-8 text-center">
        <ShieldAlert size={32} className="mx-auto mb-3 text-orange" />
        <div className="font-display text-lg text-white">Ledger Unavailable</div>
        <div className="mt-2 text-sm text-slate-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-400">
              <Database size={14} />
              Cryptographic Audit Ledger
            </div>
            <div className="font-display text-3xl text-white">Merkle Tree Compliance</div>
            <div className="mt-3 max-w-3xl text-slate-300">
              Tamper-proof, cryptographically signed ledger of all Automated Inference engine decisions.
              SHA-256 hashes are batched into Merkle Trees to provide immutable evidence for banking authorities.
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
             <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleVerify}
                disabled={verifying}
                className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  verifying
                    ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 cursor-wait"
                    : "border-slate-700 bg-white/[0.03] text-slate-300 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
                }`}
              >
                <Fingerprint size={16} className={verifying ? "animate-pulse" : ""} />
                {verifying ? "Verifying Chain..." : "Verify Integrity"}
              </motion.button>

              <AnimatePresence mode="wait">
                {verifyResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium font-mono ${
                      verifyResult.status === "VALID" 
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-red/30 bg-red/10 text-red"
                    }`}
                  >
                    {verifyResult.status === "VALID" ? <CheckCircle size={14}/> : <XCircle size={14} />}
                    {verifyResult.status === "VALID" ? "CHAIN INTACT" : "TAMPERING DETECTED"}
                  </motion.div>
                )}
              </AnimatePresence>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-line/30 pt-6 md:grid-cols-4">
            <div className="border border-line/30 bg-white/[0.01] rounded-xl p-4">
               <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Total Blocks Sealed</div>
               <div className="font-display text-2xl text-emerald-400">{ledger?.total_blocks}</div>
            </div>
            <div className="border border-line/30 bg-white/[0.01] rounded-xl p-4">
               <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Unsealed Pending</div>
               <div className="font-display text-2xl text-orange">{ledger?.total_pending}</div>
            </div>
            <div className="border border-line/30 bg-white/[0.01] rounded-xl p-4 md:col-span-2">
               <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Hashing Algorithm</div>
               <div className="font-mono text-cyan flex items-center gap-2 mt-2">
                 <Lock size={14}/>
                 SHA-256 (Merkle Root Batching)
               </div>
            </div>
        </div>
      </div>

      {/* Overview Layout */}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        
        {/* Ledger Feed (Sealed Blocks) */}
        <div className="panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
              <LinkIcon size={14} className="text-emerald-400" />
              Sealed Merkle Blocks
            </div>
          </div>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
            <AnimatePresence>
              {(ledger?.blocks || []).map((block, i) => (
                <motion.div
                  key={block.block_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-line/40 bg-white/[0.02] overflow-hidden"
                >
                   <div className="bg-emerald-500/[0.05] border-b border-emerald-500/10 px-4 py-2.5 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                         <Database size={14} className="text-emerald-400"/>
                         <span className="font-mono text-xs text-white">BLK-{block.block_id.slice(-6)}</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                         {new Date(block.timestamp).toLocaleTimeString()}
                      </div>
                   </div>
                   
                   <div className="px-4 py-3 border-b border-line/20 bg-black/20">
                     <span className="text-[10px] uppercase text-slate-500 mr-2">Merkle Root</span>
                     <span className="font-mono text-xs text-emerald-400/80 break-all select-all flex items-center gap-2">
                        {block.merkle_root}
                     </span>
                   </div>

                   <div className="p-3 bg-white/[0.01]">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 px-1">Transactions ({block.entries_count})</div>
                      <div className="space-y-1.5">
                         {block.entries.map((entry) => (
                             <EntryRow key={entry.entry_id} entry={entry} isSealed={true}/>
                         ))}
                      </div>
                   </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {(!ledger?.blocks || ledger.blocks.length === 0) && (
              <div className="py-8 text-center text-sm font-mono text-slate-500 border border-dashed border-line/40 rounded-xl bg-black/20">
                0 BLOCKS SEALED
              </div>
            )}
          </div>
        </div>

        {/* Unsealed Pending Pool */}
        <div className="panel p-6 border-orange/20 bg-gradient-to-br from-black/40 to-orange/5">
           <div className="mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-orange">
              <RefreshCw size={14} className="animate-spin-slow" />
              Unsealed Mempool
            </div>
            <div className="mb-4 text-xs text-slate-400">
               Live decisions waiting to be batched and cryptographically sealed into the next block. (Batch Size: 10)
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin pr-1">
               <AnimatePresence>
                 {(ledger?.pending || []).map((entry, i) => (
                    <motion.div
                       key={entry.entry_id}
                       initial={{ opacity: 0, x: 10 }}
                       animate={{ opacity: 1, x: 0 }}
                       className="rounded-lg border border-orange/20 bg-black/40 p-2.5"
                    >
                       <EntryRow entry={entry} isSealed={false} />
                    </motion.div>
                 ))}
               </AnimatePresence>

               {(!ledger?.pending || ledger.pending.length === 0) && (
                 <div className="py-8 text-center font-mono flex flex-col items-center text-slate-500">
                   <Clock size={20} className="mb-2 opacity-50"/>
                   Mempool Empty
                 </div>
               )}
            </div>
        </div>

      </div>
    </div>
  );
}

function EntryRow({ entry, isSealed }) {
    const isBlock = entry.action === "BLOCK";
    
    return (
        <div className="flex flex-col gap-1.5 p-2 rounded bg-black/20 border border-white/[0.02]">
            <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-slate-400">ID: {entry.entry_id.slice(-8)}</span>
                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                    isBlock ? "border-red/40 bg-red/10 text-red" : "border-orange/40 bg-orange/10 text-orange"
                }`}>
                    {entry.action}
                </span>
            </div>
            
            <div className="flex justify-between items-end gap-3 mt-1">
               <div className="flex-1 min-w-0">
                  <div className="text-xs text-white truncate font-medium">{entry.account_id}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{entry.reason}</div>
               </div>
               
               <div className="text-right">
                  <div className={`font-mono text-[9px] ${isSealed ? "text-emerald-500/70" : "text-orange/70"} truncate max-w-[120px]`}>
                     {entry.decision_hash.slice(0, 16)}...
                  </div>
                   <div className="text-[9px] text-slate-600 mt-0.5">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                   </div>
               </div>
            </div>
        </div>
    );
}
