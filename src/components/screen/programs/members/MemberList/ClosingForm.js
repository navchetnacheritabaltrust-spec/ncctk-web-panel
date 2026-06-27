import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Form,
  Input,
  Upload,
  DatePicker,
  Button,
  message,
  Spin,
  Card,
  Row,
  Col,
  Divider,
  Progress,
  Typography,
  Space,
  Alert,
  Tag,
  Select,
  Modal,
  Avatar,
  Badge,
  Switch
} from 'antd';
import { 
  UploadOutlined, 
  CloseOutlined, 
  CheckOutlined,
  UserOutlined,
  CalendarOutlined,
  FileImageOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  EditOutlined,
  EyeOutlined,
  TeamOutlined,
  PlusOutlined,
  SwapOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { 
  doc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  writeBatch,
  getDocs,
  query, 
  where, 
  getDoc,
  addDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '@/lib/firebase';
import { updateCounts } from '@/lib/helper';

const { Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ClosingForm = ({ open, onClose, memberData, user, selectedProgram, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [creatingPayments, setCreatingPayments] = useState(false);
  const [paymentProgress, setPaymentProgress] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [processedMembers, setProcessedMembers] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingPaymentCount, setExistingPaymentCount] = useState(0);
  const [existingData, setExistingData] = useState(null);
  
  // Closing group states
  const [closingGroups, setClosingGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [previousGroupId, setPreviousGroupId] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [changingGroup, setChangingGroup] = useState(false);

  // Fetch closing groups
  useEffect(() => {
    const fetchClosingGroups = async () => {
      if (!user || !selectedProgram || !open) return;
      
      try {
        const groupsRef = collection(
          db,
          `users/${user.uid}/programs/${selectedProgram.id}/closing_groups`
        );
        const groupsSnapshot = await getDocs(groupsRef);
        const groups = groupsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClosingGroups(groups);
      } catch (error) {
        console.error('Error fetching closing groups:', error);
      }
    };
    
    fetchClosingGroups();
  }, [user, selectedProgram, open]);

  // Check existing marriage
  useEffect(() => {
    const checkExistingMarriage = async () => {
      if (!memberData || !user || !selectedProgram) return;
      
      try {
        if (memberData.marriage_flag) {
          setIsEditMode(true);
          setExistingData({
            marriage_date: memberData.closing_date,
            closingNotes: memberData.closingNotes || '',
            invitationCardURL: memberData.invitationCardURL || '',
            closingGroupId: memberData.closingGroupId || null
          });
          
          if (memberData.invitationCardURL) {
            setExistingImageUrl(memberData.invitationCardURL);
          }
          
          if (memberData.closingGroupId) {
            setSelectedGroupId(memberData.closingGroupId);
            setPreviousGroupId(memberData.closingGroupId);
          }
          
          const paymentPendingRef = collection(
            db,
            `users/${user.uid}/programs/${selectedProgram.id}/payment_pending`
          );
          
          const paymentQuery = query(
            paymentPendingRef,
            where('closingMemberId', '==', memberData.id)
          );
          
          const paymentSnapshot = await getDocs(paymentQuery);
          setExistingPaymentCount(paymentSnapshot.size);
        } else {
          setIsEditMode(false);
          setExistingData(null);
          setExistingImageUrl(null);
          setSelectedGroupId(null);
          setPreviousGroupId(null);
        }
      } catch (error) {
        console.error('Error checking existing marriage:', error);
      }
    };
    
    if (open) {
      checkExistingMarriage();
    }
  }, [open, memberData, user, selectedProgram]);

  // Create new group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      message.error('Please enter a group name');
      return;
    }
    
    try {
      setCreatingGroup(true);
      
      const groupsRef = collection(
        db,
        `users/${user.uid}/programs/${selectedProgram.id}/closing_groups`
      );
      
      const newGroup = {
        name: newGroupName.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        memberCount: 0,
        members: [],
        programId: selectedProgram.id,
        status: 'active'
      };
      
      const docRef = await addDoc(groupsRef, newGroup);
      
      const createdGroup = {
        id: docRef.id,
        ...newGroup
      };
      
      setClosingGroups([...closingGroups, createdGroup]);
      setSelectedGroupId(docRef.id);
      setNewGroupName('');
      setGroupModalVisible(false);
      message.success('Group created! Select it to add this member');
      
    } catch (error) {
      console.error('Error creating group:', error);
      message.error('Failed to create group');
    } finally {
      setCreatingGroup(false);
    }
  };

  // Add member to group - FIXED: No serverTimestamp in arrayUnion
  const addMemberToGroup = async (groupId, marriageDate) => {
    try {
      const groupRef = doc(
        db,
        `users/${user.uid}/programs/${selectedProgram.id}/closing_groups`,
        groupId
      );
      
      const groupSnap = await getDoc(groupRef);
      
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const currentMembers = groupData.members || [];
        
        // Check if member already exists
        const memberExists = currentMembers.some(m => m.memberId === memberData.id);
        
        if (!memberExists) {
          // Create member object WITHOUT serverTimestamp()
          const newMember = {
            memberId: memberData.id,
            name: memberData.displayName || memberData.name,
            registrationNumber: memberData.registrationNumber,
            fatherName: memberData.fatherName,
            village: memberData.village,
            district: memberData.district,
            phone: memberData.phone || memberData.phoneNo,
            marriageDate: marriageDate ? marriageDate.format('DD-MM-YYYY') : memberData.marriage_date,
            closedAt: dayjs().format('DD-MM-YYYY HH:mm:ss'), // Use dayjs instead of serverTimestamp
            status: 'closed'
          };
          
          // First update the group with arrayUnion
          await updateDoc(groupRef, {
            members: arrayUnion(newMember),
            memberCount: currentMembers.length + 1,
            updatedAt: serverTimestamp() // serverTimestamp is fine here directly in updateDoc
          });
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error adding member to group:', error);
      return false;
    }
  };

  // Remove member from old group (for edit mode)
  const removeMemberFromGroup = async (groupId) => {
    try {
      const groupRef = doc(
        db,
        `users/${user.uid}/programs/${selectedProgram.id}/closing_groups`,
        groupId
      );
      
      const groupSnap = await getDoc(groupRef);
      
      if (groupSnap.exists()) {
        const groupData = groupSnap.data();
        const currentMembers = groupData.members || [];
        
        // Find the member to remove
        const memberToRemove = currentMembers.find(m => m.memberId === memberData.id);
        
        if (memberToRemove) {
          // Remove using arrayRemove with the exact object
          await updateDoc(groupRef, {
            members: arrayRemove(memberToRemove),
            memberCount: currentMembers.length - 1,
            updatedAt: serverTimestamp()
          });
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error removing member from group:', error);
      return false;
    }
  };

  // Update member's group in edit mode
  const updateMemberGroup = async (newGroupId, marriageDate) => {
    try {
      setChangingGroup(true);
      
      // Remove from old group if exists
      if (previousGroupId && previousGroupId !== newGroupId) {
        await removeMemberFromGroup(previousGroupId);
        message.info(`Removed from previous group`);
      }
      
      // Add to new group
      if (newGroupId) {
        const added = await addMemberToGroup(newGroupId, marriageDate);
        if (added) {
          message.success(`Added to new group: ${closingGroups.find(g => g.id === newGroupId)?.name}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating member group:', error);
      message.error('Failed to update group');
      return false;
    } finally {
      setChangingGroup(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      
      let invitationCardURL = existingImageUrl || '';
      
      if (imageFile) {
        if (isEditMode && existingImageUrl) {
          try {
            await deleteOldImage(existingImageUrl);
          } catch (error) {
            console.warn('Could not delete old image:', error);
          }
        }
        invitationCardURL = await uploadInvitationCard(imageFile);
      }
      
      const marriageDate = values.marriageDate;
      
      const updateData = { 
        marriage_flag: true,
        closing_date: marriageDate.format('DD-MM-YYYY'),
        marriage_date: marriageDate.format('DD-MM-YYYY'),
        closing_date_query: marriageDate.format('YYYY-MM-DD'),
        closing_datetime: marriageDate.toISOString(),
        closingAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(invitationCardURL && { invitationCardURL }),
        ...(values.notes && { closingNotes: values.notes })
      };
      
      // Handle group changes in edit mode
      let groupChanged = false;
      if (isEditMode && selectedGroupId !== previousGroupId) {
        groupChanged = true;
        const success = await updateMemberGroup(selectedGroupId, marriageDate);
        if (!success) {
          throw new Error('Failed to update group membership');
        }
      }
      
      // Add group info to member document
      if (selectedGroupId) {
        const selectedGroup = closingGroups.find(g => g.id === selectedGroupId);
        updateData.closingGroupId = selectedGroupId;
        updateData.closingGroupName = selectedGroup?.name || '';
      } else if (isEditMode && !selectedGroupId && previousGroupId) {
        // User removed the group in edit mode
        await removeMemberFromGroup(previousGroupId);
        updateData.closingGroupId = null;
        updateData.closingGroupName = null;
        message.info('Member removed from group');
      }

      // Update member document
      const memberRef = doc(
        db, 
        `users/${user.uid}/programs/${selectedProgram?.id}/members`, 
        memberData.id
      );
      
      await updateDoc(memberRef, updateData);
      
      // For new closing (not edit mode), add to group after closing
      if (!isEditMode && selectedGroupId) {
        const added = await addMemberToGroup(selectedGroupId, marriageDate);
        if (added) {
          message.success('Member added to group successfully!');
        }
      }
      
      // Create payment entries only for new closing
      if (!isEditMode) {
        await updateCounts(user.uid, selectedProgram?.id, memberData.agentId, Number(-1));
        setCreatingPayments(true);
        // await createPaymentPendingEntries(memberData.id, selectedProgram?.id, user.uid);
      }
      
      if (groupChanged) {
        message.success('Marriage details and group updated successfully!');
      } else {
        message.success(isEditMode ? 'Marriage details updated!' : 'Marriage case closed successfully!');
      }
      
      // Reset form
      form.resetFields();
      setImageFile(null);
      setImagePreview(null);
      setSelectedGroupId(null);
      setPreviousGroupId(null);
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      message.error('Failed: ' + error.message);
    } finally {
      setLoading(false);
      setCreatingPayments(false);
      setChangingGroup(false);
    }
  };

  const createPaymentPendingEntries = async (closingMemberId, programId, userId) => {
    try {
      const membersCollectionRef = collection(
        db, 
        `users/${userId}/programs/${programId}/members`
      );
      
      const acceptedQuery = query(
        membersCollectionRef,
        where('status', '==', 'accepted')
      );
      
      const acceptedSnapshot = await getDocs(acceptedQuery);
      let acceptedMembers = acceptedSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(member => member.id !== closingMemberId);
      
      const closingMemberRef = doc(db, `users/${userId}/programs/${programId}/members`, closingMemberId);
      const closingMemberSnap = await getDoc(closingMemberRef);
      const closingMemberData = closingMemberSnap.data();
      
      const total = acceptedMembers.length;
      setTotalMembers(total);
      
      if (total === 0) {
        message.info('No other accepted members found');
        return;
      }
      
      const batch = writeBatch(db);
      let processed = 0;
      
      for (const member of acceptedMembers) {
        const paymentId = `${closingMemberId}_${member.id}`;
        const paymentPendingRef = doc(
          db,
          `users/${userId}/programs/${programId}/payment_pending`,
          paymentId
        );
        
        const paymentData = {
          closingMemberId: closingMemberId,
          memberId: member.id,
          memberDetails: {
            displayName: member.displayName || member.name || 'N/A',
            registrationNumber: member.registrationNumber || 'N/A',
            fatherName: member.fatherName || 'N/A',
            phone: member.phone || member.phoneNo || 'N/A',
            village: member.village || 'N/A',
            district: member.district || 'N/A',
            agentId: member.agentId
          },
          status: 'pending',
          payAmount: 200,
          programId: programId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          delete_flag: false,
          dueDate: dayjs().add(30, 'days').format('DD-MM-YYYY'),
          paymentFor: closingMemberData?.displayName || 'Marriage Case',
          paymentType: 'contribution',
          ...(selectedGroupId && { closingGroupId: selectedGroupId })
        };
        
        batch.set(paymentPendingRef, paymentData);
        processed++;
        setProcessedMembers(processed);
        setPaymentProgress(Math.round((processed / total) * 100));
      }
      
      await batch.commit();
      message.success(`${total} payment entries created!`);
      
    } catch (error) {
      console.error('Error creating payments:', error);
      throw error;
    } finally {
      setCreatingPayments(false);
    }
  };

  const uploadInvitationCard = async (file) => {
    try {
      setUploading(true);
      const fileExtension = file.name.split('.').pop();
      const fileName = `invitation_${memberData.id}_${uuidv4()}.${fileExtension}`;
      
      const storageRef = ref(
        storage, 
        `users/${user.uid}/programs/${selectedProgram?.id}/members/${memberData.id}/invitation_cards/${fileName}`
      );
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const deleteOldImage = async (imageUrl) => {
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch (error) {
      console.warn('Error deleting old image:', error);
    }
  };

  const handleFileChange = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Only image files allowed!');
      return false;
    }
    
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('Image must be smaller than 5MB!');
      return false;
    }
    
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    return false;
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleRemoveExistingImage = () => {
    setExistingImageUrl(null);
    form.setFieldsValue({ invitationCard: null });
  };

  const uploadProps = {
    beforeUpload: handleFileChange,
    maxCount: 1,
    showUploadList: false,
    accept: 'image/*'
  };

  const handleClose = () => {
    if (!creatingPayments && !changingGroup) {
      form.resetFields();
      setImageFile(null);
      setImagePreview(null);
      setPaymentProgress(0);
      setProcessedMembers(0);
      setIsEditMode(false);
      setExistingData(null);
      setExistingImageUrl(null);
      setSelectedGroupId(null);
      setPreviousGroupId(null);
      onClose();
    }
  };

  const disableMarriageDate = (current) => {
    if (isEditMode) return false;
    return current && current < dayjs().startOf('day');
  };

  useEffect(() => {
    if (existingData && open) {
      form.setFieldsValue({
        marriageDate: existingData.marriage_date ? dayjs(existingData.marriage_date, 'DD-MM-YYYY') : null,
        notes: existingData.closingNotes || ''
      });
    }
  }, [existingData, form, open]);

  return (
    <>
      <Drawer
        title={
          <div style={{ fontSize: '16px', fontWeight: 600 }}>
            {isEditMode ? '✏️ Edit Closing Member' : '💍 Close Member'}
          </div>
        }
        open={open}
        onClose={handleClose}
        width={480}
        destroyOnHidden
        closable={!creatingPayments && !changingGroup}
        maskClosable={!creatingPayments && !changingGroup}
        footer={
          creatingPayments || changingGroup ? null : (
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={handleClose} disabled={loading}>Cancel</Button>
                <Button
                  type="primary"
                  onClick={() => form.submit()}
                  loading={loading}
                  icon={isEditMode ? <EditOutlined /> : <CheckOutlined />}
                  disabled={uploading}
                >
                  {isEditMode ? 'Update' : 'Confirm'}
                </Button>
              </Space>
            </div>
          )
        }
      >
        <Spin spinning={loading && !creatingPayments}>
          <div style={{ height: 'calc(100vh - 140px)', overflowY: 'auto', paddingRight: '4px' }}>
            
            {/* Compact Member Info */}
            <div style={{ 
              background: '#f0f2f5', 
              padding: '12px', 
              borderRadius: '8px', 
              marginBottom: '16px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>{memberData?.displayName || memberData?.name}</Text>
                    <Tag color={isEditMode ? "green" : "blue"} style={{ margin: 0 }}>
                      {isEditMode ? "Closed" : "Active"}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Reg: {memberData?.registrationNumber} | {memberData?.fatherName}
                  </Text>
                </div>
              </div>
            </div>

            {/* Payment Progress */}
            {creatingPayments && (
              <div style={{ 
                background: '#e6f7ff', 
                padding: '12px', 
                borderRadius: '8px', 
                marginBottom: '16px',
                border: '1px solid #91d5ff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <DollarOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: '13px' }}>Creating Payments...</Text>
                    <Progress percent={paymentProgress} size="small" style={{ margin: '8px 0' }} />
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {processedMembers} of {totalMembers} processed
                    </Text>
                  </div>
                </div>
              </div>
            )}

            {/* Group Change Indicator in Edit Mode */}
            {isEditMode && previousGroupId && selectedGroupId !== previousGroupId && (
              <div style={{ 
                background: '#fff7e6', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                marginBottom: '12px',
                border: '1px solid #ffd591'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SwapOutlined style={{ color: '#fa8c16' }} />
                  <Text style={{ fontSize: '12px' }}>
                    Changing group from <Tag size="small">{closingGroups.find(g => g.id === previousGroupId)?.name}</Tag>
                    to <Tag color="orange" size="small">{closingGroups.find(g => g.id === selectedGroupId)?.name || 'No Group'}</Tag>
                  </Text>
                </div>
              </div>
            )}

            <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle">
              
              {/* Group Selection - Always editable in edit mode */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <TeamOutlined style={{ marginRight: '8px', color: '#666' }} />
                  <Text strong>Closing Group</Text>
                  <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                    {isEditMode ? '(Changeable in edit mode)' : '(Optional)'}
                  </Text>
                </div>
                
                <Select
                  placeholder="Select or create group"
                  allowClear
                  value={selectedGroupId}
                  onChange={setSelectedGroupId}
                  style={{ width: '100%' }}
                  disabled={creatingPayments}
                  dropdownRender={(menu) => (
                    <div>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button
                        type="link"
                        icon={<PlusOutlined />}
                        onClick={() => setGroupModalVisible(true)}
                        style={{ width: '100%', textAlign: 'center' }}
                      >
                        Create New Group
                      </Button>
                    </div>
                  )}
                >
                  {closingGroups.map(group => (
                    <Option key={group.id} value={group.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{group.name}</span>
                        <Badge count={group.memberCount} showZero style={{ backgroundColor: '#52c41a' }} />
                      </div>
                    </Option>
                  ))}
                </Select>
                
                {/* Selected Group Display - Outside Dropdown */}
                {selectedGroupId && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px 12px', 
                    background: selectedGroupId !== previousGroupId && isEditMode ? '#fff7e6' : '#f6ffed', 
                    borderRadius: '6px',
                    border: selectedGroupId !== previousGroupId && isEditMode ? '1px solid #ffd591' : '1px solid #b7eb8f'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          {isEditMode && selectedGroupId !== previousGroupId ? 'New Group:' : 'Selected Group:'}
                        </Text>
                        <div>
                          <Tag color={selectedGroupId !== previousGroupId && isEditMode ? "orange" : "green"} style={{ marginTop: '4px' }}>
                            {closingGroups.find(g => g.id === selectedGroupId)?.name}
                          </Tag>
                          {isEditMode && selectedGroupId !== previousGroupId && (
                            <Tag color="blue" icon={<SwapOutlined />} style={{ marginLeft: '8px' }}>
                              Will be updated
                            </Tag>
                          )}
                        </div>
                      </div>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {closingGroups.find(g => g.id === selectedGroupId)?.memberCount || 0} members
                      </Text>
                    </div>
                    
                    {/* Show previous group info when changing */}
                    {isEditMode && previousGroupId && selectedGroupId !== previousGroupId && (
                      <div style={{ 
                        marginTop: '8px', 
                        paddingTop: '8px', 
                        borderTop: '1px dashed #ffd591',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <DeleteOutlined style={{ color: '#ff4d4f', fontSize: '12px' }} />
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          Will be removed from: {closingGroups.find(g => g.id === previousGroupId)?.name}
                        </Text>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Show current group when no change in edit mode */}
                {isEditMode && !selectedGroupId && previousGroupId && (
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px 12px', 
                    background: '#fff1f0', 
                    borderRadius: '6px',
                    border: '1px solid #ffccc7'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <DeleteOutlined style={{ color: '#ff4d4f' }} />
                      <div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>Current Group:</Text>
                        <div>
                          <Tag color="red">{closingGroups.find(g => g.id === previousGroupId)?.name}</Tag>
                          <Tag color="orange" style={{ marginLeft: '8px' }}>Will be removed</Tag>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Marriage Date */}
              <Form.Item
                label={
                  <span>
                    <CalendarOutlined style={{ marginRight: '8px', color: '#666' }} />
                    Closing Date <span style={{ color: 'red' }}>*</span>
                  </span>
                }
                name="marriageDate"
                rules={[{ required: true, message: 'Please select date!' }]}
              >
                <DatePicker
                  format="DD-MM-YYYY"
                  style={{ width: '100%' }}
                  placeholder="Select Closing date"
                
                />
              </Form.Item>

              {/* Invitation Card Upload - Compact */}
              <Form.Item
                label={
                  <span>
                    <FileImageOutlined style={{ marginRight: '8px', color: '#666' }} />
                    Invitation Card {!isEditMode && <span style={{ color: 'red' }}>*</span>}
                  </span>
                }
                name="invitationCard"
                rules={[{ required: !isEditMode, message: 'Please upload invitation card!' }]}
                extra={<Text type="secondary" style={{ fontSize: '11px' }}>Max 5MB, JPG/PNG</Text>}
              >
                <div>
                  {isEditMode && existingImageUrl && !imagePreview && (
                    <div style={{ 
                      border: '1px solid #d9d9d9', 
                      borderRadius: '6px', 
                      padding: '8px', 
                      marginBottom: '8px' 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>Current:</Text>
                        <Space size="small">
                          <Button size="small" onClick={() => window.open(existingImageUrl, '_blank')}>View</Button>
                          <Button size="small" danger onClick={handleRemoveExistingImage}>Remove</Button>
                        </Space>
                      </div>
                      <img src={existingImageUrl} alt="Current" style={{ width: '100%', height: '80px', objectFit: 'contain' }} />
                    </div>
                  )}
                  
                  {!imagePreview && !(isEditMode && existingImageUrl) ? (
                    <Upload.Dragger {...uploadProps} style={{ padding: '16px' }}>
                      <UploadOutlined style={{ fontSize: '24px', color: '#999', marginBottom: '8px' }} />
                      <p style={{ fontSize: '12px', margin: 0 }}>Click or drag to upload</p>
                    </Upload.Dragger>
                  ) : imagePreview && (
                    <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', padding: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>New:</Text>
                        <Button size="small" danger onClick={handleRemoveImage}>Remove</Button>
                      </div>
                      <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '80px', objectFit: 'contain' }} />
                    </div>
                  )}
                  
                  {uploading && (
                    <div style={{ textAlign: 'center', padding: '8px' }}>
                      <Spin size="small" /> <Text type="secondary" style={{ marginLeft: '8px' }}>Uploading...</Text>
                    </div>
                  )}
                </div>
              </Form.Item>

              {/* Notes */}
              <Form.Item label={<span><InfoCircleOutlined style={{ marginRight: '8px', color: '#666' }} />Notes</span>} name="notes">
                <TextArea rows={2} placeholder="Additional remarks..." maxLength={200} showCount />
              </Form.Item>
            </Form>
          </div>
        </Spin>
      </Drawer>

      {/* Create Group Modal */}
      <Modal
        title="New Closing Group"
        open={groupModalVisible}
        onOk={handleCreateGroup}
        onCancel={() => {
          setGroupModalVisible(false);
          setNewGroupName('');
        }}
        confirmLoading={creatingGroup}
        okText="Create"
        cancelText="Cancel"
        width={400}
      >
        <Form layout="vertical">
          <Form.Item label="Group Name" required>
            <Input
              placeholder="e.g., December Weddings, Family Group"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              maxLength={40}
              showCount
              autoFocus
            />
          </Form.Item>
          <Alert
            message={isEditMode ? "Member will be moved to this new group" : "Member will be added after closing"}
            type="info"
            showIcon
            style={{ fontSize: '12px' }}
          />
        </Form>
      </Modal>
    </>
  );
};

export default ClosingForm;