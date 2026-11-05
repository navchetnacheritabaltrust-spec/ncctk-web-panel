import React, { useState, useEffect } from 'react';
import { Button, Drawer, Form, Input, InputNumber, Select, Space, Card, Typography, App, Radio, Modal, Checkbox, Table, Spin, Alert, Tag } from 'antd';
import { FiPlusCircle, FiTrash2, FiUser, FiMapPin, FiDollarSign, FiCalendar, FiTag, FiEdit2, FiSave, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '@/lib/AuthProvider';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, getDoc, writeBatch } from "firebase/firestore";
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
  const { message: antdMessage, modal: antdModal } = App.useApp();
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
  const [updateError, setUpdateError] = useState('');
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

  // ── Member ka sahi age group nikalna ─────────────────────────────────────
  // AddMember jaisa hi logic: umar = (dateJoin - bobDate) saal me, phir
  // group.startAge <= umar < group.endAge. Saved ageGroup id / ageGroupRange
  // sirf tab use hote hain jab janm tithi na ho (purane data me id galat ho sakti hai).
  const parseDate = (val) => {
    if (!val) return null;
    if (typeof val?.toDate === 'function') return val.toDate();
    if (typeof val === 'object' && 'seconds' in val) return new Date(val.seconds * 1000);
    if (val instanceof Date) return val;
    if (typeof val === 'string') {
      const m = val.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); // DD-MM-YYYY
      if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const getDecimalAge = (birth, join) => {
    let years = join.getFullYear() - birth.getFullYear();
    const anniversary = new Date(birth);
    anniversary.setFullYear(birth.getFullYear() + years);
    if (anniversary > join) { years--; anniversary.setFullYear(birth.getFullYear() + years); }
    const next = new Date(anniversary);
    next.setFullYear(anniversary.getFullYear() + 1);
    return years + (join - anniversary) / (next - anniversary);
  };

  // Priority: 1) member me saved ageGroup id (agar program me maujood hai)
  //           2) saved ageGroupRange  3) janm tithi + joining date se umar
  const resolveMemberGroup = (m, groups) => {
    const byId = groups.find(gr => gr.id && gr.id === m.ageGroup);
    if (byId) return { group: byId, matchedBy: 'id' };
    const byRange = groups.find(gr => `${gr.startAge}-${gr.endAge}` === m.ageGroupRange);
    if (byRange) return { group: byRange, matchedBy: 'range' };
    const birth = parseDate(m.bobDate);
    if (birth) {
      const join = parseDate(m.dateJoin) || parseDate(m.createdAt) || new Date();
      const age = getDecimalAge(birth, join);
      const g = groups.find(gr => age >= Number(gr.startAge) && age < Number(gr.endAge));
      if (g) return { group: g, matchedBy: 'age' };
    }
    return { group: null, matchedBy: null };
  };

  // Program ke saare (non-deleted) members ko unke sahi group ke saath laao
  const getResolvedMembers = async (userUid, programId, groups) => {
    const snap = await getDocs(collection(db, `users/${userUid}/programs/${programId}/members`));
    const resolved = [];
    let unmatched = 0;
    snap.forEach(d => {
      const m = d.data();
      if (m.delete_flag === true) return;
      const { group, matchedBy } = resolveMemberGroup(m, groups);
      if (!group) { unmatched++; return; }
      resolved.push({ docSnap: d, data: m, group, matchedBy });
    });
    return { resolved, unmatched };
  };

  // Form ke naye age groups (id ke saath)
  const getNewAgeGroups = (values) =>
    (values?.ageGroups || []).filter(g => g && g.id);

  // Badle hue groups ke members update karo (sahi ageGroup id bhi set ho jaayegi)
  const updateMembersForAgeGroups = async (userUid, programId, changedGroups, allGroups) => {
    setIsUpdatingMembers(true);
    try {
      const changedIds = new Set(changedGroups.map(g => g.id));
      const { resolved } = await getResolvedMembers(userUid, programId, allGroups);
      const targets = resolved.filter(r => changedIds.has(r.group.id));

      for (const chunk of chunkArray(targets, 450)) {
        const batch = writeBatch(db);
        chunk.forEach(({ docSnap, group }) => {
          batch.update(docSnap.ref, {
            ageGroup: group.id,
            joinFees: Number(group.joinFee),
            payAmount: Number(group.payAmount),
            ageGroupRange: `${group.startAge}-${group.endAge}`,
            updatedAt: new Date(),
          });
        });
        await batch.commit();
      }
      return targets.length;
    } catch (error) {
      console.error('Error updating members:', error);
      throw error;
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  // Checkbox tabhi dikhega jab kisi group ka payAmount badla ho
  const payAmountChangedGroups = changedAgeGroups.filter(
    g => Number(g.payAmount) !== Number(g.oldPayAmount)
  );

  // Har member ki PENDING entries jinka amount uske (naye) group ke Pay Amount se match nahi karta.
  // Paid / partial / jisme koi paisa aa chuka ho — kabhi touch nahi karna.
  const fetchPendingEntriesPreview = async (userUid, programId, allGroups, targetGroupIds) => {
    const targetIds = new Set(targetGroupIds || []);
    const pendingRef = collection(db, `users/${userUid}/programs/${programId}/payment_pending`);
    const stats = {
      totalMembers: 0, unmatchedMembers: 0, membersWithPending: 0,
      entriesFound: 0, paidSkipped: 0, sameAmountSkipped: 0,
    };

    const { resolved: allResolved, unmatched } = await getResolvedMembers(userUid, programId, allGroups);
    // Sirf un groups ke members jinka Pay Amount abhi badla gaya hai
    const resolved = allResolved.filter(r => targetIds.has(r.group.id));
    stats.totalMembers = resolved.length;
    stats.unmatchedMembers = unmatched;
    if (resolved.length === 0) return { rows: [], stats };

    const memberInfo = {};
    resolved.forEach(r => { memberInfo[r.docSnap.id] = r; });

    // Firestore 'in' query max 30 values — 10-10 chunk parallel chalao
    const idChunks = chunkArray(Object.keys(memberInfo), 30);
    const pendingDocs = [];
    for (const group of chunkArray(idChunks, 10)) {
      const snaps = await Promise.all(
        group.map(ids => getDocs(query(pendingRef, where('memberId', 'in', ids))))
      );
      snaps.forEach(s => s.forEach(d => pendingDocs.push(d)));
    }

    const byMember = {};
    const membersSeen = new Set();
    pendingDocs.forEach(d => {
      const p = d.data();
      if (p.delete_flag === true) return;
      const info = memberInfo[p.memberId];
      if (!info) return;
      stats.entriesFound++;
      membersSeen.add(p.memberId);

      const status = String(p.status || 'pending').toLowerCase();
      if (status === 'paid' || status === 'partial' || Number(p.paidAmount) > 0 || p.transactionId) {
        stats.paidSkipped++;
        return;
      }
      const newPayAmount = Number(info.group.payAmount);
      // Purani entries me payAmount missing ho to app ₹200 maanta hai
      const currentAmount = p.payAmount === undefined || p.payAmount === null ? 200 : Number(p.payAmount);
      if (currentAmount === newPayAmount) { stats.sameAmountSkipped++; return; }

      if (!byMember[p.memberId]) byMember[p.memberId] = [];
      byMember[p.memberId].push({
        id: d.id,
        payAmount: currentAmount,
        newPayAmount,
        hasMemberDetailsPayAmount: !!(p.memberDetails && 'payAmount' in p.memberDetails),
      });
    });
    stats.membersWithPending = membersSeen.size;

    const rows = Object.entries(byMember).map(([memberId, entries]) => {
      const { data: m, group, matchedBy } = memberInfo[memberId];
      return {
        key: memberId,
        memberId,
        displayName: m.displayName || 'Unknown',
        registrationNumber: m.registrationNumber || 'N/A',
        village: m.village || '',
        ageGroupId: group.id,
        ageGroupLabel: `${group.startAge}-${group.endAge}`,
        matchedBy,
        newPayAmount: Number(group.payAmount),
        entries,
      };
    });
    rows.sort((a, b) => a.ageGroupLabel.localeCompare(b.ageGroupLabel) || a.displayName.localeCompare(b.displayName));
    return { rows, stats };
  };

  const handleTogglePendingEntries = async (checked) => {
    setUpdatePendingEntries(checked);
    if (!checked || !user?.uid || !program?.id) return;
    setLoadingPendingPreview(true);
    try {
      const { rows, stats } = await fetchPendingEntriesPreview(
        user.uid, program.id, getNewAgeGroups(pendingFormValues),
        payAmountChangedGroups.map(g => g.id)
      );
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

  // Confirm ki gayi entries update karo. Update se pehle dobara fetch karke check karte hain
  // ki entry abhi bhi pending hai — taaki beech me paid hui entry change na ho.
  const updatePendingEntriesForGroups = async (userUid, programId, confirmedPreview) => {
    const pendingCol = `users/${userUid}/programs/${programId}/payment_pending`;
    const confirmed = confirmedPreview.flatMap(m => m.entries);

    // Har entry ko abhi dobara padho — beech me paid / partial ho gayi ho to skip
    const toUpdate = [];
    for (const chunk of chunkArray(confirmed, 50)) {
      const snaps = await Promise.all(chunk.map(e => getDoc(doc(db, pendingCol, e.id))));
      snaps.forEach((snap, idx) => {
        if (!snap.exists()) return;
        const p = snap.data();
        const status = String(p.status || 'pending').toLowerCase();
        if (status === 'paid' || status === 'partial' || Number(p.paidAmount) > 0 || p.transactionId) return;
        toUpdate.push({ ...chunk[idx], currentAmount: p.payAmount ?? 200, hasMemberDetails: !!p.memberDetails });
      });
    }

    const now = new Date().toISOString();
    for (const entryChunk of chunkArray(toUpdate, 450)) {
      const batch = writeBatch(db);
      entryChunk.forEach(e => {
        const data = {
          payAmount: e.newPayAmount,
          previousPayAmount: e.currentAmount,
          payAmountUpdatedAt: now,
          updatedAt: now,
        };
        if (e.hasMemberDetailsPayAmount) data['memberDetails.payAmount'] = e.newPayAmount;
        batch.update(doc(db, pendingCol, e.id), data);
      });
      await batch.commit();
    }
    // Verification: Firestore se dobara padh kar check karo ki amount sach me badla
    let verified = 0;
    const failed = [];
    for (const chunk of chunkArray(toUpdate, 50)) {
      const snaps = await Promise.all(chunk.map(e => getDoc(doc(db, pendingCol, e.id))));
      snaps.forEach((snap, idx) => {
        if (snap.exists() && Number(snap.data().payAmount) === Number(chunk[idx].newPayAmount)) verified++;
        else failed.push(chunk[idx].id);
      });
    }
    if (failed.length) console.warn('Pending entries jo verify nahi hui:', failed);

    return { updated: toUpdate.length, skipped: confirmed.length - toUpdate.length, verified, failed: failed.length };
  };

  const resetPendingEntriesState = () => {
    setUpdatePendingEntries(false);
    setPendingPreview([]);
    setPendingStats(null);
    setLoadingPendingPreview(false);
    setUpdateError('');
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

  // Save ke baad drawer band karna / form reset — alag function taaki popup flow me
  // saara kaam khatam hone ke baad hi band ho
  const finishSave = () => {
    if (onSuccess) onSuccess();
    dispatch(setgetMemberDataChange(true));
    form.resetFields();
    setOldAgeGroups([]);
    setIsDrawerOpen(false);
  };

  const saveProgram = async (values, { keepOpen = false } = {}) => {
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

      if (!keepOpen) finishSave();
      setLoading(false);
      return true;
    } catch (error) {
      console.error(`Error ${mode === 'add' ? 'adding' : 'updating'} program:`, error);
      antdMessage.error(`Failed to ${mode === 'add' ? 'create' : 'update'} program.`);
      setLoading(false);
      return false;
    }
  };

  // Handle user response to the update members modal
  // Popup tab tak khula rahega jab tak saara kaam khatam na ho, aur error popup me hi dikhega.
  const handleUpdateMembersResponse = async (shouldUpdate) => {
    if (!pendingFormValues) return;
    const shouldUpdatePending = shouldUpdate && updatePendingEntries && pendingPreview.length > 0;
    const confirmedPreview = pendingPreview;
    const allNewGroups = getNewAgeGroups(pendingFormValues);
    const groupsToUpdate = changedAgeGroups;
    const programId = program?.id;
    const userUid = user?.uid;

    setUpdateError('');
    setIsUpdatingMembers(true);
    let step = 'Yojna save';
    const summary = { members: null, pending: null };
    let success = false;
    try {
      const saved = await saveProgram(pendingFormValues, { keepOpen: true });
      if (!saved) throw new Error('Yojna save nahi ho payi');

      if (shouldUpdate && programId) {
        step = 'Members update';
        summary.members = await updateMembersForAgeGroups(userUid, programId, groupsToUpdate, allNewGroups);
        setIsUpdatingMembers(true); // updateMembersForAgeGroups ise false kar deta hai — loading chalu rakho

        if (shouldUpdatePending) {
          step = 'Pending entries update';
          summary.pending = await updatePendingEntriesForGroups(userUid, programId, confirmedPreview);
        }
        dispatch(setgetMemberDataChange(true));
      }

      success = true;
    } catch (error) {
      console.error(`${step} failed:`, error);
      setUpdateError(`${step} me error: ${error?.code ? error.code + ' — ' : ''}${error?.message || error}`);
    } finally {
      setIsUpdatingMembers(false);
    }

    if (!success) return; // error popup me dikh raha hai — popup khula rahega

    // Sab successful — popup aur drawer band karo
    setUpdateMembersModalVisible(false);
    setPendingFormValues(null);
    setChangedAgeGroups([]);
    resetPendingEntriesState();
    try { finishSave(); } catch (e) { console.error('finishSave error:', e); }

    // Result summary dikhao
    if (shouldUpdate) {
      const p = summary.pending;
      antdModal.success({
        title: 'Update poora ho gaya',
        zIndex: 1200,
        content: (
          <div className="space-y-1 text-sm">
            <div>✅ Yojna save ho gayi</div>
            <div>✅ Members updated: <strong>{summary.members ?? 0}</strong></div>
            {p ? (
              <>
                <div>✅ Pending entries updated: <strong>{p.updated}</strong></div>
                <div>
                  {p.failed === 0 ? '✅' : '⚠️'} Verify (Firestore se dobara padh kar): <strong>{p.verified}/{p.updated}</strong> sahi amount par
                </div>
                {p.skipped > 0 && <div>⏭️ Skip (beech me paid ho gayi): {p.skipped}</div>}
                {p.failed > 0 && <div className="text-red-500">❌ {p.failed} entries verify nahi hui — console dekhein</div>}
              </>
            ) : (
              <div className="text-gray-500">Pending entries update nahi ki gayi (checkbox tick nahi tha)</div>
            )}
          </div>
        ),
      });
    }
  };

  // Popup band karo bina kuch save kiye — drawer khula rahega taaki user changes dekh/badal sake
  const handleCancelUpdateModal = () => {
    if (isUpdatingMembers) return; // update chalte waqt band mat karo
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
    {
      title: 'Age Group',
      key: 'ageGroupLabel',
      width: 100,
      render: (_, r) => (
        <div>
          <div>{r.ageGroupLabel} <span className="text-gray-400">(₹{r.newPayAmount})</span></div>
          <div className="text-[10px] text-gray-400">
            {r.matchedBy === 'age' ? 'umar se' : r.matchedBy === 'id' ? 'saved id se' : 'range se'}
          </div>
        </div>
      ),
    },
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
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.target?.tagName !== 'TEXTAREA') e.preventDefault();
          }}
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
            {updateError ? 'Close' : 'Cancel'}
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

          {updateError && (
            <Alert type="error" showIcon message="Update poora nahi hua" description={updateError} />
          )}

          {/* Existing pending entries update option — sirf jab payAmount change hua ho */}
          {payAmountChangedGroups.length > 0 && (
            <Card size="small" className="border border-blue-200 bg-blue-50">
              <Checkbox
                checked={updatePendingEntries}
                disabled={loadingPendingPreview || isUpdatingMembers}
                onChange={(e) => handleTogglePendingEntries(e.target.checked)}
              >
                <span className="font-medium">
                  Existing <strong>pending</strong> entries ka Pay Amount bhi sahi karein?
                </span>
              </Checkbox>
              <div className="text-xs text-gray-500 mt-1 ml-6">
                Sirf upar badle gaye age groups ke members. Member ka group uske record me saved group se liya jaata hai
                (na ho to umar se). Paid / partial entries kabhi change nahi hongi.
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
                          <div>Badle gaye groups ke members: <strong>{pendingStats.totalMembers}</strong> (program me kisi group me fit nahi: {pendingStats.unmatchedMembers})</div>
                          <div>Pending/paid entries wale members: <strong>{pendingStats.membersWithPending}</strong></div>
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
                        description={pendingStats && (
                          <span className="text-xs">
                            Group ke members: {pendingStats.totalMembers} • Kul entries: {pendingStats.entriesFound} •
                            Paid/partial skip: {pendingStats.paidSkipped} • Pehle se sahi amount: {pendingStats.sameAmountSkipped}
                            {pendingStats.unmatchedMembers > 0 && ` • Age group me fit nahi: ${pendingStats.unmatchedMembers}`}
                          </span>
                        )}
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