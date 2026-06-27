import React, { useEffect, useState, useMemo, memo } from 'react';
import { FiBell, FiEye, FiCheck, FiX, FiTrash2, FiPhone, FiUser, FiCalendar, FiCreditCard, FiRefreshCw, FiSearch, FiEdit2 } from 'react-icons/fi';
import { getData, updateData } from '@/lib/services/firebaseService';
import { useAuth } from '@/lib/AuthProvider';
import { useDispatch, useSelector } from 'react-redux';
import { UserOutlined, PhoneOutlined, HomeOutlined, FileOutlined, CalendarOutlined, MailOutlined, IdcardOutlined, EnvironmentOutlined, ContactsOutlined, DollarOutlined, FilePdfOutlined, LockOutlined, EyeOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Drawer, Button, Input, Modal, Card, Avatar, Tabs, Descriptions, Image as AntImage, Spin, Empty, Typography, Form, Checkbox, Tooltip, Tag, Popconfirm, Badge, Divider, App, Select, Radio, Row, Col } from 'antd';
import MemberDetailsView from '@/components/screen/programs/members/MemberDetailsView';
import EditMember from '@/components/screen/programs/members/EditMember';
import dayjs from 'dayjs';
import { acceptMemberWithCounterUpdate, checkAadhaarExists, generate6DigitRegNo, sendFirebaseNotification, updateMemberStatus } from '@/lib/helper';
import { setgetMemberDataChange } from '@/redux/slices/commonSlice';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createMemberAccount, generateMemberPassword } from '@/lib/commonFun';

const { Search, TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

const RequestSection = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [requests, setRequests] = useState([]);
  const [detailsView, setDetailsView] = useState(false);
  const [isEditmember, setIsEditMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [acceptLoading, setAcceptLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const { message } = App.useApp();

  // Join Fees states for accept modal
  const [joinFeesPaymentType, setJoinFeesPaymentType] = useState(null);
  const [customJoinFeesAmount, setCustomJoinFeesAmount] = useState(0);
  const [memberJoinFees, setMemberJoinFees] = useState(0);

  // Modal states
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [removeModalVisible, setRemoveModalVisible] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  
  const dispatch = useDispatch();
  const { user } = useAuth();
  const selectedProgram = useSelector((state) => state.data.selectedProgram);
  const programList = useSelector((state) => state.data.programList);
  const agentsList = useSelector((state) => state.data.agentsList);
  
  const [acceptForm] = Form.useForm();
  const [rejectForm] = Form.useForm();

  // Get pending members from all programs
  const getPendingMembersFromAllPrograms = async () => {
    if (!user?.uid) {
      setRequests([]);
      return;
    }

    setLoading(true);
    try {
      const allRequests = [];
      
      // Use programList if available, otherwise use selectedProgram
      const programsToCheck = programList?.length > 0 ? programList : (selectedProgram ? [selectedProgram] : []);
      
      if (programsToCheck.length === 0) {
        setRequests([]);
        return;
      }

      // Fetch requests from each program concurrently
      const fetchPromises = programsToCheck.map(async (program) => {
        try {
          const programRequests = await getData(
            `users/${user.uid}/programs/${program.id}/members`,
            [
              {
                field: 'active_flag',
                operator: '==',
                value: false
              },
              {
                field: 'status',
                operator: '==',
                value: 'pending'
              }
            ],
            {
              field: 'requestCreatedAt',
              direction: 'desc'
            }
          );

          // Add program info to each request
          return programRequests.map(request => ({
            ...request,
            programId: program.id,
            programName: program.name || program.programName || 'Unknown Program'
          }));
        } catch (error) {
          console.error(`Error fetching requests for program ${program.id}:`, error);
          return [];
        }
      });

      // Wait for all requests to complete
      const results = await Promise.all(fetchPromises);
      
      // Flatten all requests into single array
      results.forEach(programRequests => {
        allRequests.push(...programRequests);
      });

      setRequests(allRequests);
    } catch (error) {
      console.error('Error fetching pending members:', error);
      message.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  // Filter requests based on search term
  const filteredRequests = useMemo(() => {
    if (!searchTerm) return requests;
    
    const term = searchTerm.toLowerCase();
    return requests.filter(request => 
      (request.displayName && request.displayName.toLowerCase().includes(term)) ||
      (request.aadhaarNo && request.aadhaarNo.includes(term)) ||
      (request.fatherName && request.fatherName.toLowerCase().includes(term)) ||
      (request.phone && request.phone.includes(term)) ||
      (request.programName && request.programName.toLowerCase().includes(term)) || (request.addedByName && request.addedByName.toLowerCase().includes(term))
    );
  }, [requests, searchTerm]);

  // Calculate counts
  const { pendingCount, totalCount } = useMemo(() => {
    const pending = requests.filter(req => req.status === 'pending').length;
    return {
      pendingCount: pending,
      totalCount: requests.length
    };
  }, [requests]);

  // Handle Accept Member - Show Modal
const showAcceptModal = (member) => {
  setCurrentMember(member);
  // Get the join fees from the member data
  const joinFeesAmount = member.joinFees || 0;
  setMemberJoinFees(joinFeesAmount);
  setJoinFeesPaymentType(null);
  setCustomJoinFeesAmount(1100);  // Change from 0 to 1100
  setAcceptModalVisible(true);
  acceptForm.resetFields();
  acceptForm.setFieldsValue({
    joinFeesDone: false,
    joinFeesPaymentType: undefined,
    customJoinFeesAmount: 1100,  // Add this line
    joinFeesTxtId: undefined
  });
};

  const getAgentToken = (agentId) => {
    const findAgent = agentsList?.find((x) => x.id === agentId);
    return findAgent?.firbaseToken;
  };

  const handleAccept = async () => {
    try {
      setAcceptLoading(true);
      const values = await acceptForm.validateFields();
      
      // Check if Aadhaar already exists in the program
      const programDocPath = `/users/${user.uid}/programs/${currentMember.programId}`;
      const memberCollectionPath = programDocPath + '/members';
       
      const isAadhaarExists = await checkAadhaarExists(
        memberCollectionPath, 
        currentMember.aadhaarNo
      );
      
      if (isAadhaarExists) {
        message.error(`आधार संख्या ${currentMember.aadhaarNo} पहले से ही इस कार्यक्रम में एक सक्रिय सदस्य के लिए दर्ज है।`);
        setAcceptLoading(false);
        return;
      }
  
      // Calculate join fees payment details
      let joinFeesPaidAmount = 0;
      let joinFeesRemainingAmount = 0;
      
      if (values.joinFeesDone) {
        if (values.joinFeesPaymentType === 'full') {
          joinFeesPaidAmount = memberJoinFees;
          joinFeesRemainingAmount = 0;
        } else if (values.joinFeesPaymentType === 'custom') {
          joinFeesPaidAmount = values.customJoinFeesAmount || 0;
          joinFeesRemainingAmount = memberJoinFees - joinFeesPaidAmount;
        }
      }
      
      // Prepare member data for acceptance
      const memberData = {
        status: 'accepted',
        active_flag: true,
        joinFeesDone: values.joinFeesDone || false,
        closingMonths: values.closingMonths || 0,
        joinFeesTxtId: values.joinFeesTxtId || "",
        joinFeesPaymentType: values.joinFeesPaymentType || "",
        joinFeesPaidAmount: joinFeesPaidAmount,
        joinFeesRemainingAmount: joinFeesRemainingAmount,
        dateJoin:currentMember.dateJoin || dayjs().format('DD-MM-YYYY'),
        createdAt: new Date(),
        updatedAt: new Date(),
        approvedBy: user?.displayName || user?.email || 'Admin',
        approvedAt: new Date(),
      };

      // Use the transaction function to accept member and update counters
      const result = await acceptMemberWithCounterUpdate(
        user.uid,
        currentMember.programId,
        currentMember.id,
        memberData,
        currentMember.addedBy === 'agent' ? currentMember.agentId : null
      );
      
      try {
        await createMemberAccount({
          memberId: result.id,
          displayName: currentMember.displayName,
          photoURL: currentMember.photoURL || "",
          password: generateMemberPassword(currentMember.displayName, currentMember.bobDate) || "Member@123",
          programId: currentMember.programId,
          registrationNumber: result.registrationNumber,
          memberCollectionPath: memberCollectionPath,
          createdBy: user.uid
        });
      
        console.log("Member auth created");
      } catch (authError) {
        console.error("Auth creation failed:", authError);
        message.warning("Member added successfully, but login account creation failed.");
      }
      
      dispatch(setgetMemberDataChange(true));
      
      const agentToken = getAgentToken(currentMember?.agentId);

      // Update local state
      if (agentToken) {
        await sendFirebaseNotification(
          agentToken,
          'मेंबर रिक्वेस्ट मंजूर',
          `${currentMember?.displayName} की मेंबर रिक्वेस्ट मंजूर कर दी गई है।
मोबाइल: ${currentMember?.phone}
गाँव: ${currentMember?.village}
योजना: ${currentMember?.programName}
${values.joinFeesDone ? `Join Fees: ₹${joinFeesPaidAmount}` : 'Join Fees: Pending'}`
        );
      }
      
      setRequests(prev => prev.filter(req => req.id !== currentMember.id));
      
      // Show success message with payment details
      let successMsg = `Member accepted successfully! Member #${result.newMemberCount}`;
      if (values.joinFeesDone) {
        successMsg += ` | Join Fees Paid: ₹${joinFeesPaidAmount}`;
        if (joinFeesRemainingAmount > 0) {
          successMsg += ` | Remaining: ₹${joinFeesRemainingAmount}`;
        }
      }
      message.success(successMsg);
      
      setAcceptModalVisible(false);
      acceptForm.resetFields();
      setJoinFeesPaymentType(null);
      setCustomJoinFeesAmount(0);
      
    } catch (error) {
      console.error('Error accepting member:', error);
      if (error.errorFields) {
        return;
      }
      message.error('Failed to accept member request: ' + error.message);
    } finally {
      setAcceptLoading(false);
    }
  };

  // For reject operation (no counter increment)
  const handleReject = async () => {
    try {
      setRejectLoading(true);
      const values = await rejectForm.validateFields();
      const agentToken = getAgentToken(currentMember?.agentId);
      
      const updateData = {
        status: 'rejected',
        active_flag: false,
        rejectReason: values.rejectReason,
        rejectedBy: user?.displayName || user?.email || 'Admin',
        rejectedAt: new Date(),
        updatedAt: new Date()
      };

      // Use simple update for reject (no counter change)
      await updateMemberStatus(
        user.uid,
        currentMember.programId,
        currentMember.id,
        updateData
      );  

      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === currentMember.id 
          ? { ...req, status: 'rejected', rejectReason: values.rejectReason }
          : req
      ));
      
      if (agentToken) {
        await sendFirebaseNotification(
          agentToken, 
          'Member Rejected', 
          `Rejected ${currentMember.displayName}'s request. Reason: ${values.rejectReason}`,
        );
      }
      
      message.error('Member request rejected');
      setRejectModalVisible(false);
      rejectForm.resetFields();
    } catch (error) {
      console.error('Error rejecting member:', error);
      if (error.errorFields) {
        return;
      }
      message.error('Failed to reject member request: ' + error.message);
    } finally {
      setRejectLoading(false);
    }
  };

  // For remove operation (no counter increment)
  const handleRemove = async () => {
    try {
      const updateData = {
        active_flag: false,
        status: 'removed',
        removedAt: new Date(),
        updatedAt: new Date()
      };

      await updateMemberStatus(
        user.uid,
        currentMember.programId,
        currentMember.id,
        updateData
      );
      
      setRequests(prev => prev.filter(req => req.id !== currentMember.id));
      message.info('Request removed successfully');
      setRemoveModalVisible(false);
    } catch (error) {
      console.error('Error removing request:', error);
      message.error('Failed to remove request: ' + error.message);
    }
  };

  // Handle Reject Member
  const showRejectModal = (member) => {
    setCurrentMember(member);
    setRejectModalVisible(true);
    rejectForm.resetFields();
  };

  // Handle Remove Member
  const showRemoveModal = (member) => {
    setCurrentMember(member);
    setRemoveModalVisible(true);
  };

  const handleViewDetails = (member) => {
    setSelectedMember(member);
    setDetailsView(true);
  };

  const renderMemberCard = (member) => (
    <Card
      key={`${member.programId}-${member.id}`}
      className="mb-4 shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow"
      actions={[
        <Tooltip title="Accept Request">
          <Button 
            type="primary" 
            onClick={() => showAcceptModal(member)} 
            className="bg-green-500 hover:bg-green-600 border-green-500"
            icon={<FiCheck />}
            size="small"
          >
            Accept
          </Button>
        </Tooltip>,
        <Tooltip title="Reject Request">
          <Button 
            danger 
            onClick={() => showRejectModal(member)}
            icon={<FiX />}
            size="small"
          >
            Reject
          </Button>
        </Tooltip>,
        <Tooltip title="Edit Member Details">
          <Button 
            type="default"
            onClick={() => {
              setSelectedMember(member);
              setIsEditMember(true);
            }} 
            className="bg-orange-100 hover:bg-orange-200 text-orange-700 border-orange-200"
            icon={<FiEdit2 />}
            size="small"
          >
            Edit
          </Button>
        </Tooltip>,
        <Tooltip title="View Full Details">
          <Button 
            onClick={() => handleViewDetails(member)} 
            className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200"
            icon={<FiEye />}
            size="small"
          >
            Details
          </Button>
        </Tooltip>
      ]}
    >
      <div className="flex flex-col md:flex-row items-start gap-4">
        <div className="flex-shrink-0">
          <Avatar 
            icon={<UserOutlined />} 
            src={member.photoURL} 
            size={60} 
            className="border-2 border-gray-200 shadow-sm" 
          />
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-800 truncate">
                {member.displayName || 'Unknown Member'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Requested: {formatDate(member?.requestCreatedAt)}
              </p>
            </div>
            <Tag color="blue" className="rounded-full px-3 py-1 font-medium whitespace-nowrap">
              {member.programName}
            </Tag>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {member.phone && (
              <div className="flex items-center">
                <PhoneOutlined className="mr-2 text-blue-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">{member.phone}</span>
              </div>
            )}
            {member.fatherName && (
              <div className="flex items-center">
                <FileOutlined className="mr-2 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">Father: {member.fatherName}</span>
              </div>
            )}
            {member.state && (
              <div className="flex items-center">
                <EnvironmentOutlined className="mr-2 text-red-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">State: {member.state}</span>
              </div>
            )}
            {member.aadhaarNo && (
              <div className="flex items-center">
                <IdcardOutlined className="mr-2 text-purple-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">Aadhaar: {member.aadhaarNo}</span>
              </div>
            )}
            {member.joinFees > 0 && (
              <div className="flex items-center">
                <DollarOutlined className="mr-2 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">Join Fees: ₹{member.joinFees}</span>
              </div>
            )}
                      {member.addedByName  && (
              <div className="flex items-center">
                <DollarOutlined className="mr-2 text-green-500 flex-shrink-0" />
                <span className="text-gray-700 truncate">Agent: {member.addedByName}</span>
              </div>
            )}
          </div>

          {member.status === 'rejected' && member.rejectReason && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center mb-1">
                <Tag color="red" className="rounded-md">Rejected</Tag>
                <span className="text-sm text-red-600 ml-2">
                  Rejected on: {formatDate(member.rejectedAt)}
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                <strong>Reason:</strong> {member.rejectReason}
              </p>
              <Button 
                type="link" 
                danger 
                size="small" 
                onClick={() => showRemoveModal(member)}
                icon={<FiTrash2 />}
                className="p-0 h-auto"
              >
                Remove
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );

  const renderEmptyState = () => (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <div className="text-center">
          <Typography.Text type="secondary" className="text-lg">
            No pending requests
          </Typography.Text>
          <br />
          <Typography.Text type="secondary">
            All member requests have been processed
          </Typography.Text>
        </div>
      }
    />
  );

  const renderLoadingState = () => (
    <div className="flex justify-center items-center py-12">
      <Spin size="large" />
      <span className="ml-3 text-gray-600">Loading requests...</span>
    </div>
  );

  // Load initial count when component mounts
  useEffect(() => {
    getPendingMembersFromAllPrograms();
  }, [programList, user?.uid]);

  // Refresh data when drawer opens
  useEffect(() => {
    if (isDrawerOpen) {
      getPendingMembersFromAllPrograms();
    }
  }, [isDrawerOpen]);

  const formatDate = (date) => {
    if (date instanceof Date) {
      return date.toLocaleString();
    }
    if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleString();
    }
    if (date) {
      return dayjs(date).format('DD-MM-YYYY HH:mm');
    }
    return 'Unknown date';
  };

  return (
    <>
      {/* Request Button with Live Count */}
      <Badge 
        count={pendingCount} 
        offset={[-5, 5]}
        showZero={false}
        size="large"
      >
        <Button
          icon={<FiBell className="text-lg" />}
          onClick={() => setIsDrawerOpen(true)}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300 shadow-sm"
          type="default"
        >
          <span>REQUESTS</span>
        </Button>
      </Badge>

      <Drawer
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiBell className="text-blue-500 text-xl" />
              <span className="text-lg font-semibold">Member Requests</span>
              {loading && <Spin size="small" />}
            </div>
          </div>
        }
        placement="right"
        onClose={() => {
          setIsDrawerOpen(false);
          setSearchTerm('');
        }}
        open={isDrawerOpen}
        width={700}
        className="bg-gray-50"
        extra={
          <Button 
            onClick={getPendingMembersFromAllPrograms} 
            loading={loading}
            icon={<FiRefreshCw />}
            size="small"
          >
            Refresh
          </Button>
        }
      >
        {/* Search and Stats Section */}
        <div className="space-y-4 mb-6">
          <Search
            placeholder="Search by name, aadhaar, father name, phone..."
            allowClear
            enterButton={<FiSearch />}
            size="large"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={setSearchTerm}
          />
          
          <div className="flex justify-between items-center text-sm">
            <div className="flex gap-4">
              <span className="text-gray-600">
                Total: <strong>{totalCount}</strong>
              </span>
              <span className="text-blue-600">
                Pending: <strong>{pendingCount}</strong>
              </span>
              {searchTerm && (
                <span className="text-green-600">
                  Filtered: <strong>{filteredRequests.length}</strong>
                </span>
              )}
            </div>
            {searchTerm && (
              <Button 
                type="link" 
                onClick={() => setSearchTerm('')}
                size="small"
              >
                Clear search
              </Button>
            )}
          </div>
        </div>

        <Divider className="my-4" />

        {/* Requests List */}
        <div className="space-y-4 flex-1 overflow-auto">
          {loading ? (
            renderLoadingState()
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-4 flex flex-col gap-2">
              {filteredRequests.map(renderMemberCard)}
            </div>
          ) : (
            renderEmptyState()
          )}
        </div>

        {/* Accept Modal with Join Fees Options */}
        <Modal
          title="Accept Member Request"
          open={acceptModalVisible}
          onCancel={() => {
            setAcceptModalVisible(false);
            setJoinFeesPaymentType(null);
            setCustomJoinFeesAmount(0);
            acceptForm.resetFields();
          }}
          width={600}
          footer={[
            <Button key="cancel" onClick={() => {
              setAcceptModalVisible(false);
              setJoinFeesPaymentType(null);
              setCustomJoinFeesAmount(0);
              acceptForm.resetFields();
            }}>
              Cancel
            </Button>,
            <Button 
              key="accept" 
              type="primary" 
              loading={acceptLoading}
              onClick={handleAccept}
              icon={<FiCheck />}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Accept Member
            </Button>
          ]}
        >
          <Form form={acceptForm} layout="vertical">
            <Form.Item
              name="joinFeesDone"
              valuePropName="checked"
            >
              <Checkbox onChange={(e) => {
                if (!e.target.checked) {
                  setJoinFeesPaymentType(null);
                  setCustomJoinFeesAmount(0);
                  acceptForm.setFieldsValue({
                    joinFeesPaymentType: undefined,
                   customJoinFeesAmount: 1100,   // Add this line
                    joinFeesTxtId: undefined
                  });
                }
              }}>
                <strong>Join Fees Paid</strong>
              </Checkbox>
            </Form.Item>
            
            <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => 
              prevValues.joinFeesDone !== currentValues.joinFeesDone
            }>
              {({ getFieldValue }) => 
                getFieldValue('joinFeesDone') && (
                  <>
                    <Divider orientation="left" className="mt-4 mb-2">
                      Join Fees Details
                    </Divider>
                    
                    <div className="mb-4 p-3 bg-gray-50 rounded">
                      <Text strong>Total Join Fees Amount: </Text>
                      <Text strong style={{ color: '#1890ff', fontSize: '16px' }}>
                        ₹{memberJoinFees}
                      </Text>
                    </div>

                    <Form.Item
                      name="joinFeesPaymentType"
                      label="भुगतान प्रकार"
                      rules={[{ required: true, message: 'कृपया भुगतान प्रकार चुनें' }]}
                    >
                     <Select 
  placeholder="भुगतान प्रकार चुनें"
  onChange={(value) => {
    setJoinFeesPaymentType(value);
    if (value === 'full') {
      setCustomJoinFeesAmount(memberJoinFees);
      acceptForm.setFieldsValue({
        customJoinFeesAmount: memberJoinFees
      });
    } else if (value === 'custom') {
      setCustomJoinFeesAmount(1100);  // Change from 0 to 1100
      acceptForm.setFieldsValue({
        customJoinFeesAmount: 1100   // Change from undefined to 1100
      });
    }
  }}
>
  <Option value="full">Full Paid (₹{memberJoinFees})</Option>
  <Option value="custom">Custom Paid</Option>
</Select>
                    </Form.Item>

               {/* Custom payment input with default value 1100 */}
<Form.Item
  name="customJoinFeesAmount"
  label="भुगतान राशि"
  initialValue={1100}  // Add this line to set initial value
  rules={[
    { required: true, message: 'कृपया भुगतान राशि दर्ज करें' },
    {
      validator: (_, value) => {
        if (value && (value <= 0 || value > memberJoinFees)) {
          return Promise.reject(new Error(`राशि ₹1 और ₹${memberJoinFees} के बीच होनी चाहिए`));
        }
        return Promise.resolve();
      }
    }
  ]}
>
  <Input
    size='large'
    type='number'
    prefix="₹"
    placeholder={`₹1 - ₹${memberJoinFees} दर्ज करें`}
    min={1100}  // Add minimum value
    defaultValue={1100}  // Add defaultValue
    onChange={(e) => {
      const amount = parseFloat(e.target.value);
      if (!isNaN(amount)) {
        setCustomJoinFeesAmount(amount);
      }
    }}
  />
</Form.Item>

                    <Form.Item
                      name="joinFeesTxtId"
                      label="Transaction ID"
                      rules={[{ required: true, message: 'कृपया Transaction ID दर्ज करें' }]}
                    >
                      <Input
                        size='large'
                        placeholder="Enter Transaction ID"
                        autoComplete='off'
                        prefix={<IdcardOutlined />}
                      />
                    </Form.Item>

                    {/* Payment Summary */}
                    {(joinFeesPaymentType === 'full' || 
                      (joinFeesPaymentType === 'custom' && customJoinFeesAmount > 0)) && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                        <Text strong>भुगतान सारांश:</Text>
                        <div className="mt-1">
                          <Text>कुल नामांकन शुल्क: ₹{memberJoinFees}</Text>
                          <br />
                          <Text type="success">
                            भुगतान राशि: ₹
                            {joinFeesPaymentType === 'full' 
                              ? memberJoinFees 
                              : customJoinFeesAmount || 0}
                          </Text>
                          {joinFeesPaymentType === 'custom' && 
                           customJoinFeesAmount > 0 && 
                           customJoinFeesAmount < memberJoinFees && (
                            <>
                              <br />
                              <Text type="danger">
                                बकाया राशि: ₹{memberJoinFees - customJoinFeesAmount}
                              </Text>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )
              }
            </Form.Item>
            <Divider orientation="left">सदस्यता समाप्ति</Divider>
<Card size="small">
  <Row gutter={16}>
    <Col span={24}>
      <Form.Item
        name="closingMonths"
        label="सदस्यता समाप्ति महीने (Membership Closing Months)"
        tooltip="कितने महीनों बाद यह सदस्य बंद/निष्क्रिय हो जाएगा?"
        rules={[
          { 
            validator: (_, value) => {
              if (value && (value < 0 || value > 120)) {
                return Promise.reject(new Error('कृपया 0 से 120 महीनों के बीच मान दर्ज करें'));
              }
              return Promise.resolve();
            }
          }
        ]}
      >
        <Input
          type="number"
          size="large"
          placeholder="महीनों की संख्या दर्ज करें (उदा: 6, 12, 24)"
          prefix={<CalendarOutlined />}
          suffix="महीने"
     
        />
      </Form.Item>
    </Col>
  </Row>
</Card>
          </Form>
        </Modal>

        {/* Reject Modal */}
        <Modal
          title="Reject Member Request"
          open={rejectModalVisible}
          onCancel={() => setRejectModalVisible(false)}
      footer={[
  <Button key="cancel" onClick={() => {
    setAcceptModalVisible(false);
    setJoinFeesPaymentType(null);
    setCustomJoinFeesAmount(1100);  // Change from 0 to 1100
    acceptForm.resetFields();
    acceptForm.setFieldsValue({
      customJoinFeesAmount: 1100    // Add this to reset to 1100
    });
  }}>
    Cancel
  </Button>,
  <Button 
    key="accept" 
    type="primary" 
    loading={acceptLoading}
    onClick={handleAccept}
    icon={<FiCheck />}
    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
  >
    Accept Member
  </Button>
]}
        >
          <Form form={rejectForm} layout="vertical">
            <Form.Item
              name="rejectReason"
              label="Reason for Rejection"
              rules={[
                { required: true, message: 'Please provide a reason for rejection' },
                { min: 10, message: 'Reason should be at least 10 characters long' }
              ]}
            >
              <TextArea
                placeholder="Please provide the reason for rejecting this member request..."
                rows={4}
                maxLength={500}
                showCount
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Remove Modal */}
        <Modal
          title="Remove Request"
          open={removeModalVisible}
          onCancel={() => setRemoveModalVisible(false)}
          footer={[
            <Button key="cancel" onClick={() => setRemoveModalVisible(false)}>
              Cancel
            </Button>,
            <Button 
              key="remove" 
              danger 
              onClick={handleRemove}
              icon={<FiTrash2 />}
            >
              Remove Request
            </Button>
          ]}
        >
          <p>Are you sure you want to remove this request? This action cannot be undone.</p>
        </Modal>

        {/* Other Modals */}
        <MemberDetailsView 
          isModalVisible={detailsView} 
          handleCloseModal={() => setDetailsView(false)}  
          selectedMember={selectedMember}  
        />

        <EditMember 
          memberData={selectedMember} 
          programId={selectedMember?.programId} 
          onSuccess={getPendingMembersFromAllPrograms} 
          setOpen={setIsEditMember} 
          open={isEditmember} 
        />
      </Drawer>
    </>
  );
};

export default memo(RequestSection);