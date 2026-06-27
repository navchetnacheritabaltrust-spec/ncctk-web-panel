"use client";
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthProvider";
import { Modal, Button } from "antd";

const Sessions = ({ activeTab, activeSubTab }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokeSessionId, setRevokeSessionId] = useState(null);

  // Get current session token (assumes it's stored in user.tokens.accessToken)
  const currentSessionToken = localStorage.getItem("session_token");

  // Fetch sessions when security-sessions tab is active
  useEffect(() => {
    const fetchSessions = async () => {
      if (activeTab === 'security' && activeSubTab === 'security-sessions' && user?.uid) {
        setSessionsLoading(true);
        try {
          const sessionsRef = collection(db, "users", user.uid, "sessions");
          const q = query(sessionsRef);
          const snapshot = await getDocs(q);
          const data = [];
          snapshot.forEach(docSnap => {
            data.push({ id: docSnap.id, ...docSnap.data() });
          });
          setSessions(data);
        } catch (e) {
          setSessions([]);
        }
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, [activeTab, activeSubTab, user]);

  const handleRevokeSession = async (sessionId) => {
    if (!user?.uid || !sessionId) return;
    await deleteDoc(doc(db, "users", user.uid, "sessions", sessionId));
    setSessions(sessions.filter(s => s.id !== sessionId));
    setRevokeSessionId(null);
  };

  return (
    <div>
      <div className="mt-6">
        <h4 className="text-lg font-medium text-gray-700 mb-4">Active Sessions</h4>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <div className="grid grid-cols-12 text-sm font-medium text-gray-500">
              <div className="col-span-3">Device</div>
              <div className="col-span-2">Browser</div>
              <div className="col-span-2">OS</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-2">Last Active</div>
              <div className="col-span-1">Action</div>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {sessionsLoading ? (
              <div className="px-4 py-6 text-center text-gray-400">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400">No active sessions found.</div>
            ) : (
              sessions.map(session => {
                const isCurrent = session.id === currentSessionToken;
                return (
                  <div
                    className={`px-4 py-3 ${isCurrent ? 'bg-blue-50/80 border-l-4 border-blue-500' : ''}`}
                    key={session.id}
                  >
                    <div className="grid grid-cols-12 items-center">
                      <div className="col-span-3 flex items-center gap-2">
                        <div className="font-medium text-gray-700">{session.device}</div>
                        {isCurrent && (
                          <span className="ml-2 px-2 py-0.5 rounded bg-blue-500 text-white text-xs font-semibold">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="col-span-2">{session.browser}</div>
                      <div className="col-span-2">{session.os}</div>
                      <div className="col-span-2">{session.location + "-"+session?.pinCode}</div>
                      <div className="col-span-2">
                        <span className="text-xs text-gray-500">
                          {session.lastActive ? new Date(session.lastActive).toLocaleString() : "-"}
                        </span>
                      </div>
                      <div className="col-span-1 flex items-center">
                        <Button
                          type="link"
                          danger
                          disabled={isCurrent}
                          onClick={() => setRevokeSessionId(session.id)}
                          className="p-0"
                        >
                          Revoke
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      <Modal
        title="Revoke Session"
        open={!!revokeSessionId}
        onOk={() => handleRevokeSession(revokeSessionId)}
        onCancel={() => setRevokeSessionId(null)}
        okText="Revoke"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
      >
        <p>Are you sure you want to revoke this session? This will log out the device from your account.</p>
      </Modal>
    </div>
  );
};

export default Sessions;
