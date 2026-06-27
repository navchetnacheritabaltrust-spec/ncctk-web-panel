import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Input,
  Select,
  Avatar,
  Badge,
  Typography,
  Empty,
  Tag,
  Space,
  Modal,
  Button,
  Tooltip,
  Popconfirm,
  Divider,
  Progress,
  App
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
  ScheduleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  UserAddOutlined,
  DeleteOutlined,
  SwapOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  WalletOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthProvider';
import { useSelector } from 'react-redux';

const { Option } = Select;
const { Title, Text } = Typography;

/* ─────────────────────────────── helpers ─────────────────────────────── */

const STATUS_CONFIG = {
  paid: {
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    label: 'Paid',
    icon: <CheckCircleOutlined />,
    badge: 'success',
  },
  pending: {
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    label: 'Pending',
    icon: <ClockCircleOutlined />,
    badge: 'warning',
  },
  overdue: {
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    label: 'Overdue',
    icon: <CloseCircleOutlined />,
    badge: 'error',
  },
};

const getStatusKey = (record) => {
  if (record.status === 'paid') return 'paid';
  if (record.isOverdue) return 'overdue';
  return 'pending';
};

/* ─────────────────────────────── stat card ───────────────────────────── */

const StatCard = ({ icon, label, value, color, suffix, progress }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 16,
      padding: '16px 20px',
      border: '1px solid #f0f0f0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      transition: 'box-shadow 0.2s',
      height: '100%',
    }}
    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)')}
    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)')}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: color || '#1a1a2e', lineHeight: 1 }}>
          {suffix}{value}
        </div>
      </div>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: color ? `${color}18` : '#f5f5f5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color || '#595959', fontSize: 18,
      }}>
        {icon}
      </div>
    </div>
    {typeof progress === 'number' && (
      <div style={{ marginTop: 10 }}>
        <Progress percent={Math.round(progress)} size="small" strokeColor={color} showInfo={false} />
      </div>
    )}
  </div>
);

/* ─────────────────── delete confirmation modal ────────────────── */

const DeleteConfirmationModal = ({ open, record, onClose, onConfirm, loading }) => {
  if (!record) return null;
  const statusKey = getStatusKey(record);
  const cfg = STATUS_CONFIG[statusKey];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={null}
      width={460}
      centered
      styles={{ body: { padding: 0 } }}
      style={{ borderRadius: 20, overflow: 'hidden' }}
    >
      {/* gradient header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
        padding: '28px 28px 20px',
        color: '#fff',
        borderRadius: '16px 16px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar
            size={52}
            src={record.memberDetails?.photoURL}
            icon={<UserOutlined />}
            style={{ border: '3px solid rgba(255,255,255,0.25)' }}
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{record.memberDetails?.displayName}</div>
            <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
              Reg: {record.memberDetails?.registrationNumber} &nbsp;·&nbsp; {record.memberDetails?.village}
            </div>
          </div>
          <div style={{
            marginLeft: 'auto', padding: '5px 14px', borderRadius: 20,
            background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {cfg.icon} {cfg.label}
          </div>
        </div>

        <div style={{
          marginTop: 18, background: 'rgba(255,255,255,0.08)', borderRadius: 12,
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Due Date</div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{record.dueDateFormatted}</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Amount</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#4ade80' }}>₹{record.payAmount || 200}</div>
        </div>
      </div>

      {/* body */}
      <div style={{ padding: '24px 28px 28px' }}>
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12,
          padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <ExclamationCircleOutlined style={{ color: '#ef4444', marginTop: 2, fontSize: 18 }} />
          <div style={{ fontSize: 13, color: '#b91c1c' }}>
            <strong>Warning:</strong> This will permanently delete this payment record from the pending payments collection. 
            This action <strong>cannot be undone</strong>.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Button onClick={onClose} style={{ flex: 1, height: 42, borderRadius: 10 }}>Cancel</Button>
          <Button
            type="primary"
            danger
            loading={loading}
            onClick={onConfirm}
            style={{ flex: 2, height: 42, borderRadius: 10, fontWeight: 700 }}
          >
            🗑 Delete Permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/* ─────────────────────────── main component ─────────────────────────── */

const ClosingPendingPayment = ({ selectedRecord }) => {
  const { user } = useAuth();
  const agentsList = useSelector((state) => state.data.agentsList) || [];
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);

  /* fetch */
  const fetchPayments = useCallback(async () => {
    if (!selectedRecord?.programId || !user || !selectedRecord?.id) return;
    try {
      setLoading(true);
      const paymentsRef = collection(db, `users/${user.uid}/programs/${selectedRecord.programId}/payment_pending`);
      const q = query(paymentsRef, where('closingMemberId', '==', selectedRecord.id));
      const snapshot = await getDocs(q);

      const paymentsData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const id = docSnap.id;
          const [, memberId] = id.split('_');
          let memberDetails = data.memberDetails || {};

          if (memberId) {
            try {
              const memberRef = doc(db, `users/${user.uid}/programs/${selectedRecord.programId}/members`, memberId);
              const memberSnap = await getDoc(memberRef);
              if (memberSnap.exists()) memberDetails = { ...memberDetails, ...memberSnap.data() };
            } catch {}
          }

          const dueDate = data.dueDate ? dayjs(data.dueDate, 'DD-MM-YYYY') : null;
          const isOverdue = dueDate && dueDate.isBefore(dayjs(), 'day');
          const agent = agentsList.find(a => a.id === memberDetails.agentId) || {};

          return {
            id, key: id, ...data,
            memberDetails: {
              displayName: memberDetails.displayName || data.memberDetails?.displayName || 'Unknown',
              registrationNumber: memberDetails.registrationNumber || data.memberDetails?.registrationNumber || 'N/A',
              phone: memberDetails.phone || data.memberDetails?.phoneNo || 'N/A',
              village: memberDetails.village || data.memberDetails?.village || 'N/A',
              district: memberDetails.district || data.memberDetails?.district || 'N/A',
              agentName: agent.displayName || agent.name || memberDetails.addedByName || 'N/A',
              agentId: memberDetails.agentId,
              photoURL: memberDetails.photoURL || data.memberDetails?.photoURL || '',
            },
            isOverdue,
            dueDateFormatted: dueDate?.format('DD-MM-YYYY') || 'N/A',
            isClosingMember: memberId === selectedRecord.id,
            _docPath: `users/${user.uid}/programs/${selectedRecord.programId}/payment_pending/${id}`,
          };
        })
      );

      setPayments(paymentsData);
      setFilteredPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
      message.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  }, [selectedRecord, user, agentsList]);

  /* filters */
  useEffect(() => {
    const filtered = payments.filter(p => {
      const matchesSearch = !searchText ||
        p.memberDetails.displayName.toLowerCase().includes(searchText.toLowerCase()) ||
        p.memberDetails.registrationNumber.toLowerCase().includes(searchText.toLowerCase()) ||
        p.memberDetails.phone.toLowerCase().includes(searchText.toLowerCase());
      const matchesAgent = agentFilter === 'all' || p.memberDetails.agentId === agentFilter;
      const matchesStatus = statusFilter === 'all' || getStatusKey(p) === statusFilter;
      return matchesSearch && matchesAgent && matchesStatus;
    });
    setFilteredPayments(filtered);
  }, [payments, searchText, agentFilter, statusFilter]);

  useEffect(() => { if (selectedRecord) fetchPayments(); }, [selectedRecord, fetchPayments]);

  /* handle delete confirmation */
  const handleDeleteConfirm = async () => {
    if (!activeRecord) return;
    setActionLoading(true);
    try {
      const docRef = doc(db, activeRecord._docPath);
      await deleteDoc(docRef);
      setPayments(prev => prev.filter(p => p.id !== activeRecord.id));
      message.success('Payment record deleted successfully from pending payments');
      setModalOpen(false);
      setActiveRecord(null);
    } catch (err) {
      console.error(err);
      message.error('Delete failed. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  /* stats */
  const stats = {
    total: filteredPayments.length,
    pending: filteredPayments.filter(p => getStatusKey(p) === 'pending').length,
    paid: filteredPayments.filter(p => p.status === 'paid').length,
    overdue: filteredPayments.filter(p => getStatusKey(p) === 'overdue').length,
    totalAmount: filteredPayments.reduce((s, p) => s + (p.payAmount || 200), 0),
    collectedAmount: filteredPayments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.payAmount || 200), 0),
  };
  const collectionRate = stats.totalAmount > 0 ? (stats.collectedAmount / stats.totalAmount) * 100 : 0;

  /* columns */
  const columns = [
    {
      title: 'Member',
      key: 'member',
      width: 260,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar
            size={38}
            src={record.memberDetails.photoURL}
            icon={<UserOutlined />}
            style={{ background: '#e0e7ff', color: '#4f46e5', flexShrink: 0, border: '2px solid #c7d2fe' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#1a1a2e' }}>
                {record.memberDetails.displayName}
              </span>
              {record.isClosingMember && (
                <Tag color="gold" style={{ borderRadius: 20, fontSize: 10, padding: '0 7px', lineHeight: '18px' }}>Self</Tag>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
              #{record.memberDetails.registrationNumber} · {record.memberDetails.village}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>📱 {record.memberDetails.phone}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Agent',
      key: 'agent',
      width: 140,
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: '#f0fdf4',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#16a34a', fontSize: 13,
          }}>
            <UserAddOutlined />
          </div>
          <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{record.memberDetails.agentName}</span>
        </div>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <div style={{
          fontWeight: 800, fontSize: 15, color: '#0f3460',
          background: '#eff6ff', borderRadius: 8, padding: '4px 10px', display: 'inline-block',
        }}>
          ₹{record.payAmount || 200}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 130,
      render: (_, record) => {
        const key = getStatusKey(record);
        const cfg = STATUS_CONFIG[key];
        return (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 20,
            background: cfg.bg, color: cfg.color,
            border: `1px solid ${cfg.border}`,
            fontSize: 12, fontWeight: 700,
          }}>
            {cfg.icon} {cfg.label}
          </div>
        );
      },
    },
    {
      title: 'Due Date',
      key: 'dueDate',
      width: 110,
      render: (_, record) => (
        <div style={{ fontSize: 12, color: record.isOverdue ? '#ef4444' : '#6b7280', fontWeight: record.isOverdue ? 700 : 400 }}>
          {record.dueDateFormatted}
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      align: 'center',
      fixed: 'right',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <Tooltip title="Delete Payment Record">
            <Button
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => { setActiveRecord(record); setModalOpen(true); }}
              style={{
                borderRadius: 8,
                border: '1px solid #ffccc7',
                background: '#fff2f0',
                display: 'flex',
                alignItems: 'center',
              }}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  if (!selectedRecord) {
    return (
      <div style={{
        minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#fff', borderRadius: 20, border: '1px dashed #e5e7eb',
      }}>
        <Empty description={<Text style={{ color: '#9ca3af' }}>Please select a closing member to view payments</Text>} />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Google font */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
        borderRadius: 20, padding: '24px 28px', marginBottom: 20, color: '#fff',
        boxShadow: '0 8px 32px rgba(15,52,96,0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Avatar
            size={56}
            src={selectedRecord?.photoURL}
            icon={<UserOutlined />}
            style={{ border: '3px solid rgba(255,255,255,0.3)', flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <WalletOutlined style={{ color: '#4ade80', fontSize: 20 }} />
              <span style={{ fontSize: 20, fontWeight: 800 }}>{selectedRecord?.displayName}'s Marriage Payments</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {[
                { text: `Reg: ${selectedRecord?.registrationNumber}`, color: '#bfdbfe' },
                { text: selectedRecord?.programName, color: '#bbf7d0' },
                { text: `Marriage: ${selectedRecord?.marriage_date}`, color: '#fed7aa' },
              ].map((t, i) => (
                <span key={i} style={{
                  background: 'rgba(255,255,255,0.12)', padding: '3px 12px',
                  borderRadius: 20, fontSize: 11, fontWeight: 600, color: t.color,
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
                  {t.text}
                </span>
              ))}
            </div>
          </div>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchPayments}
            loading={loading}
            style={{
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, height: 38,
            }}
          >
            Refresh
          </Button>
        </div>

        {/* collection progress */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, opacity: 0.7 }}>
            <span>Collection Progress</span>
            <span>{Math.round(collectionRate)}% — ₹{stats.collectedAmount} of ₹{stats.totalAmount}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 99, height: 8 }}>
            <div style={{
              height: 8, borderRadius: 99, width: `${collectionRate}%`,
              background: 'linear-gradient(90deg, #4ade80, #22c55e)',
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        {[
          { icon: <TeamOutlined />, label: 'Total Members', value: stats.total, color: '#6366f1' },
          { icon: <ClockCircleOutlined />, label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { icon: <CheckCircleOutlined />, label: 'Completed', value: stats.paid, color: '#10b981' },
          { icon: <CloseCircleOutlined />, label: 'Overdue', value: stats.overdue, color: '#ef4444' },
          { icon: <DollarOutlined />, label: 'Total Amount', value: stats.totalAmount, color: '#3b82f6', suffix: '₹' },
          { icon: <WalletOutlined />, label: 'Collected', value: stats.collectedAmount, color: '#10b981', suffix: '₹', progress: collectionRate },
        ].map((s, i) => (
          <Col key={i} xs={12} sm={8} md={4}>
            <StatCard {...s} />
          </Col>
        ))}
      </Row>

      {/* ── Filters ── */}
      <div style={{
        background: '#fff', borderRadius: 16, padding: '16px 20px', marginBottom: 16,
        border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <FilterOutlined style={{ color: '#9ca3af' }} />
        <Input
          placeholder="Search by name, reg no, phone…"
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          allowClear
          style={{ flex: '1 1 200px', borderRadius: 10 }}
        />
        <Select
          value={agentFilter}
          onChange={setAgentFilter}
          style={{ flex: '1 1 160px', borderRadius: 10 }}
          allowClear
          showSearch
          placeholder="Filter by Agent"
        >
          <Option value="all">All Agents</Option>
          {agentsList.map(a => (
            <Option key={a.id} value={a.id}>{a.displayName || a.name}</Option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ flex: '1 1 140px' }}
          placeholder="Filter by Status"
        >
          <Option value="all">All Status</Option>
          <Option value="pending">Pending</Option>
          <Option value="paid">Paid</Option>
          <Option value="overdue">Overdue</Option>
        </Select>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)', overflow: 'hidden',
      }}>
        <Table
          columns={columns}
          dataSource={filteredPayments}
          loading={loading}
          size="middle"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            style: { padding: '12px 20px' },
            showTotal: (total, range) => (
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                {range[0]}–{range[1]} of {total} payments
              </span>
            ),
          }}
          rowKey="id"
          locale={{ emptyText: <Empty description="No payments found" style={{ padding: 40 }} /> }}
          scroll={{ x: 800 }}
          rowClassName={(record) =>
            record.isOverdue && getStatusKey(record) === 'overdue' ? 'overdue-row' : ''
          }
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        />
      </div>

      {/* ── Footer summary ── */}
      {filteredPayments.length > 0 && (
        <div style={{
          marginTop: 14, borderRadius: 14, background: '#f8fafc',
          border: '1px solid #e2e8f0', padding: '14px 20px',
          display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
        }}>
          <Text style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            Showing {filteredPayments.length} of {payments.length} payments
          </Text>
          <div style={{ display: 'flex', gap: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
              Pending: ₹{filteredPayments
                .filter(p => p.status !== 'paid')
                .reduce((s, p) => s + (p.payAmount || 200), 0)}
            </span>
            <Divider type="vertical" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>
              Collected: ₹{stats.collectedAmount}
            </span>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      <DeleteConfirmationModal
        open={modalOpen}
        record={activeRecord}
        onClose={() => { setModalOpen(false); setActiveRecord(null); }}
        onConfirm={handleDeleteConfirm}
        loading={actionLoading}
      />

      {/* row highlight style */}
      <style>{`
        .overdue-row td { background: #fff8f8 !important; }
        .overdue-row:hover td { background: #fff0f0 !important; }
        .ant-table-thead > tr > th {
          background: #f8fafc !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          letter-spacing: 0.05em !important;
          text-transform: uppercase !important;
          color: #94a3b8 !important;
          border-bottom: 2px solid #f0f0f0 !important;
        }
        .ant-table-tbody > tr > td { border-bottom: 1px solid #f8fafc !important; }
        .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
      `}</style>
    </div>
  );
};

export default ClosingPendingPayment;