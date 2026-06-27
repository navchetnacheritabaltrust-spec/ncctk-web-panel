"use client";

import React, { useState, useEffect } from 'react';
import { Button, Drawer, Select, Form, Input, DatePicker, Upload, Card, Row, Col, Divider, Space, Typography, App, Spin, Checkbox, Modal } from 'antd';
import {
  PlusOutlined,
  UserOutlined,
  PhoneOutlined,
  IdcardOutlined,
  HomeOutlined,
  UploadOutlined,
  CameraOutlined,
  DeleteOutlined,
  TagOutlined,
  LoadingOutlined,
  CalendarOutlined,
  CopyOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import ImgCrop from 'antd-img-crop';
import dayjs from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
// Services Imports
import { createData, getData } from '@/lib/services/firebaseService';
import { uploadFile } from '@/lib/services/storageService';
import { useAuth } from '@/lib/AuthProvider';
import { checkAadhaarExists, createMemberInTransaction, generateUnique4Digit, sendFirebaseNotification } from '@/lib/helper';
import { districtsByState, gender, states } from '@/lib/staticData';
import { setgetMemberDataChange } from '@/redux/slices/commonSlice';
import { createMemberAccount, generateMemberPassword } from '@/lib/commonFun';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const AddMember = () => {
  const programList = useSelector((state) => state.data.programList || []);
  const agentsList = useSelector((state) => state.data.agentsList || []);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [addedBy, setAddedBy] = useState('admin');
  const [loading, setLoading] = useState(false);
  const { message } = App.useApp();
  const [isJoinFeesDone, setIsJoinFeesDone] = useState(false);
  // Age and payment states
  const [selectedAgeGroup, setSelectedAgeGroup] = useState(null);
  const [payAmount, setPayAmount] = useState(0);
  const [joinFees, setJoinFees] = useState(0);
  const dispatch = useDispatch();
  // Location group
  const [selectedLocationGroup, setSelectedLocationGroup] = useState(null);
  const { user } = useAuth();

  // File uploads - Store actual File objects
  const [photo, setPhoto] = useState([]);
  const [extraPhoto, setExtraPhoto] = useState([]);
  const [documentFront, setDocumentFront] = useState([]);
  const [documentBack, setDocumentBack] = useState([]);
  const [guardianDocument, setGuardianDocument] = useState([]);
  const [isAadhaarChecking, setIsAadhaarChecking] = useState(false);
  const [aadhaarError, setAadhaarError] = useState(null);
  // Extra Dynamic Fields State
  const [extraFields, setExtraFields] = useState([]);
  const [joinFeesPaymentType, setJoinFeesPaymentType] = useState(null);
  const [customJoinFeesAmount, setCustomJoinFeesAmount] = useState(0);

  // Indian states and districts
  const [districts, setDistricts] = useState([]);
  
  // New state for existing member selection
  const [existingMemberPhone, setExistingMemberPhone] = useState('');
  const [existingMemberList, setExistingMemberList] = useState([]);
  const [searchingExistingMember, setSearchingExistingMember] = useState(false);
  const [isCopyFromExisting, setIsCopyFromExisting] = useState(false);
  const [selectedExistingMember, setSelectedExistingMember] = useState(null);

  // Store original birth date and join date
  const [storedBirthDate, setStoredBirthDate] = useState(null);
  const [storedJoinDate, setStoredJoinDate] = useState(dayjs());
const [closingDays, setClosingDays] = useState(null);
  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      form.resetFields();
      setSelectedProgram(null);
      setAddedBy('admin');
      setPayAmount(0);
      setJoinFees(0);
      setSelectedAgeGroup(null);
      setSelectedLocationGroup(null);
      setPhoto([]);
      setExtraPhoto([]);
      setDocumentFront([]);
      setDocumentBack([]);
      setGuardianDocument([]);
      setExtraFields([]);
      setDistricts([]);
      setIsJoinFeesDone(false);
      setIsCopyFromExisting(false);
      setExistingMemberPhone('');
      setExistingMemberList([]);
      setSelectedExistingMember(null);
      setStoredBirthDate(null);
      setStoredJoinDate(dayjs());
      setJoinFeesPaymentType(null);
      setCustomJoinFeesAmount(1100);
      // Set default join date to today
      form.setFieldsValue({
        dateJoin: dayjs()
      });
    }
  }, [open, form]);

  // Handle program selection
  const handleProgramSelect = (programId) => {
    const program = programList.find(p => p.id === programId);
    setSelectedProgram(program);

    // Reset location group
    if (program?.locationGroups?.length === 1) {
      setSelectedLocationGroup(program.locationGroups[0]);
      form.setFieldsValue({ locationGroup: program.locationGroups[0].id });
    } else {
      setSelectedLocationGroup(null);
      form.setFieldsValue({ locationGroup: undefined });
    }

    // If we have a stored birth date and program has age groups, recalculate
    if (storedBirthDate && program?.ageGroups) {
      const joinDate = storedJoinDate || dayjs();
      recalculateAgeGroup(storedBirthDate, joinDate, program);
    } else {
      // Reset age group related fields
      form.setFieldsValue({
        ageGroup: undefined
      });
      setSelectedAgeGroup(null);
      setPayAmount(0);
      setJoinFees(0);
    }
  };

  // Recalculate age group when program or dates change
  const recalculateAgeGroup = (birthDate, joinDate, program = selectedProgram) => {
    if (!birthDate || !program || !program.ageGroups) {
      setSelectedAgeGroup(null);
      setPayAmount(0);
      setJoinFees(0);
      return;
    }

    const decimalAge = getDecimalAge(birthDate, joinDate);
    const age = Math.floor(decimalAge);

    // Find matching age group
    const matchingGroup = program.ageGroups?.find(group =>
      decimalAge >= group.startAge &&
      decimalAge < group.endAge
    );

    if (matchingGroup) {
      setSelectedAgeGroup(matchingGroup);
      setPayAmount(matchingGroup.payAmount || 0);
      setJoinFees(matchingGroup.joinFee || 0);

      form.setFieldsValue({
        ageGroup: matchingGroup.id,
        age: age,
      });
    } else {
      setSelectedAgeGroup(null);
      setPayAmount(0);
      setJoinFees(0);
      form.setFieldsValue({
        ageGroup: undefined,
      });
      
      // Only show warning if we're actively changing something
      if (birthDate && program) {
        message.warning(
          `उम्र ${age} इस कार्यक्रम के लिए किसी भी पात्र आयु समूह में नहीं आती है।`
        );
      }
    }
  };

  // Handle state selection to update districts
  const handleStateSelect = (stateName) => {
    setDistricts(districtsByState[stateName] || []);
    form.setFieldsValue({ district: undefined });
  };

  // Search existing members by phone number (excluding current program)
  const searchExistingMembers = async () => {
    if (!existingMemberPhone || existingMemberPhone.length !== 10) {
      message.warning('कृपया 10 अंकों का फ़ोन नंबर दर्ज करें');
      return;
    }

    setSearchingExistingMember(true);
    try {
      // Search for this phone number across all programs
      const allMembers = [];
      
      for (const program of programList) {

        const programDocPath = `/users/${user.uid}/programs/${program.id}`;
        const members = await getData(`${programDocPath}/members`);
        
        if (members) {
          const filtered = Object.entries(members)
            .filter(([_, member]) => member.phone === existingMemberPhone && !member.delete_flag)
            .map(([id, member]) => ({
              id,
              ...member,
              programId: program.id,
              programName: program.name
            }));
          
          allMembers.push(...filtered);
        }
      }

      setExistingMemberList(allMembers);
      
      if (allMembers.length === 0) {
        message.info('इस फ़ोन नंबर से कोई सदस्य नहीं मिला');
      }
    } catch (error) {
      console.error('Error searching existing members:', error);
      message.error('सदस्य खोजने में त्रुटि');
    } finally {
      setSearchingExistingMember(false);
    }
  };

  // Copy data from existing member
  const copyFromExistingMember = (member) => {
    setSelectedExistingMember(member);
    setIsCopyFromExisting(true);
    
    // Store birth date and join date
    const birthDate = member.bobDate ? dayjs(member.bobDate, 'DD-MM-YYYY') : null;
    const joinDate = member.dateJoin ? dayjs(member.dateJoin, 'DD-MM-YYYY') : dayjs();
    
    setStoredBirthDate(birthDate);
    setStoredJoinDate(joinDate);
    
    // Fill the form with existing member data
    const formValues = {
      displayName: member.displayName,
      fatherName: member.fatherName,
      guardian: member.guardian,
      gender: member.gender,
      guardianRelation: member.guardianRelation,
      jati: member.jati,
      gotra: member.gotra || '',
      phone: member.phone,
      phoneAlt: member.phoneAlt || '',
      aadhaarNo: member.aadhaarNo,
      bobDate: birthDate,
      currentAddress: member.currentAddress,
      village: member.village,
      state: member.state,
      district: member.district,
      pinCode: member.pinCode,
      dateJoin: joinDate,
    };

    form.setFieldsValue(formValues);

    // Update districts if state is available
    if (member.state) {
      setDistricts(districtsByState[member.state] || []);
    }

    // Recalculate age group for the current program
    if (birthDate && selectedProgram) {
      recalculateAgeGroup(birthDate, joinDate, selectedProgram);
    }

    message.success(`${member.displayName} का डेटा कॉपी किया गया`);
  };

  // Handle Aadhaar validation
  const handleAadhaarBlur = async (e) => {
    const aadhaarNo = e.target.value;

    // First, check AntD's own length/pattern rules before checking Firestore
    const errors = await form.validateFields(['aadhaarNo']);
    if (errors.errorFields?.length) {
      setAadhaarError(null);
      return;
    }

    if (!aadhaarNo || aadhaarNo.length !== 12 || !/^[0-9]{12}$/.test(aadhaarNo)) {
      setAadhaarError(null);
      return;
    }

    const programId = form.getFieldValue('program');
    if (!programId) {
      message.warning('कृपया पहले कार्यक्रम का चयन करें।');
      return;
    }

    setIsAadhaarChecking(true);
    setAadhaarError(null);

    try {
      const programDocPath = `/users/${user.uid}/programs/${programId}`;
      const memberCollectionPath = programDocPath + '/members';

      const isAadhaarExists = await checkAadhaarExists(memberCollectionPath, aadhaarNo);

      if (isAadhaarExists) {
        const errorMessage = `आधार संख्या ${aadhaarNo} पहले से ही इस कार्यक्रम में एक सक्रिय सदस्य के लिए दर्ज है।`;
        setAadhaarError(errorMessage);
        form.setFields([
          {
            name: 'aadhaarNo',
            errors: [errorMessage],
          },
        ]);
      } else {
        setAadhaarError(null);
        form.setFields([
          {
            name: 'aadhaarNo',
            errors: [],
          },
        ]);
        message.success('आधार संख्या सत्यापन सफल।');
      }
    } catch (error) {
      console.error('Error checking Aadhaar existence:', error);
      setAadhaarError('आधार सत्यापन में त्रुटि हुई।');
      message.error('आधार सत्यापन में विफल।');
    } finally {
      setIsAadhaarChecking(false);
    }
  };

  // Calculate age
  const getDecimalAge = (birthDate, joinDate) => {
    return dayjs(joinDate)
      .diff(dayjs(birthDate), 'year', true);
  };

  // Handle date of birth change
  const handleDateOfBirthChange = (date) => {
    if (!date) return;
    
    setStoredBirthDate(date);
    const joinDate = form.getFieldValue('dateJoin') || dayjs();
    setStoredJoinDate(joinDate);
    
    // If program is selected, recalculate age group
    if (selectedProgram) {
      recalculateAgeGroup(date, joinDate, selectedProgram);
    }

    // Update password if name exists
    const name = form.getFieldValue('displayName');
    if (name) {
      const birthYear = date.format('YYYY');
      const first4Chars = name.replace(/\s+/g, '').slice(0, 4).toLowerCase();
      form.setFieldsValue({ password: `${first4Chars}${birthYear}` });
    }
  };

  // Handle join date change
  const handleJoinDateChange = (date) => {
    if (!date) return;
    
    setStoredJoinDate(date);
    const birthDate = form.getFieldValue('bobDate');
    
    // If birth date exists and program is selected, recalculate age group
    if (birthDate && selectedProgram) {
      recalculateAgeGroup(birthDate, date, selectedProgram);
    }
  };

  // Handle name change for password generation
  const handleNameChange = (e) => {
    const name = e.target.value;
    const birthDate = form.getFieldValue('bobDate');

    if (name && birthDate) {
      const birthYear = dayjs(birthDate).format('YYYY');
      const first4Chars = name.replace(/\s+/g, '').slice(0, 4).toLowerCase();
      form.setFieldsValue({ password: `${first4Chars}${birthYear}` });
    }
  };

  // Handle upload change
  const handleUploadChange = (setter) => ({ fileList }) => {
    const updatedFileList = fileList.map(file => {
      if (file.originFileObj instanceof File) {
        return {
          ...file,
          originFileObj: file.originFileObj,
          url: file.url || URL.createObjectURL(file.originFileObj)
        };
      }
      return file;
    });
    setter(updatedFileList.slice(-1));
  };

  // Preview uploaded files
  const onPreview = async (file) => {
    let src = file.url;
    if (!src && file.originFileObj) {
      src = await new Promise(resolve => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj);
        reader.onload = () => resolve(reader.result);
      });
    }
    const imgWindow = window.open('', '_blank');
    if (imgWindow) {
      imgWindow.document.write(`<img src="${src}" style="max-width:100%; height:auto;">`);
    }
  };

  // Extra Dynamic Fields Handlers
  const handleAddExtraField = () => {
    setExtraFields([...extraFields, { label: '', value: '' }]);
  };

  const handleExtraFieldChange = (index, key, value) => {
    const newFields = [...extraFields];
    newFields[index][key] = value;
    setExtraFields(newFields);
  };

  const handleRemoveExtraField = (index) => {
    const newFields = extraFields.filter((_, i) => i !== index);
    setExtraFields(newFields);
  };

  const getAgentToken = (agentId) => {
    const findAgent = agentsList?.find((x) => x.id === agentId);
    return findAgent?.firbaseToken;
  };

  // Form submission
  const onFinish = async (values) => {
    setLoading(true);
    
    const aadhaarNo = values.aadhaarNo;
    const programId = values.program;
    
    if (aadhaarNo && programId) {
      try {
        setIsAadhaarChecking(true);
        const programDocPath = `/users/${user.uid}/programs/${programId}`;
        const memberCollectionPath = programDocPath + '/members';
        
        const isAadhaarExists = await checkAadhaarExists(memberCollectionPath, aadhaarNo);
        
        if (isAadhaarExists) {
          const errorMessage = `आधार संख्या ${aadhaarNo} पहले से ही इस कार्यक्रम में एक सक्रिय सदस्य के लिए दर्ज है।`;
          form.setFields([
            {
              name: 'aadhaarNo',
              errors: [errorMessage],
            },
          ]);
          message.error(errorMessage);
          setIsAadhaarChecking(false);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error checking Aadhaar existence:', error);
        message.error('आधार सत्यापन में विफल। कृपया पुनः प्रयास करें।');
        setIsAadhaarChecking(false);
        setLoading(false);
        return;
      } finally {
        setIsAadhaarChecking(false);
      }
    }

    // If copying from existing member, use existing files
    let fileUrls = {};
    
    if (isCopyFromExisting && selectedExistingMember) {
      // Use existing file URLs from the selected member
      fileUrls = {
        photo: selectedExistingMember.photoURL ? { url: selectedExistingMember.photoURL } : null,
        extraImage: selectedExistingMember.extraImageURL ? { url: selectedExistingMember.extraImageURL } : null,
        documentFront: selectedExistingMember.documentFrontURL ? { url: selectedExistingMember.documentFrontURL } : null,
        documentBack: selectedExistingMember.documentBackURL ? { url: selectedExistingMember.documentBackURL } : null,
        guardianDocument: selectedExistingMember.guardianDocumentURL ? { url: selectedExistingMember.guardianDocumentURL } : null,
      };
    } else {
      // Upload new files
      if (!photo.length) {
        message.error('कृपया सदस्य का फोटो अपलोड करें।');
        setLoading(false);
        return;
      }

      try {
        const filesToUpload = [
          {
            file: photo[0].originFileObj,
            name: 'photo'
          }
        ];

        // Add optional files if they exist
        if (extraPhoto.length && extraPhoto[0].originFileObj) {
          filesToUpload.push({
            file: extraPhoto[0].originFileObj,
            name: 'extraImage'
          });
        }

        if (documentFront.length && documentFront[0].originFileObj) {
          filesToUpload.push({
            file: documentFront[0].originFileObj,
            name: 'documentFront'
          });
        }

        if (documentBack.length && documentBack[0].originFileObj) {
          filesToUpload.push({
            file: documentBack[0].originFileObj,
            name: 'documentBack'
          });
        }

        if (guardianDocument.length && guardianDocument[0].originFileObj) {
          filesToUpload.push({
            file: guardianDocument[0].originFileObj,
            name: 'guardianDocument'
          });
        }

        const fileUploadPromises = filesToUpload.map(item =>
          uploadFile(`/users/${user.uid}/programs/${values.program}/members`, item.file)
            .then(result => ({ [item.name]: result }))
        );

        const uploadedResults = await Promise.all(fileUploadPromises);
        fileUrls = uploadedResults.reduce((acc, curr) => ({ ...acc, ...curr }), {});
      } catch (error) {
        console.error('Error uploading files:', error);
        message.error('फ़ाइलें अपलोड करने में विफल।');
        setLoading(false);
        return;
      }
    }

    try {
      const agentName = values.addedBy === 'agent'
        ? agentsList.find(agent => agent.id === values.selectedAgent)?.displayName || ''
        : '';

      // Prepare member data
      const memberData = {
        displayName: values.displayName,
        fatherName: values.fatherName,
        guardian: values.guardian,
        gender: values?.gender,
        guardianRelation: values.guardianRelation,
        jati: values.jati,
        gotra: values.gotra || '',
        phone: values.phone,
        phoneAlt: values.phoneAlt || '',
        aadhaarNo: values.aadhaarNo,
        bobDate: values.bobDate.format('DD-MM-YYYY'),
        currentAddress: values.currentAddress,
        village: values.village,
        state: values.state,
        district: values.district,
        pinCode: values.pinCode,
        programId: values.program,
        programName: selectedProgram?.name || '',
        ageGroup: selectedAgeGroup?.id,
        ageGroupRange: selectedAgeGroup ? `${selectedAgeGroup.startAge}-${selectedAgeGroup.endAge}` : '',
        memberGroup: selectedLocationGroup?.groupName || 'Group_A',
        closingMonths: values.closingMonths || 0,  // 0 means no auto-closing
        membershipClosingDate: values.membershipClosingDate ? values.membershipClosingDate.format('DD-MM-YYYY') : null,
        locationGroup: selectedLocationGroup?.location || '',
        locactionGroupId: selectedLocationGroup?.id || '',
        payAmount: payAmount,
        joinFees: joinFees,
       joinFeesDone: values?.joinFeesDone || false,
joinFeesTxtId: values?.joinFeesTxtId || "",
joinFeesPaymentType: values?.joinFeesPaymentType || "",
joinFeesPaidAmount: values?.joinFeesPaymentType === 'custom' 
  ? (values?.customJoinFeesAmount || 0) 
  : (values?.joinFeesPaymentType === 'full' ? joinFees : 0),
joinFeesRemainingAmount: values?.joinFeesPaymentType === 'custom' && values?.customJoinFeesAmount 
  ? (joinFees - values.customJoinFeesAmount) 
  : (values?.joinFeesPaymentType === 'full' ? 0 : joinFees),
        role: 'member',
        addedBy: values.addedBy,
        addedByName: values.addedBy === 'agent' ? agentName : 'Admin',
        agentId: values.addedBy === 'agent' ? values.selectedAgent : null,
        delete_flag: false,
        active_flag: true,
        isBlocked: false,
        marriage_flag: false,
        status: 'accepted',
        dateJoin: values.dateJoin ? values.dateJoin.format('DD-MM-YYYY') : dayjs().format('DD-MM-YYYY'),
        photoURL: fileUrls.photo?.url || '',
        extraImageURL: fileUrls.extraImage?.url || '',
        documentFrontURL: fileUrls.documentFront?.url || '',
        documentBackURL: fileUrls.documentBack?.url || '',
        guardianDocumentURL: fileUrls.guardianDocument?.url || '',
        extraDetails: extraFields.filter(f => f.label && f.value),
        createdAt: new Date(),
      };

      // Save to Firestore
      const agentIdToUpdate = values.addedBy === 'agent' ? values.selectedAgent : null;
      const programDocPath = `/users/${user.uid}/programs/${values.program}`;
      const memberCollectionPath = programDocPath + '/members';

      const result = await createMemberInTransaction(
        programDocPath,
        memberCollectionPath,
        memberData,
        agentIdToUpdate
      );

      try {
  await createMemberAccount({
    memberId: result.id,
    displayName: values.displayName,
    photoURL: fileUrls.photo?.url || "",
    password: generateMemberPassword(values.displayName, values.bobDate.format('DD-MM-YYYY')) || "Member@123", // optional
    programId: values.program,
    registrationNumber: result.registrationNumber,
    memberCollectionPath: memberCollectionPath,
    createdBy: user.uid
  });

  console.log("Member auth created");
} catch (authError) {
  console.error("Auth creation failed:", authError);

  // optional rollback warning only
  message.warning(
    "Member added successfully, but login account creation failed."
  );
}

      const agentToken = getAgentToken(agentIdToUpdate);

      if (agentToken) {
        await sendFirebaseNotification(
          agentToken,
          'नया सदस्य जोड़ दिया गया',
          `${values.displayName} को नया सदस्य बना दिया गया है।
मोबाइल: ${values.phone}
गाँव: ${values.village}
योजना: ${selectedProgram?.name}`
        );
      }

      message.success('सदस्य सफलतापूर्वक जोड़ दिया गया!');
      dispatch(setgetMemberDataChange(true));
      setOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('सदस्य जोड़ने में त्रुटि:', error);
      message.error('सदस्य जोड़ने में विफल। कृपया पुनः प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  // Handle location group change
  const handleLocationGroupChange = (value) => {
    const group = selectedProgram?.locationGroups?.find(g => g.id === value);
    setSelectedLocationGroup(group || null);
  };

  return (
    <div>
      <Button
        onClick={() => setOpen(true)}
        type="primary"
        icon={<PlusOutlined />}
        size="medium"
        className='!bg-green-700'
      >
       ADD MEMBER
      </Button>

      <Drawer
        title={<Title level={4} style={{ margin: 0 }}>ADD NEW MEMBER</Title>}
        width={800}
        placement="right"
        onClose={() => !loading && setOpen(false)}
        open={open}
        maskClosable={false}
        keyboard={false}
        closable={!loading}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setOpen(false)} size="large" disabled={loading}>
              रद्द करें
            </Button>
            <Button
              onClick={() => form.submit()}
              type="primary"
              loading={loading}
              disabled={!selectedProgram || loading}
              size="large"
              icon={loading ? <LoadingOutlined /> : null}
            >
              {loading ? 'सबमिट हो रहा है...' : 'जमा करें'}
            </Button>
          </Space>
        }
      >
        {loading ? (
          <div className='min-h-[50vh] w-full flex flex-col items-center justify-center'>
            <Spin spinning={loading} size="large" />
            <div style={{ marginTop: 16 }}>
              <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: 8 }}>
                सदस्य जोड़ा जा रहा है...
              </Text>
              <Text type="secondary">कृपया प्रतीक्षा करें</Text>
            </div>
          </div>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{
              addedBy: 'admin',
              dateJoin: dayjs(),
              customJoinFeesAmount: 1100  // Add this line
            }}
            scrollToFirstError
            disabled={loading}
          >
            {/* कार्यक्रम चयन */}
            <Card className="mb-4" size="small">
              <Form.Item
                name="program"
                label={<Text strong>कार्यक्रम/योजना का चयन करें</Text>}
                rules={[{ required: true, message: 'कृपया एक कार्यक्रम का चयन करें' }]}
              >
                <Select
                  placeholder="कार्यक्रम चुनें"
                  size="large"
                  onChange={handleProgramSelect}
                  showSearch
                  optionFilterProp="children"
                >
                  {programList.map(program => (
                    <Option key={program.id} value={program.id}>
                      {program.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>

            {selectedProgram && (
              <>
                {/* Copy from Existing Member Section */}
                <Card className="mb-4" size="small" title="मौजूदा सदस्य से कॉपी करें">
                  <Row gutter={16}>
                    <Col span={16}>
                      <Input
                        placeholder="मौजूदा सदस्य का फ़ोन नंबर दर्ज करें"
                        value={existingMemberPhone}
                        onChange={(e) => setExistingMemberPhone(e.target.value)}
                        prefix={<PhoneOutlined />}
                        disabled={isCopyFromExisting}
                      />
                    </Col>
                    <Col span={8}>
                      <Button
                        onClick={searchExistingMembers}
                        loading={searchingExistingMember}
                        disabled={!existingMemberPhone || isCopyFromExisting}
                        block
                      >
                        खोजें
                      </Button>
                    </Col>
                  </Row>

                  {existingMemberList.filter((x)=>x.programId !==selectedProgram.id).length > 0 && !isCopyFromExisting && (
                    <div className="mt-4">
                      <Text strong>पाए गए सदस्य (अन्य कार्यक्रमों से):</Text>
                      {existingMemberList.filter((x)=>x.programId !==selectedProgram.id).map((member) => (
                        <Card key={`${member.programId}-${member.id}`} className="mt-2" size="small">
                          <Row justify="space-between" align="middle">
                            <Col>
                              <Text strong>{member.displayName} ({member.fatherName})</Text>
                              <br />
                              <Text type="secondary">कार्यक्रम: {member.programName}</Text>
                              <br />
                              <Text type="secondary">गाँव: {member.village}</Text>
                            </Col>
                            <Col>
                              <Button
                                type="primary"
                                icon={<CopyOutlined />}
                                onClick={() => copyFromExistingMember(member)}
                              >
                                इससे कॉपी करें
                              </Button>
                            </Col>
                          </Row>
                        </Card>
                      ))}
                    </div>
                  )}

                  {isCopyFromExisting && selectedExistingMember && (
                    <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded">
                      <Row justify="space-between" align="middle">
                        <Col>
                          <Text strong>
                            <CopyOutlined /> {selectedExistingMember.displayName} से डेटा कॉपी किया गया
                          </Text>
                          <br />
                          <Text type="secondary">
                            मौजूदा दस्तावेज़ों का उपयोग किया जाएगा
                          </Text>
                        </Col>
                        <Col>
                          <Button
                            type="default"
                            onClick={() => {
                              setIsCopyFromExisting(false);
                              setSelectedExistingMember(null);
                              setStoredBirthDate(null);
                              setStoredJoinDate(dayjs());
                              form.resetFields(['displayName', 'fatherName', 'guardian', 'gender', 'guardianRelation', 
                                'jati', 'gotra', 'phone', 'phoneAlt', 'aadhaarNo', 'bobDate', 'currentAddress', 
                                'village', 'state', 'district', 'pinCode']);
                              form.setFieldsValue({
                                dateJoin: dayjs()
                              });
                            }}
                          >
                            नया डेटा
                          </Button>
                        </Col>
                      </Row>
                    </div>
                  )}
                </Card>

                {/* व्यक्तिगत जानकारी */}
                <Divider orientation="left">व्यक्तिगत जानकारी</Divider>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="displayName"
                      label="नाम"
                      rules={[{ required: true, message: 'आवश्यक' }]}
                    >
                      <Input
                        prefix={<UserOutlined />}
                        placeholder="पूरा नाम"
                        onChange={handleNameChange}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="fatherName"
                      label="पिता/पति का नाम"
                      rules={[{ required: true, message: 'आवश्यक' }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="पिता/पति का नाम" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="jati"
                      label="जाति (Jati)"
                      rules={[{ required: true, message: 'आवश्यक' }]}
                    >
                      <Input placeholder="जाति" />
                    </Form.Item>
                  </Col>
                </Row>
  
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="gotra"
                      label="गोत्र (Gotra) (वैकल्पिक)"
                    >
                      <Input placeholder="गोत्र" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="guardian"
                      label="वारिसदार का नाम"
                      rules={[{ required: true, message: 'आवश्यक' }]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="वारिसदार का नाम" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <div className='grid grid-cols-2 gap-1'>
                      <Form.Item
                        name="guardianRelation"
                        label="वारि से संबंध"
                        rules={[{ required: true, message: 'आवश्यक' }]}
                      >
                        <Input placeholder="उदाहरण: पिता, माता" />
                      </Form.Item>

                      <Form.Item
                        name="gender"
                        label="Gender(लिंग)"
                        rules={[{ required: true, message: 'आवश्यक' }]}
                      >
                        <Select placeholder="लिंग चुनें" showSearch>
                          {gender.map(state => (
                            <Option key={state.value} value={state.value}>{state.label}</Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </div>
                  </Col>
                </Row>

                {/* संपर्क जानकारी */}
                <Divider orientation="left">संपर्क जानकारी</Divider>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="phone"
                      label="प्राथमिक फ़ोन"
                      rules={[
                        { required: true, message: 'आवश्यक' },
                        { len: 10, message: '10 अंक होने चाहिए' },
                        { pattern: /^[0-9]{10}$/, message: 'अमान्य फ़ोन नंबर' }
                      ]}
                    >
                      <Input prefix={<PhoneOutlined />} placeholder="10 अंकों का नंबर" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="phoneAlt"
                      label="वैकल्पिक फ़ोन (Optional)"
                      rules={[
                        { len: 10, message: '10 अंक होने चाहिए' },
                        { pattern: /^[0-9]{10}$/, message: 'अमान्य फ़ोन नंबर' }
                      ]}
                    >
                      <Input prefix={<PhoneOutlined />} placeholder="वैकल्पिक" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="aadhaarNo"
                      label="आधार संख्या"
                      rules={[
                        { required: true, message: 'आवश्यक' },
                        { len: 12, message: '12 अंक होने चाहिए' },
                        { pattern: /^[0-9]{12}$/, message: 'अमान्य आधार' }
                      ]}
                    >
                      <Input
                        prefix={<IdcardOutlined />}
                        placeholder="12 अंकों का आधार"
                        onBlur={handleAadhaarBlur}
                        suffix={isAadhaarChecking ? <LoadingOutlined /> : null}
                        loading={isAadhaarChecking}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* आयु और कार्यक्रम विवरण */}
                <Divider orientation="left">आयु और कार्यक्रम विवरण</Divider>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="dateJoin"
                      label="जुड़ने की तारीख"
                      rules={[{ required: true, message: 'आवश्यक' }]}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        format="DD-MM-YYYY"
                        prefix={<CalendarOutlined />}
                        disabledDate={(current) => current && current > dayjs()}
                        onChange={handleJoinDateChange}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="bobDate"
                      label="जन्म तिथि"
                      rules={[{ required: true, message: 'आवश्यक' }]}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        format="DD-MM-YYYY"
                        onChange={handleDateOfBirthChange}
                        disabledDate={(current) => current && current > dayjs()}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="आयु समूह">
                      <Input
                        value={selectedAgeGroup ? `${selectedAgeGroup.startAge}-${selectedAgeGroup.endAge} वर्ष` : ''}
                        disabled
                        placeholder="स्वचालित रूप से गणना"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="locationGroup"
                      label="स्थान समूह"
                      rules={[{ required: true, message: 'आवश्यक' }]}
                    >
                      <Select
                        placeholder="स्थान चुनें"
                        disabled={selectedProgram?.locationGroups?.length === 1}
                        onChange={handleLocationGroupChange}
                      >
                        {selectedProgram?.locationGroups?.map(group => (
                          <Option key={group.id} value={group.id}>
                            {group.location} - {group.groupName}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="वेतन राशि">
                      <Input
                        value={`₹${payAmount}`}
                        disabled
                        style={{ fontWeight: 'bold', color: '#52c41a' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="नामांकन शुल्क">
                      <Input
                        value={`₹${joinFees}`}
                        disabled
                        style={{ fontWeight: 'bold', color: '#1890ff' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* पता जानकारी */}
                <Divider orientation="left">पता जानकारी</Divider>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="state"
                      label="राज्य"
                      rules={[{ required: true, message: 'आवश्यक' }]}
                    >
                      <Select placeholder="राज्य चुनें" showSearch onChange={handleStateSelect}>
                        {states.map(state => (
                          <Option key={state.value} value={state.value}>{state.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="district"
                      label="ज़िला (District)"
                      rules={[{ required: true, message: 'आवश्यक' }]}
                    >
                      <Select placeholder="ज़िला चुनें" showSearch disabled={districts.length === 0}>
                        {districts.map(district => (
                          <Option key={district.value} value={district.value}>{district.label}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="village"
                      label="गाँव"
                      rules={[
                        { required: true, message: 'आवश्यक' },
                        { pattern: /^[a-zA-Z\s\u0900-\u097F]{2,50}$/, message: 'केवल अक्षर (2-50 अक्षर)' }
                      ]}
                    >
                      <Input prefix={<HomeOutlined />} placeholder="गाँव का नाम" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="pinCode"
                      label="पिन कोड"
                      rules={[
                        { required: true, message: 'आवश्यक' },
                        { len: 6, message: '6 अंक होने चाहिए' }
                      ]}
                    >
                      <Input placeholder="6 अंकों का पिनकोड" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="currentAddress"
                  label="वर्तमान पता"
                  rules={[{ required: true, message: 'आवश्यक' }]}
                >
                  <TextArea rows={2} placeholder="पूरा पता" />
                </Form.Item>

                {/* दस्तावेज़ और फोटो अपलोड - Only show if not copying from existing */}
                {!isCopyFromExisting && (
                  <>
                    <Divider orientation="left">दस्तावेज़ और फोटो</Divider>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          label="सदस्य का फोटो *"
                          required
                          tooltip="सदस्य का फोटो अपलोड करें (फोटो क्रॉप की जाएगी)"
                        >
                          <ImgCrop
                            rotate
                            showGrid
                            rotationSlider
                            aspectSlider
                            showReset
                            quality={0.9}
                          >
                            <Upload
                              listType="picture-card"
                              fileList={photo}
                              onChange={({ fileList }) => {
                                const updatedList = fileList.map((file) => {
                                  if (!file.url && !file.preview) {
                                    file.preview = URL.createObjectURL(file.originFileObj);
                                  }
                                  return file;
                                });
                                setPhoto(updatedList);
                                form.setFieldsValue({ photo: updatedList });
                              }}
                              onPreview={onPreview}
                              maxCount={1}
                              accept="image/*"
                            >
                              {!photo.length && (
                                <div>
                                  <CameraOutlined />
                                  <div style={{ marginTop: 8 }}>फोटो</div>
                                </div>
                              )}
                            </Upload>
                          </ImgCrop>
                        </Form.Item>
                      </Col>

                      <Col span={8}>
                        <Form.Item
                          label="वारिसदार फोटो (Optional)"
                          tooltip="वैकल्पिक वारिसदार फोटो (फोटो क्रॉप की जाएगी)"
                        >
                          <ImgCrop
                            rotate
                            showGrid
                            rotationSlider
                            aspectSlider
                            showReset
                            quality={0.9}
                          >
                            <Upload
                              listType="picture-card"
                              fileList={extraPhoto}
                              onChange={handleUploadChange(setExtraPhoto)}
                              onPreview={onPreview}
                              maxCount={1}
                              accept="image/*"
                            >
                              {!extraPhoto.length && (
                                <div>
                                  <PlusOutlined />
                                  <div style={{ marginTop: 8 }}>अतिरिक्त</div>
                                </div>
                              )}
                            </Upload>
                          </ImgCrop>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          label="दस्तावेज़ अग्र भाग (Front) (Optional)"
                          tooltip="आईडी दस्तावेज़ का अग्र भाग अपलोड करें (वैकल्पिक)"
                        >
                          <Upload
                            listType="picture-card"
                            fileList={documentFront}
                            onChange={handleUploadChange(setDocumentFront)}
                            onPreview={onPreview}
                            beforeUpload={() => false}
                            maxCount={1}
                          >
                            {!documentFront.length && (
                              <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8 }}>फ्रंट</div>
                              </div>
                            )}
                          </Upload>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          label="दस्तावेज़ पिछला भाग (Back) (Optional)"
                          tooltip="आईडी दस्तावेज़ का पिछला भाग अपलोड करें (वैकल्पिक)"
                        >
                          <Upload
                            listType="picture-card"
                            fileList={documentBack}
                            onChange={handleUploadChange(setDocumentBack)}
                            onPreview={onPreview}
                            beforeUpload={() => false}
                            maxCount={1}
                          >
                            {!documentBack.length && (
                              <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8 }}>बैक</div>
                              </div>
                            )}
                          </Upload>
                        </Form.Item>
                      </Col>

                      <Col span={8}>
                        <Form.Item
                          label="वारिसदार का दस्तावेज़ (Optional)"
                          tooltip="वारिसदार की आईडी अपलोड करें (वैकल्पिक)"
                        >
                          <Upload
                            listType="picture-card"
                            fileList={guardianDocument}
                            onChange={handleUploadChange(setGuardianDocument)}
                            onPreview={onPreview}
                            beforeUpload={() => false}
                            maxCount={1}
                          >
                            {!guardianDocument.length && (
                              <div>
                                <UploadOutlined />
                                <div style={{ marginTop: 8 }}>वारिसदार</div>
                              </div>
                            )}
                          </Upload>
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                )}

                {/* अतिरिक्त जानकारी (Dynamic Fields) */}
                <Divider orientation="left">अतिरिक्त जानकारी (Optional)</Divider>
                <Card size="small">
                  {extraFields.map((field, index) => (
                    <Row gutter={16} key={index} className="mb-2">
                      <Col span={8}>
                        <Input
                          prefix={<TagOutlined />}
                          placeholder="लेबल (उदाहरण: व्यवसाय)"
                          value={field.label}
                          onChange={(e) => handleExtraFieldChange(index, 'label', e.target.value)}
                        />
                      </Col>
                      <Col span={12}>
                        <Input
                          placeholder="मान (Value)"
                          value={field.value}
                          onChange={(e) => handleExtraFieldChange(index, 'value', e.target.value)}
                        />
                      </Col>
                      <Col span={4}>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveExtraField(index)}
                        >
                          हटाएँ
                        </Button>
                      </Col>
                    </Row>
                  ))}
                  <Button
                    type="dashed"
                    onClick={handleAddExtraField}
                    block
                    icon={<PlusOutlined />}
                    style={{ marginTop: extraFields.length > 0 ? 16 : 0 }}
                  >
                    और फ़ील्ड जोड़ें
                  </Button>
                </Card>

                {/* व्यवस्थापक/एजेंट चयन */}
                <Divider orientation="left">जोड़ा गया</Divider>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="addedBy"
                      label="जोड़ा गया"
                      rules={[{ required: true }]}
                    >
                      <Select onChange={setAddedBy}>
                        <Option value="admin">व्यवस्थापक (Admin)</Option>
                        <Option value="agent">एजेंट</Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  {addedBy === 'agent' && (
                    <Col span={12}>
                      <Form.Item
                        name="selectedAgent"
                        label="एजेंट चुनें"
                        rules={[{ required: true, message: 'कृपया एक एजेंट चुनें' }]}
                      >
                        <Select
                          placeholder="एजेंट चुनें"
                          showSearch
                          optionFilterProp="children"
                        >
                          {agentsList.map(agent => (
                            <Option key={agent.id} value={agent.id}>
                              {agent.displayName}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  )}
                </Row>

   {/* Join Fees Section */}
<Divider orientation="left">नामांकन शुल्क</Divider>
<Card size="small">
  <Row gutter={16}>
    <Col span={24}>
      <Form.Item name="joinFeesDone" valuePropName="checked">
        <Checkbox onChange={(e) => {
          setIsJoinFeesDone(e.target.checked);
          if (!e.target.checked) {
            // Reset payment type and custom amount when unchecked
            form.setFieldsValue({
              joinFeesPaymentType: undefined,
              customJoinFeesAmount: undefined
            });
            setJoinFeesPaymentType(null);
            setCustomJoinFeesAmount(0);
          }
        }}>
          Join Fees जमा हुआ?
        </Checkbox>
      </Form.Item>
    </Col>
  </Row>

  {isJoinFeesDone && (
    <>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="joinFeesPaymentType"
            label="भुगतान प्रकार"
            rules={[{ required: true, message: 'कृपया भुगतान प्रकार चुनें' }]}
          >
            <Select 
              placeholder="भुगतान प्रकार चुनें"
           onChange={(value) => {
  setJoinFeesPaymentType(value);
  if (value === 'full') {
    // Set full amount when Full Paid is selected
    setCustomJoinFeesAmount(joinFees);
    form.setFieldsValue({
      customJoinFeesAmount: joinFees
    });
  } else if (value === 'custom') {
    // Set default amount 1100 when Custom is selected
    setCustomJoinFeesAmount(1100);
    form.setFieldsValue({
      customJoinFeesAmount: 1100
    });
  }
}}  
            >
              <Option value="full">Full Paid (₹{joinFees})</Option>
              <Option value="custom">Custom Paid</Option>
            </Select>
          </Form.Item>
        </Col>

        <Col span={12}>
          {joinFeesPaymentType === 'custom' && (
            <Form.Item
              name="customJoinFeesAmount"
              label="भुगतान राशि"
              rules={[
                { required: true, message: 'कृपया भुगतान राशि दर्ज करें' },
                {
                  validator: (_, value) => {
                    if (value && (value <= 0 || value > joinFees)) {
                      return Promise.reject(new Error(`राशि ₹1 और ₹${joinFees} के बीच होनी चाहिए`));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <Input
                size='large'
                type='number'
                prefix="₹"
                placeholder={`₹1 - ₹${joinFees} दर्ज करें`}
                onChange={(e) => {
                  const amount = parseFloat(e.target.value);
                  if (!isNaN(amount)) {
                    setCustomJoinFeesAmount(amount);
                  }
                }}
              />
            </Form.Item>
          )}
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="joinFeesTxtId"
            label="Join Fees Transaction ID"
            rules={[
              { required: true, message: 'कृपया Transaction ID दर्ज करें' },
            ]}
          >
            <Input
              size='large'
              placeholder='Enter Join Fees Transaction ID'
              autoComplete='off'
              prefix={<IdcardOutlined />}
            />
          </Form.Item>
        </Col>
      </Row>

      {/* Display payment summary */}
      {(joinFeesPaymentType === 'full' || 
        (joinFeesPaymentType === 'custom' && customJoinFeesAmount > 0)) && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
          <Text strong>भुगतान सारांश:</Text>
          <div className="mt-1">
            <Text>कुल नामांकन शुल्क: ₹{joinFees}</Text>
            <br />
            <Text type="success">
              भुगतान राशि: ₹
              {joinFeesPaymentType === 'full' 
                ? joinFees 
                : customJoinFeesAmount || 0}
            </Text>
            {joinFeesPaymentType === 'custom' && 
             customJoinFeesAmount > 0 && 
             customJoinFeesAmount < joinFees && (
              <>
                <br />
                <Text type="danger">
                  बकाया राशि: ₹{joinFees - customJoinFeesAmount}
                </Text>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )}
</Card>
{/* Membership Closing Days */}
<Divider orientation="left">सदस्यता समाप्ति</Divider>
<Card size="small">
  <Row gutter={16}>
    <Col span={24}>
      <Form.Item
        name="closingMonths"
        label="सदस्यता समाप्ति महीने (Membership Closing Months)"
        tooltip="कितने महीनों बाद यह सदस्य बंद/निष्क्रिय हो जाएगा?"
        rules={[
          { 
            validator: (_, value) => {
              if (value && (value < 0 || value > 120)) {
                return Promise.reject(new Error('कृपया 0 से 120 महीनों के बीच मान दर्ज करें'));
              }
              return Promise.resolve();
            }
          }
        ]}
      >
        <Input
          type="number"
          size="large"
          placeholder="महीनों की संख्या दर्ज करें (उदा: 6, 12, 24)"
          prefix={<CalendarOutlined />}
          suffix="महीने"
          onChange={(e) => {
            const months = parseInt(e.target.value);
            setClosingDays(months);
          }}
        />
      </Form.Item>
    </Col>
  </Row>
</Card>

                {/* Hidden field for age group ID */}
                <Form.Item name="ageGroup" hidden>
                  <Input />
                </Form.Item>
              </>
            )}
          </Form>
        )}
      </Drawer>
    </div>
  );
};

export default AddMember;