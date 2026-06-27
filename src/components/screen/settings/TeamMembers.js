"use client";
import React, { useState } from 'react';
import { Card, Button, Modal, Form, Input, Upload, Table, Tag, Tooltip, message, Popconfirm, Select } from 'antd';
import { FiPlusCircle, FiEdit2, FiTrash2, FiUpload, FiUser } from 'react-icons/fi';

// Dummy data for team members
const dummyData = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john@trustorg.com',
    phone: '+1 (555) 123-4567',
    designation: 'Trust Manager',
    photo: 'https://example.com/john.jpg',
    signature: 'https://example.com/john-sign.png',
    status: 'active'
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane@trustorg.com',
    phone: '+1 (555) 987-6543',
    designation: 'Administrative Head',
    photo: 'https://example.com/jane.jpg',
    signature: 'https://example.com/jane-sign.png',
    status: 'active'
  }
];

// Add designation options
const designationOptions = [
  { value: 'trust_manager', label: 'Trust Manager' },
  { value: 'administrative_head', label: 'Administrative Head' },
  { value: 'financial_advisor', label: 'Financial Advisor' },
  { value: 'legal_counsel', label: 'Legal Counsel' },
  { value: 'account_manager', label: 'Account Manager' },
  { value: 'compliance_officer', label: 'Compliance Officer' },
];

// Add status options
const statusOptions = [
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'inactive', label: 'Inactive', color: 'default' },
  { value: 'pending', label: 'Pending', color: 'warning' },
];

const TeamMembers = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [editingMember, setEditingMember] = useState(null);

  const handleSubmit = (values) => {
    console.log('Form values:', values);
    message.success(`${editingMember ? 'Updated' : 'Added'} team member successfully`);
    setIsModalOpen(false);
    form.resetFields();
    setEditingMember(null);
  };

  const handleEdit = (record) => {
    setEditingMember(record);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    console.log('Deleting member:', id);
    message.success('Team member removed successfully');
  };

  const columns = [
    {
      title: 'Member',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--gray-100)] flex items-center justify-center">
            {record.photo ? (
              <img 
                src={record.photo} 
                alt={text}
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/40?text=User';
                }}
              />
            ) : (
              <FiUser className="text-[var(--gray-300)]" size={20} />
            )}
          </div>
          <div>
            <div className="font-medium text-[var(--foreground)]">{text}</div>
            <div className="text-sm text-[var(--gray-300)]">{record.designation}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.email}</div>
          <div className="text-sm text-[var(--gray-300)]">{record.phone}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'default'}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Tooltip title="Edit Member">
            <Button
              type="text"
              icon={<FiEdit2 />}
              onClick={() => handleEdit(record)}
              className="text-[var(--primary-blue)] hover:text-[var(--primary-dark)]"
            />
          </Tooltip>
          <Popconfirm
            title="Delete team member"
            description="Are you sure you want to remove this team member?"
            onConfirm={() => handleDelete(record.id)}
            okButtonProps={{ 
              className: "bg-[var(--error)] hover:bg-[var(--error)] border-[var(--error)]" 
            }}
          >
            <Button
              type="text"
              icon={<FiTrash2 />}
              className="text-[var(--error)] hover:text-[var(--error)]"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Team Members</h1>
          <p className="text-[var(--gray-300)] mt-1">Manage your organization's team members</p>
        </div>
        <Button 
          type="primary"
          size="large"
          icon={<FiPlusCircle className="mr-2" />}
          onClick={() => {
            setEditingMember(null);
            form.resetFields();
            setIsModalOpen(true);
          }}
          className="bg-[var(--primary-blue)] hover:bg-[var(--primary-dark)]"
        >
          Add Team Member
        </Button>
      </div>

      <Card className="shadow-sm">
        <Table 
          columns={columns} 
          dataSource={dummyData}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={
          <h3 className="text-xl font-semibold text-[var(--foreground)]">
            {editingMember ? 'Edit Team Member' : 'Add Team Member'}
          </h3>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
          setEditingMember(null);
        }}
        footer={null}
        width={800}
        className="custom-modal"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="bg-[var(--gray-50)] p-4 rounded-lg">
                <h4 className="text-sm font-medium text-[var(--gray-400)] mb-3">Basic Information</h4>
                <Form.Item
                  name="name"
                  label="Full Name"
                  rules={[{ required: true, message: 'Please enter member name' }]}
                >
                  <Input 
                    prefix={<FiUser className="text-[var(--gray-300)]" />}
                    placeholder="Enter full name" 
                    className="h-10"
                  />
                </Form.Item>

                <Form.Item
                  name="designation"
                  label="Designation"
                  rules={[{ required: true, message: 'Please select designation' }]}
                >
                  <Select
                    placeholder="Select designation"
                    options={designationOptions}
                    className="h-10"
                  />
                </Form.Item>
              </div>

              <div className="bg-[var(--gray-50)] p-4 rounded-lg">
                <h4 className="text-sm font-medium text-[var(--gray-400)] mb-3">Contact Details</h4>
                <Form.Item
                  name="email"
                  label="Email Address"
                  rules={[
                    { required: true, message: 'Please enter email' },
                    { type: 'email', message: 'Please enter a valid email' }
                  ]}
                >
                  <Input 
                    prefix={<span className="text-[var(--gray-300)]">@</span>}
                    placeholder="Enter email address" 
                    className="h-10"
                  />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label="Phone Number"
                  rules={[{ required: true, message: 'Please enter phone number' }]}
                >
                  <Input 
                    prefix={<span className="text-[var(--gray-300)]">+1</span>}
                    placeholder="Enter phone number" 
                    className="h-10"
                  />
                </Form.Item>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="bg-[var(--gray-50)] p-4 rounded-lg">
                <h4 className="text-sm font-medium text-[var(--gray-400)] mb-3">Access Details</h4>
                <Form.Item
                  name="status"
                  label="Member Status"
                  rules={[{ required: true, message: 'Please select status' }]}
                >
                  <Select
                    placeholder="Select status"
                    options={statusOptions}
                    className="h-10"
                  />
                </Form.Item>

                <Form.Item
                  name="role"
                  label="Access Role"
                  rules={[{ required: true, message: 'Please select role' }]}
                >
                  <Select
                    placeholder="Select role"
                    options={[
                      { value: 'admin', label: 'Administrator' },
                      { value: 'manager', label: 'Manager' },
                      { value: 'member', label: 'Team Member' },
                    ]}
                    className="h-10"
                  />
                </Form.Item>
              </div>

              <div className="bg-[var(--gray-50)] p-4 rounded-lg">
                <h4 className="text-sm font-medium text-[var(--gray-400)] mb-3">Media Upload</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Form.Item
                    name="photo"
                    label="Profile Photo"
                  >
                    <Upload
                      listType="picture-card"
                      maxCount={1}
                      className="photo-uploader"
                    >
                      <div className="flex flex-col items-center">
                        <FiUser size={20} className="text-[var(--gray-300)] mb-1" />
                        <span className="text-xs text-[var(--gray-300)]">Upload Photo</span>
                      </div>
                    </Upload>
                  </Form.Item>

                  <Form.Item
                    name="signature"
                    label="Signature"
                  >
                    <Upload
                      listType="picture-card"
                      maxCount={1}
                      className="signature-uploader"
                    >
                      <div className="flex flex-col items-center">
                        <FiUpload size={20} className="text-[var(--gray-300)] mb-1" />
                        <span className="text-xs text-[var(--gray-300)]">Upload</span>
                      </div>
                    </Upload>
                  </Form.Item>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--gray-200)]">
            <Button 
              onClick={() => {
                setIsModalOpen(false);
                form.resetFields();
                setEditingMember(null);
              }}
              className="hover:bg-[var(--gray-100)] px-6"
            >
              Cancel
            </Button>
            <Button 
              type="primary" 
              htmlType="submit"
              className="bg-[var(--primary-blue)] hover:bg-[var(--primary-dark)] px-6"
            >
              {editingMember ? 'Update Member' : 'Add Member'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamMembers;
