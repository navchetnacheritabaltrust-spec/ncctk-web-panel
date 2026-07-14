import React, { useState, useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Card, Typography, App, Radio, Modal } from 'antd';
import { FiPlusCircle, FiTrash2, FiUser, FiMapPin, FiDollarSign, FiCalendar, FiTag, FiEdit2, FiSave, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '@/lib/AuthProvider';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { setgetMemberDataChange, setPrograms } from '@/redux/slices/commonSlice';
import { useDispatch, useSelector } from 'react-redux';

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

  // Batch update all members with matching ageGroup ID
  const updateMembersForAgeGroups = async (userUid, programId, groups) => {
    setIsUpdatingMembers(true);
    try {
      const membersRef = collection(db, `users/${userUid}/programs/${programId}/members`);
      let totalUpdated = 0;

      for (const group of groups) {
        const q = query(
          membersRef,
          where('ageGroup', '==', group.id),
          where('delete_flag', '==', false)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) continue;

        const batch = writeBatch(db);
        snapshot.forEach(docSnap => {
          batch.update(docSnap.ref, {
            joinFees: Number(group.joinFee),
            payAmount: Number(group.payAmount),
            ageGroupRange: `${group.startAge}-${group.endAge}`,
            updatedAt: new Date(),
          });
        });
        await batch.commit();
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
    setUpdateMembersModalVisible(false);
    if (shouldUpdate && pendingFormValues) {
      // First save the program, then update members
      await saveProgram(pendingFormValues);
      if (program?.id) {
        const updated = await updateMembersForAgeGroups(user.uid, program.id, changedAgeGroups);
        if (updated > 0) {
          antdMessage.success(`${updated} members updated with new fee details`);
        }
        dispatch(setgetMemberDataChange(true));
      }
    } else {
      // Just save without updating members
      await saveProgram(pendingFormValues);
    }
    setPendingFormValues(null);
    setChangedAgeGroups([]);
  };

  const AgeGroupCard = ({ field, remove }) => (
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
          {...field}
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
          {...field}
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
          {...field}
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
          {...field}
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
        {...field}
        name={[field.name, 'id']}
        hidden
      >
        <Input type="hidden" />
      </Form.Item>
    </Card>
  );

  const LocationGroupCard = ({ field, remove }) => (
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
          {...field}
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
          {...field}
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
          {...field}
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
        {...field}
        name={[field.name, 'id']}
        hidden
      >
        <Input type="hidden" />
      </Form.Item>
    </Card>
  );

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
        onCancel={() => handleUpdateMembersResponse(false)}
        width={600}
        footer={[
          <Button key="skip" onClick={() => handleUpdateMembersResponse(false)} disabled={isUpdatingMembers}>
            No, Skip Member Update
          </Button>,
          <Button
            key="update"
            type="primary"
            loading={isUpdatingMembers}
            onClick={() => handleUpdateMembersResponse(true)}
            className="bg-amber-500 hover:bg-amber-600 border-amber-500"
          >
            Yes, Update All Members
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
        </div>
      </Modal>
    </>
  );
};

export default AddProgramEdit;