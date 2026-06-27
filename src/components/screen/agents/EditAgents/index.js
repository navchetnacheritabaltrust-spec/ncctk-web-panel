import React, { useEffect, useState } from 'react';
import { 
  UserOutlined, MailOutlined, PhoneOutlined, LockOutlined, 
  UploadOutlined, EditOutlined, UserAddOutlined, CloseOutlined ,FilePdfOutlined
} from '@ant-design/icons';
import { Button, DatePicker, Drawer, Form, Input, Select, Spin, Upload, message as antMessage, Card, Divider } from 'antd';
import { auth, db, storage } from '@/lib/firebase';
import { setDoc, doc, collection, getDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import dayjs from 'dayjs';

const { Option } = Select;

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", 
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const AgentManagement = ({ agentData = null, mode = 'add', onSuccess,isAgentDrawerVisible ,setIsAgentDrawerVisible}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [autoPassword, setAutoPassword] = useState('');
  const [isAutoPassword, setIsAutoPassword] = useState(true);
  const [fileList, setFileList] = useState([]);
  const [documentList, setDocumentList] = useState([]);
  const [signatureFileList, setSignatureFileList] = useState([]);
  const [initialLoading, setInitialLoading] = useState(false);

  const isEditMode = mode === 'edit' && agentData;

  function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    return Array(12).fill().map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }

  useEffect(() => {
    if (isAutoPassword && !isEditMode) {
      const pwd = generatePassword();
      setAutoPassword(pwd);
      form.setFieldsValue({ password: pwd });
    }
  }, [isAutoPassword, isEditMode]);

  // Load agent data when in edit mode
  useEffect(() => {
    if (isEditMode && isAgentDrawerVisible) {
      loadAgentData();
    }
  }, [isEditMode, isAgentDrawerVisible]);

  const loadAgentData = async () => {
    if (!agentData) return;
    
    setInitialLoading(true);
    try {
      // Set form values
      form.setFieldsValue({
        name: agentData.displayName || '',
        email: agentData.email || '',
        phone: agentData.phone || '',
        dateJoin: agentData.dateJoin ? dayjs(agentData.dateJoin) : dayjs(),
        agentCode: agentData.agentCode || '',
        oldAgentId: agentData.oldAgentId || '',
        address: agentData.address || '',
        city: agentData.city || '',
        state: agentData.state || '',
        pinCode: agentData.pinCode || ''
      });

      // Load existing photo
      if (agentData.photoURL) {
        setFileList([{
          uid: '-1',
          name: 'photo.jpg',
          status: 'done',
          url: agentData.photoURL
        }]);
      }

      // Load existing signature
      if (agentData.signatureURL) {
        setSignatureFileList([{
          uid: '-1',
          name: 'signature.jpg',
          status: 'done',
          url: agentData.signatureURL
        }]);
      }

      // Load existing documents
      if (agentData.documentURLs && agentData.documentURLs.length > 0) {
        const docs = agentData.documentURLs.map((url, index) => ({
          uid: `-${index + 1}`,
          name: `document-${index + 1}`,
          status: 'done',
          url: url
        }));
        setDocumentList(docs);
      }
    } catch (error) {
      console.error('Error loading agent data:', error);
      antMessage.error('Failed to load agent data');
    } finally {
      setInitialLoading(false);
    }
  };

  const showAgentDrawer = () => {
    setIsAgentDrawerVisible(true);
    if (!isEditMode) {
      form.setFieldsValue({ dateJoin: dayjs() });
      const pwd = generatePassword();
      setAutoPassword(pwd);
      form.setFieldsValue({ password: pwd });
    }
  };

  const closeAgentDrawer = () => {
    setIsAgentDrawerVisible(false);
    form.resetFields();
    setFileList([]);
    setDocumentList([]);
    setSignatureFileList([]);
    setIsAutoPassword(true);
  };

  const uploadFile = async (uid, file, path) => {
    if (!file) return '';
    
    // If file already has a URL (existing file), return it
    if (file.url && !file.originFileObj) {
      return file.url;
    }
    
    const storageRef = ref(storage, `agents/${uid}/${path}/${file.name}`);
    await uploadBytes(storageRef, file.originFileObj);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      const authToken = await currentUser.getIdToken();
      const adminUid = currentUser.uid;

      if (isEditMode) {
        // Edit mode - update existing agent
        await handleUpdate(values, adminUid);
      } else {
        // Add mode - create new agent
        await handleCreate(values, adminUid, authToken);
      }

    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} agent:`, error);
      antMessage.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} agent`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values, adminUid, authToken) => {
    // Check if email already exists
    const checkResponse = await fetch('/api/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'checkEmail',
        email: values.email
      }),
    });

    const checkData = await checkResponse.json();
    if (checkData.exists) {
      antMessage.error('An agent with this email already exists');
      return;
    }

    // Get password
    const password = isAutoPassword ? autoPassword : values.password;

    // Create agent user through API
    const createResponse = await fetch('/api/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        action: 'create',
        email: values.email,
        password: password,
        OrgData: {
          role: 'agent',
          displayName: values.name,
          createdBy: adminUid
        }
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      throw new Error(errorData.error || 'Failed to create agent user');
    }

    const { user: userRecord } = await createResponse.json();
    const agentUid = userRecord.uid;

    // Upload files
    let photoURL = '';
    let signatureURL = '';
    let documentURLs = [];

    if (fileList.length > 0) {
      photoURL = await uploadFile(agentUid, fileList[0], 'photo');
    }

    if (signatureFileList.length > 0) {
      signatureURL = await uploadFile(agentUid, signatureFileList[0], 'signature');
    }

    if (documentList.length > 0) {
      documentURLs = await Promise.all(
        documentList.map(file => uploadFile(agentUid, file, 'documents'))
      );
    }

    // Create agent subcollection under the admin user
    const agentRef = doc(collection(db, 'users', adminUid, 'agents'), agentUid);
    await setDoc(agentRef, {
      uid: agentUid,
      agentCode: values.agentCode || '',
      oldAgentId: values.oldAgentId || '',
      password: password,
      email: values.email,
      displayName: values.name || '',
      phone: values.phone || '',
      dateJoin: values.dateJoin ? values.dateJoin.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      address: values.address || '',
      city: values.city || '',
      state: values.state || '',
      pinCode: values.pinCode || '',
      photoURL: photoURL || '',
      signatureURL: signatureURL || '',
      documentURLs: documentURLs || [],
      createdAt: new Date(),
      createdBy: adminUid,
      active_flags: true,
      delete_flags: false,
      role: 'agent',
      status: 'active'
    });

    antMessage.success('Agent created successfully!');
    
    // Show password to admin
    antMessage.info({
      content: `Password for ${values.email}: ${password}`,
      duration: 10
    });

    if (onSuccess) onSuccess();
    closeAgentDrawer();
  };

  const handleUpdate = async (values, adminUid) => {
    const agentUid = agentData.uid;

    // Upload new files or keep existing URLs
    let photoURL = agentData.photoURL || '';
    let signatureURL = agentData.signatureURL || '';
    let documentURLs = agentData.documentURLs || [];

    if (fileList.length > 0 && fileList[0].originFileObj) {
      photoURL = await uploadFile(agentUid, fileList[0], 'photo');
    } else if (fileList.length > 0 && fileList[0].url) {
      photoURL = fileList[0].url;
    }

    if (signatureFileList.length > 0 && signatureFileList[0].originFileObj) {
      signatureURL = await uploadFile(agentUid, signatureFileList[0], 'signature');
    } else if (signatureFileList.length > 0 && signatureFileList[0].url) {
      signatureURL = signatureFileList[0].url;
    }

    if (documentList.length > 0) {
      documentURLs = await Promise.all(
        documentList.map(file => uploadFile(agentUid, file, 'documents'))
      );
    }

    // Update agent document
    const agentRef = doc(db, 'users', adminUid, 'agents', agentUid);
    await updateDoc(agentRef, {
      displayName: values.name || '',
      agentCode: values.agentCode || '',
      oldAgentId: values.oldAgentId || '',
      phone: values.phone || '',
      dateJoin: values.dateJoin ? values.dateJoin.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
      address: values.address || '',
      city: values.city || '',
      state: values.state || '',
      pinCode: values.pinCode || '',
      photoURL: photoURL || '',
      signatureURL: signatureURL || '',
      documentURLs: documentURLs || [],
      updatedAt: new Date()
    });

    antMessage.success('Agent updated successfully!');
    if (onSuccess) onSuccess();
    closeAgentDrawer();
  };

  const handleUploadChange = ({ fileList }) => {
    setFileList(fileList.slice(-1));
  };

  const handleDocumentUploadChange = ({ fileList }) => {
    setDocumentList(fileList.slice(-5));
  };

  const handleSignatureUploadChange = ({ fileList }) => {
    setSignatureFileList(fileList.slice(-1));
  };

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setAutoPassword(newPassword);
    setIsAutoPassword(true);
    form.setFieldsValue({ password: newPassword });
  };

  const handleTogglePasswordMode = () => {
    setIsAutoPassword(!isAutoPassword);
    if (!isAutoPassword) {
      const pwd = generatePassword();
      setAutoPassword(pwd);
      form.setFieldsValue({ password: pwd });
    }
  };

  return (
    <div>
 

      <Drawer
        title={
          <div className="flex items-center justify-between">
            <span className="text-xl font-semibold flex items-center gap-2">
              {isEditMode ? <EditOutlined className="text-blue-500" /> : <UserAddOutlined className="text-orange-500" />}
              {isEditMode ? 'Edit Agent Details' : 'Add New Agent'}
            </span>
          </div>
        }
        placement="right"
        onClose={closeAgentDrawer}
        open={isAgentDrawerVisible}
        width={window.innerWidth < 768 ? '100%' : 720}
        maskClosable={false}
        destroyOnClose
        extra={
          <Button type="text" icon={<CloseOutlined />} onClick={closeAgentDrawer} />
        }
      >
        <div className="bg-gray-50 rounded-lg p-4">
          {(loading || initialLoading) ? (
            <div className="h-96 flex flex-col items-center justify-center">
              <Spin size="large" />
              <p className="text-gray-600 mt-4 font-medium">
                {initialLoading ? 'Loading agent data...' : `${isEditMode ? 'Updating' : 'Creating'} agent account...`}
              </p>
              <p className="text-gray-400 text-sm mt-2">Please wait while we set everything up</p>
            </div>
          ) : (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{ dateJoin: dayjs() }}
              className="space-y-4"
            >
              {/* Personal Information */}
              <Card title="Personal Information" className="shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item
                    name="name"
                    label="Full Name"
                    rules={[{ required: true, message: 'Please enter full name' }]}
                  >
                    <Input prefix={<UserOutlined />} placeholder="Enter full name" size="large" />
                  </Form.Item>

                  <Form.Item
                    name="email"
                    label="Email Address"
                    rules={[
                      { required: true, message: 'Please enter email address' },
                      { type: 'email', message: 'Please enter valid email' },
                      { max: 50, message: 'Email cannot exceed 50 characters' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined />} 
                      placeholder="agent@example.com" 
                      size="large" 
                      disabled={isEditMode}
                    />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[
                      { required: true, message: 'Please enter phone number' },
                      { pattern: /^[0-9]{10}$/, message: 'Please enter valid 10-digit number' }
                    ]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="10-digit number" size="large" maxLength={10} />
                  </Form.Item>

                  <Form.Item
                    name="dateJoin"
                    label="Date Joined"
                    rules={[{ required: true, message: 'Please select join date' }]}
                  >
                    <DatePicker className="w-full" size="large" format="DD/MM/YYYY" />
                  </Form.Item>

                  <Form.Item
                    name="agentCode"
                    label="Agent Code"
                    rules={[
                      { required: true, message: 'Please enter agent code' },
                      {
                        validator: async (_, value) => {
                          if (!value) return;
                          const currentUser = auth.currentUser;
                          if (!currentUser) return;
                          const adminUid = currentUser.uid;
                          // Skip check if value unchanged from existing
                          if (isEditMode && agentData?.agentCode === value) return;
                          const agentsRef = collection(db, 'users', adminUid, 'agents');
                          const q = query(agentsRef, where('agentCode', '==', value));
                          const snapshot = await getDocs(q);
                          if (!snapshot.empty) {
                            throw new Error('This agent code is already in use');
                          }
                        }
                      }
                    ]}
                  >
                    <Input placeholder="Agent code" size="large" />
                  </Form.Item>

                  <Form.Item
                    name="oldAgentId"
                    label="Old Agent ID (वैकल्पिक)"
                  >
                    <Input placeholder="Previous agent ID if any" size="large" />
                  </Form.Item>
                </div>
              </Card>

              {/* Address Information */}
              <Card title="Address Details" className="shadow-sm">
                <div className="grid grid-cols-1 gap-4">
                  <Form.Item
                    name="address"
                    label="Street Address"
                    rules={[{ required: true, message: 'Please enter address' }]}
                  >
                    <Input.TextArea
                      rows={2}
                      placeholder="Enter complete address"
                      size="large"
                    />
                  </Form.Item>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Form.Item
                      name="city"
                      label="City"
                      rules={[{ required: true, message: 'Please enter city' }]}
                    >
                      <Input placeholder="Enter city" size="large" />
                    </Form.Item>

                    <Form.Item
                      name="state"
                      label="State"
                      rules={[{ required: true, message: 'Please select state' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Select state"
                        size="large"
                        optionFilterProp="children"
                        filterOption={(input, option) =>
                          option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                      >
                        {indianStates.map((state) => (
                          <Option key={state} value={state}>
                            {state}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="pinCode"
                      label="PIN Code"
                      rules={[
                        { required: true, message: 'Please enter PIN code' },
                        { pattern: /^[0-9]{6}$/, message: 'Please enter valid 6-digit PIN' }
                      ]}
                    >
                      <Input placeholder="6-digit PIN" size="large" maxLength={6} />
                    </Form.Item>
                  </div>
                </div>
              </Card>

              {/* Documents Upload */}
              <Card title="Documents & Media" className="shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item name="photo" label="Profile Photo">
                    <Upload
                      listType="picture-card"
                      maxCount={1}
                      fileList={fileList}
                      onChange={handleUploadChange}
                      beforeUpload={() => false}
                      accept="image/*"
                    >
                      {fileList.length === 0 && (
                        <div className="text-center">
                          <UploadOutlined className="text-2xl" />
                          <div className="mt-2">Upload Photo</div>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>

                  <Form.Item name="signature" label="Signature">
                    <Upload
                      listType="picture-card"
                      maxCount={1}
                      fileList={signatureFileList}
                      onChange={handleSignatureUploadChange}
                      beforeUpload={() => false}
                      accept="image/*"
                    >
                      {signatureFileList.length === 0 && (
                        <div className="text-center">
                          <UploadOutlined className="text-2xl" />
                          <div className="mt-2">Upload Signature</div>
                        </div>
                      )}
                    </Upload>
                  </Form.Item>

                  <Form.Item name="documents" label="ID Documents" className="md:col-span-2">
                    <Upload
                      listType="picture"
                      maxCount={5}
                      multiple
                      fileList={documentList}
                      onChange={handleDocumentUploadChange}
                      beforeUpload={() => false}
                      accept="image/*,.pdf"
                    >
                      <Button icon={<UploadOutlined />} size="large" block>
                        Upload Documents (Max 5)
                      </Button>
                    </Upload>
                  </Form.Item>
                </div>
              </Card>

              {/* Password Section - Only for Add Mode */}
              {!isEditMode && (
                <Card title="Account Security" className="shadow-sm">
                  <Form.Item label="Password">
                    <div className="space-y-3">
                      <Form.Item name="password" noStyle>
                        <Input.Password
                          prefix={<LockOutlined />}
                          disabled={isAutoPassword}
                          size="large"
                          placeholder="Password will be auto-generated"
                        />
                      </Form.Item>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={handleGeneratePassword}
                          disabled={!isAutoPassword}
                        >
                          🔄 Generate New
                        </Button>
                        <Button onClick={handleTogglePasswordMode}>
                          {isAutoPassword ? '✏️ Manual Entry' : '🤖 Auto Generate'}
                        </Button>
                      </div>
                      {isAutoPassword && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
                          <strong>Note:</strong> Auto-generated password will be displayed after creation
                        </div>
                      )}
                    </div>
                  </Form.Item>
                </Card>
              )}

              <Divider />

              {/* Submit Button */}
              <Form.Item className="mb-0">
                <div className="flex gap-3">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    icon={isEditMode ? <EditOutlined /> : <UserAddOutlined />}
                    className="flex-1"
                  >
                    {isEditMode ? 'Update Agent Details' : 'Create Agent Account'}
                  </Button>
                  <Button size="large" onClick={closeAgentDrawer}>
                    Cancel
                  </Button>
                </div>
              </Form.Item>
            </Form>
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default AgentManagement;