import React, { useState, useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Card, Typography, App, Radio, Modal, Checkbox, Table, Spin, Alert, Tag } from 'antd';
import { FiPlusCircle, FiTrash2, FiUser, FiMapPin, FiDollarSign, FiCalendar, FiTag, FiEdit2, FiSave, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '@/lib/AuthProvider';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { setgetMemberDataChange, setPrograms } from '@/redux/slices/commonSlice';
import { useDispatch, useSelector } from 'react-redux';

const chunkArray = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const { TextArea } = Input;
const { Title, Text } = Typography;

const AddProgramEdit = ({ program, mode = 'add', onSuccess, triggerButton = null,isDrawerOpen,setIsDrawerOpen }) => {
  const { message: antdMessage } = App.useApp();
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [oldAgeGroups, setOldAgeGroups] = useState([]);
  const [updateMembersModalVisible, setUpdateMembersModalVisible] = useState(false);
  const [changedAgeGroups, setChangedAgeGroups] = useState([]);
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState(null);
  // Existing payment_pending entries update option
  const [updatePendingEntries, setUpdatePendingEntries] = useState(false);
  const [pendingPreview, setPendingPreview] = useState([]);
  const [loadingPendingPreview, setLoadingPendingPreview] = useState(false);
  const [pendingStats, setPendingStats] = useState(null);
  const dispatch=useDispatch()
  const programList = useSelector((state) => state.data.programList);

  const locationGroupTypes = [
    { label: 'Group A', value: 'A' },
    { label: 'Group B', value: 'B' },
    { label: 'Group C', value: 'C' },
  ];

  const programCategories = [
    { label: 'Suraksha', value: 'isSuraksha' },
    { label: 'Mamera', value: 'isMamera' },
    { label: 'Vivah', value: 'isVivah' },
    { label: 'Other', value: 'isOther' },
  ];

  // Initialize form with program data when in edit mode
  useEffect(() => {
    if (mode === 'edit' && program && isDrawerOpen) {
      // Store deep copy of old age groups for change detection
      setOldAgeGroups(JSON.parse(JSON.stringify(program.ageGroups || [])));
      
      // Set isSelected from program data (default to false if not exists)
      setIsSelected(program.isSelected || false);
      
      // Determine selected category
      let selectedCategory = 'isOther';
      programCategories.forEach(cat => {
        if (program[cat.value]) {
          selectedCategory = cat.value;
        }
      });

      form.setFieldsValue({
        name: program.name,
        hiname: program.hiname,
        guname: program.guname || "",
        noteLine: program.noteLine || '',
        about: program.about,
        memberCount:program?.memberCount ||  0,
        inactivemembercount:program?.inactivemembercount || 0,
        category: selectedCategory,
        ageGroups: program.ageGroups || [],
        locationGroups: program.locationGroups || [],
      });
    } else if (mode === 'add' && isDrawerOpen) {
      // Reset form for add mode
      setIsSelected(false);
      setOldAgeGroups([]);
      form.resetFields();
    }
  }, [mode, program, isDrawerOpen, form]);

  // Detect which age groups had fee changes
  const getChangedAgeGroups = (newGroups, oldGroups) => {
    const changed = [];
    for (const newGroup of newGroups) {
      const oldGroup = oldGroups.find(g => g.id === newGroup.id);
      if (oldGroup) {
        const joinFeeChanged = Number(newGroup.joinFee) !== Number(oldGroup.joinFee);
        const payAmountChanged = Number(newGroup.payAmount) !== Number(oldGroup.payAmount);
        if (joinFeeChanged || payAmountChanged) {
          changed.push({
            ...newGroup,
            oldJoinFee: oldGroup.joinFee,
            oldPayAmount: oldGroup.payAmount,
          });
        }
      }
    }
    return changed;
  };

  // Age group ke members dhoondo — ageGroup id se, aur purane members ke liye
  // ageGroupRange ("25-50") se bhi. delete_flag missing ho to bhi member count hoga.
  const getMemberDocsForGroup = async (membersRef, group, oldGroup) => {
    const ranges = [...new Set([
      `${group.startAge}-${group.endAge}`,
      oldGroup ? `${oldGroup.startAge}-${oldGroup.endAge}` : null,
    ].filter(Boolean))];

    const snaps = await Promise.all([
      getDocs(query(membersRef, where('ageGroup', '==', group.id))),
      getDocs(query(membersRef, where('ageGroupRange', 'in', ranges))),
    ]);

    const map = new Map();
    snaps.forEach(snap => snap.forEach(d => {
      if (d.data().delete_flag === true) return;
      map.set(d.id, d);
    }));
    return [...map.values()];
  };

  // Batch update all members with matching ageGroup ID
  const updateMembersForAgeGroups = async (userUid, programId, groups) => {
    setIsUpdatingMembers(true);
    try {
      const membersRef = collection(db, `users/${userUid}/programs/${programId}/members`);
      let totalUpdated = 0;

      for (const group of groups) {
        const oldGroup = oldAgeGroups.find(g => g.id === group.id);
        const memberDocs = await getMemberDocsForGroup(membersRef, group, oldGroup);
        if (memberDocs.length === 0) continue;
        const snapshot = { docs: memberDocs, size: memberDocs.length };

        // Firestore batch limit 500 hai — chunks me commit karo
        for (const docChunk of chunkArray(snapshot.docs, 450)) {
          const batch = writeBatch(db);
          docChunk.forEach(docSnap => {
            batch.update(docSnap.ref, {
              joinFees: Number(group.joinFee),
              payAmount: Number(group.payAmount),
              ageGroupRange: `${group.startAge}-${group.endAge}`,
              updatedAt: new Date(),
            });
          });
          await batch.commit();
        }
        totalUpdated += snapshot.size;
      }
      return totalUpdated;
    } catch (error) {
      console.error('Error updating members:', error);
      throw error;
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  // Sirf wahi groups jinka payAmount change hua hai (joinFee change se pending entries par asar nahi)
  const payAmountChangedGroups = changedAgeGroups.filter(
    g => Number(g.payAmount) !== Number(g.oldPayAmount)
  );

  // Changed age groups ke members ki existing PENDING entries dhoondo.
  // Paid / partial entries ko kabhi touch nahi karna.
  const fetchPendingEntriesPreview = async (userUid, programId, groups) => {
    const membersRef = collection(db, `users/${userUid}/programs/${programId}/members`);
    const pendingRef = collection(db, `users/${userUid}/programs/${programId}/payment_pending`);
    const result = [];
    const stats = { membersFound: 0, entriesFound: 0, paidSkipped: 0, sameAmountSkipped: 0 };

    for (const group of groups) {
      const newPayAmount = Number(group.payAmount);
      const oldGroup = oldAgeGroups.find(g => g.id === group.id);
      const memberDocs = await getMemberDocsForGroup(membersRef, group, oldGroup);
      stats.membersFound += memberDocs.length;
      if (memberDocs.length === 0) continue;

      const memberMap = {};
      memberDocs.forEach(d => { memberMap[d.id] = d.data(); });

      // Firestore 'in' query max 30 values
      const pendingSnaps = await Promise.all(
        chunkArray(Object.keys(memberMap), 30).map(ids =>
          getDocs(query(pendingRef, where('memberId', 'in', ids)))
        )
      );

      const byMember = {};
      pendingSnaps.forEach(snap => snap.forEach(d => {
        const p = d.data();
        if (p.delete_flag === true) return;
        stats.entriesFound++;
        // Paid / partial / jisme koi payment aa chuka ho — kabhi touch nahi karna
        const status = String(p.status || 'pending').toLowerCase();
        if (status === 'paid' || status === 'partial' || Number(p.paidAmount) > 0 || p.transactionId) {
          stats.paidSkipped++;
          return;
        }
        // Purani entries me payAmount missing ho to app ₹200 maanta hai
        const currentAmount = p.payAmount === undefined || p.payAmount === null ? 200 : Number(p.payAmount);
        if (currentAmount === newPayAmount) { stats.sameAmountSkipped++; return; }
        if (!byMember[p.memberId]) byMember[p.memberId] = [];
        byMember[p.memberId].push({
          id: d.id,
          payAmount: currentAmount,
          hasMemberDetailsPayAmount: !!(p.memberDetails && 'payAmount' in p.memberDetails),
        });
      }));

      Object.entries(byMember).forEach(([memberId, entries]) => {
        const m = memberMap[memberId] || {};
        result.push({
          key: `${group.id}_${memberId}`,
          memberId,
          displayName: m.displayName || 'Unknown',
          registrationNumber: m.registrationNumber || 'N/A',
          village: m.village || '',
          ageGroupLabel: `${group.startAge}-${group.endAge}`,
          newPayAmount,
          entries,
        });
      });
    }
    return { rows: result, stats };
  };

  const handleTogglePendingEntries = async (checked) => {
    setUpdatePendingEntries(checked);
    if (!checked || !user?.uid || !program?.id) return;
    setLoadingPendingPreview(true);
    try {
      const { rows, stats } = await fetchPendingEntriesPreview(user.uid, program.id, payAmountChangedGroups);
      setPendingPreview(rows);
      setPendingStats(stats);
    } catch (error) {
      console.error('Error loading pending entries:', error);
      antdMessage.error('Pending entries load nahi ho payi');
      setUpdatePendingEntries(false);
      setPendingPreview([]);
      setPendingStats(null);
    } finally {
      setLoadingPendingPreview(false);
    }
  };

  // Confirm ki gayi pending entries update karo. Update se pehle dobara fetch karke
  // check karte hain ki entry abhi bhi 'pending' hai — taaki beech me paid hui entry change na ho.
  const updatePendingEntriesForGroups = async (userUid, programId, groups, confirmedPreview) => {
    const confirmedIds = new Set(confirmedPreview.flatMap(m => m.entries.map(e => e.id)));
    const { rows: fresh } = await fetchPendingEntriesPreview(userUid, programId, groups);
    const toUpdate = fresh
      .flatMap(m => m.entries.map(e => ({ ...e, newPayAmount: m.newPayAmount })))
      .filter(e => confirmedIds.has(e.id));

    const now = new Date().toISOString();
    for (const entryChunk of chunkArray(toUpdate, 450)) {
      const batch = writeBatch(db);
      entryChunk.forEach(e => {
        const data = {
          payAmount: e.newPayAmount,
          previousPayAmount: e.payAmount,
          payAmountUpdatedAt: now,
          updatedAt: now,
        };
        if (e.hasMemberDetailsPayAmount) data['memberDetails.payAmount'] = e.newPayAmount;
        batch.update(doc(db, `users/${userUid}/programs/${programId}/payment_pending`, e.id), data);
      });
      await batch.commit();
    }
    return toUpdate.length;
  };

  const resetPendingEntriesState = () => {
    setUpdatePendingEntries(false);
    setPendingPreview([]);
    setPendingStats(null);
    setLoadingPendingPreview(false);
  };

  const handleSubmit = async (values) => {
    if (!user?.uid) {
      antdMessage.error("User not authenticated!");
      return;
    }

    // In edit mode, detect changed age groups before saving
    if (mode === 'edit' && program?.id && oldAgeGroups.length > 0) {
      const newAgeGroups = (values.ageGroups || []).map(group => ({
        ...group,
        id: group.id || crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      }));
      const changed = getChangedAgeGroups(newAgeGroups, oldAgeGroups);
      if (changed.length > 0) {
        setChangedAgeGroups(changed);
        setPendingFormValues(values);
        resetPendingEntriesState();
        setUpdateMembersModalVisible(true);
        return; // Wait for user confirmation
      }
    }

    // No age group changes or add mode — save directly
    await saveProgram(values);
  };

  const saveProgram = async (values) => {
    setLoading(true);
    try {
      const ageGroupsWithId = (values.ageGroups || []).map(group => ({
        ...group,
        id: group.id || crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      }));
      
      const locationGroupsWithId = (values.locationGroups || []).map(group => ({
        ...group,
        id: group.id || crypto.randomUUID?.() || Math.random().toString(36).slice(2)
      }));

      const categoryFlags = {
        isSuraksha: false, isMamera: false, isVivah: false, isOther: false,
      };
      if (values.category) categoryFlags[values.category] = true;

      if (mode === 'add') {
        const programsRef = collection(db, "users", user.uid, "programs");
        await addDoc(programsRef, {
          name: values.name, hiname: values.hiname, guname: values.guname || "",
          noteLine: values.noteLine || '', about: values.about,
          ...categoryFlags, isSelected: isSelected,
          ageGroups: ageGroupsWithId, memberCount: values?.memberCount,
          inactivemembercount: values?.inactivemembercount,
          locationGroups: locationGroupsWithId,
          createdAt: new Date(), updatedAt: new Date(), createdBy: user.uid,
        });
        antdMessage.success('Program created successfully!');
      } else if (mode === 'edit' && program?.id) {
        const programRef = doc(db, "users", user.uid, "programs", program.id);
        await updateDoc(programRef, {
          name: values.name, hiname: values.hiname, guname: values.guname || "",
          noteLine: values.noteLine || '', about: values.about,
          ...categoryFlags, isSelected: isSelected,
          memberCount: parseInt(values?.memberCount) || 0,
          inactivemembercount: parseInt(values?.inactivemembercount) || 0,
          ageGroups: ageGroupsWithId, locationGroups: locationGroupsWithId,
          updatedAt: new Date(),
        });
        antdMessage.success('Program updated successfully!');

        const programs = programList.map(item => {
          if (item.id === program.id) {
            return {
              ...item, memberCount: values?.memberCount,
              name: values.name, hiname: values.hiname, guname: values.guname,
              noteLine: values.noteLine || '', about: values.about,
              ...categoryFlags, isSelected: isSelected,
              memberCount: values?.memberCount,
              inactivemembercount: values?.inactivemembercount,
              ageGroups: ageGroupsWithId, locationGroups: locationGroupsWithId,
              updatedAt: new Date(),
            };
          }
          return item;
        });
        dispatch(setPrograms(programs));
      }

      if (onSuccess) onSuccess();
      dispatch(setgetMemberDataChange(true));
      form.resetFields();
      setOldAgeGroups([]);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error(`Error ${mode === 'add' ? 'adding' : 'updating'} program:`, error);
      antdMessage.error(`Failed to ${mode === 'add' ? 'create' : 'update'} program.`);
    }
    setLoading(false);
  };

  // Handle user response to the update members modal
  const handleUpdateMembersResponse = async (shouldUpdate) => {
    // State reset hone se pehle values capture kar lo
    const shouldUpdatePending = shouldUpdate && updatePendingEntries && pendingPreview.length > 0;
    const confirmedPreview = pendingPreview;
    const groupsForPending = payAmountChangedGroups;

    setUpdateMembersModalVisible(false);
    if (shouldUpdate && pendingFormValues) {
      // First save the program, then update members
      await saveProgram(pendingFormValues);
      if (program?.id) {
        try {
          const updated = await updateMembersForAgeGroups(user.uid, program.id, changedAgeGroups);
          if (updated > 0) {
            antdMessage.success(`${updated} members updated with new fee details`);
          }

          if (shouldUpdatePending) {
            const pendingUpdated = await updatePendingEntriesForGroups(
              user.uid, program.id, groupsForPending, confirmedPreview
            );
            if (pendingUpdated > 0) {
              antdMessage.success(`${pendingUpdated} pending entries updated with new pay amount`);
            }
          }
        } catch (error) {
          antdMessage.error('Members / pending entries update karte waqt error aaya');
        }
        dispatch(setgetMemberDataChange(true));
      }
    } else {
      // Just save without updating members
      await saveProgram(pendingFormValues);
    }
    setPendingFormValues(null);
    setChangedAgeGroups([]);
    resetPendingEntriesState();
  };

  // Popup band karo bina kuch save kiye — drawer khula rahega taaki user changes dekh/badal sake
  const handleCancelUpdateModal = () => {
    setUpdateMembersModalVisible(false);
    setPendingFormValues(null);
    setChangedAgeGroups([]);
    resetPendingEntriesState();
  };

  const pendingTotalEntries = pendingPreview.reduce((s, m) => s + m.entries.length, 0);

  const pendingPreviewColumns = [
    {
      title: 'Member',
      key: 'member',
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.displayName}</div>
          <div className="text-xs text-gray-400">{r.registrationNumber}{r.village ? ` • ${r.village}` : ''}</div>
        </div>
      ),
    },
    { title: 'Age Group', dataIndex: 'ageGroupLabel', key: 'ageGroupLabel', width: 90 },
    {
      title: 'Pending',
      key: 'count',
      width: 75,
      render: (_, r) => <Tag color="orange">{r.entries.length}</Tag>,
    },
    {
      title: 'Amount',
      key: 'amount',
      width: 130,
      render: (_, r) => {
        const oldAmounts = [...new Set(r.entries.map(e => e.payAmount))];
        return (
          <span className="text-sm">
            <span className="line-through text-red-500">₹{oldAmounts.join(', ₹')}</span>
            <span className="ml-1 text-green-600 font-semibold">→ ₹{r.newPayAmount}</span>
          </span>
        );
      },
    },
  ];

  const AgeGroupCard = ({ field, remove }) => {
    // key ko spread se alag rakho, warna har Form.Item ko same key milti hai
    const { key, ...restField } = field;
    return (
    <Card 
      key={field.key}
      className="bg-white hover:shadow-md transition-all duration-200 border border-gray-200"
      extra={
        <Button
          type="text"
          icon={<FiTrash2 className="text-red-500 hover:text-red-600" />}
          onClick={() => remove(field.name)}
          className="hover:bg-red-50"
        />
      }
      title={
        <div className="flex items-center gap-2">
          <FiCalendar className="text-blue-500" />
          <Text strong>Age Group {field.name + 1}</Text>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-6">
        <Form.Item
          {...restField}
          label="Start Age"
          name={[field.name, 'startAge']}
          rules={[{ required: true, message: 'Required' }]}
        >
          <InputNumber 
            placeholder="Start age" 
            className="w-full h-10" 
            min={0}
            max={100}
          />
        </Form.Item>
        <Form.Item
          {...restField}
          label="End Age"
          name={[field.name, 'endAge']}
          rules={[{ required: true, message: 'Required' }]}
        >
          <InputNumber 
            placeholder="End age" 
            className="w-full h-10" 
            min={0}
            max={100}
          />
        </Form.Item>
        <Form.Item
          {...restField}
          label={
            <div className="flex items-center gap-1">
              <FiDollarSign className="text-green-500" />
              <span>Joining Fee</span>
            </div>
          }
          name={[field.name, 'joinFee']}
          rules={[{ required: true, message: 'Required' }]}
        >
          <InputNumber 
            placeholder="Amount" 
            className="w-full h-10"
            prefix="₹"
            min={0}
          />
        </Form.Item>
        <Form.Item
          {...restField}
          label={
            <div className="flex items-center gap-1">
              <FiDollarSign className="text-green-500" />
              <span>Pay Amount</span>
            </div>
          }
          name={[field.name, 'payAmount']}
          rules={[{ required: true, message: 'Required' }]}
        >
          <InputNumber 
            placeholder="Amount" 
            className="w-full h-10"
            prefix="₹"
            min={0}
          />
        </Form.Item>
      </div>
      {/* Hidden field for ID */}
      <Form.Item
        {...restField}
        name={[field.name, 'id']}
        hidden
      >
        <Input type="hidden" />
      </Form.Item>
    </Card>
  );
  };

  const LocationGroupCard = ({ field, remove }) => {
    // key ko spread se alag rakho, warna har Form.Item ko same key milti hai
    const { key, ...restField } = field;
    return (
    <Card 
      key={field.key}
      className="bg-white hover:shadow-md transition-all duration-200 border border-gray-200"
      extra={
        <Button
          type="text"
          icon={<FiTrash2 className="text-red-500 hover:text-red-600" />}
          onClick={() => remove(field.name)}
          className="hover:bg-red-50"
        />
      }
      title={
        <div className="flex items-center gap-2">
          <FiMapPin className="text-purple-500" />
          <Text strong>Location Group {field.name + 1}</Text>
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-6">
        <Form.Item
          {...restField}
          label="Group Name"
          name={[field.name, 'groupName']}
          rules={[{ required: true, message: 'Required' }]}
        >
          <Input 
            placeholder="Enter group name" 
            className="h-10 w-full"
            prefix={<FiUser className="text-gray-400" />}
          />
        </Form.Item>
        <Form.Item
          {...restField}
          label="Location"
          name={[field.name, 'location']}
          rules={[{ required: true, message: 'Required' }]}
        >
          <Input 
            placeholder="Enter location" 
            className="h-10 w-full"
            prefix={<FiMapPin className="text-gray-400" />}
          />
        </Form.Item>
        <Form.Item
          {...restField}
          label="Location Group"
          name={[field.name, 'groupType']}
          rules={[{ required: true, message: 'Required' }]}
          className="col-span-2"
        >
          <Select
            placeholder="Select group type"
            options={locationGroupTypes}
            className="h-10 w-full"
          />
        </Form.Item>
      </div>
      {/* Hidden field for ID */}
      <Form.Item
        {...restField}
        name={[field.name, 'id']}
        hidden
      >
        <Input type="hidden" />
      </Form.Item>
    </Card>
  );
  };

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    form.resetFields();
  };

  return (
    <>
      {/* Custom trigger button or default button */}
   

      <Drawer
        title={
          <div className="flex items-center gap-2">
            {mode === 'edit' ? <FiEdit2 className="text-blue-500" /> : <FiPlusCircle className="text-blue-500" />}
            <Title level={4} className="!mb-0">
              {mode === 'edit' ? 'Edit Program' : 'Create New Program'}
            </Title>
          </div>
        }
        placement="right"
        onClose={handleCloseDrawer}
        open={isDrawerOpen}
        width={600}
        className="custom-drawer"
       destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="h-full"
        >
          <div className="space-y-6 pb-20">
            {/* Basic Information */}
            <Card className="border border-gray-200">
              <Title level={5} className="!mb-4 flex items-center gap-2">
                <FiUser className="text-blue-500" />
                Basic Information
              </Title>
              <Space direction="vertical" className="w-full">
                <Form.Item
                  label="Program Name"
                  name="name"
                  rules={[{ required: true, message: 'Please enter program name' }]}
                >
                  <Input 
                    placeholder="Enter program name" 
                    className="h-10"
                  />
                </Form.Item>
                <Form.Item
                  label="Hindi Yojna Name"
                  name="hiname"
                  rules={[{ required: true, message: 'Please enter yojna name' }]}
                >
                  <Input 
                    placeholder="Enter hindi yojna name" 
                    className="h-10"
                  />
                </Form.Item>
                 <Form.Item
                  label="Gujrati Yojna Name"
                  name="guname"
                  rules={[{ required: true, message: 'Please enter yojna name' }]}
                >
                  <Input 
                    placeholder="Enter Gujrati yojna name" 
                    className="h-10"
                  />
                </Form.Item>
                        <Form.Item
                  label="Member Count"
                  name="memberCount"
                  rules={[{ required: false }]}
                >
                  <Input 
                    placeholder="Enter Member Count" 
                    className="h-10"
                  />
                </Form.Item>
                        
                        <Form.Item
                  label="InActive Member Count"
                  name="inactivemembercount"
                  rules={[{ required: false }]}
                >
                  <Input 
                    placeholder="Enter InActive Member Count" 
                    className="h-10"
                  />
                </Form.Item>
                <Form.Item
                  label="Certificate Note (Hindi)"
                  name="noteLine"
                  rules={[{ required: true, message: 'Please enter note' }]}
                >
                  <Input 
                    placeholder="Enter hindi note for certificate" 
                    className="h-10"
                  />
                </Form.Item>
                <Form.Item
                  label="About Program"
                  name="about"
                  rules={[{ required: true, message: 'Please enter program description' }]}
                >
                  <TextArea
                    placeholder="Enter program description"
                    rows={3}
                    className="resize-none"
                  />
                </Form.Item>

                {/* isSelected Field */}
                <Form.Item
                  label={
                    <div className="flex items-center gap-2">
                      <FiTag className="text-orange-500" />
                      <span>Set as Selected Program</span>
                    </div>
                  }
                  name="isSelected"
                >
                  <Radio.Group 
                    value={isSelected}
                    onChange={(e) => setIsSelected(e.target.value)}
                    className="w-full"
                  >
                    <Space direction="horizontal">
                      <Radio value={true}>Yes</Radio>
                      <Radio value={false}>No</Radio>
                    </Space>
                  </Radio.Group>
                </Form.Item>

                {/* Program Category */}
                <Form.Item
                  label={
                    <div className="flex items-center gap-2">
                      <FiTag className="text-orange-500" />
                      <span>Program Category</span>
                    </div>
                  }
                  name="category"
                  rules={[{ required: true, message: 'Please select a category' }]}
                >
                  <Radio.Group className="w-full">
                    <Space direction="vertical" className="w-full">
                      {programCategories.map(cat => (
                        <Radio key={cat.value} value={cat.value}>
                          {cat.label}
                        </Radio>
                      ))}
                    </Space>
                  </Radio.Group>
                </Form.Item>
              </Space>
            </Card>

            {/* Age Groups */}
            <Card className="border border-gray-200">
              <Title level={5} className="!mb-4 flex items-center gap-2">
                <FiCalendar className="text-blue-500" />
                Age Groups
              </Title>
              <Form.List name="ageGroups">
                {(fields, { add, remove }) => (
                  <div className="space-y-4">
                    {fields.map(field => (
                      <AgeGroupCard key={field.key} field={field} remove={remove} />
                    ))}
                    <Button 
                      type="dashed" 
                      onClick={() => add()} 
                      className="w-full h-12 flex items-center justify-center gap-2 !border-blue-200 hover:!border-blue-400"
                      icon={<FiPlusCircle />}
                    >
                      Add Age Group
                    </Button>
                  </div>
                )}
              </Form.List>
            </Card>

            {/* Location Groups */}
            <Card className="border border-gray-200">
              <Title level={5} className="!mb-4 flex items-center gap-2">
                <FiMapPin className="text-purple-500" />
                Location Groups
              </Title>
              <Form.List name="locationGroups">
                {(fields, { add, remove }) => (
                  <div className="space-y-4">
                    {fields.map(field => (
                      <LocationGroupCard key={field.key} field={field} remove={remove} />
                    ))}
                    <Button 
                      type="dashed" 
                      onClick={() => add()} 
                      className="w-full h-12 flex items-center justify-center gap-2 !border-purple-200 hover:!border-purple-400"
                      icon={<FiPlusCircle />}
                    >
                      Add Location Group
                    </Button>
                  </div>
                )}
              </Form.List>
            </Card>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200">
            <div className="flex justify-end gap-3">
              <Button
                onClick={handleCloseDrawer}
                className="hover:bg-gray-50 px-6"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                className="bg-blue-500 hover:bg-blue-600 px-6"
                loading={loading}
                icon={mode === 'edit' ? <FiSave /> : null}
              >
                {mode === 'edit' ? 'Update Program' : 'Create Program'}
              </Button>
            </div>
          </div>
        </Form>
      </Drawer>
      {/* Confirmation Modal for Updating Members */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <FiAlertTriangle className="text-amber-500 text-xl" />
            <span>Age Group Fees Changed</span>
          </div>
        }
        open={updateMembersModalVisible}
        onCancel={handleCancelUpdateModal}
        maskClosable={false}
        zIndex={1100}
        width={600}
        footer={[
          <Button key="cancel" onClick={handleCancelUpdateModal} disabled={isUpdatingMembers}>
            Cancel
          </Button>,
          <Button key="skip" onClick={() => handleUpdateMembersResponse(false)} disabled={isUpdatingMembers || loadingPendingPreview}>
            Save Yojna Only
          </Button>,
          <Button
            key="update"
            type="primary"
            loading={isUpdatingMembers}
            disabled={loadingPendingPreview}
            onClick={() => handleUpdateMembersResponse(true)}
            className="bg-amber-500 hover:bg-amber-600 border-amber-500"
          >
            {updatePendingEntries && pendingTotalEntries > 0
              ? `Yes, Update Members + ${pendingTotalEntries} Pending Entries`
              : 'Yes, Update All Members'}
          </Button>,
        ]}
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            The following age groups have changes in <strong>Joining Fee</strong> or <strong>Pay Amount</strong>.
            Would you like to update all existing members in these age groups?
          </p>
          {changedAgeGroups.map((group, idx) => (
            <Card key={idx} size="small" className="border-l-4 border-l-amber-400">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Age Group:</span>
                  <span className="ml-2 font-semibold">{group.startAge}-{group.endAge} yrs</span>
                </div>
                <div>
                  <span className="text-gray-500">Group ID:</span>
                  <span className="ml-2 font-mono text-xs">{group.id}</span>
                </div>
                <div>
                  <span className="text-gray-500">Join Fee:</span>
                  <span className="ml-2 line-through text-red-500">₹{group.oldJoinFee}</span>
                  <span className="ml-2 text-green-600 font-semibold">→ ₹{group.joinFee}</span>
                </div>
                <div>
                  <span className="text-gray-500">Pay Amount:</span>
                  <span className="ml-2 line-through text-red-500">₹{group.oldPayAmount}</span>
                  <span className="ml-2 text-green-600 font-semibold">→ ₹{group.payAmount}</span>
                </div>
              </div>
            </Card>
          ))}
          <p className="text-xs text-gray-400">
            Members updated: <code>payAmount</code>, <code>joinFees</code>, and <code>ageGroupRange</code> will be synced.
          </p>

          {/* Existing pending entries update option — sirf jab payAmount change hua ho */}
          {payAmountChangedGroups.length > 0 && (
            <Card size="small" className="border border-blue-200 bg-blue-50">
              <Checkbox
                checked={updatePendingEntries}
                disabled={loadingPendingPreview || isUpdatingMembers}
                onChange={(e) => handleTogglePendingEntries(e.target.checked)}
              >
                <span className="font-medium">
                  Existing <strong>pending</strong> entries ka Pay Amount bhi update karein?
                </span>
              </Checkbox>
              <div className="text-xs text-gray-500 mt-1 ml-6">
                Sirf "pending" status wali entries change hongi. Paid / partial entries change nahi hongi.
              </div>

              {updatePendingEntries && (
                <div className="mt-3">
                  {loadingPendingPreview ? (
                    <div className="flex justify-center py-4"><Spin tip="Pending entries load ho rahi hain..." /></div>
                  ) : pendingPreview.length === 0 ? (
                    <Alert
                      type="info"
                      showIcon
                      message="Koi pending entry change karne layak nahi mili."
                      description={pendingStats && (
                        <div className="text-xs space-y-1">
                          <div>Members mile (in age groups me): <strong>{pendingStats.membersFound}</strong></div>
                          <div>Unki kul entries: <strong>{pendingStats.entriesFound}</strong></div>
                          <div>Paid / partial (skip): <strong>{pendingStats.paidSkipped}</strong></div>
                          <div>Pehle se naya amount (skip): <strong>{pendingStats.sameAmountSkipped}</strong></div>
                        </div>
                      )}
                    />
                  ) : (
                    <>
                      <Alert
                        type="warning"
                        showIcon
                        className="mb-2"
                        message={`${pendingPreview.length} members ki ${pendingTotalEntries} pending entries ka amount change hoga. Confirm karne ke liye niche list check karein.`}
                      />
                      <Table
                        size="small"
                        rowKey="key"
                        columns={pendingPreviewColumns}
                        dataSource={pendingPreview}
                        pagination={false}
                        scroll={{ y: 260 }}
                      />
                    </>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      </Modal>
    </>
  );
};

export default AddProgramEdit;