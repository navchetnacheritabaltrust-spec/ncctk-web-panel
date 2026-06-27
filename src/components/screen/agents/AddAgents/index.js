import React, { useEffect, useState } from 'react';
import { 
  UserOutlined, MailOutlined, PhoneOutlined, LockOutlined, 
  UploadOutlined, EnvironmentOutlined, UserAddOutlined, CloseOutlined 
} from '@ant-design/icons';
import { Button, DatePicker, Drawer, Form, Input, Select, Spin, Upload, Card, Divider, App, Checkbox } from 'antd';
import { auth, db, storage } from '@/lib/firebase';
import { setDoc, doc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import dayjs from 'dayjs';
import { useDispatch } from 'react-redux';
import { setgetAgentDataChange } from '@/redux/slices/commonSlice';
import { TrsutData } from '@/lib/constentData';

const { Option } = Select;

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", 
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", 
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", 
  "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const AddAgent = () => {
  const [isAgentDrawerVisible, setIsAgentDrawerVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [autoPassword, setAutoPassword] = useState('');
  const [isAutoPassword, setIsAutoPassword] = useState(true);
  const [fileList, setFileList] = useState([]);
  const [documentList, setDocumentList] = useState([]);
  const [signatureFileList, setSignatureFileList] = useState([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [nextAgentCode, setNextAgentCode] = useState(null);

  const {message:antMessage}=App.useApp()
  const dispatch=useDispatch()
  function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    return Array(12).fill().map(() => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  }

  useEffect(() => {
    if (isAutoPassword) {
      const pwd = generatePassword();
      setAutoPassword(pwd);
      form.setFieldsValue({ password: pwd });
    }
  }, [isAutoPassword]);

  const showAgentDrawer = () => {
    setIsAgentDrawerVisible(true);
    form.setFieldsValue({ dateJoin: dayjs() });
    const pwd = generatePassword();
    setAutoPassword(pwd);
    form.setFieldsValue({ password: pwd });
    getNextAgentCode();
  };

  const closeAgentDrawer = () => {
    setIsAgentDrawerVisible(false);
    form.resetFields();
    setFileList([]);
    setDocumentList([]);
    setSignatureFileList([]);
    setIsAutoPassword(true);
    setSendEmail(true);
    setNextAgentCode(null);
  };

  const getNextAgentCode = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const adminUid = currentUser.uid;
      const agentsRef = collection(db, 'users', adminUid, 'agents');
      const q = query(agentsRef, orderBy('agentCode', 'desc'), limit(1));
      const snapshot = await getDocs(q);
      let nextCode = 1001;
      if (!snapshot.empty) {
        const maxCode = snapshot.docs[0].data().agentCode;
        nextCode = (parseInt(maxCode) || 1000) + 1;
      }
      setNextAgentCode(nextCode);
      form.setFieldsValue({ agentCode: String(nextCode) });
    } catch (error) {
      console.error('Error getting next agent code:', error);
      const fallback = 1001;
      setNextAgentCode(fallback);
      form.setFieldsValue({ agentCode: String(fallback) });
    }
  };

  const uploadFile = async (uid, file, path) => {
    if (!file) return '';
    const storageRef = ref(storage, `agents/${uid}/${path}/${file.name}`);
    await uploadBytes(storageRef, file.originFileObj);
    return await getDownloadURL(storageRef);
  };

  const sendAgentCredentialsEmail = async (agentData, password) => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #78350f 0%, #92400e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #78350f; }
            .credential-row { margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 4px; }
            .label { font-weight: bold; color: #78350f; }
            .value { color: #1f2937; margin-left: 10px; }
            .password-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
            .password { font-size: 24px; font-weight: bold; color: #92400e; letter-spacing: 2px; font-family: monospace; }
            .warning { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .button { background: #78350f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Our Team!</h1>
              <p>Your Agent Account Has Been Created</p>
            </div>
            <div class="content">
              <h2>Hello ${agentData.displayName},</h2>
              <p>We're excited to have you on board as an agent! Your account has been successfully created and is ready to use.</p>
              
              <div class="credentials">
                <h3 style="color: #78350f; margin-top: 0;">📋 Your Account Details</h3>
                
                <div class="credential-row">
                  <span class="label">👤 Name:</span>
                  <span class="value">${agentData.displayName}</span>
                </div>
                
                <div class="credential-row">
                  <span class="label">📧 Email:</span>
                  <span class="value">${agentData.email}</span>
                </div>
                
                <div class="credential-row">
                  <span class="label">📱 Phone:</span>
                  <span class="value">${agentData.phone}</span>
                </div>
                
                <div class="credential-row">
                  <span class="label">📅 Join Date:</span>
                  <span class="value">${agentData.dateJoin}</span>
                </div>
                
                <div class="credential-row">
                  <span class="label">📍 Location:</span>
                  <span class="value">${agentData.city}, ${agentData.state} - ${agentData.pinCode}</span>
                </div>
              </div>

              <div class="password-box">
                <p style="margin: 0 0 10px 0; color: #92400e; font-weight: bold;">🔐 Your Login Password:</p>
                <div class="password">${password}</div>
              </div>

              <div class="warning">
                <strong>⚠️ Important Security Notice:</strong>
                <ul style="margin: 10px 0;">
                  <li>Please change your password after your first login</li>
                  <li>Do not share your password with anyone</li>
                  <li>Keep this email secure or delete it after noting down your credentials</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="#" class="button">
                  Login to Your Account in Shavliya Seva App
                </a>
              </div>

              <p style="margin-top: 30px;">If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br><strong>${TrsutData.name}</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
              <p>© ${new Date().getFullYear()} ${TrsutData.name}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
Welcome to Our Team!

Hello ${agentData.displayName},

Your agent account has been successfully created. Here are your account details:

Name: ${agentData.displayName}
Email: ${agentData.email}
Phone: ${agentData.phone}
Join Date: ${agentData.dateJoin}
Location: ${agentData.city}, ${agentData.state} - ${agentData.pinCode}

Your Login Password: ${password}

IMPORTANT SECURITY NOTICE:
- Please change your password after your first login
- Do not share your password with anyone
- Keep this email secure or delete it after noting down your credentials

Login at: Shavliya Seva App

If you have any questions, please contact our support team.

Best regards,
The Team
      `;

      const response = await fetch('/api/email-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: agentData.email,
          subject: '🎉 Welcome! Your Agent Account Credentials',
          htmlContent,
          textContent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
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
        setLoading(false);
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

      const agentData = {
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
      };

      // Create agent subcollection under the admin user
      const agentRef = doc(collection(db, 'users', adminUid, 'agents'), agentUid);
      await setDoc(agentRef, agentData);

             
        
     dispatch(setgetAgentDataChange(true))
      // Send email if checkbox is checked
      if (sendEmail) {
        try {
         
          await sendAgentCredentialsEmail(agentData, password);
          antMessage.success('Agent created successfully! Credentials sent to email.');
        } catch (emailError) {
          console.error('Email error:', emailError);
          antMessage.warning('Agent created successfully, but failed to send email. Please share credentials manually.');
        }
      } else {
        antMessage.success('Agent created successfully!');
      }
      
      // Show password to admin
      antMessage.info({
        content: `Password for ${values.email}: ${password}`,
        duration: 15
      });

      closeAgentDrawer();

    } catch (error) {
      console.error('Error creating agent:', error);
          dispatch(setgetAgentDataChange(false))
      antMessage.error(error.message || 'Failed to create agent');
    } finally {
      setLoading(false);
    }
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
      <Button
        type="primary"
        size="medium"
        icon={<UserAddOutlined />}
        onClick={showAgentDrawer}
        className="shadow-md hover:shadow-lg transition-all duration-300 !bg-amber-900"
      >
        ADD AGENT
      </Button>

      <Drawer
        title={
          <div className="flex items-center justify-between">
            <span className="text-xl font-semibold flex items-center gap-2">
              <UserAddOutlined className="text-oragne-500" />
              ADD NEW AGENT
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
          {loading ? (
            <div className="h-96 flex flex-col items-center justify-center">
              <Spin size="large" />
              <p className="text-gray-600 mt-4 font-medium">Creating agent account...</p>
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
                    <Input prefix={<MailOutlined />} placeholder="agent@example.com" size="large" />
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
                    <Input placeholder="Auto-generated, you can change it" size="large" />
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

              {/* Password Section */}
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

                {/* Email Notification Checkbox */}
                <Form.Item className="mt-4">
                  <Checkbox
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                  >
                    <span className="font-medium">📧 Send account credentials to agent's email</span>
                  </Checkbox>
                  <div className="text-xs text-gray-500 mt-1 ml-6">
                    The agent will receive their login details including password via email
                  </div>
                </Form.Item>
              </Card>

              <Divider />

              {/* Submit Button */}
              <Form.Item className="mb-0">
                <div className="flex gap-3">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    icon={<UserAddOutlined />}
                    className="flex-1"
                  >
                    Create Agent Account
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

export default AddAgent;