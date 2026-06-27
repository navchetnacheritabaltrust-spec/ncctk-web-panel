"use client";
import React, { useEffect, useState } from 'react';
import { Popover, Modal, Tooltip, Select } from 'antd';
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { usePathname, useRouter } from 'next/navigation';
import { 
  FiMenu, 
  FiX, 
  FiUser, 
  FiLogOut, 
  FiChevronRight,
  FiChevronDown,
  FiGrid,
  FiSearch
} from 'react-icons/fi';
import RequestSection from '../common/requestSection';
import AddProgram from '../common/program';
import { useAuth } from '@/lib/AuthProvider';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import AddAgent from '../screen/agents/AddAgents';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedProgram } from '@/redux/slices/commonSlice';
import AddMember from '../screen/programs/members/AddMember';
import AddPaymentModal from '../common/addPayment/AddPaymentModal';

const { Option } = Select;

// Page name map
const PAGE_LABELS = {
  '': 'Dashboard',
  'members': 'Members',
  'agents': 'Agents',
  'yojna': 'Yojna',
  'closingPayments': 'Closing Payments',
  'transactions': 'Payments',
  'setting': 'Settings',
};

const TopBar = ({ sidebarCollapsed, toggleSidebar, showNotifications, toggleNotifications, showUserMenu, toggleUserMenu }) => {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const pathname = usePathname();
  const programList = useSelector((state) => state.data.programList);
  const selectedProgram = useSelector((state) => state.data.selectedProgram);

  const segments = pathname.split('/').filter(Boolean);
  const currentSegment = segments[segments.length - 1] || '';
  const pageLabel = PAGE_LABELS[currentSegment] ?? (currentSegment.charAt(0).toUpperCase() + currentSegment.slice(1));

  const logout = async () => {
    await signOut(auth);
    router.replace('/auth/login');
  };

  const handleLogout = async () => {
    try {
      const userId = user?.uid;
      const sessionToken = localStorage.getItem("session_token");
      if (userId && sessionToken) {
        await deleteDoc(doc(db, "users", userId, "sessions", sessionToken));
      }
      logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleProgramSelect = (programId) => {
    dispatch(setSelectedProgram(programList.find(p => p.id === programId)));
  };

  useEffect(() => {
    const userId = user?.uid;
    const sessionToken = localStorage.getItem("session_token");
    if (!userId || !sessionToken) return;
    const sessionRef = doc(db, "users", userId, "sessions", sessionToken);
    const unsubscribe = onSnapshot(sessionRef, (snap) => {
      if (!snap.exists()) logout();
    });
    return unsubscribe;
  }, []);

  const initials = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        .topbar-root {
          font-family: 'Outfit', sans-serif;
          background: #fff;
          border-bottom: 1px solid #f1f5f9;
          box-shadow: 0 1px 0 rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.03);
        }
        .toggle-btn {
          width: 38px; height: 38px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: #64748b;
          transition: all 0.18s;
          border: 1px solid transparent;
          flex-shrink: 0;
        }
        .toggle-btn:hover {
          background: #f1f5f9;
          color: #3b82f6;
          border-color: #e2e8f0;
        }
        .breadcrumb-page {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.01em;
        }
        .breadcrumb-home {
          font-size: 13px;
          color: #94a3b8;
          font-weight: 500;
        }

        /* Program select override */
        .program-select .ant-select-selector {
          border-radius: 10px !important;
          border: 1px solid #e2e8f0 !important;
          background: #f8fafc !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 13px !important;
          height: 38px !important;
          display: flex !important;
          align-items: center !important;
          transition: all 0.18s !important;
        }
        .program-select .ant-select-selector:hover {
          border-color: #3b82f6 !important;
          background: #fff !important;
        }
        .program-select.ant-select-focused .ant-select-selector {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12) !important;
          background: #fff !important;
        }

        /* Avatar */
        .user-avatar-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 10px 5px 5px;
          border-radius: 40px;
          border: 1px solid #e2e8f0;
          transition: all 0.18s;
          cursor: pointer;
        }
        .user-avatar-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
        .user-avatar {
          width: 30px; height: 30px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          flex-shrink: 0;
        }
        .user-name-text {
          font-size: 13px;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
        }

        /* Dropdown menu */
        .user-dropdown {
          position: absolute;
          right: 0; top: calc(100% + 8px);
          width: 220px;
          background: #fff;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.05);
          overflow: hidden;
          z-index: 100;
          animation: dropIn 0.18s ease;
        }
        .user-dropdown-header {
          padding: 12px 16px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 1px solid #f1f5f9;
        }
        .logout-btn {
          display: flex; align-items: center; gap: 10px;
          width: 100%; padding: 10px 16px;
          font-size: 13px; font-weight: 600;
          color: #ef4444;
          transition: background 0.15s;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
        }
        .logout-btn:hover { background: #fef2f2; }

        /* Separator */
        .topbar-sep {
          width: 1px; height: 24px;
          background: #e2e8f0;
          flex-shrink: 0;
        }

        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Mobile: hide username */
        @media (max-width: 640px) {
          .user-name-text { display: none; }
          .user-avatar-btn { padding: 5px; border-radius: 50%; }
          .topbar-actions-desktop { display: none; }
          .program-select { width: 140px !important; }
        }
      `}</style>

      <header className="topbar-root h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={toggleSidebar} className="toggle-btn" aria-label="Toggle sidebar">
            {sidebarCollapsed ? <FiMenu size={20} /> : <FiX size={20} />}
          </button>

          {/* Breadcrumb */}
          <nav className="hidden sm:flex items-center gap-1.5">
            <FiGrid size={13} className="text-slate-400" />
            <span className="breadcrumb-home">Home</span>
            <FiChevronRight size={13} className="text-slate-300" />
            <span className="breadcrumb-page">{pageLabel}</span>
          </nav>

          {/* Mobile page title */}
          <span className="sm:hidden breadcrumb-page truncate">{pageLabel}</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Program select */}
          <Select
            placeholder="Select Program"
            className="program-select"
            style={{ width: 180 }}
            size="middle"
            onChange={handleProgramSelect}
            value={selectedProgram ? selectedProgram.id : undefined}
            suffixIcon={<FiChevronDown size={13} className="text-slate-400" />}
          >
            {programList.map(p => (
              <Option key={p.id} value={p.id}>{p.name}</Option>
            ))}
          </Select>

          <span className="topbar-sep topbar-actions-desktop" />

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 topbar-actions-desktop">
            <AddPaymentModal />
            <AddAgent />
            <AddMember />
            <RequestSection />
          </div>

          <span className="topbar-sep" />

          {/* User menu */}
          <div className="relative user-menu-trigger">
            <button onClick={toggleUserMenu} className="user-avatar-btn user-menu-trigger">
              <div className="user-avatar">{initials}</div>
              <span className="user-name-text">{user?.username || 'User'}</span>
              <FiChevronDown size={13} className="text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="user-dropdown user-menu-content">
                <div className="user-dropdown-header">
                  <p className="text-sm font-bold text-slate-800 truncate">{user?.username || 'User'}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email || ''}</p>
                </div>
                <button onClick={() => setIsLogoutModalOpen(true)} className="logout-btn">
                  <FiLogOut size={15} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile actions bar */}
      <div className="sm:hidden flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-white overflow-x-auto">
        <AddPaymentModal />
        <AddAgent />
        <AddMember />
        <RequestSection />
      </div>

      {/* Logout modal */}
      <Modal
        title={
          <div className="flex items-center gap-2" style={{ color: '#ef4444' }}>
            <FiLogOut size={17} />
            <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Confirm Logout</span>
          </div>
        }
        open={isLogoutModalOpen}
        onOk={handleLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
        okText="Logout"
        cancelText="Cancel"
        centered
        maskClosable
        okButtonProps={{ danger: true }}
      >
        <p style={{ fontFamily: 'Outfit, sans-serif', color: '#475569', padding: '8px 0' }}>
          Are you sure you want to logout from the Trust Management System?
        </p>
      </Modal>
    </>
  );
};

export default TopBar;