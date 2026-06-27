'use client'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react';
import {
    ClientSideRowModelModule, ModuleRegistry, NumberEditorModule,
    NumberFilterModule, PaginationModule, RowSelectionModule,
    TextEditorModule, TextFilterModule, ValidationModule, RowStyleModule
} from 'ag-grid-community';
import {
    EyeOutlined, EditOutlined, PlusCircleOutlined, FilterOutlined,
    ClearOutlined, CalendarOutlined, FilePdfOutlined, DownloadOutlined
} from '@ant-design/icons';
import { MdOutlinePendingActions } from 'react-icons/md';
import { GrCertificate } from 'react-icons/gr';
import {
    Avatar, Button, Dropdown, Tag, Tooltip, Select,
    DatePicker, Modal, Badge, Divider, message
} from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { getData } from '@/lib/services/firebaseService';
import { useAuth } from '@/lib/AuthProvider';
import { BsThreeDots } from 'react-icons/bs';
import MemberDetailsView from '../MemberDetailsView';
import EditMember from '../EditMember';
import MemberCertificateCom from '../MemberCertificates';
import { FaFile } from 'react-icons/fa';
import MemberRegForm from '../MemberRegForm';
import { setgetMemberDataChange } from '@/redux/slices/commonSlice';
import ClosingForm from './ClosingForm';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { fetchSingleMemberMarriageReport } from '@/lib/helper';
import MemberPaymentDetails from './MemberPaymentDetails';
import MemberExportPDF from './MemberExportPDF';
import JoinFeesMemberList from './JoinFeesCom/JoinFeesMemberList';

dayjs.extend(isBetween);

const { Option } = Select;
const { RangePicker } = DatePicker;

ModuleRegistry.registerModules([
    NumberEditorModule, TextEditorModule, TextFilterModule,
    NumberFilterModule, RowSelectionModule, PaginationModule,
    ClientSideRowModelModule, ValidationModule, RowStyleModule
]);

// ── presets ────────────────────────────────────────────────────────────────────
const DATE_PRESETS = [
    { label: 'This week',     value: [dayjs().startOf('week'),                         dayjs().endOf('week')]                         },
    { label: 'This month',    value: [dayjs().startOf('month'),                        dayjs().endOf('month')]                        },
    { label: 'Last month',    value: [dayjs().subtract(1,'month').startOf('month'),    dayjs().subtract(1,'month').endOf('month')]    },
    { label: 'Last 3 months', value: [dayjs().subtract(3,'month'),                     dayjs()]                                       },
    { label: 'This year',     value: [dayjs().startOf('year'),                         dayjs().endOf('year')]                         },
];

const STATUS_OPTIONS = [
    { value: 'active',   label: 'Active members',  dot: 'bg-green-500' },
    { value: 'blocked',  label: 'Blocked members', dot: 'bg-red-500'   },
];

const GENDER_OPTIONS = [
    { value: 'all',    label: 'All genders' },
    { value: 'male',   label: 'Male'        },
    { value: 'female', label: 'Female'      },
];

const JOIN_FEES_OPTIONS = [
    { value: 'all',     label: 'All members'         },
    { value: 'pending', label: 'Join fees pending'   },
    { value: 'paid',    label: 'Join fees paid'      },
];

// ── helpers ────────────────────────────────────────────────────────────────────
const countActive = ({ gender, agent, dateRange, joinFees }) => {
    let n = 0;
    if (gender   !== 'all')  n++;
    if (agent)               n++;
    if (dateRange)           n++;
    if (joinFees !== 'all')  n++;
    return n;
};

const buildFilterLabel = ({ statusFilter, genderFilter, selectedAgentFilter, dateRange, joinFeesFilter, agentsList }) => {
    const parts = [];
    if (genderFilter !== 'all')   parts.push(genderFilter === 'male' ? 'Male' : 'Female');
    if (selectedAgentFilter)      parts.push(`Agent: ${agentsList?.find(a => a.id === selectedAgentFilter)?.displayName || selectedAgentFilter}`);
    if (joinFeesFilter !== 'all') parts.push(joinFeesFilter === 'pending' ? 'Fees Pending' : 'Fees Paid');
    if (dateRange)                parts.push(`${dateRange[0]?.format('DD/MM/YY')} – ${dateRange[1]?.format('DD/MM/YY')}`);
    return parts;
};

// ── main component ─────────────────────────────────────────────────────────────
const MemberList = () => {
    // data
    const [allMembersData,       setAllMembersData]       = useState([]);
    const [filteredMembersData,  setFilteredMembersData]  = useState([]);
    const [isLoading,            setIsLoading]            = useState(false);

    // selection / sub-modals
    const [selectedMember,       setSelectedMember]       = useState(null);
    const [isDetailsView,        setIsDetailsView]        = useState(false);
    const [isEditmemberOpen,     setIsEditmemberOpen]     = useState(false);
    const [isCertModalOpen,      setIsCertModalOpen]      = useState(false);
    const [isOpenRegModal,       setIsOpenRegModal]       = useState(false);
    const [isOpenClosingForm,    setIsOpenClosingForm]    = useState(false);
    const [isPaymentDetailsOpen, setIsPaymentDetailsOpen] = useState(false);
    const [paymentReport,        setPaymentReport]        = useState(null);
    const [loadingReport,        setLoadingReport]        = useState(false);

    // export PDF modal
    const [isExportOpen,         setIsExportOpen]         = useState(false);

    // filter modal
    const [isFilterModalOpen,    setIsFilterModalOpen]    = useState(false);

    // committed filter values
    const [statusFilter,         setStatusFilter]         = useState('active');
    const [genderFilter,         setGenderFilter]         = useState('all');
    const [selectedAgentFilter,  setSelectedAgentFilter]  = useState(null);
    const [dateRange,            setDateRange]            = useState(null);
    const [joinFeesFilter,       setJoinFeesFilter]       = useState('all');

    // draft values (inside modal)
    const [draftStatus,          setDraftStatus]          = useState('active');
    const [draftGender,          setDraftGender]          = useState('all');
    const [draftAgent,           setDraftAgent]           = useState(null);
    const [draftDateRange,       setDraftDateRange]       = useState(null);
    const [draftJoinFees,        setDraftJoinFees]        = useState('all');

    const [JoinFeesMemberListOpen, setJoinFeesMemberListOpen] = useState(false);
    
    const [isCertDownloading, setIsCertDownloading] = useState(false);


    const dispatch           = useDispatch();
    const memberStatusChange = useSelector(s => s.data.getMemberDataChange);
    const selectedProgram    = useSelector(s => s.data.selectedProgram);
    const agentList          = useSelector(s => s.data.agentList);
    const { agentsList }     = useSelector(s => s.data);
    const { user }           = useAuth();
    const gridRef            = useRef();

    const [windowWidth, setWindowWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : 1200
    );

    const activeFilterCount = countActive({
        gender: genderFilter, agent: selectedAgentFilter,
        dateRange, joinFees: joinFeesFilter
    });

    const defaultColDef = { sortable: true, filter: true, resizable: true, flex: 1, minWidth: 100 };

    // ── filter modal open ──────────────────────────────────────────────────────
    const openFilterModal = () => {
        setDraftStatus(statusFilter);
        setDraftGender(genderFilter);
        setDraftAgent(selectedAgentFilter);
        setDraftDateRange(dateRange);
        setDraftJoinFees(joinFeesFilter);
        setIsFilterModalOpen(true);
    };

    const handleApplyFilters = () => {
        setStatusFilter(draftStatus);
        setGenderFilter(draftGender);
        setSelectedAgentFilter(draftAgent);
        setDateRange(draftDateRange);
        setJoinFeesFilter(draftJoinFees);
        setIsFilterModalOpen(false);
    };

    const handleClearDrafts = () => {
        setDraftStatus('active');
        setDraftGender('all');
        setDraftAgent(null);
        setDraftDateRange(null);
        setDraftJoinFees('all');
    };

    const removeFilter = (key) => {
        if (key === 'gender')    setGenderFilter('all');
        if (key === 'agent')     setSelectedAgentFilter(null);
        if (key === 'dateRange') setDateRange(null);
        if (key === 'joinFees')  setJoinFeesFilter('all');
    };

    // ── core filter logic ──────────────────────────────────────────────────────
    const applyFilters = useCallback((data, opts = {}) => {
        if (!data?.length) return data ?? [];
        const s  = opts.status    ?? statusFilter;
        const g  = opts.gender    ?? genderFilter;
        const ag = opts.agent     ?? selectedAgentFilter;
        const dr = opts.dateRange ?? dateRange;
        const jf = opts.joinFees  ?? joinFeesFilter;

        let out = [...data];

        if (s === 'active')
            out = out.filter(m => m.status === 'accepted' && m.active_flag === true && !m.delete_flag);
        else if (s === 'blocked')
            out = out.filter(m => m.status === 'blocked' && m.active_flag === false && !m.delete_flag);

        if (g !== 'all')
            out = out.filter(m => m.gender?.toLowerCase() === g);

        if (ag)
            out = out.filter(m => m.agentId === ag);

        if (jf === 'pending')
            out = out.filter(m => !m.joinFeesDone);
        else if (jf === 'paid')
            out = out.filter(m => !!m.joinFeesDone);

        if (dr?.[0] && dr?.[1]) {
            const start = dr[0].startOf('day');
            const end   = dr[1].endOf('day');
            out = out.filter(m => {
                if (!m.dateJoin) return false;
                const d = dayjs(m.dateJoin, ['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD', undefined]);
                return d.isValid() && d.isBetween(start, end, null, '[]');
            });
        }

        return out;
    }, [statusFilter, genderFilter, selectedAgentFilter, dateRange, joinFeesFilter]);

    // ── fetch ──────────────────────────────────────────────────────────────────
    const onGridReady = useCallback(async () => {
        if (!selectedProgram) return;
        setIsLoading(true);
        try {
            const memberData = await getData(
                `/users/${user.uid}/programs/${selectedProgram.id}/members`,
                [{ field: 'delete_flag', operator: '==', value: false }],
                { field: 'createdAt', direction: 'desc' }
            );
            dispatch(setgetMemberDataChange(false));
            setAllMembersData(memberData);
            setFilteredMembersData(applyFilters(memberData));
        } catch (e) {
            console.error('Error fetching members:', e);
            message.error('Failed to load members');
        } finally {
            setIsLoading(false);
        }
    }, [selectedProgram, user, applyFilters, dispatch]);

    useEffect(() => {
        if (allMembersData.length) setFilteredMembersData(applyFilters(allMembersData));
    }, [statusFilter, genderFilter, selectedAgentFilter, dateRange, joinFeesFilter, allMembersData, applyFilters]);

    useEffect(() => { onGridReady(); }, [selectedProgram, memberStatusChange]);

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── payment ────────────────────────────────────────────────────────────────
    const handleShowPaymentDetails = async (data) => {
        setSelectedMember(data);
        setLoadingReport(true);
        setIsPaymentDetailsOpen(true);
        try {
            const res = await fetchSingleMemberMarriageReport({
                userId: user.uid, programId: selectedProgram.id, memberId: data.id
            });
            setPaymentReport(res);
        } catch (e) {
            console.error(e);
            message.error('Failed to load payment details');
        } finally {
            setLoadingReport(false);
        }
    };

    // ── draft preview count ────────────────────────────────────────────────────
    const previewCount = applyFilters(allMembersData, {
        status: draftStatus, gender: draftGender, agent: draftAgent,
        dateRange: draftDateRange, joinFees: draftJoinFees
    }).length;

    const draftActiveCount = countActive({
        gender: draftGender, agent: draftAgent,
        dateRange: draftDateRange, joinFees: draftJoinFees
    });

    // ── build active chip labels for toolbar ───────────────────────────────────
    const activeChips = buildFilterLabel({
        statusFilter, genderFilter, selectedAgentFilter, dateRange, joinFeesFilter, agentsList
    });

    // ── current filter summary string (for PDF header) ─────────────────────────
    const filterSummary = (() => {
        const parts = [`Status: ${STATUS_OPTIONS.find(o => o.value === statusFilter)?.label}`];
        if (genderFilter !== 'all')   parts.push(`Gender: ${genderFilter}`);
        if (selectedAgentFilter)      parts.push(`Agent: ${agentsList?.find(a => a.id === selectedAgentFilter)?.displayName || ''}`);
        if (joinFeesFilter !== 'all') parts.push(`Join Fees: ${joinFeesFilter === 'pending' ? 'Pending' : 'Paid'}`);
        if (dateRange)                parts.push(`Date: ${dateRange[0]?.format('DD/MM/YYYY')} – ${dateRange[1]?.format('DD/MM/YYYY')}`);
        return parts.join(' · ');
    })();

    // ── column defs ────────────────────────────────────────────────────────────
    const COL_DEFS = [
        {
            field: 'displayName', cellDataType: 'text', headerName: 'Name', pinned: 'left',
            cellRenderer: ({ data }) => (
                <div className={`flex items-center gap-2 relative ${data.status === 'blocked' ? 'bg-red-50' : ''}`}>
                    <div className={`absolute -left-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full ${!data.joinFeesDone ? 'bg-red-500' : 'bg-green-500'}`} />
                    <Avatar src={data.photoURL} alt={data.displayName} size={30} />
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">{data.displayName}</span>
                        <span className="text-xs text-gray-400">
                            {data.status === 'blocked'  ? 'Blocked'  :
                             data.delete_flag           ? 'Deleted'  :
                             data.status === 'closed'   ? 'Closed'   :
                             data.status === 'accepted' ? 'Active'   : 'Pending'}
                            {!data.joinFeesDone && (
                                <span className="ml-1 text-red-500 font-semibold">· Fees pending</span>
                            )}
                        </span>
                    </div>
                </div>
            )
        },
        { field: 'fatherName',        headerName: 'Father Name',         width: 150, cellDataType: 'text' },
        { field: 'jati',              headerName: 'Surname',             width: 150, cellDataType: 'text' },
        {
            field: 'registrationNumber', headerName: 'Reg. Number', cellDataType: 'text',
            cellRenderer: ({ data }) => <div className="font-semibold">{data.registrationNumber || '—'}</div>
        },
        { field: 'phone', headerName: 'Phone', width: 120, cellDataType: 'text' },
        {
            field: 'gender', headerName: 'Gender', width: 100,
            cellRenderer: ({ data }) => {
                const g = data.gender;
                if (!g) return '—';
                return <Tag color={g === 'male' ? 'blue' : g === 'female' ? 'pink' : 'default'} className="capitalize">{g}</Tag>;
            }
        },
        { field: 'village',       headerName: 'Village',      width: 100, cellDataType: 'text' },
        { field: 'addedByName', headerName: 'Created By', cellRenderer: ({ data }) => <div>{data.addedByName}</div> },
        { field: 'aadhaarNo',   headerName: 'Aadhaar No', cellDataType: 'text' },
        {
            field: 'payAmount', headerName: 'D Amount',
            cellRenderer: ({ data }) => (
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${data.processedColorClass}`} />
                    <span>{data.payAmount}</span>
                </div>
            )
        },
        {
            field: 'joinFeesDone', headerName: 'Join Fees', width: 120,
            cellRenderer: ({ data }) => (
                data.joinFeesDone
                    ? <Tag color="green">Paid</Tag>
                    : <Tag color="red">Pending</Tag>
            )
        },
        { field: 'ageGroupRange', headerName: 'Age Group', width: 130, cellDataType: 'text' },
        {
            field: 'createdAt', headerName: 'Join Date', width: 130,
            cellRenderer: ({ data }) => data.dateJoin || '—'
        },
        {
            field: 'Action', headerName: 'Action', pinned: 'right', width: 150, filter: false,
            cellRenderer: ({ data }) => {
                const isDeleted = data.delete_flag === true;
                const isBlocked = data.status === 'blocked';
                const isClosed  = data.status === 'closed' && data.marriage_flag === true;

                const items = [
                    {
                        key: '0', disabled: isDeleted || isBlocked || isClosed,
                        label: (
                            <Button type="default" size="small"
                                onClick={() => { setSelectedMember(data); setIsOpenClosingForm(true); }}
                                className="flex items-center gap-1 h-8 rounded-lg bg-blue-50 border-blue-200"
                                disabled={isDeleted || isBlocked || isClosed}>
                                <PlusCircleOutlined /> Close Form
                            </Button>
                        ),
                    },
                    {
                        key: '1', disabled: isDeleted,
                        label: (
                            <Button type="default" size="small"
                                onClick={() => { setSelectedMember(data); setIsCertModalOpen(true); }}
                                className="flex items-center gap-1 h-8 rounded-lg bg-blue-50 border-blue-200"
                                disabled={isDeleted}>
                                <GrCertificate /> Certificate
                            </Button>
                        ),
                    },
                    {
                        key: '2', disabled: isDeleted || isBlocked || isClosed,
                        label: (
                            <Button type="default" size="small"
                                onClick={() => handleShowPaymentDetails(data)}
                                className="flex items-center gap-1 h-8 rounded-lg bg-blue-50 border-blue-200"
                                disabled={isDeleted || isBlocked || isClosed}>
                                <MdOutlinePendingActions /> Payment Details
                            </Button>
                        ),
                    },
                    {
                        key: '3', disabled: isDeleted,
                        label: (
                            <Button type="default" size="small"
                                onClick={() => { setSelectedMember(data); setIsOpenRegModal(true); }}
                                className="flex items-center gap-1 h-8 rounded-lg bg-blue-50 border-blue-200"
                                disabled={isDeleted}>
                                <FaFile /> Reg Form
                            </Button>
                        ),
                    },
                ];

                return (
                    <div className="flex items-center gap-2">
                        <Tooltip title="View Details">
                            <Button type="primary" icon={<EyeOutlined />} size="small"
                                onClick={() => { setSelectedMember(data); setIsDetailsView(true); }}
                                className="w-8 h-8 rounded-lg" />
                        </Tooltip>
                        <Tooltip title="Edit">
                            <Button type="default" icon={<EditOutlined />} size="small"
                                onClick={() => { setSelectedMember(data); setIsEditmemberOpen(true); }}
                                className="w-8 h-8 rounded-lg bg-blue-50 border-blue-200"
                                disabled={isDeleted || isBlocked || isClosed} />
                        </Tooltip>
                        <Dropdown menu={{ items: items.filter(i => !i.disabled) }} trigger={['click']}>
                            <Button type="default" icon={<BsThreeDots />} size="small"
                                className="w-8 h-8 rounded-lg bg-blue-50 border-blue-200"
                                disabled={isDeleted} />
                        </Dropdown>
                    </div>
                );
            }
        },
    ];
  const downloadMultipleCertificates = async (membersArray, selectedProgram) => {
        if (!membersArray || membersArray.length === 0) {
            message.warning('No members selected for certificate download');
            return;
        }

        setIsCertDownloading(true);
        const loadingMessage = message.loading('Generating certificates, please wait...', 0);

        const membersData = membersArray.map(member => ({
            ...member,
            agentPhone: agentsList?.find(a => a.id === member.agentId)?.phone || 'N/A',
            agentCode: agentsList?.find(a => a.id === member.agentId)?.agentCode
        }));

        try {
            const response = await fetch('/api/certificate-send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    memberData: membersData,
                    selectedProgram: selectedProgram
                }),
            });

            const data = await response.json();
            
            const binaryString = atob(data.base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            // Open in new tab instead of downloading
            window.open(url, '_blank');
            
            // Clean up after a delay
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
            
            message.success('Certificate generated successfully!');
            
        } catch (error) {
            console.error('Error:', error);
            message.error('Failed to generate certificates. Please try again.');
        } finally {
            loadingMessage();
            setIsCertDownloading(false);
        }
    };
    // ── render ─────────────────────────────────────────────────────────────────
    return (
        <div>
            {/* ── Toolbar ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Filter button */}
                    <Badge count={activeFilterCount} size="small" offset={[-4, 4]}
                        style={{ backgroundColor: '#2563EB' }}>
                        <Button
                            icon={<FilterOutlined />}
                            onClick={openFilterModal}
                            className={`flex items-center gap-1.5 h-9 px-4 rounded-lg font-medium ${
                                activeFilterCount > 0
                                    ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                                    : 'bg-white border-gray-300 text-gray-700'
                            }`}
                        >
                            Filters
                        </Button>
                    </Badge>

                    {/* Active chips */}
                    {genderFilter !== 'all' && (
                        <Tag closable onClose={() => removeFilter('gender')}
                            color={genderFilter === 'male' ? 'blue' : 'pink'}
                            className="h-7 flex items-center capitalize text-xs">
                            {genderFilter}
                        </Tag>
                    )}
                    {selectedAgentFilter && (
                        <Tag closable onClose={() => removeFilter('agent')} color="purple"
                            className="h-7 flex items-center text-xs">
                            Agent: {agentsList?.find(a => a.id === selectedAgentFilter)?.displayName || selectedAgentFilter}
                        </Tag>
                    )}
                    {joinFeesFilter !== 'all' && (
                        <Tag closable onClose={() => removeFilter('joinFees')}
                            color={joinFeesFilter === 'pending' ? 'red' : 'green'}
                            className="h-7 flex items-center text-xs">
                            {joinFeesFilter === 'pending' ? 'Fees Pending' : 'Fees Paid'}
                        </Tag>
                    )}
                    {dateRange && (
                        <Tag closable onClose={() => removeFilter('dateRange')} color="orange"
                            className="h-7 flex items-center text-xs">
                            {dateRange[0]?.format('DD/MM/YY')} – {dateRange[1]?.format('DD/MM/YY')}
                        </Tag>
                    )}
                    {activeFilterCount > 0 && (
                        <Button size="small" type="link" icon={<ClearOutlined />}
                            onClick={() => { setGenderFilter('all'); setSelectedAgentFilter(null); setDateRange(null); setJoinFeesFilter('all'); }}
                            className="text-gray-400 hover:text-red-500 px-1 text-xs">
                            Clear all
                        </Button>
                    )}
                </div>

                {/* Right side: count + export */}
                <div className="flex items-center gap-2">
                    <Tag color="blue" className="text-sm font-medium h-7 flex items-center m-0">
                        {filteredMembersData.length} members
                    </Tag>
                    <Button 
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-red-50 border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400 font-medium"
                    onClick={() => setJoinFeesMemberListOpen(true)}
                    >
                        Join Fees List
                    </Button>
                     <Button
                        icon={<FilePdfOutlined />}
                        onClick={() => downloadMultipleCertificates(filteredMembersData, selectedProgram)}
                        loading={isCertDownloading}
                        disabled={isCertDownloading || filteredMembersData.length === 0}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-green-50 border-green-300 text-green-600 hover:bg-green-100 hover:border-green-400 font-medium"
                    >
                        {isCertDownloading ? 'Generating...' : 'Download Certificates'}
                    </Button>
                    <Button
                        icon={<FilePdfOutlined />}
                        onClick={() => setIsExportOpen(true)}
                        className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-red-50 border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400 font-medium"
                    >
                        Export PDF
                    </Button>
                </div>
            </div>

            {/* ── AG Grid ──────────────────────────────────────────────────── */}
            <div style={{ height: windowWidth < 768 ? '70vh' : '65vh' }}>
                <AgGridReact
                    ref={gridRef}
                    rowData={filteredMembersData}
                    loading={isLoading}
                    defaultColDef={defaultColDef}
                    columnDefs={COL_DEFS}
                    pagination={true}
                    onGridReady={onGridReady}
                    overlayLoadingTemplate='<span class="ag-overlay-loading-center">Loading…</span>'
                    overlayNoRowsTemplate='<span class="ag-overlay-loading-center">No data available</span>'
                />
            </div>

            {/* ════════════════════ FILTER MODAL ════════════════════════════ */}
            <Modal
                open={isFilterModalOpen}
                onCancel={() => setIsFilterModalOpen(false)}
                footer={null}
                width={520}
                centered
                title={
                    <div className="flex items-center gap-2">
                        <FilterOutlined className="text-blue-500" />
                        <span className="font-semibold text-gray-800">Filter members</span>
                        {draftActiveCount > 0 && (
                            <Badge count={draftActiveCount} size="small" style={{ backgroundColor: '#2563EB' }} />
                        )}
                    </div>
                }
            >
                <div className="pt-2 space-y-4">
                    {/* Row: Status + Gender */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Status
                            </label>
                            <Select value={draftStatus} onChange={setDraftStatus} className="w-full" size="middle">
                                {STATUS_OPTIONS.map(o => (
                                    <Option key={o.value} value={o.value}>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-block w-2 h-2 rounded-full ${o.dot}`} />
                                            {o.label}
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                                Gender
                            </label>
                            <Select value={draftGender} onChange={setDraftGender} className="w-full" size="middle">
                                {GENDER_OPTIONS.map(o => (
                                    <Option key={o.value} value={o.value}>{o.label}</Option>
                                ))}
                            </Select>
                        </div>
                    </div>

                    {/* Join Fees Filter */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Join Fees Status
                        </label>
                        <div className="flex gap-2">
                            {JOIN_FEES_OPTIONS.map(o => (
                                <button
                                    key={o.value}
                                    onClick={() => setDraftJoinFees(o.value)}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all cursor-pointer ${
                                        draftJoinFees === o.value
                                            ? o.value === 'pending'
                                                ? 'bg-red-500 text-white border-red-500'
                                                : o.value === 'paid'
                                                    ? 'bg-green-500 text-white border-green-500'
                                                    : 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                                    }`}
                                >
                                    {o.value === 'pending' && <span className="inline-block w-2 h-2 rounded-full bg-current mr-1.5 align-middle" />}
                                    {o.value === 'paid'    && <span className="inline-block w-2 h-2 rounded-full bg-current mr-1.5 align-middle" />}
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Agent */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Agent
                        </label>
                        <Select
                            value={draftAgent}
                            onChange={setDraftAgent}
                            className="w-full"
                            size="middle"
                            placeholder="All agents"
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            filterOption={(inp, opt) => (opt?.label ?? '').toLowerCase().includes(inp.toLowerCase())}
                            options={agentsList?.map(a => ({ value: a.id, label: a.displayName }))}
                            optionRender={(opt) => (
                                <div className="flex items-center gap-2">
                                    <Avatar size={20} style={{ backgroundColor: '#7c3aed', fontSize: 10 }}>
                                        {opt.label?.charAt(0)?.toUpperCase()}
                                    </Avatar>
                                    <span>{opt.label}</span>
                                </div>
                            )}
                        />
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            Join Date Range
                        </label>
                        <RangePicker
                            value={draftDateRange}
                            onChange={setDraftDateRange}
                            className="w-full"
                            size="middle"
                            format="DD/MM/YYYY"
                            allowClear
                            placeholder={['From date', 'To date']}
                            suffixIcon={<CalendarOutlined className="text-orange-400" />}
                        />
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {DATE_PRESETS.map(p => (
                                <button
                                    key={p.label}
                                    onClick={() => setDraftDateRange(p.value)}
                                    className={`px-2.5 py-0.5 text-xs rounded-full border transition-all cursor-pointer ${
                                        draftDateRange?.[0]?.isSame(p.value[0], 'day') &&
                                        draftDateRange?.[1]?.isSame(p.value[1], 'day')
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Divider className="my-0" />

                    {/* Selected chips preview */}
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            Selected filters
                        </p>
                        <div className="flex flex-wrap gap-2 min-h-7">
                            {draftStatus !== 'active' && <Tag color="red" className="text-xs">{STATUS_OPTIONS.find(o=>o.value===draftStatus)?.label}</Tag>}
                            {draftGender !== 'all'    && <Tag color={draftGender==='male'?'blue':'pink'} className="text-xs capitalize">{draftGender}</Tag>}
                            {draftAgent               && <Tag color="purple" className="text-xs">Agent: {agentsList?.find(a=>a.id===draftAgent)?.displayName||draftAgent}</Tag>}
                            {draftJoinFees!=='all'     && <Tag color={draftJoinFees==='pending'?'red':'green'} className="text-xs">{draftJoinFees==='pending'?'Fees Pending':'Fees Paid'}</Tag>}
                            {draftDateRange           && <Tag color="orange" className="text-xs">{draftDateRange[0]?.format('DD/MM/YY')} – {draftDateRange[1]?.format('DD/MM/YY')}</Tag>}
                            {draftActiveCount === 0 && draftStatus === 'active' && (
                                <span className="text-xs text-gray-400 italic">No additional filters</span>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-sm text-gray-500">
                            <span className="font-semibold text-gray-800">{previewCount}</span> members match
                        </span>
                        <div className="flex gap-2">
                            <Button icon={<ClearOutlined />} onClick={handleClearDrafts}>Clear all</Button>
                            <Button type="primary" onClick={handleApplyFilters} className="bg-blue-600 hover:bg-blue-700">
                                Apply filters
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ════════════════════ EXPORT PDF MODAL ════════════════════════ */}
            <MemberExportPDF
                open={isExportOpen}
                onClose={() => setIsExportOpen(false)}
                members={filteredMembersData}
                filterSummary={filterSummary}
                programName={selectedProgram?.name || ''}
            />
            {
                JoinFeesMemberListOpen &&   <JoinFeesMemberList onSuccess={onGridReady} selectedProgram={selectedProgram} agentData={agentsList?.find(a => a.id === draftAgent)} membersData={filteredMembersData} open={JoinFeesMemberListOpen} onClose={() => setJoinFeesMemberListOpen(false)} />
            }
          

            {/* ── member modals ─────────────────────────────────────────────── */}
            <MemberDetailsView
                isModalVisible={isDetailsView}
                handleCloseModal={() => setIsDetailsView(false)}
                showDeleteConfirm={false}
                selectedMember={selectedMember}
            />
            <EditMember
                open={isEditmemberOpen}
                setOpen={setIsEditmemberOpen}
                memberData={selectedMember}
                programId={selectedProgram?.id}
                onSuccess={onGridReady}
            />
            <MemberCertificateCom
                open={isCertModalOpen}
                onClose={() => setIsCertModalOpen(false)}
                memberData={selectedMember}
            />
            <MemberRegForm
                open={isOpenRegModal}
                onClose={() => setIsOpenRegModal(false)}
                memberData={selectedMember}
            />
            {isOpenClosingForm && (
                <ClosingForm
                    open={isOpenClosingForm}
                    onClose={() => setIsOpenClosingForm(false)}
                    memberData={selectedMember}
                    user={user}
                    selectedProgram={selectedProgram}
                    onSuccess={onGridReady}
                />
            )}
            <MemberPaymentDetails
                visible={isPaymentDetailsOpen}
                onClose={() => { setIsPaymentDetailsOpen(false); setPaymentReport(null); }}
                memberData={selectedMember}
                paymentReport={paymentReport}
                loading={loadingReport}
            />
        </div>
    );
};

export default MemberList;