"use client";
import React, { useEffect, useState } from 'react';
import { Modal, Tabs, Button, Tag, Card, Descriptions, Input, Collapse, Empty, Row, Col, Statistic, Divider, message, Popconfirm } from 'antd';
import { 
  EyeOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  SearchOutlined,
  PlusOutlined,
  CalendarOutlined,
  TeamOutlined,
  DollarOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  UserOutlined,
  StarOutlined,
  StarFilled
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import AddProgramEdit from '@/components/common/program/AddProgramEdit';
import { deleteProgram, updateProgram } from '@/lib/services/firebaseService';
import AddProgram from '@/components/common/program';
import { setPrograms } from '@/redux/slices/commonSlice';
// Import your Redux action

const { Panel } = Collapse;
const { Meta } = Card;

const Programs = () => {
  const dispatch = useDispatch();
  const programsList = useSelector((state) => state.data.programList);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filteredData, setFilteredData] = useState(programsList);
  const [editDrawerVisible, setEditDrawerVisible] = useState(false);
  const [programToEdit, setProgramToEdit] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setFilteredData(programsList);
  }, [programsList]);

  const handleSearch = (value) => {
    setSearchText(value);
    const filtered = programsList.filter(program =>
      program.name.toLowerCase().includes(value.toLowerCase()) ||
      program.about.toLowerCase().includes(value.toLowerCase()) ||
      program.locationGroups.some(loc => 
        loc.location.toLowerCase().includes(value.toLowerCase())
      )
    );
    setFilteredData(filtered);
  };

  const handleView = (record) => {
    setSelectedProgram(record);
    setIsModalVisible(true);
  };

  const handleEdit = (program) => {
    setProgramToEdit(program);
    setEditDrawerVisible(true);
  };

  // FIXED: Proper delete function with Redux state update
  const handleDelete = async (programId) => {
    try {
      setIsDeleting(true);
      
      // Delete from Firebase
      await deleteProgram(programId);
      
      // Update Redux state by filtering out the deleted program
      const updatedPrograms = programsList.filter(program => program.id !== programId);
      dispatch(setPrograms(updatedPrograms));
      
      // Also update filtered data if search is active
      if (searchText) {
        const updatedFiltered = updatedPrograms.filter(program =>
          program.name.toLowerCase().includes(searchText.toLowerCase()) ||
          program.about.toLowerCase().includes(searchText.toLowerCase()) ||
          program.locationGroups.some(loc => 
            loc.location.toLowerCase().includes(searchText.toLowerCase())
          )
        );
        setFilteredData(updatedFiltered);
      } else {
        setFilteredData(updatedPrograms);
      }
      
      message.success('Program deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting program:', error);
      message.error('Failed to delete program. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Alternative: If you have a fetchPrograms function, you can refetch
  // const fetchPrograms = async () => {
  //   const programs = await getPrograms();
  //   dispatch(setPrograms(programs));
  // };

  // const handleDelete = async (programId) => {
  //   try {
  //     setIsDeleting(true);
  //     await deleteProgram(programId);
  //     await fetchPrograms(); // Refetch the entire list
  //     message.success('Program deleted successfully!');
  //   } catch (error) {
  //     console.error('Error deleting program:', error);
  //     message.error('Failed to delete program.');
  //   } finally {
  //     setIsDeleting(false);
  //   }
  // };

  const handleSetSelected = async (programId) => {
    try {
      await updateProgram(programId, { isSelected: true });
      
      // Update all other programs in Redux
      const updatedPrograms = programsList.map(program => ({
        ...program,
        isSelected: program.id === programId
      }));
      
      dispatch(setPrograms(updatedPrograms));
      setFilteredData(updatedPrograms);
      
      message.success('Program set as selected!');
    } catch (error) {
      console.error('Error setting selected program:', error);
      message.error('Failed to set selected program.');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.seconds) return 'N/A';
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getTotalJoinFees = (ageGroups) => {
    return ageGroups.reduce((sum, group) => sum + group.joinFee, 0);
  };

  const getAveragePayAmount = (ageGroups) => {
    if (!ageGroups.length) return 0;
    const total = ageGroups.reduce((sum, group) => sum + group.payAmount, 0);
    return Math.round(total / ageGroups.length);
  };

  const tabItems = [
    {
      key: '1',
      label: 'Program Overview',
      children: (
        <div className="space-y-6">
          <Card className="shadow-sm">
            <Descriptions title="Basic Information" bordered column={2}>
              <Descriptions.Item label="Program Name" span={2}>
                <span className="font-semibold text-lg">{selectedProgram?.name}</span>
                {selectedProgram?.isSelected && (
                  <Tag color="gold" className="ml-2">
                    <StarFilled /> Selected
                  </Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Hindi Name" span={2}>
                {selectedProgram?.hiname || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Certificate Note" span={2}>
                {selectedProgram?.noteLine || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {selectedProgram?.about}
              </Descriptions.Item>
              <Descriptions.Item label="Created Date">
                {formatDate(selectedProgram?.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Created By">
                <span className="font-mono text-xs">{selectedProgram?.createdBy}</span>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="shadow-sm">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <InfoCircleOutlined className="text-blue-500" />
              Program Statistics
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {selectedProgram?.ageGroups.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Age Groups</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">
                  {selectedProgram?.locationGroups.length}
                </div>
                <div className="text-sm text-gray-600 mt-1">Locations</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {formatCurrency(getTotalJoinFees(selectedProgram?.ageGroups || []))}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Join Fees</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {formatCurrency(getAveragePayAmount(selectedProgram?.ageGroups || []))}
                </div>
                <div className="text-sm text-gray-600 mt-1">Avg. Payment</div>
              </div>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: '2',
      label: 'Age Groups & Fees',
      children: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TeamOutlined className="text-blue-500" />
            Age Group Configuration
          </h3>
          {selectedProgram?.ageGroups && selectedProgram.ageGroups.length > 0 ? (
            <Collapse accordion className="bg-white">
              {selectedProgram.ageGroups.map((group, index) => (
                <Panel 
                  header={
                    <div className="flex items-center justify-between pr-4">
                      <span className="font-semibold">
                        Age Group {index + 1}: {group.startAge} - {group.endAge} years
                      </span>
                      <Tag color="blue">{formatCurrency(group.joinFee)}</Tag>
                    </div>
                  } 
                  key={group.id || index}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-500 text-sm mb-1">Age Range</p>
                      <p className="font-semibold text-lg">
                        {group.startAge} - {group.endAge} years
                      </p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-gray-500 text-sm mb-1">
                        <DollarOutlined /> Joining Fee
                      </p>
                      <p className="font-semibold text-lg text-green-600">
                        {formatCurrency(group.joinFee)}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-gray-500 text-sm mb-1">
                        <DollarOutlined /> Payment Amount
                      </p>
                      <p className="font-semibold text-lg text-blue-600">
                        {formatCurrency(group.payAmount)}
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-gray-500 text-sm mb-1">Group ID</p>
                      <p className="font-mono text-xs break-all">{group.id || 'N/A'}</p>
                    </div>
                  </div>
                </Panel>
              ))}
            </Collapse>
          ) : (
            <Empty description="No age groups configured" />
          )}
        </div>
      ),
    },
    {
      key: '3',
      label: 'Location Groups',
      children: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <EnvironmentOutlined className="text-green-500" />
            Location Configuration
          </h3>
          {selectedProgram?.locationGroups && selectedProgram.locationGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedProgram.locationGroups.map((location, index) => (
                <Card 
                  key={location.id || index}
                  className="shadow-sm hover:shadow-md transition-shadow"
                  title={
                    <div className="flex items-center gap-2">
                      <EnvironmentOutlined className="text-green-500" />
                      <span>Location {index + 1}</span>
                    </div>
                  }
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Group Name:</span>
                      <Tag color="blue">{location.groupName}</Tag>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Group Type:</span>
                      <Tag color="purple">{location.groupType}</Tag>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Location:</span>
                      <Tag color="green" icon={<EnvironmentOutlined />}>
                        {location.location}
                      </Tag>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">Location ID</p>
                      <p className="font-mono text-xs text-gray-700 break-all">{location.id || 'N/A'}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="No locations configured" />
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Search and Add Button */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Programs Management</h1>
              <p className="text-gray-600">Manage and view all program configurations</p>
            </div>
            <div className="flex items-center gap-3">
              <AddProgram/>
              <AddProgramEdit />
            </div>
          </div>
        </div>

        {/* Programs Grid */}
        <Row gutter={[24, 24]}>
          {filteredData.map((program) => (
            <Col xs={24} sm={24} md={12} lg={8} key={program.id}>
              <Card
                hoverable
                className="h-full shadow-md hover:shadow-xl transition-all duration-300"
                actions={[
                  <Button 
                    type="text" 
                    icon={<EyeOutlined />}
                    onClick={() => handleView(program)}
                    key="view"
                  >
                    View Details
                  </Button>,
                  <Button 
                    type="text" 
                    icon={<EditOutlined />}
                    onClick={() => handleEdit(program)}
                    key="edit"
                  >
                    Edit
                  </Button>,
                  <Popconfirm
                    title="Delete Program"
                    description="Are you sure you want to delete this program?"
                    onConfirm={() => handleDelete(program.id)}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ loading: isDeleting }}
                  >
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      key="delete"
                      disabled={isDeleting}
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                ]}
              >
                <div className="mb-4">
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      <InfoCircleOutlined className="text-blue-500" />
                      {program.name}
                    </h2>
                    {program.isSelected && (
                      <Tag icon={<StarFilled />} color="gold">
                        Selected
                      </Tag>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2">{program.about}</p>
                  {program.hiname && (
                    <p className="text-gray-500 text-sm mt-1">Hindi: {program.hiname}</p>
                  )}
                </div>

                <Divider className="my-4" />

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <TeamOutlined />
                        <span className="text-xs font-medium">Age Groups</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-700">
                        {program.ageGroups.length}
                      </div>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 text-green-600 mb-1">
                        <EnvironmentOutlined />
                        <span className="text-xs font-medium">Locations</span>
                      </div>
                      <div className="text-2xl font-bold text-green-700">
                        {program.locationGroups.length}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        <CalendarOutlined className="mr-1" />
                        Created
                      </span>
                      <span className="font-medium text-gray-800">
                        {formatDate(program.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Tag color="blue" className="mb-0">
                      {program.ageGroups.length} Age Groups
                    </Tag>
                    {program.locationGroups.slice(0, 2).map((loc, idx) => (
                      <Tag key={idx} color="green" icon={<EnvironmentOutlined />}>
                        {loc.location}
                      </Tag>
                    ))}
                    {program.locationGroups.length > 2 && (
                      <Tag color="default">+{program.locationGroups.length - 2} more</Tag>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {filteredData.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Empty 
              description={
                <span className="text-gray-500">
                  {searchText ? 'No programs found matching your search' : 'No programs available'}
                </span>
              }
            />
          </div>
        )}

        {/* View Details Modal */}
        <Modal
          title={
            <div className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <InfoCircleOutlined className="text-blue-500" />
              Program Details
            </div>
          }
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setIsModalVisible(false)}>
              Close
            </Button>,
            <Button 
              key="edit" 
              type="primary" 
              icon={<EditOutlined />}
              onClick={() => {
                setIsModalVisible(false);
                handleEdit(selectedProgram);
              }}
            >
              Edit Program
            </Button>,
          ]}
          width={900}
          destroyOnHidden
        >
          <Tabs items={tabItems} />
        </Modal>

        {/* Edit Program Drawer */}
        <AddProgramEdit
          mode="edit"
          program={programToEdit}
          onSuccess={() => {
            setEditDrawerVisible(false);
            setProgramToEdit(null);
            // Refresh programs list here
          }}
          triggerButton={
            <div style={{ display: 'none' }}>
              {/* Hidden trigger */}
            </div>
          }
          isDrawerOpen={editDrawerVisible}
          setIsDrawerOpen={setEditDrawerVisible}
          onClose={() => {
            setEditDrawerVisible(false);
            setProgramToEdit(null);
          }}
        />
      </div>
    </div>
  );
};

export default Programs;