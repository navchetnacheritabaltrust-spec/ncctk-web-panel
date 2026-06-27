"use client";
import React, { useState, useEffect } from 'react';
import { App } from 'antd';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { getDeviceInfo } from '@/lib/commonFun';
import { doc, setDoc } from 'firebase/firestore';
import Image from 'next/image';
import { TrsutData } from '@/lib/constentData';
import logo from '@/app/api/helperfile/Images/logo';

const OTP_TIMEOUT = 60;
const OTP_VALIDITY_DAYS = 7;
const OTP_STORAGE_KEY = 'lastOtpVerification';

const getLastVerification = (email) => {
  try {
    const stored = localStorage.getItem(OTP_STORAGE_KEY);
    if (!stored) return null;
    const data = JSON.parse(stored);
    return data[email] || null;
  } catch {
    return null;
  }
};

const setLastVerification = (email) => {
  try {
    const stored = localStorage.getItem(OTP_STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : {};
    data[email] = new Date().toISOString();
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(data));
  } catch {}
};

const needsOTPVerification = (email) => {
  const lastVerified = getLastVerification(email);
  if (!lastVerified) return true;
  const diffDays = (Date.now() - new Date(lastVerified).getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= OTP_VALIDITY_DAYS;
};

async function saveSession(userId, sessionToken) {
  const deviceInfo = getDeviceInfo();
  const ipRes = await fetch("https://ipapi.co/json/");
  const locationData = await ipRes.json();
  const session = {
    ip: locationData.ip,
    location: `${locationData.city}, ${locationData.region}, ${locationData.country_name}`,
    pinCode: locationData.postal,
    device: deviceInfo.device,
    os: deviceInfo.os,
    browser: deviceInfo.browser,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    sessionToken,
  };
  await setDoc(doc(db, "users", userId, "sessions", sessionToken), session);
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconMail = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const IconLock = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
  </svg>
);
const IconOTP = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const IconPin = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconPhone = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 7V5z" />
  </svg>
);
const IconPerson = () => (
  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const IconShield = () => (
  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const IconEyeOff = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);
const IconEye = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// ─── Alert ────────────────────────────────────────────────────────────────────
const alertStyles = {
  info:    { background: 'rgba(26,15,94,0.07)',  borderLeft: '3px solid #1a0f5e', color: '#1a0f5e' },
  success: { background: 'rgba(16,124,65,0.07)', borderLeft: '3px solid #0a8c44', color: '#0a6e34' },
  error:   { background: 'rgba(234,31,37,0.07)', borderLeft: '3px solid #EA1F25', color: '#b81a1f' },
};

const AlertBox = ({ msg, type }) => (
  <div style={{ ...alertStyles[type], padding: '0.55rem 0.85rem', borderRadius: 6, fontSize: 13, marginBottom: 12, fontFamily: "'Poppins', sans-serif" }}>
    {msg}
  </div>
);

// ─── Loader spinner ───────────────────────────────────────────────────────────
const Loader = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'lp-spin 0.8s linear infinite' }}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

// ─── Main ─────────────────────────────────────────────────────────────────────
const LoginPage = () => {
  const { message } = App.useApp();

  const [step, setStep]         = useState(1);
  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState('');
  const [emailVal, setEmailVal] = useState('');
  const [otpVal, setOtpVal]     = useState('');
  const [passVal, setPassVal]   = useState('');
  const [showPass, setShowPass] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [alert, setAlert]       = useState(null); // { msg, type }

  const showAlert = (msg, type = 'info') => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4500);
  };

  function generateSessionToken() {
    return 'sess_' + crypto.randomUUID();
  }

  useEffect(() => {
    if (countdown <= 0) { setCanResend(step === 2); return; }
    const t = setInterval(() => setCountdown(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [countdown, step]);

  // Step 1 — Email
  const onSubmitEmail = async (e) => {
    e.preventDefault();
    if (!emailVal || !emailVal.includes('@')) { showAlert('Please enter a valid email address.', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkEmail', email: emailVal }),
      });
      const data = await res.json();
      if (!data.exists) { showAlert('This email is not registered.', 'error'); setLoading(false); return; }

      if (needsOTPVerification(emailVal)) {
        const otpRes = await fetch('/api/opt-send-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send', email: emailVal }),
        });
        if (otpRes.ok) {
          setEmail(emailVal);
          showAlert('OTP sent to your email!', 'success');
          setStep(2); setCountdown(OTP_TIMEOUT); setCanResend(false);
        } else {
          const d = await otpRes.json();
          showAlert(d.error || 'Failed to send OTP.', 'error');
        }
      } else {
        setEmail(emailVal);
        setStep(3);
        showAlert('Please enter your password to continue.', 'info');
      }
    } catch { showAlert('An error occurred. Please try again.', 'error'); }
    setLoading(false);
  };

  // Step 2 — OTP
  const onSubmitOtp = async (e) => {
    e.preventDefault();
    if (!otpVal || otpVal.length !== 6) { showAlert('Please enter the 6-digit OTP.', 'error'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/opt-send-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, otp: otpVal }),
      });
      if (res.ok) {
        setLastVerification(email);
        showAlert('OTP verified! Please enter your password.', 'success');
        setStep(3);
      } else { showAlert('OTP verification failed.', 'error'); }
    } catch { showAlert('An error occurred during verification.', 'error'); }
    setLoading(false);
  };

  // Step 3 — Password
  const onSubmitPassword = async (e) => {
    e.preventDefault();
    if (!passVal || passVal.length < 6) { showAlert('Password must be at least 6 characters.', 'error'); return; }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, passVal);
      const user = userCredential.user;
      let sessionToken = localStorage.getItem('session_token');
      if (!sessionToken) {
        sessionToken = generateSessionToken();
        localStorage.setItem('session_token', sessionToken);
      }
      await saveSession(user.uid, sessionToken);
      message.success('Login Successful!');
      window.location.href = '/';
    } catch (error) { showAlert(error.message || 'Login failed.', 'error'); }
    setLoading(false);
  };

  // Forgot password
  const handleForgotPassword = async () => {
    if (!email) { showAlert('Please enter your email first.', 'error'); setStep(1); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      showAlert('Password reset link sent! Check your inbox.', 'success');
    } catch (error) { showAlert(error.message || 'Failed to send reset link.', 'error'); }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    const res = await fetch('/api/opt-send-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', email }),
    });
    if (res.ok) { showAlert('New OTP sent!', 'success'); setCountdown(OTP_TIMEOUT); setCanResend(false); }
    else { const d = await res.json(); showAlert(d.error || 'Failed to resend OTP.', 'error'); }
    setLoading(false);
  };

  const stepLabels = [
    'Step 1 of 3 — Identification',
    'Step 2 of 3 — Verification',
    'Step 3 of 3 — Authentication',
  ];

  const getDotStyle = (dotStep) => ({
    height: 4, borderRadius: 2, transition: 'all 0.3s', width: 24,
    background: dotStep < step
      ? 'rgba(212,175,55,0.45)'
      : dotStep === step
        ? '#d4af37'
        : 'rgba(255,255,255,0.18)',
  });

  // ─── Shared styles ──────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', height: 44, padding: '0 12px 0 38px',
    border: '1px solid rgba(84,63,39,0.25)', borderRadius: 8,
    background: '#fffdf8', fontSize: 14, color: '#2a1a0a',
    fontFamily: "'Poppins', sans-serif", outline: 'none',
  };
  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#543f27',
    letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6,
  };
  const btnPrimary = {
    width: '100%', height: 46, marginTop: 8,
    background: 'linear-gradient(135deg, #1a0f5e 0%, #2a1a7c 100%)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 14, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.75 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
  const btnLink = {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#1a0f5e', fontSize: 12, fontWeight: 600,
    fontFamily: "'Poppins', sans-serif", padding: 0,
    textDecoration: 'underline', textUnderlineOffset: 2,
  };
  const inputIconStyle = {
    position: 'absolute', left: 12, color: '#6b5a3e',
    pointerEvents: 'none', display: 'flex', top: '50%', transform: 'translateY(-50%)',
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600&family=Poppins:wght@300;400;500;600&family=Playfair+Display:wght@400;600&display=swap');
        @keyframes lp-spin { to { transform: rotate(360deg); } }
        @keyframes lp-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .lp-input:focus { border-color: #1a0f5e !important; box-shadow: 0 0 0 3px rgba(26,15,94,0.1) !important; }
        .lp-input::placeholder { color: rgba(107,90,62,0.4); font-size: 13px; }
        .lp-step { animation: lp-fadeIn 0.3s ease; }
        .lp-btn:hover { opacity: 0.88 !important; }
        .lp-btn:active { transform: scale(0.99); }
        .lp-mandala::before { content:''; position:absolute; inset:6px; border-radius:50%; border:1px dashed rgba(212,175,55,0.5); }
        .lp-mandala::after  { content:''; position:absolute; inset:14px; border-radius:50%; border:1px solid rgba(212,175,55,0.25); }
        @media (max-width: 700px) { .lp-left { display: none !important; } }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Poppins', sans-serif", background: '#fdf8f0', position: 'relative', overflow: 'hidden' }}>

        {/* Background */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(circle at 15% 25%, rgba(212,175,55,0.12) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(234,31,37,0.08) 0%, transparent 45%)` }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35, backgroundImage: 'radial-gradient(rgba(84,63,39,0.35) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* ── Left Panel ── */}
        <div className="lp-left" style={{ flexShrink: 0, width: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2.25rem', position: 'relative', borderRight: '1px solid rgba(84,63,39,0.2)' }}>

          {/* Top color bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #EA1F25, #d4af37, #1a0f5e)' }} />

          {/* Emblem */}
          <div className="lp-mandala" style={{ width: 176, height: 176, borderRadius: '50%', border: '2px solid #d4af37', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: '1.5rem' }}>
            <div style={{ width: 118, height: 118, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
              {/* <span style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: '2.6rem', color: '#d4af37', lineHeight: 1 }}>ॐ</span> */}
              <Image src={logo} alt="Trust Logo" width={80} height={80} style={{ width: '100%', height: "100%", borderRadius: 8, boxShadow: '0 4px 12px rgba(212,175,55,0.3)' }} />
            </div>
          </div>

          {/* Trust name */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: '1.05rem', fontWeight: 600, color: '#1a0f5e', lineHeight: 1.4 }}>{TrsutData.name}</div>
  
            <div style={{ fontSize: 11, color: '#6b5a3e', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 4 }}>गुजरात · राजस्थान</div>
          </div>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '1.25rem 0', width: '100%' }}>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
            <span style={{ color: '#d4af37', fontSize: 14 }}>❋</span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, #d4af37, transparent)' }} />
          </div>

          {/* Info rows */}
          <div style={{ width: '100%' }}>
            {[
              { icon: <IconPin />, text: <span>{TrsutData.address} </span> },
              { icon: <IconPhone />, text: <span><strong style={{ color: '#2a1a0a' }}></strong> / <strong style={{ color: '#2a1a0a' }}>9320387645 / 9725823111 / 9076970217</strong> </span> },
              { icon: <IconPerson />, text: <span>अध्यक्ष: <strong style={{ color: '#2a1a0a' }}>{TrsutData.trustPresident}</strong></span> },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#6b5a3e', lineHeight: 1.5, marginBottom: 8 }}>
                <span style={{ flexShrink: 0, marginTop: 1, color: '#EA1F25' }}>{row.icon}</span>
                {row.text}
              </div>
            ))}
          </div>

          {/* Reg badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f9f0d0', border: '1px solid rgba(212,175,55,0.4)', borderRadius: 4, padding: '0.28rem 0.75rem', fontSize: 11, color: '#543f27', fontWeight: 700, letterSpacing: '0.06em', marginTop: 12 }}>
            <IconShield /> रजि. नं. {TrsutData.regNo}
          </div>

          <div style={{ fontFamily: "'Noto Sans Devanagari', sans-serif", fontSize: 12, color: 'rgba(26,15,94,0.5)', textAlign: 'center', marginTop: 16 }}>
{
TrsutData.topTitle.map((item)=>{
  return item + " "
})
}
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2.5rem 2rem' }}>
          <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 16, border: '1px solid rgba(84,63,39,0.2)', boxShadow: '0 2px 32px rgba(26,15,94,0.07)', overflow: 'hidden' }}>

            {/* Card header */}
            <div style={{ background: 'linear-gradient(135deg, #1a0f5e 0%, #2a1a7c 100%)', padding: '1.5rem 2rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', border: '20px solid rgba(212,175,55,0.12)' }} />
              <div style={{ position: 'absolute', bottom: -30, left: 30, width: 80, height: 80, borderRadius: '50%', border: '15px solid rgba(234,31,37,0.1)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(212,175,55,0.7)', marginBottom: 4, fontWeight: 500 }}>
                  {stepLabels[step - 1]}
                </div>
                <div style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
                  Welcome Back, <span style={{ color: '#d4af37' }}>User</span>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                  {[1, 2, 3].map(d => <div key={d} style={getDotStyle(d)} />)}
                </div>
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: '1.75rem 2rem' }}>
              {alert && <AlertBox msg={alert.msg} type={alert.type} />}

              {/* Step 1 */}
              {step === 1 && (
                <form className="lp-step" onSubmit={onSubmitEmail}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <span style={inputIconStyle}><IconMail /></span>
                      <input
                        type="email"
                        className="lp-input"
                        style={inputStyle}
                        placeholder="you@example.com"
                        value={emailVal}
                        onChange={e => setEmailVal(e.target.value)}
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <button type="submit" className="lp-btn" style={btnPrimary} disabled={loading}>
                    {loading && <Loader />}
                    {loading ? 'Checking...' : 'Continue →'}
                  </button>
                </form>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <form className="lp-step" onSubmit={onSubmitOtp}>
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>One-Time Password</label>
                    <div style={{ position: 'relative' }}>
                      <span style={inputIconStyle}><IconOTP /></span>
                      <input
                        type="text"
                        className="lp-input"
                        style={inputStyle}
                        placeholder="6-digit OTP"
                        maxLength={6}
                        value={otpVal}
                        onChange={e => setOtpVal(e.target.value.replace(/\D/g, ''))}
                        autoComplete="one-time-code"
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 12, color: '#6b5a3e' }}>
                      <span>Sent to {email}</span>
                      <span style={{ color: '#EA1F25', fontWeight: 700 }}>{countdown > 0 ? `${countdown}s` : 'Expired'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <button
                      type="button"
                      style={{ ...btnLink, opacity: canResend ? 1 : 0.4, cursor: canResend ? 'pointer' : 'not-allowed' }}
                      onClick={canResend ? handleResendOTP : undefined}
                    >
                      Resend OTP
                    </button>
                    <button type="button" style={btnLink} onClick={() => setStep(1)}>
                      ← Change Email
                    </button>
                  </div>
                  <button type="submit" className="lp-btn" style={btnPrimary} disabled={loading}>
                    {loading && <Loader />}
                    {loading ? 'Verifying...' : 'Verify OTP →'}
                  </button>
                </form>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <form className="lp-step" onSubmit={onSubmitPassword}>
                  <div style={{ marginBottom: 4 }}>
                    <label style={labelStyle}>Password</label>
                    <div style={{ position: 'relative' }}>
                      <span style={inputIconStyle}><IconLock /></span>
                      <input
                        type={showPass ? 'text' : 'password'}
                        className="lp-input"
                        style={{ ...inputStyle, paddingRight: 44 }}
                        placeholder="Enter your password"
                        value={passVal}
                        onChange={e => setPassVal(e.target.value)}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(p => !p)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b5a3e', display: 'flex', padding: 0 }}
                      >
                        {showPass ? <IconEyeOff /> : <IconEye />}
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <button type="button" style={btnLink} onClick={handleForgotPassword}>
                      Forgot Password?
                    </button>
                  </div>
                  <button type="submit" className="lp-btn" style={btnPrimary} disabled={loading}>
                    {loading && <Loader />}
                    {loading ? 'Logging in...' : 'Login →'}
                  </button>
                </form>
              )}
            </div>

            {/* Card footer */}
            <div style={{ padding: '1rem 2rem 1.5rem', borderTop: '1px solid rgba(84,63,39,0.1)', textAlign: 'center', fontSize: 11, color: '#6b5a3e', lineHeight: 1.6 }}>
              <strong style={{ color: '#543f27' }}>Secure Portal</strong> — {TrsutData.name}
              <br />All data protected &amp; encrypted
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;