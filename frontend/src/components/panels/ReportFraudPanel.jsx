import { useState } from "react";
import { ShieldAlert, AlertTriangle, ArrowRight, Activity, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function ReportFraudPanel({ onSubmitReport }) {
  const [accountNumber, setAccountNumber] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (accountNumber.trim()) {
      onSubmitReport(accountNumber.trim());
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-6">
      <div className="panel p-6">
        <div className="mb-2 inline-flex rounded-full border border-red/30 bg-red/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-red">
          <ShieldAlert size={14} className="inline mr-2" />
          Cyber Fraud Reporting
        </div>
        <h2 className="mt-3 font-display text-4xl font-bold text-white">
          Report Compromised Account
        </h2>
        <p className="mt-3 max-w-2xl text-slate-300">
          Enter the account number suspected of fraudulent compromise. VARUNA will instantly
          track its transaction history, map out its entire associated mule network, and 
          activate multi-bank isolation protocol.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Form Container */}
        <div className="panel p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                Suspect Account Number
              </label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. VICTIM-A1 or MULE-HYD-01"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full rounded-xl border border-line/70 bg-black/40 px-4 py-3 text-white placeholder-slate-600 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/50"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                Incident Description (Optional)
              </label>
              <textarea
                rows={4}
                placeholder="Provide any known context about the incident, e.g. Phishing call, OTP theft..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full resize-none rounded-xl border border-line/70 bg-black/40 px-4 py-3 text-white placeholder-slate-600 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/50"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!accountNumber.trim()}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-6 py-3 font-semibold text-white shadow-lg shadow-red-500/20 disabled:opacity-50"
            >
              Analyze Chain & Isolate
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </motion.button>
          </form>
        </div>

        {/* Info/Context Box */}
        <div className="space-y-4">
          <div className="panel border-orange/30 bg-orange/5 p-5">
            <div className="mb-2 flex items-center gap-2 font-display text-lg text-orange">
              <Clock size={18} /> Time is Critical
            </div>
            <p className="text-sm text-slate-300">
              VARUNA's average intercept time is under 180 seconds. By isolating the victim's
              downstream chain immediately, we lock funds before dissipation to external crypto ramps.
            </p>
          </div>
          
          <div className="panel border-cyan/30 bg-cyan/5 p-5">
            <div className="mb-2 flex items-center gap-2 font-display text-lg text-cyan">
              <Activity size={18} /> Real-time Chain Tracing
            </div>
            <p className="text-sm text-slate-300">
              Once reported, the dashboard will switch to Command Center mode and automatically isolate
              all connections radiating from the submitted account. You can then freeze the compromised elements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
