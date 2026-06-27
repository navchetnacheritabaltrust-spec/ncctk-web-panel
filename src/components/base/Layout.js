"use client";
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from "@/lib/AuthProvider";
import TopBar from './TopBar';
import SideBar from './SideBar';
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { setAgentList, setgetAgentDataChange, setPrograms, setSelectedProgram } from '@/redux/slices/commonSlice';
import { useDispatch, useSelector } from 'react-redux';
import { FiLayers } from 'react-icons/fi';

// ─── Skeleton loader ────────────────────────────────────────────────────────
const SkeletonRow = ({ w = 'w-full', h = 'h-4', className = '' }) => (
  <div className={`skeleton-pulse rounded-lg ${w} ${h} ${className}`} />
);

const LoadingScreen = () => (
  <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap');
      .loading-root {
        min-height: 100vh;
        background: #f8fafc;
        display: flex;
        font-family: 'Outfit', sans-serif;
      }
      /* Fake sidebar */
      .loading-sidebar {
        width: 72px;
        background: linear-gradient(180deg, #0f172a 0%, #0a1020 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px 0;
        gap: 16px;
        flex-shrink: 0;
      }
      @media (max-width: 768px) { .loading-sidebar { display: none; } }
      .loading-sidebar-icon {
        width: 40px; height: 40px;
        border-radius: 10px;
        background: linear-gradient(135deg, #1e3a5f, #172d4d);
      }
      .loading-sidebar-dot {
        width: 36px; height: 36px;
        border-radius: 10px;
        background: rgba(255,255,255,0.06);
      }
      /* Fake topbar */
      .loading-topbar {
        height: 64px;
        background: #fff;
        border-bottom: 1px solid #f1f5f9;
        display: flex; align-items: center;
        padding: 0 24px; gap: 12px;
      }
      /* Main content area */
      .loading-content { flex: 1; padding: 24px; display: flex; flex-direction: column; gap: 16px; }
      .loading-card {
        background: #fff;
        border-radius: 16px;
        border: 1px solid #f1f5f9;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        padding: 20px;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .skeleton-pulse {
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .spinner-ring {
        width: 20px; height: 20px;
        border: 2px solid rgba(59,130,246,0.2);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        flex-shrink: 0;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>

    <div className="loading-root">
      {/* Fake sidebar */}
      <div className="loading-sidebar">
        <div className="loading-sidebar-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="loading-sidebar-dot" style={{ opacity: 1 - i * 0.12 }} />
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Fake topbar */}
        <div className="loading-topbar">
          <SkeletonRow w="w-8" h="h-8" className="rounded-lg flex-shrink-0" />
          <SkeletonRow w="w-32" h="h-4" />
          <div style={{ flex: 1 }} />
          <SkeletonRow w="w-36" h="h-8" className="rounded-lg" />
          <SkeletonRow w="w-8" h="h-8" className="rounded-full" />
        </div>

        {/* Content */}
        <div className="loading-content">
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="loading-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <SkeletonRow w="w-10" h="h-10" className="rounded-xl" />
                <SkeletonRow w="w-24" h="h-3" />
                <SkeletonRow w="w-16" h="h-6" />
              </div>
            ))}
          </div>

          {/* Table-like card */}
          <div className="loading-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <SkeletonRow w="w-40" h="h-5" />
              <div style={{ flex: 1 }} />
              <SkeletonRow w="w-24" h="h-8" className="rounded-lg" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <SkeletonRow w="w-8" h="h-8" className="rounded-full" />
                <SkeletonRow w="w-32" h="h-4" />
                <SkeletonRow w="w-20" h="h-4" />
                <div style={{ flex: 1 }} />
                <SkeletonRow w="w-16" h="h-6" className="rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </>
);

// ─── Main Layout ─────────────────────────────────────────────────────────────
export default function CustomDashboardLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();
  const agentStatusChanged = useSelector((state) => state.data.getAgentDataChange);
  const memberStatusChanged = useSelector((state) => state.data.setgetMemberDataChange);

  const withoutLayout = ["/auth/login"];

  const getAgentData = async () => {
    try {
      const col = collection(db, "users", user.uid, 'agents');
      const snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
      dispatch(setAgentList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      dispatch(setgetAgentDataChange(false));
    } catch (e) { console.error(e); }
  };

  const getProgramData = async () => {
    try {
      const col = collection(db, "users", user.uid, "programs");
      const snap = await getDocs(query(col, orderBy('createdAt', 'desc')));
      const programs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      dispatch(setPrograms(programs));
      dispatch(setSelectedProgram(programs[0] || null));
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!loading && !user && !withoutLayout.includes(pathname)) {
      router.replace("/auth/login");
    }
    if (user) {
      getProgramData();
      getAgentData();
    }
  }, [user, loading, pathname, agentStatusChanged, memberStatusChanged]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.user-menu-trigger') && !e.target.closest('.user-menu-content')) {
        setShowUserMenu(false);
      }
      if (!e.target.closest('.notification-trigger') && !e.target.closest('.notification-content')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileSidebarOpen(false); }, [pathname]);

  if (loading) return <LoadingScreen />;
  if (withoutLayout.includes(pathname)) return children;
  if (!user) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .layout-root {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: #f1f5f9;
          font-family: 'Outfit', sans-serif;
        }

        /* Desktop sidebar */
        .desktop-sidebar {
          flex-shrink: 0;
          height: 100%;
          display: flex;
        }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none; }
        }

        /* Mobile overlay */
        .mobile-overlay {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-overlay {
            display: block;
            position: fixed;
            inset: 0;
            z-index: 200;
            pointer-events: none;
          }
          .mobile-overlay.open {
            pointer-events: all;
          }
          .mobile-backdrop {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.5);
            backdrop-filter: blur(2px);
            opacity: 0;
            transition: opacity 0.25s;
          }
          .mobile-overlay.open .mobile-backdrop { opacity: 1; }
          .mobile-drawer {
            position: absolute;
            top: 0; left: 0; bottom: 0;
            width: 280px;
            transform: translateX(-100%);
            transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          }
          .mobile-overlay.open .mobile-drawer { transform: translateX(0); }
          .mobile-close-btn {
            position: absolute;
            top: 16px; right: -44px;
            width: 36px; height: 36px;
            border-radius: 50%;
            background: rgba(255,255,255,0.15);
            border: 1px solid rgba(255,255,255,0.2);
            display: flex; align-items: center; justify-content: center;
            color: #fff;
            cursor: pointer;
            transition: background 0.15s;
          }
          .mobile-close-btn:hover { background: rgba(255,255,255,0.25); }
        }

        /* Mobile toggle button in TopBar */
        .mobile-menu-btn {
          display: none;
        }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex; }
        }

        /* Main area */
        .main-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }
        .page-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        @media (max-width: 640px) {
          .page-content { padding: 12px; }
        }
        .page-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03);
          padding: 24px;
          min-height: calc(100vh - 140px);
        }
        @media (max-width: 640px) {
          .page-card { padding: 16px; border-radius: 12px; }
        }

        /* Page enter animation */
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .page-card { animation: pageEnter 0.25s ease; }
      `}</style>

      <div className="layout-root">
        {/* Desktop Sidebar */}
        <div className="desktop-sidebar">
          <SideBar collapsed={sidebarCollapsed} />
        </div>

        {/* Mobile Sidebar Drawer */}
        <div className={`mobile-overlay ${mobileSidebarOpen ? 'open' : ''}`}>
          <div className="mobile-backdrop" onClick={() => setMobileSidebarOpen(false)} />
          <div className="mobile-drawer">
            <SideBar collapsed={false} onClose={() => setMobileSidebarOpen(false)} />
            <button
              className="mobile-close-btn"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="main-area">
          <TopBar
            sidebarCollapsed={sidebarCollapsed}
            toggleSidebar={() => {
              if (window.innerWidth <= 768) {
                setMobileSidebarOpen(prev => !prev);
              } else {
                setSidebarCollapsed(prev => !prev);
              }
            }}
            showNotifications={showNotifications}
            toggleNotifications={() => {
              setShowNotifications(p => !p);
              setShowUserMenu(false);
            }}
            showUserMenu={showUserMenu}
            toggleUserMenu={() => {
              setShowUserMenu(p => !p);
              setShowNotifications(false);
            }}
          />
          <main className="page-content">
            <div className="page-card">
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}