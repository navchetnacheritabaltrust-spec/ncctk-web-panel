'use client'
import { Button, Card, Descriptions, Modal, Typography, Tabs, Table, Tooltip, App, Tag, Space, Divider, Badge, Drawer } from 'antd'
import React, { useState, useEffect } from 'react'
import { EyeOutlined, DeleteOutlined, DollarOutlined, CalendarOutlined, IdcardOutlined, UserOutlined, PhoneOutlined, TagOutlined } from '@ant-design/icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';
import { db } from '@/lib/firebase';
import { toggleMemberBlockStatus } from '@/lib/helper';
import { useAuth } from '@/lib/AuthProvider';
import { setgetMemberDataChange } from '@/redux/slices/commonSlice';
import { getData } from '@/lib/services/firebaseService';
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const dummyImg = "https://cdn2.iconfinder.com/data/icons/business-and-finance-related-hand-gestures/256/face_female_blank_user_avatar_mannequin-512.png";

function MemberDetailsView({isModalVisible, handleCloseModal, showDeleteConfirm, selectedMember}) {
  const [memberTransactions, setMemberTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  
  const { user } = useAuth();
  const dispatch = useDispatch();
  const selectedProgram = useSelector((state) => state.data.selectedProgram);
  const { message } = App.useApp();

  // Fetch member transactions when modal opens
  useEffect(() => {
    if (isModalVisible && selectedMember?.id && selectedProgram?.id && user?.uid) {
      fetchMemberTransactions();
    }
  }, [isModalVisible, selectedMember, selectedProgram, user]);

  const fetchMemberTransactions = async () => {
    if (!user?.uid || !selectedProgram?.id || !selectedMember?.id) return;

    setLoadingTransactions(true);
    try {
      const data = await getData(
        `/users/${user.uid}/programs/${selectedProgram.id}/transactions`,
        [
          { field: 'payerId', operator: '==', value: selectedMember.id },
          { field: 'active_flag', operator: '==', value: true },
          { field: 'delete_flag', operator: '==', value: false }
        ],
        { field: 'createdAt', direction: 'desc' }
      );
      setMemberTransactions(data);
    } catch (error) {
      console.error('Error fetching member transactions:', error);
      message.error('Failed to load transaction history');
    } finally {
      setLoadingTransactions(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return moment(date).format('DD/MM/YYYY');
  };

  const columns = [
    {
      title: "TRX ID",
      dataIndex: "transactionNumber",
      key: "transactionNumber",
      width: 140,
      sorter: (a, b) =>
        (a.transactionNumber || "").localeCompare(b.transactionNumber || ""),
      render: (value, record) => (
        <Button
          type="link"
          onClick={() => handleView(record)}
          className="p-0 text-xs text-blue-600"
        >
          {value}
        </Button>
      ),
    },
    {
      title: "Date",
      dataIndex: "paymentDate",
      key: "paymentDate",
      width: 100,
      sorter: (a, b) =>
        dayjs(a.paymentDate).unix() - dayjs(b.paymentDate).unix(),
      render: (value) =>
        value ? dayjs(value).format("DD/MM/YY") : "-",
    },
    {
      title: "Payer",
      key: "payer",
      width: 140,
      sorter: (a, b) =>
        (a.payerName || "").localeCompare(b.payerName || ""),
      render: (_, record) => (
        <div className="text-xs">
          <div className="font-medium truncate">
            {record.payerName || "-"}
          </div>
          <div className="text-gray-500 truncate">
            {record.payerRegistrationNumber || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Beneficiary",
      key: "beneficiary",
      width: 140,
      sorter: (a, b) =>
        (a.marriageMemberName || "").localeCompare(b.marriageMemberName || ""),
      render: (_, record) => (
        <div className="text-xs">
          <div className="font-medium truncate">
            {record.marriageMemberName || "-"}
          </div>
          <div className="text-gray-500 truncate">
            {record.marriageRegistrationNumber || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      width: 100,
      align: "right",
      sorter: (a, b) => (a.amount || 0) - (b.amount || 0),
      render: (value) => (
        <span style={{ fontWeight: "bold", color: "#52c41a" }}>
          ₹{value?.toLocaleString("en-IN") || "0"}
        </span>
      ),
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      width: 100,
      filters: [
        { text: "Cash", value: "cash" },
        { text: "Online", value: "online" },
      ],
      onFilter: (value, record) =>
        record.paymentMethod === value,
      render: (method) => {
        const color = method === "cash" ? "green" : "blue";
        return (
          <Tag color={color} className="capitalize text-xs">
            {method === "cash" ? "Cash" : "Online"}
          </Tag>
        );
      },
    },
    {
      title: "Reference",
      dataIndex: "onlineReference",
      key: "onlineReference",
      width: 140,
      render: (value) => {
        if (!value) return "-";
        return (
          <Tooltip title={value}>
            <div className="text-xs font-mono truncate">
              {value.length > 15
                ? `${value.substring(0, 12)}...`
                : value}
            </div>
          </Tooltip>
        );
      },
    }
  ];

  // Calculate total amount
  const calculateTotalAmount = () => {
    return memberTransactions.reduce((total, t) => total + (t.amount || 0), 0);
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const [day, month, year] = birthDate.split('-').map(Number);
    const dob = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const blockMember = async () => {
    setIsBlocking(true);
    try {
      await toggleMemberBlockStatus(user.uid, selectedProgram.id, selectedMember.id, selectedMember?.agentId, message);
      setIsBlocking(false);
      dispatch(setgetMemberDataChange(true));
      handleCloseModal();
    } catch (error) {
      console.log(error);
      message.error("Failed to block/unblock member");
    }
  };

  // Calculate membership closing date if closingMonths is set
  const getMembershipClosingDate = () => {
    if (!selectedMember?.closingMonths || selectedMember?.closingMonths === 0) {
      return 'No closing date set';
    }
    const joinDate = selectedMember?.dateJoin ? dayjs(selectedMember.dateJoin, 'DD-MM-YYYY') : dayjs();
    const closingDate = joinDate.add(selectedMember.closingMonths, 'month');
    return closingDate.format('DD-MM-YYYY');
  };

  // Check if membership is expired
  const isMembershipExpired = () => {
    if (!selectedMember?.closingMonths || selectedMember?.closingMonths === 0) {
      return false;
    }
    const joinDate = selectedMember?.dateJoin ? dayjs(selectedMember.dateJoin, 'DD-MM-YYYY') : dayjs();
    const closingDate = joinDate.add(selectedMember.closingMonths, 'month');
    return dayjs().isAfter(closingDate);
  };

  // Get join fees payment status color
  const getJoinFeesStatusColor = () => {
    if (!selectedMember?.joinFeesDone) return 'red';
    if (selectedMember?.joinFeesRemainingAmount > 0) return 'orange';
    return 'green';
  };

  // Get join fees status text
  const getJoinFeesStatusText = () => {
    if (!selectedMember?.joinFeesDone) return 'Pending';
    if (selectedMember?.joinFeesRemainingAmount > 0) return 'Partial';
    return 'Paid';
  };

  const handleView = (record) => {
    // Handle view transaction details
    console.log('View transaction:', record);
  };

  return (
    <Drawer
      title={<Title level={3}>Member Details</Title>}
      open={isModalVisible}
      onClose={handleCloseModal}
      footer={[
        <Button key="close" onClick={handleCloseModal} className="rounded-md mr-2">
          Close
        </Button>,
        <Button 
          loading={isBlocking} 
          onClick={blockMember} 
          type='primary'  
          className={selectedMember?.active_flag === false && selectedMember?.status == 'blocked' ? "!bg-green-700" : "!bg-red-700"}
        >
          {selectedMember?.active_flag == false && selectedMember?.status == 'blocked' 
            ? "Unblock Member" 
            : "Block Member"}
        </Button>
      ]}
      width={1200}
      className="rounded-lg"
    >
      {selectedMember && (
        <Tabs defaultActiveKey="1" animated>
          <TabPane tab="Basic Info" key="1">
            <Card className="rounded-lg mb-4">
              <div className="flex items-start space-x-4">
                <div className='flex flex-col gap-2'>
                  <img
                    src={selectedMember.photoURL || dummyImg}
                    alt={selectedMember.displayName}
                    className="rounded-lg w-[150px] h-[160px] object-cover"
                  />
                  {selectedMember.extraImageURL && (
                    <div>
                      <img
                        src={selectedMember.extraImageURL}
                        alt="Guardian"
                        className="rounded-lg w-[150px] h-[160px] object-cover"
                      />
                      <h3 className='text-[12px] font-semibold text-center'>Guardian Image</h3>
                    </div>
                  )}
                </div>
               
                <div className='flex-grow'>
                  <Descriptions layout="vertical" bordered column={2} size='small'>
                    <Descriptions.Item label="Application Number">
                      <Badge status="processing" text={selectedMember.applicationNumber || '-'} />
                    </Descriptions.Item>
                    <Descriptions.Item label="Registration Number">{selectedMember.registrationNumber}</Descriptions.Item>
                    <Descriptions.Item label="Name">{selectedMember.displayName}</Descriptions.Item>
                    <Descriptions.Item label="Father Name">{selectedMember.fatherName || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Surname/Jati">{selectedMember.jati || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Gotra">{selectedMember.gotra || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Phone">{selectedMember.phone}</Descriptions.Item>
                    <Descriptions.Item label="Alternative Phone">{selectedMember.phoneAlt || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Aadhaar Number">{selectedMember.aadhaarNo || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Guardian Aadhaar">{selectedMember.guardianAadharNo || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Password">{selectedMember.password || '-'}</Descriptions.Item>
                  </Descriptions>
                </div>
              </div>
            </Card>

            {/* Payment Information Card */}
            <Card className="rounded-lg mb-4" title="Payment Information" size="small">
              <Descriptions layout="vertical" bordered column={3} size='small'>
                <Descriptions.Item label="Pay Amount">
                  <Tag color="green" className="text-base font-bold">₹{selectedMember.payAmount || 0}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Join Fees">
                  <Tag color="blue" className="text-base font-bold">₹{selectedMember.joinFees || 0}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Join Fees Status">
                  <Badge 
                    status={getJoinFeesStatusColor()} 
                    text={getJoinFeesStatusText()}
                  />
                </Descriptions.Item>
                {selectedMember.joinFeesDone && (
                  <>
                    <Descriptions.Item label="Join Fees Payment Type">
                      <Tag color="purple">
                        {selectedMember.joinFeesPaymentType === 'full' ? 'Full Paid' : 'Custom Paid'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Join Fees Paid Amount">
                      <Tag color="green">₹{selectedMember.joinFeesPaidAmount || 0}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Join Fees Remaining">
                      <Tag color="orange">₹{selectedMember.joinFeesRemainingAmount || 0}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Join Fees Transaction ID" span={3}>
                      <Text copyable>{selectedMember.joinFeesTxtId || '-'}</Text>
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>
            </Card>

            {/* Age and Program Information Card */}
            <Card className="rounded-lg mb-4" title="Age & Program Information" size="small">
              <Descriptions layout="vertical" bordered column={3} size='small'>
                <Descriptions.Item label="Date of Birth">{selectedMember.bobDate}</Descriptions.Item>
                <Descriptions.Item label="Date Joined">{selectedMember.dateJoin}</Descriptions.Item>
                <Descriptions.Item label="Age">
                  {calculateAge(selectedMember.bobDate)} years
                </Descriptions.Item>
                <Descriptions.Item label="Age Group Range" span={2}>
                  {selectedMember.ageGroupRange || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Program Name">
                  {selectedMember.programName || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Location Group">
                  {selectedMember.locationGroup || '-'}
                </Descriptions.Item>
                <Descriptions.Item label="Member Group">
                  {selectedMember.memberGroup || '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Membership Status Card */}
            <Card className="rounded-lg mb-4" title="Membership Status" size="small">
              <Descriptions layout="vertical" bordered column={3} size='small'>
                <Descriptions.Item label="Membership Closing Months">
                  {selectedMember.closingMonths ? `${selectedMember.closingMonths} months` : 'No closing date'}
                </Descriptions.Item>
                <Descriptions.Item label="Membership Closing Date">
                  {getMembershipClosingDate()}
                </Descriptions.Item>
                <Descriptions.Item label="Membership Status">
                  {isMembershipExpired() ? (
                    <Badge status="error" text="Expired" />
                  ) : (
                    <Badge status="success" text="Active" />
                  )}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </TabPane>
          
          <TabPane tab="Additional Details" key="2">
            <Descriptions layout="vertical" bordered column={3} size='small'>
              <Descriptions.Item label="Guardian Name">{selectedMember.guardian || '-'}</Descriptions.Item>
              <Descriptions.Item label="Guardian Relation">{selectedMember.guardianRelation || '-'}</Descriptions.Item>
              <Descriptions.Item label="Gender">{selectedMember.gender || '-'}</Descriptions.Item>
              <Descriptions.Item label="Added By">{selectedMember.addedBy || '-'}</Descriptions.Item>
              <Descriptions.Item label="Added By Name">{selectedMember.addedByName || '-'}</Descriptions.Item>
              <Descriptions.Item label="Agent ID">
                {selectedMember.agentId ? selectedMember.agentId : 
                  selectedMember.addedBy === 'self' ? "Self Joined" : 'Admin'}
              </Descriptions.Item>
              <Descriptions.Item label="Village">{selectedMember.village || '-'}</Descriptions.Item>
              <Descriptions.Item label="State">{selectedMember.state || '-'}</Descriptions.Item>
              <Descriptions.Item label="District">{selectedMember.district || '-'}</Descriptions.Item>
              <Descriptions.Item label="Pin Code">{selectedMember.pinCode || '-'}</Descriptions.Item>
              <Descriptions.Item label="Current Address" span={2}>{selectedMember.currentAddress || '-'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge 
                  status={selectedMember.active_flag ? "success" : "error"} 
                  text={selectedMember.active_flag ? "Active" : "Inactive"} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="Blocked">
                <Badge 
                  status={selectedMember.isBlocked ? "error" : "success"} 
                  text={selectedMember.isBlocked ? "Yes" : "No"} 
                />
              </Descriptions.Item>
              <Descriptions.Item label="Created At">
                {selectedMember.createdAt?.toDate?.()?.toLocaleString() || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Updated At">
                {selectedMember.updatedAt?.toDate?.()?.toLocaleString() || '-'}
              </Descriptions.Item>
            </Descriptions>

            {/* Extra Details Section */}
            {selectedMember.extraDetails && selectedMember.extraDetails.length > 0 && (
              <>
                <Divider orientation="left">Extra Information</Divider>
                <Descriptions layout="vertical" bordered column={3} size='small'>
                  {selectedMember.extraDetails.map((detail, index) => (
                    <Descriptions.Item key={index} label={detail.label}>
                      {detail.value}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              </>
            )}
          </TabPane>
          
          <TabPane tab="Documents" key="3">
            <div className="grid grid-cols-3 gap-2">
              {selectedMember.documentFrontURL && (
                <div className="relative">
                  <Title level={5}>Front Document</Title>
                  <img src={selectedMember.documentFrontURL} alt="Front" className="rounded-lg object-fill h-[200px] w-full" />
                  <Tooltip title="Full View" className='absolute top-8 right-2'>
                    <Button icon={<EyeOutlined />} onClick={() => window.open(selectedMember.documentFrontURL, '_blank')} />
                  </Tooltip>
                </div>
              )}
              {selectedMember.documentBackURL && (
                <div className="relative">
                  <Title level={5}>Back Document</Title>
                  <img src={selectedMember.documentBackURL} alt="Back" className="rounded-lg object-fill h-[200px] w-full" />
                  <Tooltip title="Full View" className='absolute top-8 right-2'>
                    <Button icon={<EyeOutlined />} onClick={() => window.open(selectedMember.documentBackURL, '_blank')} />
                  </Tooltip>
                </div>
              )}
              {selectedMember.guardianDocumentURL && (
                <div className="relative">
                  <Title level={5}>Guardian Document</Title>
                  <img src={selectedMember.guardianDocumentURL} alt="Guardian" className="rounded-lg object-fill h-[200px] w-full" />
                  <Tooltip title="Full View" className='absolute top-8 right-2'>
                    <Button icon={<EyeOutlined />} onClick={() => window.open(selectedMember.guardianDocumentURL, '_blank')} />
                  </Tooltip>
                </div>
              )}
            </div>
          </TabPane>
          
          <TabPane tab="Transactions" key="4">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <Title level={5}>Transaction History</Title>
                <div className="text-lg">
                  <span className="font-semibold">Total Paid: </span>
                  <span className="text-green-600 font-bold">₹{calculateTotalAmount().toFixed(2)}</span>
                </div>
              </div>
              
              <Table
                columns={columns}
                dataSource={memberTransactions}
                rowKey="id"
                loading={loadingTransactions}
                pagination={{ pageSize: 5 }}
                className="rounded-lg"
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: 'No transactions found for this member' }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={2} className="text-right font-bold">
                        Total Amount:
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} className="font-bold text-green-600">
                        ₹{calculateTotalAmount().toFixed(2)}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} colSpan={3}></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>
          </TabPane>

          <TabPane tab="Summary" key="5">
            <Card className="rounded-lg">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarOutlined className="text-blue-600" />
                      <Text strong>Payment Summary</Text>
                    </div>
                    <div className="space-y-1">
                      <div>💵 Monthly Pay Amount: <strong>₹{selectedMember.payAmount || 0}</strong></div>
                      <div>💰 Total Join Fees: <strong>₹{selectedMember.joinFees || 0}</strong></div>
                      {selectedMember.joinFeesDone && (
                        <>
                          <div>✅ Join Fees Paid: <strong>₹{selectedMember.joinFeesPaidAmount || 0}</strong></div>
                          {selectedMember.joinFeesRemainingAmount > 0 && (
                            <div>⚠️ Join Fees Remaining: <strong className="text-red-600">₹{selectedMember.joinFeesRemainingAmount}</strong></div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarOutlined className="text-green-600" />
                      <Text strong>Membership Summary</Text>
                    </div>
                    <div className="space-y-1">
                      <div>📅 Joined Date: <strong>{selectedMember.dateJoin}</strong></div>
                      {selectedMember.closingMonths ? (
                        <>
                          <div>⏰ Closing After: <strong>{selectedMember.closingMonths} months</strong></div>
                          <div>📆 Closing Date: <strong>{getMembershipClosingDate()}</strong></div>
                          <div>📊 Status: <Badge status={isMembershipExpired() ? "error" : "success"} text={isMembershipExpired() ? "Expired" : "Active"} /></div>
                        </>
                      ) : (
                        <div>📊 Status: <Badge status="success" text="Active (No closing date)" /></div>
                      )}
                    </div>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <IdcardOutlined className="text-purple-600" />
                      <Text strong>Identity Summary</Text>
                    </div>
                    <div className="space-y-1">
                      <div>🔢 Application Number: <strong>{selectedMember.applicationNumber || '-'}</strong></div>
                      <div>🆔 Registration Number: <strong>{selectedMember.registrationNumber}</strong></div>
                      <div>👤 Aadhaar: {selectedMember.aadhaarNo ? '✓ Verified' : '✗ Not provided'}</div>
                      <div>👥 Guardian Aadhaar: {selectedMember.guardianAadharNo ? '✓ Provided' : '✗ Not provided'}</div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <UserOutlined className="text-orange-600" />
                      <Text strong>Personal Summary</Text>
                    </div>
                    <div className="space-y-1">
                      <div>🧑 Name: <strong>{selectedMember.displayName}</strong></div>
                      <div>👨 Father: {selectedMember.fatherName}</div>
                      <div>🏘️ Village: {selectedMember.village}</div>
                      <div>📞 Phone: {selectedMember.phone}</div>
                    </div>
                  </div>
                </div>

                {/* Extra Details Summary */}
                {selectedMember.extraDetails && selectedMember.extraDetails.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TagOutlined className="text-gray-600" />
                      <Text strong>Additional Information</Text>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedMember.extraDetails.map((detail, index) => (
                        <div key={index} className="flex justify-between border-b pb-1">
                          <Text type="secondary">{detail.label}:</Text>
                          <Text strong>{detail.value}</Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabPane>
        </Tabs>
      )}
      
      {showDeleteConfirm && (
        <div className="flex justify-end mt-4">
          <Button
            onClick={() => showDeleteConfirm(selectedMember)}
            className="rounded-md bg-red-600 text-white"
            icon={<DeleteOutlined />}
          >
            Delete Member
          </Button>
        </div>
      )}
    </Drawer>
  )
}

export default MemberDetailsView;