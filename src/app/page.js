"use client";
import { useAuth } from "@/lib/AuthProvider";
import { useSelector } from "react-redux";
import ClosingCom from "@/components/screen/home/ClosingCom";
import { useState, useEffect } from "react";
import { getData } from "@/lib/services/firebaseService";
import { App } from "antd";
import { 
  FiUsers, FiCheckCircle, FiUserCheck, FiTrendingUp,
  FiActivity, FiRefreshCw
} from "react-icons/fi";

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, gradient, delay = 0 }) => (
  <div className="stat-card" style={{ animationDelay: `${delay}ms` }}>
    <div className="stat-icon-wrap" style={{ background: gradient }}>
      <Icon size={22} className="text-white" />
    </div>
    <div className="stat-body">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-sub">{sub}</p>
    </div>
    <div className="stat-bar" style={{ background: gradient }} />
  </div>
);

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const StatSkeleton = () => (
  <div className="stat-card">
    <div className="skel w-12 h-12 rounded-2xl" />
    <div className="stat-body gap-2 flex flex-col">
      <div className="skel h-3 w-24 rounded" />
      <div className="skel h-7 w-16 rounded" />
      <div className="skel h-2.5 w-32 rounded" />
    </div>
  </div>
);

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading } = useAuth();
  const { message } = App.useApp();
  const selectedProgram = useSelector((state) => state.data.selectedProgram);
  const agentList = useSelector((state) => state.data.agentsList);

  const [closingCount, setClosingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const getClosingCount = async () => {
    if (!user || !selectedProgram) return;
    setIsLoading(true);
    try {
      const data = await getData(
        `/users/${user.uid}/programs/${selectedProgram?.id}/members`,
        [
          { field: 'active_flag', operator: '==', value: true },
          { field: 'delete_flag', operator: '==', value: false },
          { field: 'marriage_flag', operator: '==', value: true },
          { field: 'status', operator: 'in', value: ['closed', 'accepted'] }
        ]
      );
      setClosingCount(data?.length || 0);
    } catch (e) {
      message.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProgram) getClosingCount();
  }, [selectedProgram]);

  const activeMemberCount = selectedProgram?.memberCount || 0;
  const inactiveMemberCount = selectedProgram?.inactivemembercount || 0;
  const totalMembers = activeMemberCount + inactiveMemberCount;

  const stats = [
    {
      icon: FiUsers,
      label: "Total Members",
      value: totalMembers,
      sub: `${activeMemberCount} active · ${inactiveMemberCount} inactive`,
      gradient: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    },
    {
      icon: FiCheckCircle,
      label: "Closing Members",
      value: closingCount,
      sub: "Closed & accepted cases",
      gradient: "linear-gradient(135deg,#10b981,#059669)",
    },
    {
      icon: FiUserCheck,
      label: "Total Agents",
      value: agentList?.length || 0,
      sub: "Active agents in system",
      gradient: "linear-gradient(135deg,#f59e0b,#d97706)",
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
        
        .home-root {
          font-family: 'Outfit', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* Page header */
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .page-title {
          font-size: 22px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.03em;
          line-height: 1.2;
        }
        .page-subtitle {
          font-size: 13px;
          color: #94a3b8;
          margin-top: 3px;
        }
        .program-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: linear-gradient(135deg, rgba(59,130,246,0.08), rgba(37,99,235,0.05));
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 40px;
          font-size: 12px;
          font-weight: 600;
          color: #3b82f6;
          letter-spacing: 0.02em;
        }
        .program-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #3b82f6;
          animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        /* Stats grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: 1fr; }
        }
        @media (min-width: 480px) and (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* Stat card */
        .stat-card {
          position: relative;
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: box-shadow 0.2s, transform 0.2s;
          animation: cardIn 0.4s ease both;
        }
        .stat-card:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stat-icon-wrap {
          width: 48px; height: 48px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .stat-body { flex: 1; min-width: 0; }
        .stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 4px;
        }
        .stat-value {
          font-size: 30px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.04em;
          line-height: 1;
          margin-bottom: 6px;
        }
        .stat-sub {
          font-size: 11.5px;
          color: #cbd5e1;
          font-weight: 500;
        }
        /* Bottom accent bar */
        .stat-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          opacity: 0.6;
          border-radius: 0 0 16px 16px;
        }

        /* Skeleton */
        .skel {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        /* Section card */
        .section-card {
          background: #fff;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          overflow: hidden;
          animation: cardIn 0.4s ease 0.2s both;
        }
      `}</style>

      <div className="home-root">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              {selectedProgram ? `Viewing data for selected program` : 'Select a program to see data'}
            </p>
          </div>
          {selectedProgram && (
            <div className="program-badge">
              <span className="program-dot" />
              {selectedProgram.name}
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="stats-grid">
          {isLoading
            ? [0, 1, 2].map(i => <StatSkeleton key={i} />)
            : stats.map((s, i) => (
                <StatCard key={s.label} {...s} delay={i * 60} />
              ))
          }
        </div>

        {/* Closing Members Table */}
        <div className="section-card">
          <ClosingCom
            selectedProgram={selectedProgram}
            user={user}
            closingCount={closingCount}
            isLoading={isLoading}
            onRefresh={() => { getClosingCount(); setRefreshKey(k => k + 1); }}
            key={refreshKey}
          />
        </div>
      </div>
    </>
  );
}