"use client";
import { getData, updateData } from '@/lib/services/firebaseService';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import {
  Avatar, Button, Space, Table, Typography, Modal,
  Form, Input, DatePicker, Tag, Divider, Image,
  Upload, Row, Col,
  App, Drawer, Select, Badge, Alert
} from 'antd';
import React, { useEffect, useState } from 'react';
import {
  EyeOutlined, EditOutlined, CheckCircleOutlined,
  UserOutlined, UploadOutlined, CalendarOutlined,
  FileTextOutlined, PictureOutlined, DeleteOutlined,
  FilePdfOutlined, TeamOutlined, SwapOutlined, PlusOutlined,
  RollbackOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { db, storage } from '@/lib/firebase';
import ClosingPendingPayment from './ClosingMember/ClosingPendingPayment';
import AllClosingPendingPayment from './ClosingMember/AllClosingPendingPayment';
import ClosingFormPdfDraver from './ClosingMember/ClosingFormPdfDraver';
import {
  collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove, getDoc, addDoc
} from 'firebase/firestore';
import ClosingBannerImageDrawer from './ClosingMember/ClosingBannerImageDrawer';
import EditPdfDataForm from './ClosingMember/EditPdfDataForm';
import { getAuth } from 'firebase/auth';
import {
  FiRefreshCw, FiCreditCard, FiUsers, FiCheckCircle,
  FiEye, FiEdit2, FiFileText, FiDollarSign, FiRotateCcw,
  FiUser, FiCalendar, FiMessageSquare, FiImage, FiPlus,
  FiAlertTriangle
} from 'react-icons/fi';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ─── Action icon button ───────────────────────────────────────────────────────
const ActionBtn = ({ icon: Icon, onClick, title, danger, loading, color }) => (
  <button
    className={`action-btn ${danger ? 'action-btn-danger' : ''}`}
    onClick={onClick}
    title={title}
    disabled={loading}
    style={color ? { '--btn-color': color } : {}}
  >
    {loading
      ? <span className="btn-spinner" />
      : <Icon size={14} />
    }
  </button>
);

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    closed:   { label: 'Closed',   bg: '#dcfce7', color: '#166534' },
    accepted: { label: 'Accepted', bg: '#dbeafe', color: '#1e40af' },
  };
  const s = map[status] || { label: status, bg: '#f1f5f9', color: '#475569' };
  return (
    <span className="status-badge" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

// ─── Section header inside modal ──────────────────────────────────────────────
const ModalSection = ({ icon: Icon, title, children }) => (
  <div className="modal-section">
    <div className="modal-section-header">
      <Icon size={14} />
      <span>{title}</span>
    </div>
    <div className="modal-section-body">{children}</div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ClosingCom = ({ user, selectedProgram }) => {
  const [allMembersData, setAllMembersData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isOpenDrawer, setIsOpenDrawer] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editForm] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const { message, modal } = App.useApp();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isOpenBanner, setIsOpenBanner] = useState(false);
  const [isEditPdfDataOpen, setIsEditPdfDataOpen] = useState(false);
  const [closingGroups, setClosingGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [previousGroupId, setPreviousGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [changingGroup, setChangingGroup] = useState(false);
  const [revertingId, setRevertingId] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchClosingGroups = async () => {
    if (!user || !selectedProgram) return;
    try {
      const snap = await getDocs(
        collection(db, `users/${user.uid}/programs/${selectedProgram.id}/closing_groups`)
      );
      setClosingGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
  };

  const getClosingData = async () => {
    setIsLoading(true);
    if (!user || !selectedProgram) { setIsLoading(false); return; }
    try {
      const data = await getData(
        `/users/${user.uid}/programs/${selectedProgram?.id}/members`,
        [
          { field: 'active_flag', operator: '==', value: true },
          { field: 'delete_flag', operator: '==', value: false },
          { field: 'marriage_flag', operator: '==', value: true },
          { field: 'status', operator: 'in', value: ['closed', 'accepted'] }
        ],
        { field: 'closingAt', direction: 'desc' }
      );
      setAllMembersData(data);
    } catch (e) {
      message.error("Failed to fetch data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && selectedProgram) {
      getClosingData();
      fetchClosingGroups();
    }
  }, [user, selectedProgram]);

  // ── Group ops ──────────────────────────────────────────────────────────────
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) { message.error('Enter a group name'); return; }
    try {
      setCreatingGroup(true);
      const ref = collection(db, `users/${user.uid}/programs/${selectedProgram.id}/closing_groups`);
      const newGroup = {
        name: newGroupName.trim(),
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        memberCount: 0,
        members: [],
        programId: selectedProgram.id,
        status: 'active'
      };
      const docRef = await addDoc(ref, newGroup);
      setClosingGroups(prev => [...prev, { id: docRef.id, ...newGroup }]);
      setSelectedGroupId(docRef.id);
      setNewGroupName('');
      setGroupModalVisible(false);
      message.success('Group created!');
    } catch (e) {
      message.error('Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  const addMemberToGroup = async (groupId, marriageDate) => {
    try {
      const groupRef = doc(db, `users/${user.uid}/programs/${selectedProgram.id}/closing_groups`, groupId);
      const snap = await getDoc(groupRef);
      if (!snap.exists()) return false;
      const members = snap.data().members || [];
      if (members.some(m => m.memberId === selectedRecord.id)) return false;
      const newMember = {
        memberId: selectedRecord.id,
        name: selectedRecord.displayName || selectedRecord.name,
        registrationNumber: selectedRecord.registrationNumber,
        fatherName: selectedRecord.fatherName,
        village: selectedRecord.village,
        district: selectedRecord.district,
        phone: selectedRecord.phone || selectedRecord.phoneNo,
        marriageDate: marriageDate ? marriageDate.format('DD-MM-YYYY') : selectedRecord.closing_date,
        closedAt: dayjs().format('DD-MM-YYYY HH:mm:ss'),
        status: 'closed'
      };
      await updateDoc(groupRef, {
        members: arrayUnion(newMember),
        memberCount: members.length + 1,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (e) { return false; }
  };

  const removeMemberFromGroup = async (groupId) => {
    try {
      const groupRef = doc(db, `users/${user.uid}/programs/${selectedProgram.id}/closing_groups`, groupId);
      const snap = await getDoc(groupRef);
      if (!snap.exists()) return false;
      const members = snap.data().members || [];
      const memberToRemove = members.find(m => m.memberId === selectedRecord.id);
      if (!memberToRemove) return false;
      await updateDoc(groupRef, {
        members: arrayRemove(memberToRemove),
        memberCount: members.length - 1,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (e) { return false; }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleView = (record) => { setSelectedRecord(record); setViewModalVisible(true); };

  const handleEdit = async (record) => {
    setSelectedRecord(record);
    await fetchClosingGroups();
    const gid = record.closingGroupId || null;
    setSelectedGroupId(gid);
    setPreviousGroupId(gid);
    editForm.setFieldsValue({
      closing_date: record.closing_date ? dayjs(record.closing_date, 'DD-MM-YYYY') : null,
      closingNotes: record.closingNotes || '',
    });
    setEditModalVisible(true);
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleEditPdfData = (record) => { setSelectedRecord(record); setIsEditPdfDataOpen(true); };

  const handleSavePdfData = async (updatedData) => {
    try {
      await updateData(
        `/users/${user.uid}/programs/${selectedProgram?.id}/members`,
        selectedRecord.id,
        { pdfData: { ...updatedData, updatedAt: new Date().toISOString() } }
      );
      message.success('PDF data updated!');
      getClosingData();
      setIsEditPdfDataOpen(false);
    } catch (e) {
      message.error('Failed to save PDF data.');
    }
  };

  const handleEditSubmit = async (values) => {
    try {
      setChangingGroup(true);
      const formattedValues = {
        marriage_date: values.closing_date ? values.closing_date.format('DD-MM-YYYY') : null,
        closing_date: values.closing_date ? values.closing_date.format('DD-MM-YYYY') : null,
        closingNotes: values.closingNotes,
        updatedAt: new Date().toISOString(),
      };
      if (selectedGroupId !== previousGroupId) {
        if (previousGroupId) await removeMemberFromGroup(previousGroupId);
        if (selectedGroupId) {
          await addMemberToGroup(selectedGroupId, values.closing_date);
          const g = closingGroups.find(g => g.id === selectedGroupId);
          formattedValues.closingGroupId = selectedGroupId;
          formattedValues.closingGroupName = g?.name || '';
        } else {
          formattedValues.closingGroupId = null;
          formattedValues.closingGroupName = null;
        }
      }
      if (selectedFile) {
        try {
          formattedValues.invitationCardURL = await uploadInvitationCard(selectedFile);
        } catch { message.error('Failed to upload invitation card'); return; }
      }
      await updateData(
        `/users/${user.uid}/programs/${selectedProgram?.id}/members`,
        selectedRecord.id,
        formattedValues
      );
      message.success('Updated successfully!');
      setEditModalVisible(false);
      setSelectedFile(null); setFilePreview(null);
      setSelectedGroupId(null); setPreviousGroupId(null);
      getClosingData(); fetchClosingGroups();
    } catch (e) {
      message.error('Failed to update');
    } finally {
      setChangingGroup(false);
    }
  };

  const handleFileSelect = (file) => {
    if (!['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'].includes(file.type)) {
      message.error('Invalid file type'); return false;
    }
    if (file.size > 5 * 1024 * 1024) { message.error('File too large (max 5MB)'); return false; }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = (e) => setFilePreview(e.target.result);
      r.readAsDataURL(file);
    } else { setFilePreview(null); }
    return false;
  };

  const handleRemoveFile = () => { setSelectedFile(null); setFilePreview(null); };

  const handleRevertClosing = (record) => {
    modal.confirm({
      title: 'Revert Closing Case?',
      icon: <ExclamationCircleOutlined style={{ color: '#ef4444' }} />,
      content: (
        <div style={{ fontFamily: 'Outfit, sans-serif', padding: '4px 0' }}>
          <p>This will <strong>delete all payment entries</strong> for <strong>{record.displayName}</strong> and reset the member to <em>accepted</em> status.</p>
          <p style={{ marginTop: 8, color: '#ef4444', fontSize: 12 }}>⚠️ This action cannot be undone.</p>
        </div>
      ),
      okText: 'Yes, Revert',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: () => doRevert(record),
    });
  };

  const doRevert = async (record) => {
    try {
      setRevertingId(record.id);
      const auth = getAuth();
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(process.env.NEXT_PUBLIC_REVERT_CLOSING_MEMBERS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.uid, programId: selectedProgram?.id, memberId: record.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to revert");
      message.success(data.message || "Reverted successfully!");
      getClosingData();
    } catch (e) {
      message.error(e.message || "Failed to revert");
    } finally {
      setRevertingId(null);
    }
  };

  const uploadInvitationCard = async (file) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const storageRef = ref(
        storage,
        `users/${user.uid}/programs/${selectedProgram?.id}/members/${selectedRecord.id}/invitation_cards/invitation_${selectedRecord.id}_${uuidv4()}.${ext}`
      );
      const snap = await uploadBytes(storageRef, file);
      return await getDownloadURL(snap.ref);
    } finally { setUploading(false); }
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Member',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (text, record) => (
        <div className="member-cell">
          <Avatar src={record.photoURL} icon={<UserOutlined />} size={36} className="member-avatar" />
          <div>
            <p className="member-name">{text}</p>
            <p className="member-sub">{record.fatherName}</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Reg No.',
      dataIndex: 'registrationNumber',
      key: 'registrationNumber',
      render: (v) => <span className="reg-chip">{v}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      title: 'Closing Date',
      dataIndex: 'closing_date',
      key: 'closing_date',
      render: (v) => v ? (
        <span className="date-chip"><CalendarOutlined style={{ marginRight: 4 }} />{v}</span>
      ) : <span className="na-text">—</span>,
    },
    {
      title: 'Group',
      key: 'closingGroup',
      render: (_, record) => record.closingGroupName
        ? <span className="group-chip"><TeamOutlined style={{ marginRight: 4 }} />{record.closingGroupName}</span>
        : <span className="na-text">No Group</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 200,
      render: (_, record) => (
        <div className="action-row">
          <ActionBtn icon={FiEye}          onClick={() => handleView(record)}                        title="View Details" />
          <ActionBtn icon={FiEdit2}        onClick={() => handleEdit(record)}                        title="Edit" />
          <ActionBtn icon={FiFileText}     onClick={() => handleEditPdfData(record)}                 title="Edit PDF Data" />
          <ActionBtn icon={FiDollarSign}   onClick={() => { setSelectedRecord(record); setIsDrawerOpen(true); }} title="Pay Status" color="#3b82f6" />
          <ActionBtn icon={FiRotateCcw}    onClick={() => handleRevertClosing(record)}               title="Revert" danger loading={revertingId === record.id} />
        </div>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');

        .closing-root { font-family: 'Outfit', sans-serif; }

        /* Table header */
        .table-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #f1f5f9;
          flex-wrap: wrap; gap: 12px;
        }
        .table-title {
          display: flex; align-items: center; gap: 10px;
        }
        .table-title-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #10b981, #059669);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          box-shadow: 0 3px 8px rgba(16,185,129,0.3);
        }
        .table-title-text {
          font-size: 16px; font-weight: 800; color: #0f172a;
          letter-spacing: -0.02em;
        }
        .table-title-count {
          font-size: 11px; font-weight: 600; color: #94a3b8;
          margin-top: 1px;
        }
        .header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        
        /* Buttons */
        .hdr-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 9px;
          font-size: 12.5px; font-weight: 600;
          border: 1px solid #e2e8f0;
          background: #fff; color: #475569;
          cursor: pointer; transition: all 0.15s;
          font-family: 'Outfit', sans-serif;
        }
        .hdr-btn:hover { background: #f8fafc; border-color: #cbd5e1; color: #0f172a; }
        .hdr-btn-primary {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-color: transparent; color: #fff;
          box-shadow: 0 2px 6px rgba(59,130,246,0.3);
        }
        .hdr-btn-primary:hover { box-shadow: 0 4px 12px rgba(59,130,246,0.4); transform: translateY(-1px); }

        /* Member cell */
        .member-cell { display: flex; align-items: center; gap: 10px; }
        .member-name { font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3; }
        .member-sub { font-size: 11px; color: #94a3b8; margin-top: 1px; }

        /* Chips */
        .reg-chip {
          font-family: 'Outfit', monospace; font-size: 11.5px; font-weight: 700;
          background: #f1f5f9; color: #475569;
          padding: 3px 8px; border-radius: 6px;
          letter-spacing: 0.04em;
        }
        .status-badge {
          font-size: 11px; font-weight: 700; padding: 3px 10px;
          border-radius: 40px; letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .date-chip {
          font-size: 12px; font-weight: 600; color: #475569;
          display: inline-flex; align-items: center;
        }
        .group-chip {
          font-size: 11.5px; font-weight: 700;
          background: #dcfce7; color: #166534;
          padding: 3px 10px; border-radius: 40px;
          display: inline-flex; align-items: center;
        }
        .na-text { color: #cbd5e1; font-size: 18px; }

        /* Action buttons */
        .action-row { display: flex; gap: 4px; align-items: center; }
        .action-btn {
          width: 30px; height: 30px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid #f1f5f9; background: #fafafa;
          color: #64748b; cursor: pointer;
          transition: all 0.15s;
        }
        .action-btn:hover {
          background: #f1f5f9; color: #0f172a;
          border-color: #e2e8f0;
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .action-btn-danger:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }

        /* Spinner */
        .btn-spinner {
          width: 12px; height: 12px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Ant Design table overrides */
        .closing-root .ant-table-thead > tr > th {
          background: #f8fafc !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 11px !important;
          font-weight: 700 !important;
          color: #94a3b8 !important;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          border-bottom: 1px solid #f1f5f9 !important;
          padding: 10px 16px !important;
        }
        .closing-root .ant-table-tbody > tr > td {
          font-family: 'Outfit', sans-serif !important;
          border-bottom: 1px solid #f8fafc !important;
          padding: 12px 16px !important;
        }
        .closing-root .ant-table-tbody > tr:hover > td {
          background: #f8fafc !important;
        }
        .closing-root .ant-table-pagination.ant-pagination {
          padding: 12px 16px;
          margin: 0 !important;
        }
        .closing-root .ant-pagination-item-active {
          border-color: #3b82f6 !important;
        }
        .closing-root .ant-pagination-item-active a {
          color: #3b82f6 !important;
        }

        /* Modal overrides */
        .closing-modal .ant-modal-content {
          border-radius: 16px !important;
          overflow: hidden;
          font-family: 'Outfit', sans-serif !important;
        }
        .closing-modal .ant-modal-header {
          padding: 20px 24px 16px !important;
          border-bottom: 1px solid #f1f5f9 !important;
        }
        .closing-modal .ant-modal-title {
          font-family: 'Outfit', sans-serif !important;
          font-weight: 800 !important; font-size: 17px !important;
          color: #0f172a !important;
        }
        .closing-modal .ant-modal-body { padding: 0 !important; }
        .closing-modal .ant-modal-footer {
          padding: 14px 24px !important;
          border-top: 1px solid #f1f5f9 !important;
        }
        .closing-modal .ant-form-item-label > label {
          font-family: 'Outfit', sans-serif !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          color: #64748b !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .closing-modal .ant-input, .closing-modal .ant-picker, .closing-modal .ant-select-selector {
          border-radius: 10px !important;
          font-family: 'Outfit', sans-serif !important;
        }

        /* View modal details */
        .view-modal-hero {
          padding: 24px;
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          border-bottom: 1px solid #e2e8f0;
          display: flex; align-items: flex-start; gap: 16px;
          flex-wrap: wrap;
        }
        .view-hero-info { flex: 1; min-width: 180px; }
        .view-hero-name { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
        .view-hero-reg { font-size: 12px; color: #94a3b8; font-weight: 600; margin-top: 2px; }
        .view-hero-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
        .view-tag {
          font-size: 11px; font-weight: 700; padding: 3px 10px;
          border-radius: 40px; letter-spacing: 0.04em;
        }
        .view-hero-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .view-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto; max-height: 55vh; }
        
        /* Modal section */
        .modal-section {
          border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden;
        }
        .modal-section-header {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 14px;
          background: #f8fafc;
          font-size: 11.5px; font-weight: 700; color: #64748b;
          text-transform: uppercase; letter-spacing: 0.07em;
          border-bottom: 1px solid #f1f5f9;
        }
        .modal-section-body { padding: 14px; }

        /* Detail grid */
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 520px) { .detail-grid { grid-template-columns: 1fr; } }
        .detail-item {}
        .detail-label { font-size: 10.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 3px; }
        .detail-value { font-size: 13.5px; font-weight: 600; color: #0f172a; }

        /* Edit modal member header */
        .edit-member-header {
          margin: 20px 24px 0;
          padding: 14px;
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          display: flex; align-items: center; gap: 12px;
        }
        .edit-member-name { font-size: 14px; font-weight: 700; color: #0f172a; }
        .edit-member-reg { font-size: 12px; color: #94a3b8; margin-top: 1px; }
        .edit-form-body { padding: 16px 24px 0; }

        /* Group change alert */
        .group-change-alert {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 12px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          margin-top: 10px;
          font-size: 12px; font-weight: 600; color: #92400e;
        }

        /* File upload zone */
        .upload-zone {
          border: 2px dashed #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-zone:hover { border-color: #3b82f6; background: rgba(59,130,246,0.02); }
        .file-preview {
          border: 1px solid #f1f5f9; border-radius: 12px;
          padding: 12px; margin-bottom: 12px;
          display: flex; align-items: center; gap: 12px;
        }

        /* Drawer overrides */
        .ant-drawer-content { font-family: 'Outfit', sans-serif !important; }
        .ant-drawer-title { font-family: 'Outfit', sans-serif !important; font-weight: 800 !important; }
      `}</style>

      <div className="closing-root">
        {/* Header */}
        <div className="table-header">
          <div className="table-title">
            <div className="table-title-icon">
              <FiCheckCircle size={17} />
            </div>
            <div>
              <p className="table-title-text">Closed Cases</p>
              <p className="table-title-count">{allMembersData.length} total records</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="hdr-btn" onClick={() => setIsOpenDrawer(true)}>
              <FiUsers size={13} /> Pay Status
            </button>
            <button className="hdr-btn hdr-btn-primary" onClick={getClosingData}>
              <FiRefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={columns}
          dataSource={allMembersData}
          rowKey="id"
          pagination={{ pageSize: 8, showTotal: (t) => `${t} records`, showSizeChanger: false }}
          scroll={{ x: 860 }}
          loading={isLoading}
          locale={{ emptyText: (
            <div style={{ padding: '40px 0', fontFamily: 'Outfit, sans-serif', color: '#94a3b8' }}>
              <FiCheckCircle size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600 }}>No closed cases found</p>
            </div>
          )}}
        />

        {/* ── Drawers ── */}
        <Drawer
          title="Member Pay Status"
          placement="right"
          onClose={() => setIsDrawerOpen(false)}
          open={isDrawerOpen}
          width={Math.min(1100, window?.innerWidth - 20 || 1100)}
        >
          {isDrawerOpen && <ClosingPendingPayment selectedRecord={selectedRecord} />}
        </Drawer>

        <AllClosingPendingPayment
          open={isOpenDrawer}
          setOpen={setIsOpenDrawer}
          closingMemberList={allMembersData}
        />

        {selectedRecord && (
          <EditPdfDataForm
            open={isEditPdfDataOpen}
            onClose={() => { setIsEditPdfDataOpen(false); setSelectedRecord(null); }}
            memberData={selectedRecord}
            selectedProgram={selectedProgram}
            onSave={handleSavePdfData}
            user={user}
          />
        )}

        {/* ── View Modal ── */}
        <Modal
          className="closing-modal"
          title="Closing Details"
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          width={660}
          footer={[
            <Button key="close" onClick={() => setViewModalVisible(false)}>Close</Button>,
            <Button key="edit" type="primary" onClick={() => { setViewModalVisible(false); handleEdit(selectedRecord); }}>
              Edit Details
            </Button>
          ]}
        >
          {selectedRecord && (
            <>
              {/* Hero */}
              <div className="view-modal-hero">
                <Avatar src={selectedRecord.photoURL} icon={<UserOutlined />} size={56} />
                <div className="view-hero-info">
                  <p className="view-hero-name">{selectedRecord.displayName}</p>
                  <p className="view-hero-reg">#{selectedRecord.registrationNumber}</p>
                  <div className="view-hero-tags">
                    <span className="view-tag" style={{ background: '#dbeafe', color: '#1e40af' }}>{selectedRecord.gender}</span>
                    <span className="view-tag" style={{ background: '#f0fdf4', color: '#166534' }}>{selectedRecord.ageGroupRange}</span>
                    <span className="view-tag" style={{ background: selectedRecord.joinFeesDone ? '#dcfce7' : '#fef2f2', color: selectedRecord.joinFeesDone ? '#166534' : '#991b1b' }}>
                      {selectedRecord.joinFeesDone ? 'Fees Paid' : 'Fees Pending'}
                    </span>
                  </div>
                </div>
                <div className="view-hero-actions">
                  <Button size="small" type="primary" onClick={() => setIsOpen(true)}>PDF Form</Button>
                  <Button size="small" icon={<FilePdfOutlined />} onClick={() => handleEditPdfData(selectedRecord)}>Banner</Button>
                </div>
              </div>

              {/* Body */}
              <div className="view-body">
                {/* PDF Data */}
                {selectedRecord.pdfData && (
                  <ModalSection icon={FiFileText} title="PDF Data Summary">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <p className="detail-label">Document No</p>
                        <p className="detail-value">{selectedRecord.pdfData.documentNumber || '—'}</p>
                      </div>
                      <div className="detail-item">
                        <p className="detail-label">Date</p>
                        <p className="detail-value">{selectedRecord.pdfData.date || '—'}</p>
                      </div>
                      <div className="detail-item">
                        <p className="detail-label">Total Donation</p>
                        <p className="detail-value">₹{selectedRecord.pdfData?.donationCalculations?.totalBeforeDeduction?.toLocaleString('en-IN') || '0'}</p>
                      </div>
                      <div className="detail-item">
                        <p className="detail-label">Final Amount</p>
                        <p className="detail-value" style={{ color: '#059669' }}>₹{selectedRecord.pdfData?.donationCalculations?.finalAmount?.toLocaleString('en-IN') || '0'}</p>
                      </div>
                    </div>
                  </ModalSection>
                )}

                {/* Group */}
                {selectedRecord.closingGroupName && (
                  <ModalSection icon={FiUsers} title="Closing Group">
                    <span className="group-chip" style={{ fontSize: 13, padding: '5px 14px' }}>
                      <TeamOutlined style={{ marginRight: 6 }} />
                      {selectedRecord.closingGroupName}
                    </span>
                  </ModalSection>
                )}

                {/* Closing details */}
                <ModalSection icon={FiCalendar} title="Closing Details">
                  <div className="detail-grid" style={{ marginBottom: 12 }}>
                    <div className="detail-item">
                      <p className="detail-label">Closing Date</p>
                      <p className="detail-value">{selectedRecord.closing_date || '—'}</p>
                    </div>
                    <div className="detail-item">
                      <p className="detail-label">Status</p>
                      <StatusBadge status={selectedRecord.status} />
                    </div>
                  </div>
                  {selectedRecord.closingNotes && (
                    <div>
                      <p className="detail-label" style={{ marginBottom: 6 }}>Notes</p>
                      <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{selectedRecord.closingNotes}</p>
                    </div>
                  )}
                </ModalSection>

                {/* Invitation card */}
                <ModalSection icon={FiImage} title="Invitation Card">
                  {selectedRecord.invitationCardURL ? (
                    <div style={{ textAlign: 'center' }}>
                      <Image src={selectedRecord.invitationCardURL} alt="Invitation" width={200} style={{ borderRadius: 10 }} />
                      <div style={{ marginTop: 8 }}>
                        <a href={selectedRecord.invitationCardURL} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3b82f6' }}>
                          Open in new tab →
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: '#cbd5e1' }}>
                      <FiImage size={32} style={{ opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
                      <p style={{ fontSize: 12, fontWeight: 600 }}>No invitation card uploaded</p>
                    </div>
                  )}
                </ModalSection>
              </div>
            </>
          )}
        </Modal>

        {/* ── Edit Modal ── */}
        <Modal
          className="closing-modal"
          title="Edit Closing Details"
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            setSelectedFile(null); setFilePreview(null);
            setSelectedGroupId(null); setPreviousGroupId(null);
          }}
          onOk={() => editForm.submit()}
          confirmLoading={uploading || changingGroup}
          width={640}
          okText="Save Changes"
        >
          {selectedRecord && (
            <>
              {/* Member header */}
              <div className="edit-member-header">
                <Avatar src={selectedRecord.photoURL} icon={<UserOutlined />} size={40} />
                <div>
                  <p className="edit-member-name">{selectedRecord.displayName}</p>
                  <p className="edit-member-reg">
                    #{selectedRecord.registrationNumber} · {selectedRecord.fatherName} · {selectedRecord.gender}
                  </p>
                </div>
              </div>

              <div className="edit-form-body">
                <Form form={editForm} layout="vertical" onFinish={handleEditSubmit} style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      {/* Group select */}
                      <Form.Item label="Closing Group">
                        <Select
                          placeholder="Select or create group"
                          allowClear
                          value={selectedGroupId}
                          onChange={setSelectedGroupId}
                          style={{ width: '100%', fontFamily: 'Outfit, sans-serif' }}
                          dropdownRender={(menu) => (
                            <>
                              {menu}
                              <Divider style={{ margin: '8px 0' }} />
                              <Button type="link" icon={<PlusOutlined />} onClick={() => setGroupModalVisible(true)} style={{ width: '100%' }}>
                                Create New Group
                              </Button>
                            </>
                          )}
                        >
                          {closingGroups.map(g => (
                            <Option key={g.id} value={g.id}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{g.name}</span>
                                <Badge count={g.memberCount} showZero style={{ backgroundColor: '#10b981' }} />
                              </div>
                            </Option>
                          ))}
                        </Select>
                        {selectedGroupId !== previousGroupId && (
                          <div className="group-change-alert">
                            <FiAlertTriangle size={13} />
                            {previousGroupId ? 'Will move from previous group' : 'Will add to new group'}
                          </div>
                        )}
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="Closing Date" name="closing_date">
                        <DatePicker format="DD-MM-YYYY" style={{ width: '100%', borderRadius: 10 }} allowClear />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item label="Closing Notes" name="closingNotes">
                    <TextArea rows={3} placeholder="Any notes, observations..." showCount maxLength={500} style={{ borderRadius: 10, fontFamily: 'Outfit, sans-serif' }} />
                  </Form.Item>

                  <Divider style={{ margin: '8px 0 16px' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                      Invitation Card
                    </span>
                  </Divider>

                  {/* Current card preview */}
                  {selectedRecord.invitationCardURL && !selectedFile && (
                    <div className="file-preview" style={{ marginBottom: 12 }}>
                      <Image src={selectedRecord.invitationCardURL} width={60} height={60} style={{ borderRadius: 8, objectFit: 'cover' }} />
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Current invitation card</p>
                        <a href={selectedRecord.invitationCardURL} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#3b82f6' }}>View full size</a>
                      </div>
                    </div>
                  )}

                  {/* New file preview */}
                  {filePreview && (
                    <div className="file-preview" style={{ marginBottom: 12 }}>
                      {selectedFile.type.startsWith('image/') ? (
                        <Image src={filePreview} width={60} height={60} style={{ borderRadius: 8, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 60, height: 60, background: '#dbeafe', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FileTextOutlined style={{ fontSize: 24, color: '#3b82f6' }} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{selectedFile.name}</p>
                        <p style={{ fontSize: 11, color: '#94a3b8' }}>{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={handleRemoveFile}>Remove</Button>
                    </div>
                  )}

                  <Form.Item label="">
                    <Upload accept=".jpg,.jpeg,.png,.pdf" beforeUpload={handleFileSelect} showUploadList={false} maxCount={1}>
                      <div className="upload-zone">
                        <UploadOutlined style={{ fontSize: 22, color: '#94a3b8', display: 'block', marginBottom: 6 }} />
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Click to upload a new invitation card</p>
                        <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 3 }}>JPG, PNG, PDF · Max 5MB</p>
                      </div>
                    </Upload>
                  </Form.Item>
                </Form>
              </div>
            </>
          )}
        </Modal>

        {/* ── Create Group Modal ── */}
        <Modal
          className="closing-modal"
          title="Create Closing Group"
          open={groupModalVisible}
          onOk={handleCreateGroup}
          onCancel={() => { setGroupModalVisible(false); setNewGroupName(''); }}
          confirmLoading={creatingGroup}
          okText="Create Group"
          width={400}
        >
          <div style={{ padding: '16px 0 8px', fontFamily: 'Outfit, sans-serif' }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Group Name</p>
            <Input
              placeholder="e.g. December Weddings"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              maxLength={40}
              showCount
              autoFocus
              style={{ borderRadius: 10, fontFamily: 'Outfit, sans-serif' }}
            />
            <Alert message="Member will be moved to this group" type="info" showIcon style={{ marginTop: 12, borderRadius: 10, fontSize: 12 }} />
          </div>
        </Modal>

        {/* ── PDF Drawers ── */}
        <ClosingFormPdfDraver
          closingMembers={allMembersData}
          user={user}
          open={isOpen}
          setOpen={setIsOpen}
          memberData={selectedRecord}
          selectedProgram={selectedProgram}
        />

        <ClosingBannerImageDrawer
          open={isOpenBanner}
          onClose={() => setIsOpenBanner(false)}
          memberData={selectedRecord}
          selectedProgram={selectedProgram}
          user={user}
        />
      </div>
    </>
  );
};

export default ClosingCom;