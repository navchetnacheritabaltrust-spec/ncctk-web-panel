'use client';
import { App, DatePicker, Input, Tag, Badge, Tooltip, Modal, Empty, Spin, Steps, Avatar, Divider, Statistic, Card, Row, Col, Alert, Space, Button, Drawer, Form, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getData, createData } from '@/lib/services/firebaseService';
import { useAuth } from '@/lib/AuthProvider';
import { updateDoc, doc, getDocs, query, where, collection, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  DollarOutlined, 
  UserOutlined, 
  CalendarOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CloseOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CreditCardOutlined,
  WalletOutlined,
  AppstoreOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  RocketOutlined
} from '@ant-design/icons';
import { createSearchIndex } from '@/lib/commonFun';

const { Option } = Select;
const { TextArea } = Input;
const { Search } = Input;

const AddPaymentModal = () => {
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [marriages, setMarriages] = useState([]);
    const [filteredMarriages, setFilteredMarriages] = useState([]);
    const [members, setMembers] = useState([]);
    const { message } = App.useApp();
    const [fetchingMarriages, setFetchingMarriages] = useState(false);
    const [fetchingMembers, setFetchingMembers] = useState(false);
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const programList = useSelector((state) => state.data.programList);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [selectedMarriages, setSelectedMarriages] = useState([]);
    const [selectedMember, setSelectedMember] = useState(null);
    const [totalAmount, setTotalAmount] = useState(0);
    const [paymentPendingEntries, setPaymentPendingEntries] = useState([]);
    const [alreadyPaidMarriages, setAlreadyPaidMarriages] = useState([]);
    const [checkingReference, setCheckingReference] = useState(false);
    const [isReferenceValid, setIsReferenceValid] = useState(true);
    const [marriageSearchText, setMarriageSearchText] = useState('');
    const [showPendingOnly, setShowPendingOnly] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [paymentSummary, setPaymentSummary] = useState(null);
    const [quickAmounts] = useState([100, 200, 500, 1000, 2000, 5000]);

    const showDrawer = () => {
        setIsDrawerVisible(true);
        setCurrentStep(0);
    }

    // Check if UTR/Transaction reference already exists
    const checkDuplicateReference = async (reference, programId) => {
        if (!reference || !programId || !user) return false;
        
        try {
            setCheckingReference(true);
            const transactionsRef = collection(
                db,
                `users/${user.uid}/programs/${programId}/transactions`
            );
            
            const exactMatchQuery = query(
                transactionsRef,
                where('onlineReference', '==', reference),
                where('delete_flag', '==', false)
            );
            
            const exactMatchSnapshot = await getDocs(exactMatchQuery);
            
            if (!exactMatchSnapshot.empty) {
                setIsReferenceValid(false);
                return true;
            }
            
            const transactionQuery = query(
                transactionsRef,
                where('transactionNumber', '==', reference),
                where('delete_flag', '==', false)
            );
            
            const transactionSnapshot = await getDocs(transactionQuery);
            
            if (!transactionSnapshot.empty) {
                setIsReferenceValid(false);
                return true;
            }
            
            setIsReferenceValid(true);
            return false;
        } catch (error) {
            console.error('Error checking duplicate reference:', error);
            message.error('Failed to verify reference number');
            setIsReferenceValid(false);
            return true;
        } finally {
            setCheckingReference(false);
        }
    };

    // Get all payment information for selected member
    const fetchMemberPaymentInfo = async (memberId) => {
        if (!memberId || !selectedProgram || !user) return;
        
        try {
            const paymentPendingRef = collection(
                db,
                `users/${user.uid}/programs/${selectedProgram.id}/payment_pending`
            );
            
            const pendingQuery = query(
                paymentPendingRef,
                where('memberId', '==', memberId),
                where('status', '==', 'pending'),
                where('delete_flag', '==', false)
            );
            
            const pendingSnapshot = await getDocs(pendingQuery);
            const pendingEntries = pendingSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPaymentPendingEntries(pendingEntries);
            
            const transactionsRef = collection(
                db,
                `users/${user.uid}/programs/${selectedProgram.id}/transactions`
            );
            
            const paidQuery = query(
                transactionsRef,
                where('payerId', '==', memberId),
                where('status', '==', 'completed'),
                where('delete_flag', '==', false)
            );
            
            const paidSnapshot = await getDocs(paidQuery);
            const paidEntries = paidSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            const alreadyPaidIds = [...new Set(paidEntries.map(t => t.marriageId))];
            setAlreadyPaidMarriages(alreadyPaidIds);
            
            return { pendingEntries, alreadyPaidIds };
            
        } catch (error) {
            console.error('Error fetching payment info:', error);
            message.error('Failed to load payment information');
            return { pendingEntries: [], alreadyPaidIds: [] };
        }
    };

    // Update pending payment entries after transaction
    const updatePendingPaymentEntries = async (transactions) => {
        try {
            const batch = writeBatch(db);
            
            for (const transaction of transactions) {
                const { marriageId, payerId, transactionId } = transaction;
                
                const paymentPendingRef = doc(
                    db,
                    `users/${user.uid}/programs/${selectedProgram.id}/payment_pending`,
                    `${marriageId}_${payerId}`
                );
                
                const updateData = {
                    status: 'paid',
                    paymentDate: dayjs().toISOString(),
                    transactionId: transactionId,
                    updatedAt: new Date().toISOString(),
                    paidAmount: transaction.amount,
                    paymentMethod: paymentMethod,
                    ...(paymentMethod === 'online' && {
                        onlineReference: form.getFieldValue('onlineReference')
                    })
                };
                
                batch.update(paymentPendingRef, updateData);
            }
            
            await batch.commit();
            
        } catch (error) {
            console.error('Error updating pending payment entries:', error);
            throw error;
        }
    };

    const handleSubmit = async (values) => {
        if (!selectedProgram || !user) {
            message.error("Please select a program first");
            return;
        }

        if (!selectedMarriages.length) {
            message.error("Please select at least one marriage");
            return;
        }

        if (!selectedMember) {
            message.error("Please select a paying member");
            return;
        }

        if (values.paymentMethod === 'online') {
            if (!values.onlineReference?.trim()) {
                message.error("Please enter transaction reference/UTR number");
                return;
            }

            const isDuplicate = await checkDuplicateReference(values.onlineReference, selectedProgram.id);
            
            if (isDuplicate) {
                Modal.error({
                    title: 'Duplicate Transaction Reference',
                    content: `The reference "${values.onlineReference}" already exists. Please use a unique reference number.`,
                    okText: 'Got it',
                    okButtonProps: { className: 'bg-blue-500' }
                });
                return;
            }
        }

        const alreadyPaidSelected = selectedMarriages.filter(id => 
            alreadyPaidMarriages.includes(id)
        );
        
        if (alreadyPaidSelected.length > 0) {
            const remainingCount = selectedMarriages.length - alreadyPaidSelected.length;
            
            if (remainingCount === 0) {
                message.warning('All selected Closings are already paid');
                return;
            }
            
            Modal.confirm({
                title: 'Already Paid Closings',
                content: (
                    <div>
                        <p>{alreadyPaidSelected.length} Closings are already paid.</p>
                        <p className="font-medium text-green-600">Continue with {remainingCount} remaining?</p>
                    </div>
                ),
                okText: 'Continue',
                cancelText: 'Cancel',
                okButtonProps: { className: 'bg-blue-500' },
                onOk: async () => {
                    const filteredMarriages = selectedMarriages.filter(id => 
                        !alreadyPaidMarriages.includes(id)
                    );
                    await processPayment(filteredMarriages, values);
                }
            });
            return;
        }

        await processPayment(selectedMarriages, values);
    };

    const processPayment = async (marriageIds, values) => {
        const amount = Number(values.amount);
        const marriageCount = marriageIds.length;
        const individualAmount = marriageCount > 0 ? amount / marriageCount : amount;

        setLoading(true);
        try {
            const transactions = [];
            const timestamp = Date.now();
            const batchId = Math.random().toString(36).substr(2, 6).toUpperCase();
            
            for (let i = 0; i < marriageIds.length; i++) {
                const marriageId = marriageIds[i];
                const marriage = marriages.find(m => m.id === marriageId);
                const member = members.find(m => m.id === selectedMember);
                
                const transactionNumber = `TRX-${timestamp}-${batchId}-${(i + 1).toString().padStart(3, '0')}`;
                
                const transactionData = {
                    amount:member.payAmount || individualAmount,
                    paymentMethod: values.paymentMethod,
                    paymentDate: dayjs(values.paymentDate).toISOString(),
                    note: values.note || '',
                    status: 'completed',
                    createdAt: dayjs().toISOString(),
                    updatedAt: dayjs().toISOString(),
                    programId: selectedProgram.id,
                    programName: selectedProgram.name,
                    payerId: selectedMember,
                    payerName: member?.displayName || '',
                    payerFatherName: member?.fatherName || '',
                    payerRegistrationNumber: member?.registrationNumber || '',
                    payerPhone: member?.phone || '',
                    payerAadhaarNo: member?.aadhaarNo || '',
                    marriageId: marriageId,
                    marriageMemberName: marriage?.displayName || '',
                    marriageFatherName: marriage?.fatherName || '',
                    marriageRegistrationNumber: marriage?.registrationNumber || '',
                    marriageDate: marriage?.date || '',
                    marriageClosingAt: marriage?.closingAt || '',
                    marriageStatus: marriage?.status || '',
                    paymentPendingId: `${marriageId}_${selectedMember}`,
                    ...(values.paymentMethod === 'online' && {
                        onlineReference: values.onlineReference,
                        onlineVerified: false
                    }),
                    createdBy: user.uid,
                    active_flag: true,
                    delete_flag: false,
                    transactionType: 'marriage_payment',
                    transactionNumber: transactionNumber,
                    batchId: `BATCH-${batchId}`,
                    sequenceNumber: i + 1,
                    search_keywords: createSearchIndex([
                        member?.displayName,
                        member?.fatherName,
                        member?.registrationNumber,
                        marriage?.displayName,
                        marriage?.fatherName,
                        marriage?.registrationNumber,
                        selectedProgram.name,
                        transactionNumber,
                        member?.phone,
                        values.onlineReference || ''
                    ])
                };

                const transactionId = await createData(
                    `/users/${user.uid}/programs/${selectedProgram.id}/transactions`,
                    transactionData
                );
                
                transactions.push({
                    marriageId,
                    payerId: selectedMember,
                    transactionId,
                    amount: individualAmount,
                    paymentDate: dayjs(values.paymentDate).toISOString(),
                    transactionNumber: transactionNumber
                });
            }
            
            const pendingEntriesToUpdate = transactions.filter(t => 
                paymentPendingEntries.some(p => 
                    p.closingMemberId === t.marriageId && p.memberId === t.payerId
                )
            );
            
            if (pendingEntriesToUpdate.length > 0) {
                await updatePendingPaymentEntries(pendingEntriesToUpdate);
            }
            
            setPaymentSummary({
                count: transactions.length,
                amount: amount,
                method: values.paymentMethod,
                reference: values.onlineReference
            });
            
            message.success({
                content: (
                    <div>
                        <div className="font-medium">Payment Successful!</div>
                        <div className="text-xs">Processed {transactions.length} payment(s) of ₹{amount}</div>
                    </div>
                ),
                duration: 3,
            });
            
            setTimeout(() => {
                handleCloseDrawer();
            }, 2000);
            
        } catch (error) {
            console.error('Error saving payments:', error);
            message.error('Failed to save payments. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getClosingData = async () => {
        setFetchingMarriages(true);
        if (!user || !selectedProgram) {
            setFetchingMarriages(false);
            return;
        }
        try {
            const memberData = await getData(
                `/users/${user.uid}/programs/${selectedProgram?.id}/members`,
                [
                    { field: 'active_flag', operator: '==', value: true },
                    { field: 'delete_flag', operator: '==', value: false },
                    { field: 'marriage_flag', operator: '==', value: true },
                    { field: 'status', operator: 'in', value: ['closed', "accepted"] }
                ],
                { field: 'closingAt', direction: 'desc' }
            );
            setMarriages(memberData);
            setFilteredMarriages(memberData);
        } catch (error) {
            console.error("Error fetching closing data:", error);
            message.error("Failed to fetch marriages");
        } finally {
            setFetchingMarriages(false);
        }
    };

    const getmemberData = async () => {
        setFetchingMembers(true);
        try {
            const memberData = await getData(
                `/users/${user.uid}/programs/${selectedProgram?.id}/members`,
                [
                    { field: 'active_flag', operator: '==', value: true },
                    { field: 'delete_flag', operator: '==', value: false },
                    { field: 'status', operator: '==', value: 'accepted' }
                ],
                { field: 'createdAt', direction: 'desc' }
            );
            setMembers(memberData);
        } catch (error) {
            console.error('Error fetching members:', error);
            message.error('Failed to fetch members');
        } finally {
            setFetchingMembers(false);
        }
    }

    useEffect(() => {
        if (selectedProgram) {
            getClosingData();
            getmemberData();
        }
    }, [selectedProgram]);

    useEffect(() => {
        if (selectedMember && selectedProgram) {
            fetchMemberPaymentInfo(selectedMember);
        }
    }, [selectedMember, selectedProgram]);

    // Filter marriages based on search and filter
    useEffect(() => {
        let filtered = [...marriages];
        
        if (marriageSearchText) {
            const searchLower = marriageSearchText.toLowerCase();
            filtered = filtered.filter(m => 
                m.displayName?.toLowerCase().includes(searchLower) ||
                m.fatherName?.toLowerCase().includes(searchLower) ||
                m.registrationNumber?.toLowerCase().includes(searchLower)
            );
        }
        
        if (showPendingOnly && selectedMember) {
            const pendingIds = paymentPendingEntries
                .filter(p => p.memberId === selectedMember)
                .map(p => p.closingMemberId);
            filtered = filtered.filter(m => pendingIds.includes(m.id));
        }
        
        filtered = filtered.filter(m => !alreadyPaidMarriages.includes(m.id));
        
        setFilteredMarriages(filtered);
    }, [marriageSearchText, showPendingOnly, marriages, paymentPendingEntries, selectedMember, alreadyPaidMarriages]);

    const handleMemberSelect = async (memberId) => {
        setSelectedMember(memberId);
        setSelectedMarriages([]);
        setMarriageSearchText('');
        setShowPendingOnly(false);
        
        const member = members.find(m => m.id === memberId);
        form.setFieldsValue({ amount: member?.payAmount || 200 });
        
        const { pendingEntries, alreadyPaidIds } = await fetchMemberPaymentInfo(memberId);
        
        if (alreadyPaidIds.length > 0) {
            message.info(`${alreadyPaidIds.length} marriage(s) already paid`, 2);
        }
        
        setCurrentStep(1);
    };

    const handleAmountChange = (value) => {
        const amount = Number(value) || 0;
        const count = selectedMarriages.length || 1;
        setTotalAmount(amount * count);
    };

    const handleSelectAllPending = () => {
        const pendingMarriageIds = paymentPendingEntries
            .filter(entry => entry.memberId === selectedMember)
            .map(entry => entry.closingMemberId)
            .filter(id => !alreadyPaidMarriages.includes(id));
        
        const availableIds = marriages
            .filter(m => pendingMarriageIds.includes(m.id))
            .map(m => m.id);
        
        if (availableIds.length === 0) {
            message.info('No pending payments available');
            return;
        }
        
        setSelectedMarriages(availableIds);
        message.success(`Selected ${availableIds.length} pending payment(s)`);
    };

    const handleCloseDrawer = () => {
        setIsDrawerVisible(false);
        form.resetFields();
        setPaymentMethod('cash');
        setSelectedProgram(null);
        setMarriages([]);
        setFilteredMarriages([]);
        setMembers([]);
        setSelectedMarriages([]);
        setSelectedMember(null);
        setTotalAmount(0);
        setPaymentPendingEntries([]);
        setAlreadyPaidMarriages([]);
        setIsReferenceValid(true);
        setMarriageSearchText('');
        setShowPendingOnly(false);
        setCurrentStep(0);
        setPaymentSummary(null);
    };

    const handleReferenceChange = async (e) => {
        const value = e.target.value;
        form.setFieldsValue({ onlineReference: value });
        
        if (value && value.length >= 3) {
            await checkDuplicateReference(value, selectedProgram?.id);
        } else {
            setIsReferenceValid(true);
        }
    };

    const handleQuickAmount = (amount) => {
        form.setFieldsValue({ amount });
        handleAmountChange(amount);
    };

    const handleNextStep = () => {
        if (currentStep === 0 && !selectedProgram) {
            message.warning('Please select a program');
            return;
        }
        if (currentStep === 1 && !selectedMember) {
            message.warning('Please select a member');
            return;
        }
        if (currentStep === 2 && selectedMarriages.length === 0) {
            message.warning('Please select at least one marriage');
            return;
        }
        setCurrentStep(currentStep + 1);
    };

    const handlePrevStep = () => {
        setCurrentStep(currentStep - 1);
    };

    const getStats = () => {
        const totalSelected = selectedMarriages.length;
        const pendingSelected = paymentPendingEntries.filter(p => 
            selectedMarriages.includes(p.closingMemberId) && p.memberId === selectedMember
        ).length;
        const perAmount = form.getFieldValue('amount') || 0;
        
        return {
            totalSelected,
            pendingSelected,
            newPayments: totalSelected - pendingSelected,
            perAmount,
            totalAmount: perAmount * totalSelected,
            availableMarriages: filteredMarriages.length,
            pendingCount: paymentPendingEntries.filter(p => p.memberId === selectedMember).length,
            paidCount: alreadyPaidMarriages.length
        };
    };

    const stats = getStats();

    const getSelectedMemberDetails = () => {
        if (!selectedMember) return null;
        return members.find(m => m.id === selectedMember);
    };

    const memberDetails = getSelectedMemberDetails();

    // Custom option renderer for select to fix value display
    const renderProgramOption = (program) => (
     
            <div className="flex items-center gap-3 py-1  text-blue-700!">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <AppstoreOutlined className=" text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-black">{program.name}</div>
                    {program.description && (
                        <div className="text-xs text-gray-500 truncate">{program.description}</div>
                    )}
                </div>
            </div>
      
    );

    const renderMemberOption = (member) => {
        const pendingCount = paymentPendingEntries.filter(p => p.memberId === member.id).length;
        return (
         
                <div className="flex items-center gap-3 py-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center  text-xs font-bold flex-shrink-0">
                        {member.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{member.displayName}</span>
                            {pendingCount > 0 && (
                                <Badge 
                                    count={pendingCount} 
                                    className="flex-shrink-0"
                                    style={{ backgroundColor: '#f97316', fontSize: '10px' }}
                                />
                            )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                            {member.registrationNumber} • {member.fatherName}
                        </div>
                    </div>
                </div>
    
        );
    };

    // Marriage selection card render with fixed spacing
    const renderMarriageCard = (marriage) => {
        const isPending = paymentPendingEntries.some(p => 
            p.closingMemberId === marriage.id && p.memberId === selectedMember
        );
        const isSelected = selectedMarriages.includes(marriage.id);
        const selectionIndex = selectedMarriages.findIndex(id => id === marriage.id) + 1;
        console.log(marriage,"marriage")
        return (
            <div
                key={marriage.id}
                onClick={() => {
                    if (isSelected) {
                        setSelectedMarriages(prev => prev.filter(id => id !== marriage.id));
                    } else {
                        setSelectedMarriages(prev => [...prev, marriage.id]);
                    }
                }}
                className={`
                    relative p-3 mb-2 rounded-lg border-2 cursor-pointer transition-all
                    ${isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }
                `}
                style={{ minHeight: '70px' }}
            >
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                        ${isPending ? 'bg-orange-100' : 'bg-gray-100'}
                        ${isSelected ? 'bg-blue-100' : ''}
                    `}>
                        {isPending ? (
                            <CalendarOutlined className="text-orange-500 text-sm" />
                        ) : (
                            <UserOutlined className="text-gray-500 text-sm" />
                        )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm truncate">
                                {marriage.displayName}
                            </span>
                            {isPending && (
                                <Badge 
                                    count="PENDING" 
                                    className="flex-shrink-0"
                                    style={{ 
                                        backgroundColor: '#f97316', 
                                        fontSize: '9px', 
                                        height: '18px', 
                                        lineHeight: '18px',
                                        padding: '0 6px'
                                    }} 
                                />
                            )}
                        </div>
                        
                        <div className="text-xs text-gray-500 space-y-0.5">
                            <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-mono">{marriage.registrationNumber}</span>
                                <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0"></span>
                                <span className="truncate"> {marriage.fatherName}</span>
                            </div>
                            {marriage.closing_date && (
                                <div className="flex items-center gap-1">
                                    <CalendarOutlined className="text-xs flex-shrink-0" />
                                    <span className="truncate">
                                        Closing: {marriage.closing_date}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ml-1">
                            {selectionIndex}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Step content renderers with fixed spacing
    const renderStep0 = () => (
        <div className="space-y-4">
            <div className="text-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <RocketOutlined className="text-white text-xl" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">Select Program</h3>
                <p className="text-xs text-gray-500">Choose the program for payment</p>
            </div>

            <Form.Item
                name="program"
                rules={[{ required: true, message: 'Select program' }]}
                className="mb-0"
            >
                <Select
                    placeholder="Select program"
                    size="large"
                    onChange={(value) => {
                        const program = programList.find(p => p.id === value);
                        setSelectedProgram(program);
                        // Update form field value to show in select
                        form.setFieldsValue({ program: value });
                    }}
                    value={selectedProgram?.id}
                    className="w-full"
                    popupMatchSelectWidth ={false}
                    optionLabelProp="label"
                >
                    {programList.map(program => (
                        <Option 
                            key={program.id} 
                            value={program.id}
                            label={program.name}
                        >
                            {renderProgramOption(program)}
                        </Option>
                    ))}
                </Select>
            </Form.Item>

            {selectedProgram && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-2">
                        <InfoCircleOutlined className="text-blue-500 text-sm mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-blue-700 mb-0.5">Program Selected</p>
                            <p className="text-xs text-blue-600 truncate">{selectedProgram.name}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep1 = () => (
        <div className="space-y-4">
            <div className="text-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <TeamOutlined className="text-white text-xl" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">Select Payer</h3>
                <p className="text-xs text-gray-500">Choose who is making the payment</p>
            </div>

            <Form.Item
                name="member"
                rules={[{ required: true, message: 'Select member' }]}
                className="mb-0"
            >
                <Select
                    loading={fetchingMembers}
                    placeholder="Search member..."
                    size="large"
                    showSearch
                    filterOption={(input, option) => {
                        const searchText = option['data-search'] || '';
                        return searchText.toLowerCase().includes(input.toLowerCase());
                    }}
                    onChange={handleMemberSelect}
                    value={selectedMember}
                    disabled={!selectedProgram}
                    className="w-full"
                    notFoundContent={fetchingMembers ? <Spin size="small" /> : 'No members found'}
                    dropdownMatchSelectWidth={false}
                    optionLabelProp="label"
                >
                    {members.map(member => (
                        <Option 
                            key={member.id} 
                            value={member.id}
                            label={member.displayName}
                            data-search={`${member.displayName} ${member.fatherName} ${member.registrationNumber} ${member.phone}`}
                        >
                            {renderMemberOption(member)}
                        </Option>
                    ))}
                </Select>
            </Form.Item>

            {memberDetails && (
                <div className="mt-3 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                            {memberDetails.displayName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 text-sm truncate">{memberDetails.displayName}</h4>
                            <p className="text-xs text-gray-500 truncate">{memberDetails.registrationNumber}</p>
                            <div className="flex gap-1 mt-1 flex-wrap">
                                <Tag color="blue" className="text-xs m-0">₹{memberDetails.payAmount || 200}</Tag>
                                {stats.pendingCount > 0 && (
                                    <Tag color="orange" className="text-xs m-0">{stats.pendingCount} Pending</Tag>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-4">
            <div className="text-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <UnorderedListOutlined className="text-white text-xl" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">Select closings</h3>
                <p className="text-xs text-gray-500">Choose closings to process payment for</p>
            </div>

            {/* Stats Cards - Fixed spacing */}
            <Row gutter={[8, 8]} className="mb-3">
                <Col span={8}>
                    <Card size="small" className="text-center bg-green-50 border-green-100" bodyStyle={{ padding: '8px' }}>
                        <Statistic 
                            title={<span className="text-xs text-green-600">Available</span>}
                            value={stats.availableMarriages}
                            valueStyle={{ fontSize: '16px', color: '#10b981', fontWeight: 600 }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" className="text-center bg-orange-50 border-orange-100" bodyStyle={{ padding: '8px' }}>
                        <Statistic 
                            title={<span className="text-xs text-orange-600">Pending</span>}
                            value={stats.pendingCount}
                            valueStyle={{ fontSize: '16px', color: '#f97316', fontWeight: 600 }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" className="text-center bg-blue-50 border-blue-100" bodyStyle={{ padding: '8px' }}>
                        <Statistic 
                            title={<span className="text-xs text-blue-600">Selected</span>}
                            value={stats.totalSelected}
                            valueStyle={{ fontSize: '16px', color: '#3b82f6', fontWeight: 600 }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Search and Filters - Fixed spacing */}
            <div className="flex gap-2">
                <Search
                    placeholder="Search by name or registration"
                    value={marriageSearchText}
                    onChange={(e) => setMarriageSearchText(e.target.value)}
                    className="flex-1"
                    allowClear
                    size="middle"
                />
                <Tooltip title={showPendingOnly ? "Show All" : "Show Pending Only"}>
                    <Button
                        type={showPendingOnly ? "primary" : "default"}
                        icon={<FilterOutlined />}
                        onClick={() => setShowPendingOnly(!showPendingOnly)}
                        className={showPendingOnly ? 'bg-orange-500' : ''}
                        size="middle"
                    />
                </Tooltip>
            </div>

            {/* Quick Actions - Fixed spacing */}
            {stats.pendingCount > 0 && (
                <div className="flex items-center justify-between bg-orange-50 p-2 rounded-lg">
                    <span className="text-xs text-orange-600">{stats.pendingCount} pending payments</span>
                    <Button 
                        type="link" 
                        size="small" 
                        onClick={handleSelectAllPending}
                        className="text-orange-600 p-0 h-auto text-xs font-medium"
                    >
                        Select All Pending
                    </Button>
                </div>
            )}

            {/* Marriage List - Fixed height and spacing */}
            <div className="border rounded-lg bg-gray-50 p-2" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {fetchingMarriages ? (
                    <div className="text-center py-8">
                        <Spin size="small" />
                        <p className="text-xs text-gray-500 mt-2">Loading marriages...</p>
                    </div>
                ) : filteredMarriages.length === 0 ? (
                    <Empty 
                        description={
                            <span className="text-xs text-gray-500">
                                {marriageSearchText ? 'No matches found' : 'No marriages available'}
                            </span>
                        }
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        className="py-6"
                    />
                ) : (
                    <div className="space-y-2">
                        {filteredMarriages.map(renderMarriageCard)}
                    </div>
                )}
            </div>

            {/* Selection Summary - Fixed spacing */}
            {selectedMarriages.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs text-blue-600 block">Selected Closing</span>
                            <span className="text-lg font-bold text-blue-700">{selectedMarriages.length}</span>
                        </div>
                        <Button 
                            type="text" 
                            size="small" 
                            onClick={() => setSelectedMarriages([])}
                            className="text-blue-600"
                            icon={<CloseOutlined />}
                        >
                            Clear All
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-4">
            <div className="text-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <DollarOutlined className="text-white text-xl" />
                </div>
                <h3 className="text-base font-semibold text-gray-800">Payment Details</h3>
                <p className="text-xs text-gray-500">Enter payment information</p>
            </div>

            {/* Payment Summary Card - Fixed padding */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 mb-3" bodyStyle={{ padding: '12px' }}>
                <div className="text-center">
                    <div className="text-xs text-blue-600 mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-blue-700">₹{stats.totalAmount}</div>
                    <div className="text-xs text-blue-500 mt-1">
                        {stats.totalSelected} × ₹{stats.perAmount}
                    </div>
                </div>
            </Card>

         

            <Row gutter={12}>
                <Col span={12}>
                    <Form.Item
                        name="amount"
                        label={<span className="text-xs font-medium">Per Marriage</span>}
                        rules={[
                            { required: true, message: 'Enter amount' },
                            {
                                validator: (_, value) => {
                                    const num = Number(value);
                                    if (num <= 0) return Promise.reject('Amount must be > 0');
                                    return Promise.resolve();
                                }
                            }
                        ]}
                    >
                        <Input
                            type="number"
                            placeholder="200"
                            prefix={<span className="text-gray-400">₹</span>}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            size="middle"
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        name="paymentMethod"
                        label={<span className="text-xs font-medium">Method</span>}
                        rules={[{ required: true }]}
                    >
                        <Select 
                            onChange={setPaymentMethod}
                            size="middle"
                            value={paymentMethod}
                        >
                            <Option value="cash">
                                <div className="flex items-center gap-2">
                                    <WalletOutlined className="text-green-500" />
                                    <span>Cash</span>
                                </div>
                            </Option>
                            <Option value="online">
                                <div className="flex items-center gap-2">
                                    <CreditCardOutlined className="text-blue-500" />
                                    <span>Online</span>
                                </div>
                            </Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item
                name="paymentDate"
                label={<span className="text-xs font-medium">Payment Date</span>}
                rules={[{ required: true, message: 'Select date' }]}
            >
                <DatePicker 
                    className="w-full" 
                    format="DD/MM/YYYY" 
                    size="middle"
                    suffixIcon={<CalendarOutlined className="text-gray-400" />}
                />
            </Form.Item>

            {paymentMethod === 'online' && (
                <Form.Item
                    name="onlineReference"
                    label={<span className="text-xs font-medium">Transaction Reference</span>}
                    rules={[
                        { required: true, message: 'Enter reference' },
                        { min: 3, message: 'Min 3 characters' }
                    ]}
                    validateStatus={!isReferenceValid ? 'error' : checkingReference ? 'validating' : ''}
                    help={!isReferenceValid && 'Reference already exists'}
                >
                    <Input
                        placeholder="UTR/Transaction ID"
                        onChange={handleReferenceChange}
                        size="middle"
                        suffix={
                            checkingReference ? (
                                <Spin size="small" />
                            ) : isReferenceValid && form.getFieldValue('onlineReference') ? (
                                <CheckCircleOutlined className="text-green-500" />
                            ) : !isReferenceValid ? (
                                <WarningOutlined className="text-red-500" />
                            ) : null
                        }
                    />
                </Form.Item>
            )}

            <Form.Item name="note" label={<span className="text-xs font-medium">Note (Optional)</span>}>
                <TextArea
                    rows={2}
                    placeholder="Add notes..."
                    maxLength={200}
                    showCount
                    size="middle"
                />
            </Form.Item>

            {/* Final Summary - Fixed spacing */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-3">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">Selected Closing</span>
                    <span className="text-sm font-medium">{selectedMarriages.length}</span>
                </div>
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">Amount per Marriage</span>
                    <span className="text-sm font-medium">₹{form.getFieldValue('amount') || 0}</span>
                </div>
                <Divider className="my-2" />
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Payable</span>
                    <span className="text-lg font-bold text-green-600">₹{stats.totalAmount}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div>
            <Button 
                type="primary" 
                onClick={showDrawer} 
                icon={<DollarOutlined />}
                size="middle"
                className="bg-gradient-to-r from-green-500 to-blue-500 border-0 shadow-lg hover:shadow-xl transition-all"
            >
                ADD PAYMENT
            </Button>
            
            <Drawer
                title={
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center shadow">
                            <DollarOutlined className="text-white text-sm" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold m-0">Record Payment</h3>
                            <p className="text-xs text-gray-400 m-0">Process marriage payments</p>
                        </div>
                    </div>
                }
                placement="right"
                onClose={handleCloseDrawer}
                open={isDrawerVisible}
                width={480}
                closable={true}
                destroyOnHidden
                className="rounded-l-xl overflow-hidden"
                footer={
                    <div className="border-t pt-3">
                        {/* Steps Indicator - Fixed size */}
                        <Steps 
                            current={currentStep} 
                            size="small" 
                            className="mb-3"
                            items={[
                                { title: 'Program', icon: <AppstoreOutlined /> },
                                { title: 'Payer', icon: <TeamOutlined /> },
                                { title: 'Closing', icon: <UnorderedListOutlined /> },
                                { title: 'Payment', icon: <DollarOutlined /> },
                            ]}
                        />

                        <div className="flex justify-between gap-2 mt-2">
                            {currentStep > 0 && (
                                <Button onClick={handlePrevStep} disabled={loading} size="middle" block>
                                    Previous
                                </Button>
                            )}
                            {currentStep < 3 ? (
                                <Button 
                                    type="primary" 
                                    onClick={handleNextStep}
                                    block={currentStep === 0}
                                    size="middle"
                                    className="bg-blue-500"
                                >
                                    Next
                                </Button>
                            ) : (
                                <Button 
                                    type="primary"
                                    onClick={() => form.submit()}
                                    loading={loading}
                                    disabled={
                                        !selectedMarriages.length || 
                                        !form.getFieldValue('amount') ||
                                        (paymentMethod === 'online' && !isReferenceValid) ||
                                        checkingReference
                                    }
                                    icon={<CheckCircleOutlined />}
                                    block
                                    size="middle"
                                    className="bg-gradient-to-r from-green-500 to-blue-500 border-0"
                                >
                                    Confirm Payment
                                </Button>
                            )}
                        </div>
                    </div>
                }
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    size="middle"
                    initialValues={{ 
                        paymentDate: dayjs(),
                        paymentMethod: 'cash',
                        amount: 200
                    }}
                    className="payment-form"
                >
                    {/* Step content with fixed padding */}
                    <div className="px-1">
                        {currentStep === 0 && renderStep0()}
                        {currentStep === 1 && renderStep1()}
                        {currentStep === 2 && renderStep2()}
                        {currentStep === 3 && renderStep3()}
                    </div>
                </Form>

                {/* Success Animation - Fixed positioning */}
                {paymentSummary && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(4px)' }}>
                        <div className="bg-white rounded-xl p-6 max-w-xs text-center animate-bounce-in mx-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircleOutlined className="text-green-500 text-2xl" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">Payment Successful!</h3>
                            <p className="text-gray-500 text-xs mb-3">
                                {paymentSummary.count} payment(s) of ₹{paymentSummary.amount} processed
                            </p>
                            {paymentSummary.reference && (
                                <Tag color="blue" className="mb-3 text-xs">Ref: {paymentSummary.reference}</Tag>
                            )}
                            <div className="text-xs text-gray-400">
                                Redirecting...
                            </div>
                        </div>
                    </div>
                )}
            </Drawer>

            <style jsx global>{`
                @keyframes bounce-in {
                    0% {
                        opacity: 0;
                        transform: scale(0.3);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.05);
                    }
                    70% {
                        transform: scale(0.9);
                    }
                    100% {
                        transform: scale(1);
                    }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.5s ease-out;
                }
                
                /* Form styling - Fixed spacing */
                .payment-form .ant-form-item {
                    margin-bottom: 16px;
                }
                
                .payment-form .ant-form-item:last-child {
                    margin-bottom: 0;
                }
                
                .payment-form .ant-form-item-label {
                    padding-bottom: 4px;
                }
                
                .payment-form .ant-form-item-label label {
                    font-size: 12px;
                    color: #6b7280;
                }
                
                /* Select styling - Fixed value display */
                .payment-form .ant-select-selection-item {
                    font-size: 13px;
                    line-height: 32px !important;
                }
                
                .payment-form .ant-select-selection-placeholder {
                    font-size: 13px;
                    line-height: 32px !important;
                }
                
                .payment-form .ant-input {
                    font-size: 13px;
                }
                
                .payment-form .ant-input::placeholder {
                    font-size: 13px;
                }
                
                .payment-form .ant-card-body {
                    padding: 12px;
                }
                
                /* Steps styling - Fixed size */
                .payment-form .ant-steps-item-title {
                    font-size: 11px !important;
                }
                
                .payment-form .ant-steps-icon {
                    font-size: 12px;
                }
                
                /* Badge styling */
                .payment-form .ant-badge-count {
                    box-shadow: none;
                    font-size: 10px;
                    height: 18px;
                    line-height: 18px;
                    padding: 0 6px;
                }
                
                /* Scrollbar styling */
                .payment-form ::-webkit-scrollbar {
                    width: 4px;
                }
                
                .payment-form ::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 4px;
                }
                
                .payment-form ::-webkit-scrollbar-thumb {
                    background: #cbd5e0;
                    border-radius: 4px;
                }
                
                .payment-form ::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                
                /* Drawer styling */
                .ant-drawer-content-wrapper {
                    border-radius: 12px 0 0 12px !important;
                    overflow: hidden;
                }
                
                .ant-drawer-body {
                    padding: 16px !important;
                }
                
                .ant-drawer-header {
                    padding: 12px 16px !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                }
                
                .ant-drawer-footer {
                    padding: 12px 16px !important;
                }
            `}</style>
        </div>
    );
}

export default AddPaymentModal;