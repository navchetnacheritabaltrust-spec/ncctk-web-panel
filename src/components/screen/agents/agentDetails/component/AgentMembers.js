"use client";
import { useAuth } from '@/lib/AuthProvider';
import { getData } from '@/lib/services/firebaseService';
import { AgGridReact } from 'ag-grid-react';
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { EyeOutlined, EditOutlined, PlusCircleOutlined, FilterOutlined, DeleteFilled } from '@ant-design/icons';
import { 
  ClientSideRowModelModule,
  ModuleRegistry,
  NumberEditorModule,
  NumberFilterModule,
  PaginationModule,
  RowSelectionModule,
  TextEditorModule,
  TextFilterModule,
  ValidationModule,
  createGrid,
  RowStyleModule
} from 'ag-grid-community';
import { 
  Avatar, 
  Button, 
  Drawer, 
  Space, 
  Tooltip, 
  Select, 
  Row, 
  Col, 
  Card, 
  Statistic,
  DatePicker,
  Form,
  Input,
  Modal,
  App
} from 'antd';
import dayjs from 'dayjs';
import MemberDetailsView from '@/components/screen/programs/members/MemberDetailsView';
import MemberListPdf from './pdfcom/MemberList';
import { PDFDownloadLink } from '@react-pdf/renderer';
import MemberListPdfCom from './pdfcom/MemberPdfCom';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { collection, deleteDoc, doc, getDocs, runTransaction } from 'firebase/firestore';

const { RangePicker } = DatePicker;

ModuleRegistry.registerModules([
  NumberEditorModule,
  TextEditorModule,
  TextFilterModule,
  NumberFilterModule,
  RowSelectionModule,
  PaginationModule,
  ClientSideRowModelModule,
  ValidationModule /* Development Only */,
  RowStyleModule
]);

const AgentMembers = ({ agentId, agentInfo }) => {
  const gridRef = useRef();
  const dispatch = useDispatch();
    const [deleteLoading, setDeleteLoading] = useState(false);
   const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [allMembersData, setAllMembersData] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isDetailsView, setIsDetailsView] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProgramFilter, setSelectedProgramFilter] = useState('all');
  const [programMembersData, setProgramMembersData] = useState({});
  const [dateRange, setDateRange] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [filterForm] = Form.useForm();
    const { message } = App.useApp();
  const { user } = useAuth();
  const programList = useSelector((state) => state.data.programList);

  const COL_DEFS = [
    { 
      field: "displayName",   
      cellDataType: 'text', 
      headerName: "Name", 
      pinned: 'left', 
      cellRenderer: (props) => {
        return (
          <div className={`flex items-center gap-2 relative ${props.data.isBlocked ? 'bg-red-300' : props.data.isPrinted ? 'bg-green-100' : 'bg-white'}`}>
            <Avatar
              src={props.data.photoURL}
              alt={props.data.displayName}
              size={30}
            />
            <h1>{props.data.displayName}</h1>
          </div>
        );
      } 
    },
    { field: "fatherName", headerName: "Father Name", width: 150, cellDataType: "text" },
    { field: "jati", headerName: "Surname", width: 150, cellDataType: "text" },
    { field: "registrationNumber", headerName: "Registration Number", cellDataType: "text" },
    { field: "phone", headerName: "Phone", width: 120, cellDataType: "text" },
    { field: "state", headerName: "State", width: 100, cellDataType: "text" },
    { field: "ageGroupRange", headerName: "Age Group", cellDataType: "text", width: 130 },
    { 
      field: "programName", 
      headerName: "Program", 
      width: 150,
      cellDataType: "text",
      cellRenderer: (props) => {
        return props.data.programName || 'N/A';
      }
    },
    {
      field: "createdAt",
      headerName: "Join Date",
      width: 120,
      cellRenderer: (props) => {
        if (!props.value) return 'N/A';
        const date = props.value.toDate ? props.value.toDate() : new Date(props.value);
        return date.toLocaleDateString('en-IN');
      }
    },
    {
      field: "Action",
      headerName: "Action",
      pinned: 'right',
      width: 100,
      filter: false,
      cellRenderer: (props) => {
        const { data } = props;
        return (
          <div>
            <div className="flex items-center justify-start gap-2">
              <Tooltip title="View Details">
                <Button
                  type="primary"
                  icon={<EyeOutlined />}
                  onClick={() => {
                    setSelectedMember(data);
                    setIsDetailsView(true);
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:scale-105 transition-transform"
                />
              </Tooltip>
               <Tooltip title="Delete Member">
                <Button
                  type="primary"
                  icon={<DeleteFilled />}
                  onClick={() => {
                    setSelectedMember(data);
                    setIsDeleteModalVisible(true);
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:scale-105 transition-transform !bg-red-700"
                />
              </Tooltip>
            </div>
          </div>
        );
      }
    },
  ];

  const getMemberData = async () => {
    try {
      setIsLoading(true);
      let allMembers = [];
      
      // Get members from all programs
      for (const program of programList) {
        const memberData = await getData(
          `/users/${user.uid}/programs/${program.id}/members`,
          [
            {
              field: 'agentId',
              operator: '==',
              value: agentId
            },
            {
              field: 'active_flag',
              operator: '==',
              value: true
            },
            {
              field: 'delete_flag',
              operator: '==',
              value: false
            },
            {
              field: 'status',
              operator: '==',
              value: 'accepted'
            }
          ],
          {
            field: 'createdAt',
            direction: 'desc'
          }
        );

        // Add program name to each member
        const membersWithProgram = memberData.map(member => ({
          ...member,
          programId: program.id,
          programName: program.hiname || program.englishName,
          programData: program
        }));

        allMembers = [...allMembers, ...membersWithProgram];
        
        // Store members by program
        setProgramMembersData(prev => ({
          ...prev,
          [program.id]: membersWithProgram
        }));
      }

      setAllMembersData(allMembers);
      setFilteredMembers(allMembers);
      
    } catch (error) {
      console.log(error, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allMembersData;

    // Apply program filter
    if (selectedProgramFilter !== 'all') {
      filtered = filtered.filter(member => member.programId === selectedProgramFilter);
    }

    // Apply date range filter
    if (dateRange && dateRange[0] && dateRange[1]) {
      const startDate = dateRange[0].startOf('day').toDate();
      const endDate = dateRange[1].endOf('day').toDate();
      
      filtered = filtered.filter(member => {
        if (!member.createdAt) return false;
        const memberDate = member.createdAt.toDate ? member.createdAt.toDate() : new Date(member.createdAt);
        return memberDate >= startDate && memberDate <= endDate;
      });
    }

    // Apply search filter
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(member => 
        (member.displayName && member.displayName.toLowerCase().includes(searchLower)) ||
        (member.fatherName && member.fatherName.toLowerCase().includes(searchLower)) ||
        (member.phone && member.phone.includes(searchText)) ||
        (member.registrationNumber && member.registrationNumber.toLowerCase().includes(searchLower))
      );
    }

    setFilteredMembers(filtered);
  };

  const resetFilters = () => {
    setSelectedProgramFilter('all');
    setDateRange(null);
    setSearchText('');
    filterForm.resetFields();
    setFilteredMembers(allMembersData);
  };

  const calculateStatistics = (members) => {
    const total = members.length;
    const today = new Date();
    const last7Days = new Date(today);
    last7Days.setDate(today.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);
    
    const todayCount = members.filter(member => {
      if (!member.createdAt) return false;
      const memberDate = member.createdAt.toDate ? member.createdAt.toDate() : new Date(member.createdAt);
      return memberDate.toDateString() === today.toDateString();
    }).length;
    
    const last7DaysCount = members.filter(member => {
      if (!member.createdAt) return false;
      const memberDate = member.createdAt.toDate ? member.createdAt.toDate() : new Date(member.createdAt);
      return memberDate >= last7Days;
    }).length;
    
    const last30DaysCount = members.filter(member => {
      if (!member.createdAt) return false;
      const memberDate = member.createdAt.toDate ? member.createdAt.toDate() : new Date(member.createdAt);
      return memberDate >= last30Days;
    }).length;

    return {
      total,
      today: todayCount,
      last7Days: last7DaysCount,
      last30Days: last30DaysCount
    };
  };

  const stats = calculateStatistics(filteredMembers);

  useEffect(() => {
    applyFilters();
  }, [selectedProgramFilter, dateRange, searchText, allMembersData]);

  useEffect(() => {
    onGridReady();
  }, []);

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 100,
  };

  const onGridReady = useCallback(async (params) => {
    getMemberData();
  }, []);

  const generatePdfData = () => {
    setIsOpen(true);
  };

  const getSelectedProgramData = () => {
    if (selectedProgramFilter === 'all') {
      return {
        hiname: 'सभी योजना',
        englishName: 'All Programs'
      };
    }
    return programList.find(p => p.id === selectedProgramFilter) || {};
  };

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const getPdfFileName = () => {
  let fileName = 'Member_List';
  
  // Agent name add करें
  if (agentInfo?.displayName) {
    const agentName = agentInfo.displayName.replace(/\s+/g, '_');
    fileName += `_${agentName}`;
  }
  
  // Program filter add करें
  if (selectedProgramFilter === 'all') {
    fileName += '_All_Programs';
  } else {
    const selectedProgram = programList.find(p => p.id === selectedProgramFilter);
    if (selectedProgram) {
      const programName = (selectedProgram.hiname || selectedProgram.englishName || selectedProgram.name).replace(/\s+/g, '_');
      fileName += `_${programName}`;
    }
  }
  
  // Date range add करें
  if (dateRange && dateRange[0] && dateRange[1]) {
    const startDate = dateRange[0].format('DDMMYYYY');
    const endDate = dateRange[1].format('DDMMYYYY');
    fileName += `_${startDate}_to_${endDate}`;
  }
  
  // Current timestamp add करें
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  fileName += `_${timestamp}`;
  
  return `${fileName}.pdf`;
};
  const deleteFile = async (fileURL) => {
    if (!fileURL) return; 
    const fileRef = ref(storage, fileURL);
    await deleteObject(fileRef);
  };
const handleDelete = async () => {
  try {
    setDeleteLoading(true);

    // 1. Storage Deletion (Keep outside transaction)
    const fileUrls = [
      selectedMember.photoURL,
      selectedMember.extraImageURL,
      selectedMember.documentFrontURL,
      selectedMember.documentBackURL,
      selectedMember.guardianDocumentURL
    ];

    for (const url of fileUrls) {
      if (url && url.trim() !== "") {
        try {
          const fileRef = ref(storage, url);
          await deleteObject(fileRef);
        } catch (e) { console.warn("Storage cleanup skip:", e.message); }
      }
    }

    // 2. Transaction: READ everything first, then WRITE everything
    await runTransaction(db, async (transaction) => {
      const memberRef = doc(db, `users/${user.uid}/programs/${selectedMember.programId}/members`, selectedMember.id);
      const programRef = doc(db, `users/${user.uid}/programs/${selectedMember.programId}`);
      
      // --- ALL READS FIRST ---
      const memberDoc = await transaction.get(memberRef);
      if (!memberDoc.exists()) throw new Error("Member not found.");
      
      const programDoc = await transaction.get(programRef);
      const memberData = memberDoc.data();
      
      let agentDoc = null;
      let agentRef = null;
      if (memberData.agentId) {
        agentRef = doc(db, `users/${user.uid}/agents`, memberData.agentId);
        agentDoc = await transaction.get(agentRef);
      }

      // --- ALL WRITES SECOND ---
      
      // Only decrease counts if the member was currently "accepted"
      if (memberData.status === "accepted") {
        // Update Program Count
        if (programDoc.exists()) {
          const currentCount = programDoc.data().memberCount || 0;
          transaction.update(programRef, {
            memberCount: Math.max(currentCount - 1, 0)
          });
        }

        // Update Agent Count
        if (agentDoc && agentDoc.exists()) {
          const programCounts = agentDoc.data().programCounts || {};
          const currentAgentCount = programCounts[selectedMember.programId] || 0;
          
          transaction.update(agentRef, {
            [`programCounts.${selectedMember.programId}`]: Math.max(currentAgentCount - 1, 0)
          });
        }
      }
 
      // Final write: Delete the member
      transaction.delete(memberRef);
    });

    message.success("Member and counts updated successfully!");
    getMemberData(); 
  } catch (error) {
    console.error("Delete error:", error);
    message.error(error.message);
  } finally {
    setDeleteLoading(false);
    setIsDeleteModalVisible(false);
  }
};
  return (
    <div>
      {/* Header Section with Filters */}
      <Card className="mb-4">
        <Row gutter={[16, 16]} align="middle">
          <Col span={24}>
            <Row gutter={16} align="middle">
              <Col span={6}>
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-2">Program Filter</h3>
                  <Select
                    style={{ width: '100%' }}
                    value={selectedProgramFilter}
                    onChange={setSelectedProgramFilter}
                    options={[
                      { label: 'All Programs', value: 'all' },
                      ...programList.map(program => ({
                        label: `${program.hiname} (${program.name})`,
                        value: program.id
                      }))
                    ]}
                    size="large"
                  />
                </div>
              </Col>
              <Col span={10}>
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-2">Date Range Filter</h3>
                  <RangePicker
                    style={{ width: '100%' }}
                    onChange={handleDateRangeChange}
                    value={dateRange}
                    size="large"
                    format="DD/MM/YYYY"
                  />
                </div>
              </Col>
              <Col span={6}>
                <div className="flex flex-col">
                  <h3 className="text-lg font-semibold mb-2">Search</h3>
                  <Input
                    placeholder="Search by name, phone, reg no..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    size="large"
                    allowClear
                  />
                </div>
              </Col>
              <Col span={2}>
                <Button
                  type="default"
                  onClick={resetFilters}
                  size="large"
                  style={{ marginTop: 30 }}
                >
                  Reset
                </Button>
              </Col>
            </Row>
          </Col>
          
          <Col span={24}>
            <Row gutter={16}>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Total Members"
                    value={stats.total}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Today"
                    value={stats.today}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Last 7 Days"
                    value={stats.last7Days}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="Last 30 Days"
                    value={stats.last30Days}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* AG Grid Section */}
      <div className='h-[65vh]'>
        <AgGridReact
          ref={gridRef}
          style={{ height: '100%' }}
          rowData={filteredMembers}
          loading={isLoading}
          defaultColDef={defaultColDef}
          overlayLoadingTemplate={'<span class="ag-overlay-loading-center">Loading...</span>'}
          overlayNoRowsTemplate={'<span class="ag-overlay-loading-center">No Data Available</span>'}
          columnDefs={COL_DEFS}
          pagination={true}
          paginationPageSize={20}
          onGridReady={onGridReady}
        />
      </div>

      {/* Download Button */}
      <div className="mt-4 flex justify-between">
        <div className="text-gray-600">
          Showing {filteredMembers.length} of {allMembersData.length} members
          {dateRange && (
            <span className="ml-2">
              | Date Range: {dateRange[0].format('DD/MM/YYYY')} - {dateRange[1].format('DD/MM/YYYY')}
            </span>
          )}
        </div>
        <Button 
          type="primary" 
          onClick={generatePdfData}
          icon={<PlusCircleOutlined />}
          size="large"
        >
          Download Member List
        </Button>
      </div>

      {/* Member Details Modal */}
      <MemberDetailsView 
        isModalVisible={isDetailsView}
        handleCloseModal={() => setIsDetailsView(false)}
        showDeleteConfirm={false}
        selectedMember={selectedMember}
      />

      {/* PDF Drawer */}
      <Drawer
        title={getPdfFileName()}
        width={800}
        placement="right"
        onClose={() => setIsOpen(false)}
        open={isOpen}
        maskClosable={false}
        destroyOnHidden={true}
        keyboard={false}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setIsOpen(false)} size="large">
              Cancel
            </Button>
              <PDFDownloadLink style={{
                background:"#1890ff",
                color:"#fff",
                border:"none",
                padding:"6px 15px",
                borderRadius:"4px",
                fontSize:"16px",
                cursor:"pointer",
            }} fileName={getPdfFileName()} document={<MemberListPdfCom  members={filteredMembers}
  agentInfo={{
    name: agentInfo.displayName,
    phone: agentInfo?.phone || "N/A",
    id: agentId
  }}
  programInfo={getSelectedProgramData()}
  programList={programList}
  dateRange={dateRange}
  searchText={searchText} />} >
                Download Pdf
            </PDFDownloadLink>
          </Space>
        }
      >
     <MemberListPdf 
  members={filteredMembers}
  agentInfo={{
    name: agentInfo.displayName,
    phone: agentInfo?.phone || "N/A",
    id: agentId
  }}
  programInfo={getSelectedProgramData()}
  programList={programList}
  dateRange={dateRange}
  searchText={searchText}
/>
      </Drawer>
           <Modal
        title="Delete Member"
        open={isDeleteModalVisible}
        onCancel={() => setIsDeleteModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsDeleteModalVisible(false)} className="rounded-md">
            Cancel
          </Button>,
          <Button
            key="delete"
            type="primary"
            danger
            loading={deleteLoading}
            onClick={handleDelete}
            className="rounded-md"
          >
            Delete
          </Button>
        ]}
        className="rounded-lg"
      >
        <p>Are you sure you want to delete <strong>{selectedMember?.displayName}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default AgentMembers;