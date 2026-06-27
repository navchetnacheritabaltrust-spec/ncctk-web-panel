import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiGrid, 
  FiUsers, 
  FiFileText, 
  FiBell, 
  FiSettings, 
  FiShield,
  FiCreditCard,
  FiFolder,
  FiUser,
  FiLayers,
  FiX
} from 'react-icons/fi';
import { useAuth } from '@/lib/AuthProvider';

const SideBar = ({ collapsed, onClose }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = [
    { icon: FiGrid,      label: 'Dashboard',         link: '/',                description: 'Overview & analytics' },
    { icon: FiUsers,     label: 'Members',            link: '/members',         description: 'Manage members' },
    { icon: FiUser,      label: 'Agents',             link: '/agents',          description: 'Agent management' },
    { icon: FiBell,      label: 'Yojna',              link: '/yojna',           description: 'Schemes & programs' },
    { icon: FiCreditCard,label: 'Closing Payments',   link: '/closingPayments', description: 'Closing payments' },
    { icon: FiCreditCard,label: 'Payments',           link: '/transactions',    description: 'Payment history' },
  ];

  const systemItems = [
    { icon: FiSettings, label: 'Settings', link: '/setting', description: 'App configuration' },
  ];

  const isActive = (path) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const NavItem = ({ item, index }) => {
    const active = isActive(item.link);
    const Icon = item.icon;
    return (
      <li key={index} style={{ animation: `slideIn 0.3s ease ${index * 0.04}s both` }}>
        <Link
          href={item.link}
          onClick={onClose}
          className={`nav-item group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden
            ${active ? 'nav-active' : 'nav-default'}
            ${collapsed ? 'justify-center' : ''}
          `}
          title={collapsed ? item.label : ''}
        >
          {active && <span className="active-glow" />}
          <span className={`icon-wrap flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200
            ${active ? 'icon-active' : 'icon-default group-hover:icon-hover'}`}>
            <Icon size={18} />
          </span>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <span className={`text-sm font-semibold block leading-tight ${active ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                {item.label}
              </span>
              <span className={`text-xs block mt-0.5 ${active ? 'text-blue-200' : 'text-slate-500 group-hover:text-slate-400'}`}>
                {item.description}
              </span>
            </div>
          )}
          {active && !collapsed && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-300 flex-shrink-0" />
          )}
        </Link>
      </li>
    );
  };

  const initials = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
        
        .sidebar-root {
          font-family: 'Outfit', sans-serif;
          background: linear-gradient(180deg, #0f172a 0%, #0c1525 60%, #0a1020 100%);
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .sidebar-logo-border { border-bottom: 1px solid rgba(255,255,255,0.07); }
        .logo-icon {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          box-shadow: 0 4px 14px rgba(59,130,246,0.4);
        }
        
        /* Nav items */
        .nav-item { position: relative; }
        .nav-active {
          background: linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(37,99,235,0.15) 100%);
          border: 1px solid rgba(59,130,246,0.3);
          box-shadow: 0 2px 12px rgba(59,130,246,0.15);
        }
        .nav-default {
          border: 1px solid transparent;
        }
        .nav-default:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.08);
        }
        .active-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at left center, rgba(59,130,246,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .icon-active {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #fff;
          box-shadow: 0 2px 8px rgba(59,130,246,0.4);
        }
        .icon-default {
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
        }
        .icon-hover { background: rgba(59,130,246,0.12); color: #93c5fd; }
        .group:hover .icon-default { background: rgba(59,130,246,0.12); color: #93c5fd; }
        
        /* Section label */
        .section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #475569;
          text-transform: uppercase;
        }
        
        /* Scrollbar */
        .sidebar-nav::-webkit-scrollbar { width: 3px; }
        .sidebar-nav::-webkit-scrollbar-track { background: transparent; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 99px; }
        
        /* Avatar */
        .avatar-ring {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          padding: 2px;
          border-radius: 50%;
        }
        .avatar-inner {
          background: #1e293b;
          border-radius: 50%;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e2e8f0;
          font-weight: 700;
          font-size: 14px;
        }
        .online-dot {
          width: 8px; height: 8px;
          background: #22c55e;
          border-radius: 50%;
          border: 2px solid #0f172a;
          position: absolute; bottom: 0; right: 0;
        }
        .sidebar-footer { border-top: 1px solid rgba(255,255,255,0.07); }
        
        /* Divider */
        .divider { border-color: rgba(255,255,255,0.06); }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <aside className={`sidebar-root flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? 'w-20' : 'w-72'}
        h-full
      `}>
        {/* Logo */}
        <div className={`sidebar-logo-border flex items-center h-16 px-4 flex-shrink-0
          ${collapsed ? 'justify-center' : 'gap-3'}
        `}>
          {/* Mobile close btn — only on small screens, handled by parent */}
          <div className="logo-icon w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <FiLayers size={20} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-bold text-white text-base leading-tight tracking-tight">Trust Manager</h2>
              <p className="text-xs text-slate-500 mt-0.5">Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Main */}
          <div>
            {!collapsed && <p className="section-label px-2 mb-3">Main Menu</p>}
            <ul className="space-y-1">
              {navItems.map((item, i) => <NavItem key={i} item={item} index={i} />)}
            </ul>
          </div>

          {/* Divider */}
          <hr className="divider" />

          {/* System */}
          <div>
            {!collapsed && <p className="section-label px-2 mb-3">System</p>}
            <ul className="space-y-1">
              {systemItems.map((item, i) => <NavItem key={i} item={item} index={i + navItems.length} />)}
            </ul>
          </div>
        </nav>

        {/* User footer */}
        <div className={`sidebar-footer px-3 py-4 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-3 ${collapsed ? '' : 'w-full'}`}>
            <div className="relative flex-shrink-0">
              <div className="avatar-ring w-10 h-10">
                <div className="avatar-inner">{initials}</div>
              </div>
              <span className="online-dot" />
            </div>
            {!collapsed && user && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-200 truncate">{user.username || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{user.email || 'admin@trust.com'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default SideBar;