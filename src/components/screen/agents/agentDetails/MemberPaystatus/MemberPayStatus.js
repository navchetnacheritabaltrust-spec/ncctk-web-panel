"use client";
import { useAuth } from '@/lib/AuthProvider';
import { getAgentMemberPaystatus } from '@/lib/helper';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Button,
  Avatar,
  Space,
  Input,
  Select,
  Tooltip,
  Badge,
  Modal,
  message,
  Drawer,
  Checkbox,
  Divider,
  Radio,
  Spin,
  Progress,
  Empty,
} from 'antd';
import {
  EyeOutlined,
  DownloadOutlined,
  ReloadOutlined,
  MoneyCollectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  SearchOutlined,
  PhoneOutlined,
  IdcardOutlined,
  FilePdfOutlined,
  ClearOutlined,
  PrinterOutlined,
  TeamOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import PaymentReportPDF from '../component/pdfcom/PaymentReportPDF';
import { setSelectedProgram } from '@/redux/slices/commonSlice';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const { Search } = Input;
const { Option } = Select;

const MemberPayStatus = ({ agentId, agentInfo }) => {
  const [open, setOpen] = useState(false);
  const selectedProgram = useSelector((state) => state.data.selectedProgram);
  const programList = useSelector((state) => state.data.programList);
  const { user } = useAuth();
  const dispatch = useDispatch();

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [programChanging, setProgramChanging] = useState(false);
  const [summary, setSummary] = useState({
    totalMembers: 0,
    totalPending: 0,
    totalPaid: 0,
    totalPendingAmount: 0,
    totalPaidAmount: 0,
    totalAmount: 0,
  });
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [filteredData, setFilteredData] = useState([]);

  // Group filter states
  const [closingGroups, setClosingGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupFilterLoading, setGroupFilterLoading] = useState(false);

  // Member selection state
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectionMode, setSelectionMode] = useState('all');
  const [selectAll, setSelectAll] = useState(false);

  const [activeFilters, setActiveFilters] = useState({
    search: false,
    status: false,
    group: false,
  });

  // Fetch closing groups
  const fetchClosingGroups = useCallback(async () => {
    if (!user?.uid || !selectedProgram?.id) return;
    try {
      setGroupFilterLoading(true);
      const groupsRef = collection(
        db,
        `users/${user.uid}/programs/${selectedProgram.id}/closing_groups`
      );
      const groupsSnapshot = await getDocs(groupsRef);
      const groups = groupsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        memberCount: doc.data().memberCount || 0,
        members: doc.data().members || [],
      }));
      setClosingGroups(groups);
    } catch (error) {
      console.error('Error fetching closing groups:', error);
      message.error('Failed to load closing groups');
    } finally {
      setGroupFilterLoading(false);
    }
  }, [user?.uid, selectedProgram?.id]);

  useEffect(() => {
    if (selectedProgram?.id && user?.uid) fetchClosingGroups();
  }, [selectedProgram?.id, user?.uid, fetchClosingGroups]);

  const handleProgramSelect = useCallback(
    async (programId) => {
      if (!programId || programId === selectedProgram?.id) return;
      setProgramChanging(true);
      setLoading(true);
      const newProgram = programList.find((p) => p.id === programId);
      if (newProgram) {
        dispatch(setSelectedProgram(newProgram));
        resetFilters();
        setSelectedMembers([]);
        setSelectAll(false);
        setSelectionMode('all');
        setSelectedGroupId(null);
      }
    },
    [selectedProgram, programList, dispatch]
  );

  const loadAgentPaymentData = useCallback(async () => {
    if (!user?.uid || !selectedProgram?.id || !agentId) {
      setLoading(false);
      setProgramChanging(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getAgentMemberPaystatus({
        userId: user.uid,
        programId: selectedProgram.id,
        agentId: agentId,
        closingGroupId: selectedGroupId,
      });
      if (data?.success) {
        setReportData(data.report || []);
        setSummary(data.summary || {});
        setFilteredData(data.report || []);
        if (data.groupInfo) {
          message.success(
            `Showing payments for group: ${data.groupInfo.name} (${data.groupInfo.memberCount} members)`
          );
        }
      } else {
        message.error(data?.message || 'Failed to load payment data');
        setReportData([]);
        setFilteredData([]);
      }
    } catch (err) {
      console.error('Error loading payment data:', err);
      message.error('Error loading payment data');
      setReportData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
      setProgramChanging(false);
    }
  }, [selectedProgram?.id, agentId, user?.uid, selectedGroupId]);

  useEffect(() => {
    if (closingGroups.length > 0 && selectedProgram?.id && agentId && user?.uid) {
      loadAgentPaymentData();
    }
  }, [closingGroups]);

  useEffect(() => {
    if (selectedProgram?.id && agentId && user?.uid) loadAgentPaymentData();
  }, [selectedProgram?.id, agentId, user?.uid, loadAgentPaymentData]);

  const applyFilters = useCallback(() => {
    let filtered = [...reportData];
    let filtersActive = { search: false, status: false, group: false };

    if (searchText && searchText.trim()) {
      filtersActive.search = true;
      const s = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (member) =>
          (member.displayName && member.displayName.toLowerCase().includes(s)) ||
          (member.fatherName && member.fatherName.toLowerCase().includes(s)) ||
          (member.phone && member.phone.includes(searchText)) ||
          (member.registrationNumber &&
            member.registrationNumber.toLowerCase().includes(s)) ||
          (member.village && member.village.toLowerCase().includes(s)) ||
          (member.marriages &&
            member.marriages.some(
              (m) =>
                (m.closingMemberName &&
                  m.closingMemberName.toLowerCase().includes(s)) ||
                (m.paymentFor && m.paymentFor.toLowerCase().includes(s))
            ))
      );
    }

    if (statusFilter !== 'all') {
      filtersActive.status = true;
      filtered = filtered.filter(
        (member) =>
          member.marriages &&
          member.marriages.some((m) => m.status === statusFilter)
      );
    }

    setFilteredData(filtered);
    setActiveFilters(filtersActive);
    setSelectedMembers([]);
    setSelectAll(false);
  }, [searchText, statusFilter, reportData]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const resetFilters = useCallback(() => {
    setSearchText('');
    setStatusFilter('all');
    setSelectedGroupId(null);
    setFilteredData(reportData);
    setSelectedMembers([]);
    setSelectAll(false);
    setSelectionMode('all');
    setActiveFilters({ search: false, status: false, group: false });
  }, [reportData]);

  const getStatusTag = (status) => {
    switch (status) {
      case 'pending':
        return (
          <Tag color="orange" icon={<ClockCircleOutlined />}>
            Pending
          </Tag>
        );
      case 'paid':
        return (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Paid
          </Tag>
        );
      default:
        return <Tag color="default">{status}</Tag>;
    }
  };

  const calculateMemberStats = useCallback((member) => {
    const pendingMarriages =
      member.marriages?.filter((m) => m.status === 'pending').length || 0;
    const paidMarriages =
      member.marriages?.filter((m) => m.status === 'paid').length || 0;
    const pendingAmount =
      member.marriages
        ?.filter((m) => m.status === 'pending')
        .reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
    const paidAmount =
      member.marriages
        ?.filter((m) => m.status === 'paid')
        .reduce((sum, m) => sum + (m.amount || 0), 0) || 0;
    return { pendingMarriages, paidMarriages, pendingAmount, paidAmount };
  }, []);

  const handleSelectAll = useCallback(
    (checked) => {
      setSelectAll(checked);
      if (checked) {
        setSelectedMembers(filteredData.map((m) => m.memberId));
        setSelectionMode('custom');
      } else {
        setSelectedMembers([]);
      }
    },
    [filteredData]
  );

  const rowSelection = useMemo(
    () => ({
      selectedRowKeys: selectedMembers,
      onChange: (selectedRowKeys) => {
        setSelectedMembers(selectedRowKeys);
        setSelectionMode('custom');
        setSelectAll(selectedRowKeys.length === filteredData.length);
      },
    }),
    [selectedMembers, filteredData.length]
  );

  const columns = useMemo(
    () => [
      {
        title: 'Member Info',
        dataIndex: 'memberInfo',
        key: 'memberInfo',
        fixed: 'left',
        width: 260,
        render: (_, record) => (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <Avatar
              src={record.photoURL}
              size={40}
              icon={!record.photoURL && <UserOutlined />}
              style={{ flexShrink: 0, border: '1px solid #f0f0f0' }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13, color: '#1a1a1a' }}>
                {record.displayName}{' '}
                {record.surname && (
                  <span style={{ color: '#888', fontWeight: 400 }}>
                    {record.surname}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                <IdcardOutlined style={{ marginRight: 3 }} />
                {record.registrationNumber}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>
                <UserOutlined style={{ marginRight: 3 }} />
                {record.fatherName ? `S/o ${record.fatherName}` : 'N/A'}
              </div>
              {record.phone && (
                <div style={{ fontSize: 11, color: '#888' }}>
                  <PhoneOutlined style={{ marginRight: 3 }} />
                  {record.phone}
                </div>
              )}
              {record.groupInfo?.groupName && (
                <Tag
                  color="cyan"
                  icon={<TeamOutlined />}
                  style={{ marginTop: 4, fontSize: 10 }}
                >
                  {record.groupInfo.groupName}
                </Tag>
              )}
            </div>
          </div>
        ),
      },
      {
        title: 'Location',
        key: 'location',
        width: 130,
        render: (_, record) => (
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {record.village || 'N/A'}
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>{record.district || ''}</div>
          </div>
        ),
      },
      {
        title: 'Pending',
        key: 'pending',
        width: 140,
        render: (_, record) => {
          const { pendingMarriages, pendingAmount } = calculateMemberStats(record);
          return (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#d46b08' }}>
                ₹{pendingAmount.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>
                {pendingMarriages} case{pendingMarriages !== 1 ? 's' : ''}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Paid',
        key: 'paid',
        width: 140,
        render: (_, record) => {
          const { paidMarriages, paidAmount } = calculateMemberStats(record);
          return (
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#389e0d' }}>
                ₹{paidAmount.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11, color: '#888' }}>
                {paidMarriages} case{paidMarriages !== 1 ? 's' : ''}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Total',
        key: 'total',
        width: 130,
        render: (_, record) => {
          const { pendingAmount, paidAmount } = calculateMemberStats(record);
          const total = pendingAmount + paidAmount;
          const pct = total > 0 ? Math.round((paidAmount / total) * 100) : 0;
          return (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1677ff' }}>
                ₹{total.toLocaleString('en-IN')}
              </div>
              <Progress
                percent={pct}
                size="small"
                showInfo={false}
                status={pct === 100 ? 'success' : 'active'}
                style={{ marginTop: 4 }}
              />
              <div style={{ fontSize: 10, color: '#888' }}>{pct}% paid</div>
            </div>
          );
        },
      },
      {
        title: 'Status',
        key: 'overallStatus',
        width: 110,
        align: 'center',
        render: (_, record) => {
          const pendingCount =
            record.marriages?.filter((m) => m.status === 'pending').length || 0;
          const paidCount =
            record.marriages?.filter((m) => m.status === 'paid').length || 0;
          if (pendingCount === 0 && paidCount === 0)
            return <Tag color="default">No Payments</Tag>;
          if (pendingCount === 0)
            return <Tag color="success">All Paid</Tag>;
          if (paidCount === 0)
            return <Tag color="error">All Pending</Tag>;
          return <Tag color="warning">Partial</Tag>;
        },
      },
      {
        title: '',
        key: 'actions',
        fixed: 'right',
        width: 48,
        align: 'center',
        render: (_, record) => (
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => {
                setSelectedMember(record);
                setIsDetailsModalVisible(true);
              }}
            />
          </Tooltip>
        ),
      },
    ],
    [calculateMemberStats]
  );

  const marriageColumns = useMemo(
    () => [
      {
        title: 'Payment For',
        dataIndex: 'paymentFor',
        key: 'paymentFor',
        width: 150,
        render: (text) => <span style={{ fontWeight: 500 }}>{text || 'N/A'}</span>,
      },
      {
        title: 'Closing Member',
        key: 'closingMember',
        width: 220,
        render: (_, record) => (
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.closingMemberName || record.paymentFor || 'N/A'}
            </div>
            {record.closingRegNo && (
              <div style={{ fontSize: 11, color: '#888' }}>
                Reg: {record.closingRegNo}
              </div>
            )}
            {record.closingFatherName && (
              <div style={{ fontSize: 11, color: '#888' }}>
                S/o: {record.closingFatherName}
              </div>
            )}
            {record.closingVillage && (
              <div style={{ fontSize: 11, color: '#888' }}>
                Village: {record.closingVillage}
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        width: 110,
        align: 'right',
        render: (amount) => (
          <span style={{ fontWeight: 600, color: '#1677ff' }}>
            ₹{amount?.toLocaleString('en-IN') || '0'}
          </span>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        align: 'center',
        render: getStatusTag,
      },
      {
        title: 'Date',
        dataIndex: 'paymentDate',
        key: 'paymentDate',
        width: 120,
        render: (date) => {
          console.log(date,'date')
          if (!date) return 'N/A';
          let formattedDate;
          if (typeof date === 'number' || date?.seconds) {
            formattedDate = dayjs
              .unix(date?.seconds || date)
              .format('DD/MM/YYYY');
          } else {
            formattedDate = dayjs(date).format('DD/MM/YYYY');
          }
          return <span style={{ fontSize: 12 }}>{formattedDate}</span>;
        },
      },
    ],
    []
  );

  const getFileName = useCallback(() => {
    const agentName = agentInfo?.displayName?.replace(/\s+/g, '_') || 'Agent';
    const programName = selectedProgram?.name?.replace(/\s+/g, '_') || 'Program';
    const groupName = selectedGroupId
      ? closingGroups
          .find((g) => g.id === selectedGroupId)
          ?.name?.replace(/\s+/g, '_')
      : '';
    const date = dayjs().format('DDMMYYYY');
    const memberCount =
      selectionMode === 'all' ? filteredData.length : selectedMembers.length;
    const groupSuffix = groupName ? `_${groupName}` : '';
    return `${agentName}_Payment_Report${groupSuffix}_${programName}_${memberCount}Members_${date}.pdf`;
  }, [
    agentInfo,
    selectedProgram,
    selectionMode,
    filteredData,
    selectedMembers,
    selectedGroupId,
    closingGroups,
  ]);

  const getExportData = useCallback(() => {
    if (selectionMode === 'all') return filteredData;
    return filteredData.filter((m) => selectedMembers.includes(m.memberId));
  }, [selectionMode, filteredData, selectedMembers]);

  const hasActiveFilters =
    activeFilters.search || activeFilters.status || activeFilters.group;

  if (loading && reportData.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 400,
        }}
      >
        <Spin size="large" tip="Loading payment data..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          padding: '14px 20px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,.06)',
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>
            Member Payment Status
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            <UserOutlined style={{ marginRight: 4 }} />
            {agentInfo?.displayName || 'N/A'}
            <span style={{ margin: '0 6px' }}>·</span>
            <span style={{ fontWeight: 500 }}>{selectedProgram?.name || 'N/A'}</span>
          </div>
        </div>
        <Space wrap>
          <Select
            placeholder="Select Program"
            size="middle"
            style={{ width: 220 }}
            onChange={handleProgramSelect}
            value={selectedProgram?.id}
            disabled={programChanging}
            loading={programChanging}
          >
            {programList.map((program) => (
              <Option key={program.id} value={program.id}>
                {program.name}
              </Option>
            ))}
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadAgentPaymentData}
            loading={loading}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => setOpen(true)}
            disabled={filteredData.length === 0}
          >
            Generate PDF
          </Button>
        </Space>
      </div>

      {/* ── Summary Metrics ── */}
      <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
        {[
          {
            label: 'Total Members',
            value: summary.totalMembers,
            color: '#1677ff',
            prefix: <UserOutlined />,
            format: false,
          },
          {
            label: 'Pending Payments',
            value: summary.totalPending,
            color: '#d46b08',
            prefix: <ClockCircleOutlined />,
            format: false,
          },
          {
            label: 'Paid Payments',
            value: summary.totalPaid,
            color: '#389e0d',
            prefix: <CheckCircleOutlined />,
            format: false,
          },
          {
            label: 'Pending Amount',
            value: summary.totalPendingAmount,
            color: '#cf1322',
            prefix: <MoneyCollectOutlined />,
            format: true,
          },
          {
            label: 'Total Collected',
            value: summary.totalPaidAmount,
            color: '#389e0d',
            prefix: <MoneyCollectOutlined />,
            format: true,
          },
        ].map((item, i) => (
          <Col xs={12} sm={8} md={6} lg={4} key={i} style={{ flex: '1 1 160px' }}>
            <Card
              size="small"
              style={{
                borderRadius: 10,
                boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                height: '100%',
              }}
              bodyStyle={{ padding: '12px 16px' }}
            >
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
                {item.label}
              </div>
              <Statistic
                value={item.value}
                valueStyle={{
                  color: item.color,
                  fontWeight: 600,
                  fontSize: 20,
                  lineHeight: 1.2,
                }}
                prefix={item.prefix}
                formatter={
                  item.format
                    ? (v) => `₹${v?.toLocaleString('en-IN')}`
                    : undefined
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Filter + Table Card ── */}
      <Card
        style={{ borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}
        bodyStyle={{ padding: 0 }}
      >
        {/* Filter Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Row 1: search + group + status + clear */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <Search
              placeholder="Search name, phone, reg, village…"
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 260 }}
              size="middle"
            />

            <Select
              placeholder="Filter by Closing Group"
              value={selectedGroupId}
              onChange={(val) => {
                setSelectedGroupId(val);
                // reload data with group filter
                setTimeout(() => loadAgentPaymentData(), 0);
              }}
              style={{ width: 220 }}
              allowClear
              loading={groupFilterLoading}
              showSearch
              optionFilterProp="children"
              size="middle"
              suffixIcon={<FolderOpenOutlined />}
            >
              {closingGroups.map((group) => (
                <Option key={group.id} value={group.id}>
                  <span>
                    <TeamOutlined
                      style={{ marginRight: 6, color: '#1677ff' }}
                    />
                    {group.name}
                  </span>
                  <Badge
                    count={group.memberCount}
                    showZero
                    style={{
                      backgroundColor: '#52c41a',
                      marginLeft: 8,
                      fontSize: 10,
                    }}
                  />
                </Option>
              ))}
            </Select>

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 140 }}
              size="middle"
            >
              <Option value="all">All Status</Option>
              <Option value="pending">Pending Only</Option>
              <Option value="paid">Paid Only</Option>
            </Select>

            {hasActiveFilters && (
              <Button
                icon={<ClearOutlined />}
                onClick={resetFilters}
                size="middle"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {activeFilters.search && (
                <Tag
                  color="blue"
                  closable
                  onClose={() => setSearchText('')}
                  style={{ fontSize: 11 }}
                >
                  Search: {searchText}
                </Tag>
              )}
              {activeFilters.status && statusFilter !== 'all' && (
                <Tag
                  color="purple"
                  closable
                  onClose={() => setStatusFilter('all')}
                  style={{ fontSize: 11 }}
                >
                  {statusFilter === 'pending' ? 'Pending Only' : 'Paid Only'}
                </Tag>
              )}
              {selectedGroupId && (
                <Tag
                  color="orange"
                  closable
                  onClose={() => {
                    setSelectedGroupId(null);
                    setTimeout(() => loadAgentPaymentData(), 0);
                  }}
                  style={{ fontSize: 11 }}
                >
                  Group: {closingGroups.find((g) => g.id === selectedGroupId)?.name}
                </Tag>
              )}
            </div>
          )}

          {/* Row 2: count + selection mode */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, color: '#888' }}>
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
                {filteredData.length}
              </span>{' '}
              of{' '}
              <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
                {reportData.length}
              </span>{' '}
              members
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Radio.Group
                value={selectionMode}
                onChange={(e) => {
                  setSelectionMode(e.target.value);
                  if (e.target.value === 'all') {
                    setSelectedMembers([]);
                    setSelectAll(false);
                  }
                }}
                optionType="button"
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="all">
                  All ({filteredData.length})
                </Radio.Button>
                <Radio.Button value="custom">Custom</Radio.Button>
              </Radio.Group>

              {selectionMode === 'custom' && filteredData.length > 0 && (
                <Checkbox
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  indeterminate={
                    selectedMembers.length > 0 &&
                    selectedMembers.length < filteredData.length
                  }
                  style={{ fontSize: 12 }}
                >
                  Select All ({selectedMembers.length}/{filteredData.length})
                </Checkbox>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        {filteredData.length === 0 ? (
          <Empty
            description="No payment data found"
            style={{ padding: '48px 0' }}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            rowSelection={selectionMode === 'custom' ? rowSelection : undefined}
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            rowKey="memberId"
            size="small"
            scroll={{ x: 1000, y: 'calc(100vh - 460px)' }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} members`,
              pageSizeOptions: ['10', '20', '50', '100'],
              size: 'small',
            }}
            expandable={{
              expandedRowRender: (record) => {
                const marriages = record.marriages || [];
                if (marriages.length === 0)
                  return (
                    <div
                      style={{
                        padding: 16,
                        textAlign: 'center',
                        color: '#888',
                      }}
                    >
                      No marriage payment records found
                    </div>
                  );
                return (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: '#fafafa',
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 500,
                        marginBottom: 10,
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <MoneyCollectOutlined /> Marriage Payment Details
                    </div>
                    <Table
                      columns={marriageColumns}
                      dataSource={marriages}
                      rowKey="paymentId"
                      pagination={false}
                      size="small"
                      bordered
                    />
                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: '1px solid #f0f0f0',
                        textAlign: 'right',
                        fontSize: 13,
                      }}
                    >
                      <span style={{ marginRight: 16 }}>
                        Pending:{' '}
                        <span style={{ fontWeight: 600, color: '#d46b08' }}>
                          ₹
                          {marriages
                            .filter((m) => m.status === 'pending')
                            .reduce((s, m) => s + (m.amount || 0), 0)
                            .toLocaleString('en-IN')}
                        </span>
                      </span>
                      <span>
                        Paid:{' '}
                        <span style={{ fontWeight: 600, color: '#389e0d' }}>
                          ₹
                          {marriages
                            .filter((m) => m.status === 'paid')
                            .reduce((s, m) => s + (m.amount || 0), 0)
                            .toLocaleString('en-IN')}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              },
              rowExpandable: (record) => record.marriages?.length > 0,
            }}
          />
        )}
      </Card>

      {/* ── Member Details Modal ── */}
      <Modal
        title={
          <span>
            <UserOutlined style={{ marginRight: 8 }} />
            Member Payment Details
          </span>
        }
        open={isDetailsModalVisible}
        onCancel={() => setIsDetailsModalVisible(false)}
        width={860}
        footer={[
          <Button key="close" onClick={() => setIsDetailsModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="print"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
          >
            Print
          </Button>,
        ]}
      >
        {selectedMember && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Member Info */}
            <Card
              size="small"
              style={{ background: '#f0f5ff', border: '1px solid #d6e4ff' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <Avatar
                  src={selectedMember.photoURL}
                  size={72}
                  icon={!selectedMember.photoURL && <UserOutlined />}
                  style={{ border: '3px solid #fff', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}
                  >
                    {selectedMember.displayName} {selectedMember.surname}
                  </div>
                  {selectedMember.groupInfo?.groupName && (
                    <Tag color="cyan" icon={<TeamOutlined />} style={{ marginBottom: 8 }}>
                      {selectedMember.groupInfo.groupName}
                    </Tag>
                  )}
                  <Row gutter={[16, 4]}>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: '#555' }}>
                        <strong>Reg No:</strong> {selectedMember.registrationNumber}
                      </div>
                      <div style={{ fontSize: 12, color: '#555' }}>
                        <strong>Father:</strong>{' '}
                        {selectedMember.fatherName || 'N/A'}
                      </div>
                      <div style={{ fontSize: 12, color: '#555' }}>
                        <strong>Phone:</strong> {selectedMember.phone || 'N/A'}
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ fontSize: 12, color: '#555' }}>
                        <strong>Village:</strong> {selectedMember.village || 'N/A'}
                      </div>
                      <div style={{ fontSize: 12, color: '#555' }}>
                        <strong>District:</strong>{' '}
                        {selectedMember.district || 'N/A'}
                      </div>
                      <div style={{ fontSize: 12, color: '#555' }}>
                        <strong>Join Date:</strong>{' '}
                        {selectedMember.dateJoin || 'N/A'}
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            </Card>

            {/* Stats */}
            <Row gutter={12}>
              {[
                {
                  label: 'Total Marriages',
                  value: selectedMember.marriages?.length || 0,
                  color: '#1677ff',
                },
                {
                  label: 'Pending',
                  value:
                    selectedMember.marriages?.filter(
                      (m) => m.status === 'pending'
                    ).length || 0,
                  color: '#d46b08',
                },
                {
                  label: 'Paid',
                  value:
                    selectedMember.marriages?.filter(
                      (m) => m.status === 'paid'
                    ).length || 0,
                  color: '#389e0d',
                },
                {
                  label: 'Total Amount',
                  value:
                    selectedMember.marriages?.reduce(
                      (s, m) => s + (m.amount || 0),
                      0
                    ) || 0,
                  color: '#1677ff',
                  format: true,
                },
              ].map((item, i) => (
                <Col span={6} key={i}>
                  <Card size="small" style={{ textAlign: 'center' }}>
                    <Statistic
                      title={
                        <span style={{ fontSize: 11 }}>{item.label}</span>
                      }
                      value={item.value}
                      valueStyle={{
                        color: item.color,
                        fontSize: 18,
                        fontWeight: 600,
                      }}
                      formatter={
                        item.format
                          ? (v) => `₹${v?.toLocaleString('en-IN')}`
                          : undefined
                      }
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Marriage Table */}
            <Card title="Marriage Payment Details" size="small">
              <Table
                columns={marriageColumns}
                dataSource={selectedMember.marriages || []}
                rowKey="paymentId"
                pagination={false}
                bordered
                size="small"
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* ── PDF Drawer ── */}
      <Drawer
        title={
          <span>
            <FilePdfOutlined style={{ color: '#f5222d', marginRight: 8 }} />
            {getFileName()}
          </span>
        }
        width={800}
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        maskClosable={false}
        destroyOnClose
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <PDFDownloadLink
              document={
                <PaymentReportPDF
                  data={getExportData()}
                  summary={summary}
                  agentInfo={agentInfo}
                  programInfo={selectedProgram}
                  filters={{
                    searchText,
                    dateRange: null,
                    statusFilter,
                    groupName: selectedGroupId
                      ? closingGroups.find((g) => g.id === selectedGroupId)?.name
                      : null,
                  }}
                  selectionMode={selectionMode}
                  selectedCount={getExportData().length}
                />
              }
              fileName={getFileName()}
            >
              {({ loading: pdfLoading }) => (
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={pdfLoading}
                  disabled={getExportData().length === 0}
                >
                  Download PDF ({getExportData().length} members)
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        }
      >
        <PDFViewer
          style={{ width: '100%', height: 'calc(100vh - 120px)', border: 'none' }}
        >
          <PaymentReportPDF
            data={getExportData()}
            summary={summary}
            agentInfo={agentInfo}
            programInfo={selectedProgram}
            filters={{
              searchText,
              dateRange: null,
              statusFilter,
              groupName: selectedGroupId
                ? closingGroups.find((g) => g.id === selectedGroupId)?.name
                : null,
            }}
            selectionMode={selectionMode}
            selectedCount={getExportData().length}
          />
        </PDFViewer>
      </Drawer>
    </div>
  );
};

export default MemberPayStatus;