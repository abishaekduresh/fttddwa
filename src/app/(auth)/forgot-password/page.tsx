"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call (password reset via email not implemented yet)
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
  };

  return (
    <>
      <Link href="/login" className="flex items-center gap-1 text-slate-500 hover:text-slate-700 text-sm mb-4">
        <ArrowLeft size={14} /> Back to login
      </Link>

      <h2 className="text-2xl font-bold text-slate-900 mb-1">Forgot password?</h2>
      <p className="text-slate-500 text-sm mb-6">Enter your email to receive reset instructions</p>

      {sent ? (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 text-sm">
          <p className="font-medium">Request received</p>
          <p className="mt-1 text-green-600">If an account exists for {email}, your administrator will be notified.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                className="form-input pl-9"
                placeholder="admin@fttddwa.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : "Send Reset Link"}
          </button>
        </form>
      )}
    </>
  );
}
