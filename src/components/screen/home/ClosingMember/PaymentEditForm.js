import React, { useState } from 'react';
import { Button, Input, Card, Divider, Space, Statistic, Form, message } from 'antd';
import { CheckCircleOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';

const PaymentEditForm = ({ 
  payStatus, 
  memberData, 
  selectedProgram, 
  onSave, 
  onCancel 
}) => {
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    memberContributed: payStatus?.totalAmount || 0,
    membersCount: payStatus?.paymentDetails?.length || 0,
    amountGiven: 0,
    paymentMode: 'Cash',
    oldPending: payStatus?.pendingAmount || 0,
    netAmount: 0,
    closingDate: new Date().toLocaleDateString('en-GB')
  });

  // Calculate net amount whenever amountGiven or oldPending changes
  const calculateNetAmount = (amountGiven, oldPending) => {
    return Math.max(0, amountGiven - oldPending);
  };

  const handleInputChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    
    // Recalculate net amount when amountGiven or oldPending changes
    if (field === 'amountGiven' || field === 'oldPending') {
      newData.netAmount = calculateNetAmount(
        field === 'amountGiven' ? value : formData.amountGiven,
        field === 'oldPending' ? value : formData.oldPending
      );
    }
    
    setFormData(newData);
  };

  const handleSave = async () => {
    try {
      // Validate data
      if (formData.amountGiven <= 0) {
        message.error('Please enter a valid amount given');
        return;
      }

      // Call the parent save function
      await onSave(formData);
      setEditing(false);
      message.success('Payment data saved successfully!');
    } catch (error) {
      message.error('Failed to save payment data');
    }
  };

  return (
    <Card 
      title="Payment Details Editor" 
      extra={
        <Space>
          {!editing ? (
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={() => setEditing(true)}
            >
              Edit Payment Data
            </Button>
          ) : (
            <Button 
              type="default"
              onClick={() => {
                setEditing(false);
                onCancel?.();
              }}
            >
              Cancel
            </Button>
          )}
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {/* Summary Statistics */}
      <div style={{ marginBottom: 24 }}>
        <Space wrap size="large">
          <Statistic 
            title="Total Member Contributions" 
            value={payStatus?.totalAmount || 0} 
            prefix="₹" 
            valueStyle={{ color: '#3f8600' }}
          />
          <Statistic 
            title="Paid Amount" 
            value={payStatus?.paidAmount || 0} 
            prefix="₹" 
            valueStyle={{ color: '#1890ff' }}
          />
          <Statistic 
            title="Pending Amount" 
            value={payStatus?.pendingAmount || 0} 
            prefix="₹" 
            valueStyle={{ color: '#cf1322' }}
          />
          <Statistic 
            title="Total Payments" 
            value={payStatus?.paymentDetails?.length || 0} 
            suffix="payments"
          />
        </Space>
      </div>

      <Divider />

      {/* Payment Details Form */}
      <Form
        form={form}
        layout="vertical"
        initialValues={formData}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Read-only fields */}
          <Form.Item label="Member ID">
            <Input value={memberData?.id || 'N/A'} disabled />
          </Form.Item>

          <Form.Item label="Member Name">
            <Input value={memberData?.displayName || 'N/A'} disabled />
          </Form.Item>

          <Form.Item label="Total Contributed">
            <Input 
              value={`₹${payStatus?.totalAmount || 0}`} 
              disabled 
              prefix="₹"
            />
          </Form.Item>

          <Form.Item label="Number of Payments">
            <Input 
              value={payStatus?.paymentDetails?.length || 0} 
              disabled 
              suffix="payments"
            />
          </Form.Item>

          {/* Editable fields */}
          <Form.Item 
            label="Amount Given to Member"
            required
            help="Amount being given to member during closing"
          >
            <Input
              type="number"
              prefix="₹"
              value={formData.amountGiven}
              onChange={(e) => handleInputChange('amountGiven', parseFloat(e.target.value) || 0)}
              disabled={!editing}
              placeholder="Enter amount"
            />
          </Form.Item>

          <Form.Item label="Payment Mode">
            <Input
              value={formData.paymentMode}
              onChange={(e) => handleInputChange('paymentMode', e.target.value)}
              disabled={!editing}
              placeholder="Cash/Cheque/Online"
            />
          </Form.Item>

          <Form.Item 
            label="Old Pending Amount"
            help="Previous pending amount from member"
          >
            <Input
              type="number"
              prefix="₹"
              value={formData.oldPending}
              onChange={(e) => handleInputChange('oldPending', parseFloat(e.target.value) || 0)}
              disabled={!editing}
            />
          </Form.Item>

          {/* Calculated field */}
          <Form.Item label="Net Amount to Member">
            <Input
              value={`₹${formData.netAmount}`}
              disabled
              style={{ 
                backgroundColor: '#f6ffed',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            />
          </Form.Item>
        </div>

        {/* Payment History */}
        {payStatus?.paymentDetails && (
          <>
            <Divider>Payment History</Divider>
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Amount</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Status</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Due Date</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd' }}>Payment Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payStatus.paymentDetails.map((payment, index) => (
                    <tr key={index}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        ₹{payment.amount}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        <span style={{ 
                          color: payment.status === 'paid' ? '#52c41a' : '#f5222d',
                          fontWeight: 'bold'
                        }}>
                          {payment.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        {payment.dueDate || 'N/A'}
                      </td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>
                        {payment.paymentDate || 'Pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {editing && (
          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                onClick={handleSave}
              >
                Save & Generate PDF
              </Button>
            </Space>
          </div>
        )}
      </Form>
    </Card>
  );
};

export default PaymentEditForm;