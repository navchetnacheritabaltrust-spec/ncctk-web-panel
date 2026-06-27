import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Tag,
  Space,
  Avatar,
  Tooltip,
  Badge,
  Typography,
  Empty,
  Statistic,
  Divider,
  Drawer,
  Modal,
  Progress
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  DollarOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  FileTextOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  UserAddOutlined,
  FilterOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthProvider';
import { useSelector } from 'react-redux';

const { Option } = Select;
const { Title, Text } = Typography;

const AllClosingPendingPayment = ({ open, setOpen, closingMemberList }) => {
  const { user } = useAuth();
  const agentsList = useSelector((state) => state.data.agentsList) || [];
  
  const [loading, setLoading] = useState(false);
  const [allPaymentsData, setAllPaymentsData] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agentFilter, setAgentFilter] = useState('all');
  const [selectedMemberDetail, setSelectedMemberDetail] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [programPayments, setProgramPayments] = useState({});

  // Fetch payments for all closing members
  const fetchAllPayments = useCallback(async () => {
    if (!user || !closingMemberList?.length) return;

    try {
      setLoading(true);
      const allData = [];
      const programStats = {};

      // Group members by program
      const membersByProgram = {};
      closingMemberList.forEach(member => {
        if (!membersByProgram[member.programId]) {
          membersByProgram[member.programId] = [];
        }
        membersByProgram[member.programId].push(member);
      });

      // Fetch payments for each program
      for (const [programId, members] of Object.entries(membersByProgram)) {
        const paymentsRef = collection(db, `users/${user.uid}/programs/${programId}/payment_pending`);
        
        // Get all payments for these members
        for (const member of members) {
          try {
            const q = query(paymentsRef, where('closingMemberId', '==', member.id));
            const snapshot = await getDocs(q);
            
            const payments = await Promise.all(
              snapshot.docs.map(async (docSnap) => {
                const data = docSnap.data();
                const id = docSnap.id;
                const [, memberId] = id.split('_');

                let paymentMemberDetails = data.memberDetails || {};
                
                // Fetch member details if needed
                if (memberId) {
                  try {
                    const memberRef = doc(db, `users/${user.uid}/programs/${programId}/members`, memberId);
                    const memberSnap = await getDoc(memberRef);
                    if (memberSnap.exists()) {
                      const memberData = memberSnap.data();
                      paymentMemberDetails = { ...paymentMemberDetails, ...memberData };
                    }
                  } catch (err) {
                    console.error('Error fetching member details:', err);
                  }
                }

                const dueDate = data.dueDate ? dayjs(data.dueDate, 'DD-MM-YYYY') : null;
                const isOverdue = dueDate && dueDate.isBefore(dayjs(), 'day');
                const agent = agentsList.find(a => a.id === paymentMemberDetails.agentId) || {};

                return {
                  id,
                  closingMemberId: member.id,
                  closingMemberName: member.displayName,
                  closingMemberReg: member.registrationNumber,
                  closingMemberPhoto: member.photoURL,
                  closingMemberProgram: member.programName,
                  marriageDate: member.marriage_date,
                  closingDate: member.closing_date,
                  ...data,
                  memberDetails: {
                    displayName: paymentMemberDetails.displayName || data.memberDetails?.displayName || 'Unknown',
                    registrationNumber: paymentMemberDetails.registrationNumber || data.memberDetails?.registrationNumber || 'N/A',
                    phone: paymentMemberDetails.phone || data.memberDetails?.phoneNo || 'N/A',
                    village: paymentMemberDetails.village || data.memberDetails?.village || 'N/A',
                    district: paymentMemberDetails.district || data.memberDetails?.district || 'N/A',
                    agentName: agent.displayName || agent.name || paymentMemberDetails.addedByName || 'N/A',
                    agentId: paymentMemberDetails.agentId,
                    photoURL: paymentMemberDetails.photoURL || data.memberDetails?.photoURL || ''
                  },
                  isOverdue,
                  dueDateFormatted: dueDate?.format('DD-MM-YYYY') || 'N/A',
                  isSelfPayment: memberId === member.id,
                  programId
                };
              })
            );

            allData.push(...payments);

            // Update program stats
            if (!programStats[programId]) {
              programStats[programId] = {
                programName: member.programName,
                totalMembers: members.length,
                totalPayments: 0,
                pending: 0,
                completed: 0,
                totalAmount: 0,
                collectedAmount: 0
              };
            }

            payments.forEach(payment => {
              programStats[programId].totalPayments++;
              if (payment.status === 'paid') {
                programStats[programId].completed++;
                programStats[programId].collectedAmount += payment.payAmount || 200;
              } else {
                programStats[programId].pending++;
              }
              programStats[programId].totalAmount += payment.payAmount || 200;
            });

          } catch (error) {
            console.error(`Error fetching payments for member ${member.id}:`, error);
          }
        }
      }

      setAllPaymentsData(allData);
      setProgramPayments(programStats);
    } catch (error) {
      console.error('Error fetching all payments:', error);
    } finally {
      setLoading(false);
    }
  }, [user, closingMemberList, agentsList]);

  // Apply filters
  const filteredPayments = allPaymentsData.filter(payment => {
    // Search filter
    const matchesSearch = !searchText || 
      payment.closingMemberName.toLowerCase().includes(searchText.toLowerCase()) ||
      payment.closingMemberReg.toLowerCase().includes(searchText.toLowerCase()) ||
      payment.memberDetails.displayName.toLowerCase().includes(searchText.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

    // Agent filter
    const matchesAgent = agentFilter === 'all' || payment.memberDetails.agentId === agentFilter;

    return matchesSearch && matchesStatus && matchesAgent;
  });

  // Calculate overall statistics
  const overallStats = {
    totalClosingMembers: closingMemberList?.length || 0,
    totalPayments: filteredPayments.length,
    pending: filteredPayments.filter(p => !p.status || p.status === 'pending').length,
    completed: filteredPayments.filter(p => p.status === 'paid').length,
    overdue: filteredPayments.filter(p => p.isOverdue && (!p.status || p.status === 'pending')).length,
    totalAmount: filteredPayments.reduce((sum, p) => sum + (p.payAmount || 200), 0),
    collectedAmount: filteredPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.payAmount || 200), 0)
  };

  // Group payments by closing member
  const paymentsByClosingMember = {};
  filteredPayments.forEach(payment => {
    if (!paymentsByClosingMember[payment.closingMemberId]) {
      paymentsByClosingMember[payment.closingMemberId] = {
        closingMemberId: payment.closingMemberId,
        closingMemberName: payment.closingMemberName,
        closingMemberReg: payment.closingMemberReg,
        closingMemberPhoto: payment.closingMemberPhoto,
        programName: payment.closingMemberProgram,
        marriageDate: payment.marriageDate,
        closingDate: payment.closingDate,
        payments: [],
        totalAmount: 0,
        collectedAmount: 0,
        pending: 0,
        completed: 0
      };
    }
    
    paymentsByClosingMember[payment.closingMemberId].payments.push(payment);
    paymentsByClosingMember[payment.closingMemberId].totalAmount += payment.payAmount || 200;
    
    if (payment.status === 'paid') {
      paymentsByClosingMember[payment.closingMemberId].collectedAmount += payment.payAmount || 200;
      paymentsByClosingMember[payment.closingMemberId].completed++;
    } else {
      paymentsByClosingMember[payment.closingMemberId].pending++;
    }
  });

  const closingMembersSummary = Object.values(paymentsByClosingMember);

  // Table columns for main view
  const columns = [
    {
      title: 'Closing Member',
      key: 'closingMember',
      width: 250,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <div className="flex items-center gap-2">
            <Avatar 
              size="small" 
              src={record.closingMemberPhoto} 
              icon={<UserOutlined />}
              className="bg-blue-100 text-blue-600"
            />
            <div>
              <div className="font-medium text-sm">{record.closingMemberName}</div>
              <div className="text-xs text-gray-500">
                Reg: {record.closingMemberReg} • {record.programName}
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            <CalendarOutlined className="mr-1" />
            Marriage: {record.marriageDate} • Close: {record.closingDate}
          </div>
        </Space>
      ),
    },
    {
      title: 'Payments Summary',
      key: 'summary',
      width: 200,
      render: (_, record) => (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Total:</span>
            <span className="font-semibold">{record.payments.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-green-600">Completed:</span>
            <span className="font-semibold text-green-600">{record.completed}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-orange-500">Pending:</span>
            <span className="font-semibold text-orange-500">{record.pending}</span>
          </div>
          <Divider className="my-1" />
          <div className="flex justify-between text-sm font-bold">
            <span>Amount:</span>
            <span className="text-blue-600">₹{record.totalAmount}</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Collection Progress',
      key: 'progress',
      width: 180,
      render: (_, record) => {
        const progress = record.totalAmount > 0 ? (record.collectedAmount / record.totalAmount) * 100 : 0;
        return (
          <div>
            <Progress 
              percent={Math.round(progress)} 
              size="small" 
              status={progress === 100 ? 'success' : 'active'}
              strokeColor={progress === 100 ? '#52c41a' : '#1890ff'}
            />
            <div className="text-xs text-gray-500 mt-1 text-center">
              ₹{record.collectedAmount} / ₹{record.totalAmount}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedMemberDetail(record);
            setDetailModalVisible(true);
          }}
        >
          View Details
        </Button>
      ),
    },
  ];

  // Detail modal columns
  const detailColumns = [
    {
      title: 'Member',
      key: 'member',
      width: 200,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Avatar 
            size="small" 
            src={record.memberDetails.photoURL} 
            icon={<UserOutlined />}
          />
          <div>
            <div className="font-medium">{record.memberDetails.displayName}</div>
            <div className="text-xs text-gray-500">{record.memberDetails.registrationNumber}</div>
          </div>
          {record.isSelfPayment && (
            <Tag color="gold" size="small">Self</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 150,
      render: (_, record) => (
        <div>
          <div className="flex items-center gap-1">
            <PhoneOutlined className="text-gray-400" />
            <span>{record.memberDetails.phone}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <EnvironmentOutlined />
            {record.memberDetails.village}
          </div>
        </div>
      ),
    },
    {
      title: 'Agent',
      key: 'agent',
      width: 150,
      render: (_, record) => (
        <div className="flex items-center gap-1">
          <UserAddOutlined className="text-gray-400" />
          <span>{record.memberDetails.agentName}</span>
        </div>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 100,
      render: (_, record) => (
        <div className="font-bold text-blue-700">₹{record.payAmount || 200}</div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const status = record.status || 'pending';
        const color = status === 'paid' ? 'success' : 
                     record.isOverdue ? 'error' : 'warning';
        const text = status === 'pending' && record.isOverdue ? 'Overdue' : status;
        
        return (
          <Tag color={color} className="capitalize">
            {text}
          </Tag>
        );
      },
    },
    {
      title: 'Due Date',
      key: 'dueDate',
      width: 120,
      render: (_, record) => (
        <div className="text-sm">{record.dueDateFormatted}</div>
      ),
    },
  ];

  // Fetch data on mount
  useEffect(() => {
    if (open && closingMemberList?.length) {
      fetchAllPayments();
    }
  }, [open, closingMemberList, fetchAllPayments]);

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileTextOutlined className="text-xl text-green-600" />
            <div>
              <Title level={4} className="m-0">All Marriage Pending Payments</Title>
              <Text type="secondary">View and manage all marriage case payments</Text>
            </div>
          </div>
        </div>
      }
      placement="right"
      onClose={() => setOpen(false)}
      open={open}
      width={1200}
      className="all-pending-payments-drawer"
    >
      {/* Overall Statistics */}
      <Card className="mb-6">
        <Row gutter={16}>
          <Col span={4}>
            <Card size="small" className="text-center">
              <Statistic
                title="Closing Members"
                value={overallStats.totalClosingMembers}
                prefix={<TeamOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="text-center">
              <Statistic
                title="Total Payments"
                value={overallStats.totalPayments}
                prefix={<DollarOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="text-center">
              <Statistic
                title="Pending"
                value={overallStats.pending}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="text-center">
              <Statistic
                title="Completed"
                value={overallStats.completed}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="text-center">
              <Statistic
                title="Total Amount"
                value={overallStats.totalAmount}
                prefix="₹"
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size="small" className="text-center">
              <Statistic
                title="Collected"
                value={overallStats.collectedAmount}
                prefix="₹"
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Program-wise Stats */}
      {Object.keys(programPayments).length > 0 && (
        <Card className="mb-6" size="small">
          <Title level={5} className="mb-4">
            <TeamOutlined className="mr-2" />
            Program-wise Summary
          </Title>
          <Row gutter={16}>
            {Object.entries(programPayments).map(([programId, stats]) => (
              <Col span={8} key={programId}>
                <Card size="small">
                  <div className="font-semibold mb-2">{stats.programName}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Closing Members: <strong>{stats.totalMembers}</strong></div>
                    <div>Total Payments: <strong>{stats.totalPayments}</strong></div>
                    <div>Completed: <Tag color="green">{stats.completed}</Tag></div>
                    <div>Pending: <Tag color="orange">{stats.pending}</Tag></div>
                    <div className="col-span-2">
                      <Progress 
                        percent={Math.round((stats.collectedAmount / stats.totalAmount) * 100)} 
                        size="small" 
                      />
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Filters */}
      <Card size="small" className="mb-4">
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Input
              placeholder="Search by closing member name or registration..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Payment Status"
              className="w-full"
              value={statusFilter}
              onChange={setStatusFilter}
              allowClear
            >
              <Option value="all">All Status</Option>
              <Option value="pending">Pending</Option>
              <Option value="completed">Completed</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="Filter by Agent"
              className="w-full"
              value={agentFilter}
              onChange={setAgentFilter}
              allowClear
              showSearch
            >
              <Option value="all">All Agents</Option>
              {agentsList.map(agent => (
                <Option key={agent.id} value={agent.id}>
                  {agent.displayName || agent.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setSearchText('');
                setStatusFilter('all');
                setAgentFilter('all');
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Table - Closing Members Summary */}
      <Card>
        <Title level={5} className="mb-4">
          <FileTextOutlined className="mr-2" />
          Closing Members Payment Summary ({closingMembersSummary.length})
        </Title>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2">Loading payment data...</p>
          </div>
        ) : closingMembersSummary.length === 0 ? (
          <Empty description="No payment data found for closing members" />
        ) : (
          <Table
            columns={columns}
            dataSource={closingMembersSummary}
            rowKey="closingMemberId"
            pagination={{ pageSize: 10 }}
            size="small"
            className="member-summary-table"
          />
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <Avatar 
              size={40}
              src={selectedMemberDetail?.closingMemberPhoto}
              icon={<UserOutlined />}
            />
            <div>
              <div className="font-semibold">{selectedMemberDetail?.closingMemberName}</div>
              <div className="text-sm text-gray-600">
                {selectedMemberDetail?.closingMemberReg} • {selectedMemberDetail?.programName}
              </div>
            </div>
          </div>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={900}
        footer={null}
      >
        {selectedMemberDetail && (
          <>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <Row gutter={16}>
                <Col span={8}>
                  <div className="text-sm text-gray-600">Marriage Date</div>
                  <div className="font-medium">{selectedMemberDetail.marriageDate}</div>
                </Col>
                <Col span={8}>
                  <div className="text-sm text-gray-600">Closing Date</div>
                  <div className="font-medium">{selectedMemberDetail.closingDate}</div>
                </Col>
                <Col span={8}>
                  <div className="text-sm text-gray-600">Total Payments</div>
                  <div className="font-medium">{selectedMemberDetail.payments.length}</div>
                </Col>
              </Row>
            </div>

            <Table
              columns={detailColumns}
              dataSource={selectedMemberDetail.payments}
              rowKey="id"
              pagination={{ pageSize: 5 }}
              size="small"
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}>
                      <strong>Total for this marriage:</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong>₹{selectedMemberDetail.totalAmount}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <div>
                        <Tag color="green">Completed: {selectedMemberDetail.completed}</Tag>
                        <Tag color="orange" className="ml-2">Pending: {selectedMemberDetail.pending}</Tag>
                      </div>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3}></Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </>
        )}
      </Modal>
    </Drawer>
  );
};

export default AllClosingPendingPayment;