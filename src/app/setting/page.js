"use client";

import React, { useState, useEffect } from 'react';
import Contact from '@/components/screen/settings/Contact';
import Organization from '@/components/screen/settings/organization';
import TeamMembers from '@/components/screen/settings/TeamMembers';
import Sessions from '@/components/screen/settings/Sessions';
import PasswordChange from '@/components/screen/settings/PasswordChange';
import RulePolicy from '@/components/screen/settings/rulePolicy';
import DataMigration from '@/components/screen/settings/DataMigration';
import {
  BsBank2,
  BsShieldLock,
  BsHeadset,
  BsPeople,
  BsGear,
  BsChevronRight,
  BsChevronLeft,
  BsGearFill,
  BsX,
  BsList,
  BsCloudUpload,
} from 'react-icons/bs';
import { collection, getDocs, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthProvider';

const menuItems = [
  {
    key: 'organization',
    icon: <BsBank2 size={18} />,
    label: 'Organization',
    description: 'Manage trust details and profile',
  },
  {
    key: 'teams',
    icon: <BsPeople size={18} />,
    label: 'Team Members',
    description: 'Manage your organization members',
  },
  {
    key: 'security',
    icon: <BsShieldLock size={18} />,
    label: 'Security',
    description: 'Secure your account and data',
    subItems: [
      { key: 'security-password', label: 'Password' },
      { key: 'security-sessions', label: 'Active Sessions' },
    ],
  },
  {
    key: 'contact',
    icon: <BsHeadset size={18} />,
    label: 'Contact Support',
    description: 'Get help from our team',
  },
  {
    key: 'Rules & Policies',
    icon: <BsGearFill size={18} />,
    label: 'Rules & Policies',
    description: "View and manage your organization's rules and policies",
  },
  {
    key: 'data-migration',
    icon: <BsCloudUpload size={18} />,
    label: 'Data Migration',
    description: 'Migrate JSON data (Vivah/Mamera/Suraksha) to program',
  },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('organization');
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Close mobile sidebar on tab change
  const handleTabClick = (key) => {
    setActiveTab(key);
    setActiveSubTab(null);
    setMobileSidebarOpen(false);
  };

  const handleSubTabClick = (key) => {
    setActiveSubTab(key);
    setMobileSidebarOpen(false);
  };

  const getActiveMenuItem = () => menuItems.find((item) => item.key === activeTab);

  const getTabTitle = () => {
    const activeMenuItem = getActiveMenuItem();
    if (activeSubTab && activeMenuItem?.subItems) {
      const sub = activeMenuItem.subItems.find((i) => i.key === activeSubTab);
      return sub ? sub.label : activeMenuItem.label;
    }
    return activeMenuItem ? activeMenuItem.label : '';
  };

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (activeTab === 'security' && activeSubTab === 'security-sessions' && user?.uid) {
        setSessionsLoading(true);
        try {
          const sessionsRef = collection(db, 'users', user.uid, 'sessions');
          const snapshot = await getDocs(query(sessionsRef));
          const data = [];
          snapshot.forEach((docSnap) => data.push({ id: docSnap.id, ...docSnap.data() }));
          setSessions(data);
        } catch {
          setSessions([]);
        }
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, [activeTab, activeSubTab, user]);

  const handleRevokeSession = async (sessionId) => {
    if (!user?.uid || !sessionId) return;
    await deleteDoc(doc(db, 'users', user.uid, 'sessions', sessionId));
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'organization':
        return <Organization />;
      case 'contact':
        return <Contact />;
      case 'Rules & Policies':
        return <RulePolicy />;
      case 'data-migration':
        return <DataMigration />;
      case 'teams':
        return <TeamMembers />;
      case 'security':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Security Settings</h3>
            <p className="text-sm text-gray-500 mb-6">
              Configure your account security options and privacy settings.
            </p>

            {activeSubTab === 'security-password' && <PasswordChange />}
            {activeSubTab === 'security-sessions' && (
              <Sessions activeTab={activeTab} activeSubTab={activeSubTab} />
            )}

            {!activeSubTab && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {getActiveMenuItem()?.subItems?.map((subItem) => (
                  <button
                    key={subItem.key}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-left group"
                    onClick={() => handleSubTabClick(subItem.key)}
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 group-hover:bg-blue-100 transition-colors flex-shrink-0">
                      <BsShieldLock size={17} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{subItem.label}</p>
                    </div>
                    <BsChevronRight size={13} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 flex flex-col items-center justify-center min-h-64">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
              {getActiveMenuItem()?.icon}
            </div>
            <h3 className="text-base font-medium text-gray-700 mb-2">{getTabTitle()}</h3>
            <p className="text-sm text-gray-400 text-center max-w-xs">
              This section is under development. Please check back soon.
            </p>
          </div>
        );
    }
  };

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <BsGear className="text-blue-500" size={18} />
            <span className="text-base font-semibold text-gray-800">Settings</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="flex justify-center w-full">
            <BsGear className="text-blue-500" size={18} />
          </div>
        )}
        {/* Collapse toggle — hidden on mobile */}
        <button
          className="hidden md:flex p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <BsChevronRight size={14} /> : <BsChevronLeft size={14} />}
        </button>
        {/* Close button — mobile only */}
        <button
          className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close menu"
        >
          <BsX size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {menuItems.map((item) => {
          const isActive = activeTab === item.key;
          const hasSubItems = !!item.subItems;
          const isExpanded = isActive && hasSubItems;

          return (
            <div key={item.key}>
              <button
                onClick={() => handleTabClick(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span
                  className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}
                >
                  {item.icon}
                </span>

                {!sidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.label}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>
                    </div>
                    {hasSubItems && (
                      <BsChevronRight
                        size={12}
                        className={`flex-shrink-0 text-gray-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    )}
                  </>
                )}
              </button>

              {/* Sub-items */}
              {isExpanded && !sidebarCollapsed && (
                <div className="ml-9 pl-3 border-l border-gray-200 mt-1 mb-1 space-y-0.5">
                  {item.subItems.map((sub) => (
                    <button
                      key={sub.key}
                      onClick={() => handleSubTabClick(sub.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                        activeSubTab === sub.key
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="flex h-full bg-gray-50 relative">

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-gray-200 h-[calc(100vh-64px)] sticky top-0 transition-all duration-200 ${
          sidebarCollapsed ? 'w-[60px]' : 'w-[260px]'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar — mobile drawer */}
      <aside
        className={`fixed top-0 left-0 h-full z-30 flex flex-col bg-white border-r border-gray-200 w-72 transition-transform duration-200 md:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
          >
            <BsList size={20} />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-gray-400 min-w-0">
            <span className="hidden sm:inline">Settings</span>
            <BsChevronRight size={11} className="hidden sm:inline flex-shrink-0" />
            <span className="text-gray-700 font-medium truncate">{getActiveMenuItem()?.label}</span>
            {activeSubTab && (
              <>
                <BsChevronRight size={11} className="flex-shrink-0" />
                <span className="text-gray-700 font-medium truncate">
                  {getActiveMenuItem()?.subItems?.find((s) => s.key === activeSubTab)?.label}
                </span>
              </>
            )}
          </nav>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-3xl w-full mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;