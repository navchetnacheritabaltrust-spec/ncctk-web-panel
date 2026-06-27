import {
    Drawer, Table, Button, Space, Tag, Card, Row, Col,
    Checkbox, Input, Segmented, Modal, Form,
    Select, DatePicker, InputNumber, Divider, Progress, Avatar, Tooltip,
    App, Timeline, Empty, Typography
} from 'antd'
import {
    DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
    SearchOutlined, PlusOutlined, BankOutlined, WalletOutlined,
    QrcodeOutlined, UserOutlined, TeamOutlined, ExportOutlined,
    InfoCircleOutlined, CloseOutlined, ArrowRightOutlined,
    HistoryOutlined, ReceiptOutlined, FilePdfOutlined
} from '@ant-design/icons'
import React, { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import dayjs from 'dayjs'
import PaymentModal from './PaymentModal'
import { createData, updateData, getData } from '@/lib/services/firebaseService'
import TransactionHistoryDrawer from './TransactionHistoryDrawer'
import JoinFeesExportPDF from './JoinFeesExportPDF'
import { pdfColors, TrsutData } from '@/lib/constentData'

const { Option } = Select
const { TextArea } = Input
const { Text } = Typography

// ─── Helper function to safely convert to number ───────────────────────────
const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0
    const num = Number(value)
    return isNaN(num) ? 0 : num
}

// ─── colour tokens ───────────────────────────────────────────────────────────
const C = {
    green:  { bg: '#f0faf4', border: '#b7e4c7', text: '#1a7f45', badge: '#d1fae5' },
    red:    { bg: '#fff5f5', border: '#fecaca', text: '#c0392b', badge: '#fee2e2' },
    blue:   { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badge: '#dbeafe' },
    amber:  { bg: '#fffbeb', border: '#fde68a', text: '#b45309', badge: '#fef3c7' },
    gray:   { bg: '#f9fafb', border: '#e5e7eb', text: '#374151', badge: '#f3f4f6' },
}

// ─── Format number as currency ──────────────────────────────────────────────
const fmt = (v) => `₹${toNumber(v).toLocaleString('en-IN')}`

// ─── Calculate percentage ───────────────────────────────────────────────────
const pct = (paid, total) => {
    const paidNum = toNumber(paid)
    const totalNum = toNumber(total)
    return totalNum ? Math.round((paidNum / totalNum) * 100) : 0
}

// ─── Check if fully paid ────────────────────────────────────────────────────
const isFullyPaid = (m) => toNumber(m?.joinFeesPaidAmount) >= toNumber(m?.joinFees)

// ─── Get remaining amount ───────────────────────────────────────────────────
const getRemaining = (m) => Math.max(0, toNumber(m?.joinFees) - toNumber(m?.joinFeesPaidAmount))

// ─── Get initials from name ─────────────────────────────────────────────────
const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// ─── Get avatar color based on name ─────────────────────────────────────────
const avatarColor = (name = '') => {
    const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444']
    return colors[name.charCodeAt(0) % colors.length]
}

// ─── Normalize member data (convert string amounts to numbers) ──────────────
const normalizeMember = (member) => ({
    ...member,
    joinFees: toNumber(member?.joinFees),
    joinFeesPaidAmount: toNumber(member?.joinFeesPaidAmount),
    joinFeesRemainingAmount: toNumber(member?.joinFeesRemainingAmount)
})

// ─── sub-components ──────────────────────────────────────────────────────────

const StatCard = ({ label, value, color = 'gray', icon }) => (
    <div style={{
        background: C[color].bg,
        border: `1px solid ${C[color].border}`,
        borderRadius: 10,
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        flex: 1, minWidth: 0,
    }}>
        {icon && (
            <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: C[color].badge,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C[color].text, fontSize: 15, flexShrink: 0,
            }}>
                {icon}
            </div>
        )}
        <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C[color].text, lineHeight: 1.2, marginTop: 2, whiteSpace: 'nowrap' }}>{value}</div>
        </div>
    </div>
)

const MemberAvatar = ({ name, size = 28 }) => (
    <div style={{
        width: size, height: size, borderRadius: '50%',
        background: avatarColor(name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
        letterSpacing: '-0.02em',
    }}>
        {initials(name)}
    </div>
)

// ─── Main Component ──────────────────────────────────────────────────────────

const JoinFeesMemberList = ({ onSuccess,open, onClose, membersData, agentData, selectedProgram }) => {
    const [selectedRowKeys, setSelectedRowKeys] = useState([])
    const [loading, setLoading]                 = useState(false)
    const [searchText, setSearchText]           = useState('')
    const [filterStatus, setFilterStatus]       = useState('all')
    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [submitting, setSubmitting]           = useState(false)
    const [paymentForm]                         = Form.useForm()
    const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false)
    const [selectedMemberForHistory, setSelectedMemberForHistory] = useState(null)
    const [pdfExportOpen, setPdfExportOpen] = useState(false)
    const { user }                              = useAuth()
    const { message } = App.useApp()

    // ── Normalize members data (convert strings to numbers) ──────────────────
    const normalizedMembersData = useMemo(() => {
        if (!membersData) return []
        return membersData.map(normalizeMember)
    }, [membersData])

    // ── derived data ──────────────────────────────────────────────────────────
    const filteredMembers = useMemo(() => {
        let list = normalizedMembersData || []
        if (filterStatus === 'paid')    list = list.filter(isFullyPaid)
        if (filterStatus === 'pending') list = list.filter(m => !isFullyPaid(m))
        if (searchText.trim()) {
            const q = searchText.toLowerCase()
            list = list.filter(m =>
                m.displayName?.toLowerCase().includes(q) ||
                m.registrationNumber?.toLowerCase().includes(q) ||
                m.phone?.includes(searchText) ||
                m.fatherName?.toLowerCase().includes(q) ||
                m.joinFeesTxtId?.toLowerCase().includes(q)
            )
        }
        return list
    }, [normalizedMembersData, searchText, filterStatus])

    const selectedMembers = useMemo(
        () => selectedRowKeys.map(k => filteredMembers[k]).filter(Boolean),
        [selectedRowKeys, filteredMembers]
    )

    const totalSelectedDue = useMemo(
        () => selectedMembers.reduce((s, m) => s + getRemaining(m), 0),
        [selectedMembers]
    )

    const totals = useMemo(() => {
        if (!filteredMembers.length)
            return { totalMembers: 0, totalFees: 0, totalPaid: 0, totalRemaining: 0, paidCount: 0, pendingCount: 0 }
        return filteredMembers.reduce((acc, m) => {
            acc.totalFees      += toNumber(m?.joinFees)
            acc.totalPaid      += toNumber(m?.joinFeesPaidAmount)
            acc.totalRemaining += getRemaining(m)
            if (isFullyPaid(m)) acc.paidCount++; else acc.pendingCount++
            acc.totalMembers++
            return acc
        }, { totalMembers: 0, totalFees: 0, totalPaid: 0, totalRemaining: 0, paidCount: 0, pendingCount: 0 })
    }, [filteredMembers])

    const originalTotals = useMemo(() => {
        if (!normalizedMembersData?.length) return { paidCount: 0, pendingCount: 0, total: 0 }
        const pc = normalizedMembersData.filter(isFullyPaid).length
        return { paidCount: pc, pendingCount: normalizedMembersData.length - pc, total: normalizedMembersData.length }
    }, [normalizedMembersData])

    // ── handlers ──────────────────────────────────────────────────────────────
    const handleSelectAll = () =>
        setSelectedRowKeys(
            selectedRowKeys.length === filteredMembers.length ? [] : filteredMembers.map((_, i) => i)
        )

    const handleExport = (type) => {
        const data = type === 'selected' ? selectedMembers : filteredMembers
        if (!data.length) { message.warning('No members to export'); return }
        
        if (type === 'pdf') {
            setPdfExportOpen(true)
        } else if (type === 'csv') {
            exportToCSV(data)
        }
    }
    
    const exportToCSV = (data) => {
        setLoading(true)
        try {
            const headers = ['S.No', 'Member Name', 'Registration No', 'Father Name', 'Village', 'Phone', 'Join Fees', 'Paid Amount', 'Remaining', 'Status']
            const rows = data.map((member, idx) => [
                idx + 1,
                member.displayName || '',
                member.registrationNumber || '',
                member.fatherName || '',
                member.village || '',
                member.phone || '',
                toNumber(member.joinFees),
                toNumber(member.joinFeesPaidAmount),
                getRemaining(member),
                isFullyPaid(member) ? 'Paid' : 'Pending'
            ])
            
            const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.href = url
            link.setAttribute('download', `join_fees_${selectedProgram?.name}_${dayjs().format('YYYY-MM-DD')}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            message.success(`Exported ${data.length} members to CSV`)
        } catch (error) {
            message.error('Failed to export CSV')
        } finally {
            setLoading(false)
        }
    }

    const handleOpenPayment = () => {
        if (!selectedMembers.length) { message.warning('Select at least one member'); return }
        paymentForm.resetFields()
        paymentForm.setFieldsValue({ paymentDate: dayjs() })
        setPaymentModalOpen(true)
    }

    const handleOpenHistory = (member) => {
        if (member && member.id) {
            setSelectedMemberForHistory(member)
            setHistoryDrawerOpen(true)
        }
    }

    const handleSubmitPayment = async (allocations) => {
        try {
            const values = await paymentForm.validateFields()
            setSubmitting(true)
     
            for (let idx = 0; idx < selectedMembers.length; idx++) {
                const member = selectedMembers[idx]
                const pay = toNumber(allocations[idx])
                if (pay <= 0) continue
     
                const currentPaid = toNumber(member.joinFeesPaidAmount)
                const totalFees = toNumber(member.joinFees)
                const newPaid = currentPaid + pay
                const fullPaid = newPaid >= totalFees
     
                await createData(
                    `/users/${user.uid}/programs/${selectedProgram.id}/joinFeesTransactions`,
                    {
                        memberId:           member.id,
                        memberName:         member.displayName,
                        registrationNumber: member.registrationNumber,
                        amount:             pay,
                        paymentMode:        values.paymentMode,
                        transactionId:      values.transactionId || null,
                        note:               values.note || null,
                        paymentDate:        values.paymentDate?.toDate() || new Date(),
                        createdAt:          new Date(),
                        createdBy:          user?.uid,
                        agentId:           agentData?.id || null,
                        createdByName:      agentData?.displayName || user?.displayName || 'Agent',
                    }
                )
                await updateData(
                    `/users/${user.uid}/programs/${selectedProgram.id}/members`,
                    member.id,
                    {
                        joinFeesPaidAmount:    newPaid,
                        joinFeesRemainingAmount: totalFees - newPaid,
                        joinFeesDone:          fullPaid,
                        joinFeesTxtId:         values.transactionId || member.joinFeesTxtId || null,
                        joinFeesPaymentType:   values.paymentMode === 'cash' ? 'cash' : 'online',
                        lastPaymentDate:       values.paymentDate?.toDate() || new Date(),
                    }
                )
            }
     
            const totalPaid = Object.values(allocations).reduce((s, v) => s + toNumber(v), 0)
            onSuccess && onSuccess()
            message.success(`Payment of ${fmt(totalPaid)} recorded for ${selectedMembers.length} member(s)`)
            setPaymentModalOpen(false)
            setSelectedRowKeys([])
            onClose()
            window.dispatchEvent(new Event('memberDataUpdate'))
        } catch (err) {
            console.error(err)
            if (err?.errorFields) return
            message.error('Failed to process payment')
        } finally {
            setSubmitting(false)
        }
    }

    // Get filter summary for PDF
    const getFilterSummary = () => {
        const filters = []
        if (filterStatus === 'paid') filters.push('Paid Members')
        if (filterStatus === 'pending') filters.push('Pending Members')
        if (searchText) filters.push(`Search: "${searchText}"`)
        return filters.join(' · ')
    }

    // ── columns ───────────────────────────────────────────────────────────────
    const columns = [
        {
            title: (
                <Checkbox
                    checked={selectedRowKeys.length === filteredMembers.length && filteredMembers.length > 0}
                    indeterminate={selectedRowKeys.length > 0 && selectedRowKeys.length < filteredMembers.length}
                    onChange={handleSelectAll}
                />
            ),
            key: 'select', width: 40,
            render: (_, record, index) => (
                <Checkbox
                    checked={selectedRowKeys.includes(index)}
                    disabled={isFullyPaid(record)}
                    onChange={() => {
                        if (selectedRowKeys.includes(index))
                            setSelectedRowKeys(selectedRowKeys.filter(k => k !== index))
                        else setSelectedRowKeys([...selectedRowKeys, index])
                    }}
                />
            ),
        },
        {
            title: <span style={{ color: '#9ca3af', fontSize: 11 }}>#</span>,
            key: 'sno', width: 40,
            render: (_, __, i) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{i + 1}</span>,
        },
        {
            title: 'Member', dataIndex: 'displayName', key: 'name',
            render: (name, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MemberAvatar name={name} size={28} />
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>{name || '—'}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                            {record.registrationNumber ? `#${record.registrationNumber}` : '—'}
                            {record.phone ? ` · ${record.phone}` : ''}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Father Name', dataIndex: 'fatherName', key: 'fatherName', width: 110,
            render: t => <span style={{ fontSize: 12, color: '#6b7280' }}>{t || '—'}</span>,
        },
        {
            title: 'Village', dataIndex: 'village', key: 'village', width: 90,
            render: t => <span style={{ fontSize: 12, color: '#6b7280' }}>{t || '—'}</span>,
        },
        {
            title: 'Join fees', dataIndex: 'joinFees', key: 'fees', width: 90, align: 'right',
            render: (v, record) => <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{fmt(record.joinFees)}</span>,
        },
        {
            title: 'Paid', dataIndex: 'joinFeesPaidAmount', key: 'paid', width: 85, align: 'right',
            render: (v, record) => <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>{fmt(record.joinFeesPaidAmount)}</span>,
        },
        {
            title: 'Remaining', key: 'remaining', width: 90, align: 'right',
            render: (_, r) => {
                const rem = getRemaining(r)
                return <span style={{ fontSize: 13, fontWeight: 600, color: rem > 0 ? C.red.text : '#16a34a' }}>{fmt(rem)}</span>
            },
        },
        {
            title: 'Progress', key: 'progress', width: 110,
            render: (_, r) => {
                const p = pct(r.joinFeesPaidAmount, r.joinFees)
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${p}%`, background: p === 100 ? '#22c55e' : '#3b82f6', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 11, color: '#9ca3af', minWidth: 28, textAlign: 'right' }}>{p}%</span>
                    </div>
                )
            },
        },
        {
            title: 'Status', key: 'status', width: 75, align: 'center',
            render: (_, r) => isFullyPaid(r)
                ? <span style={{ fontSize: 11, fontWeight: 600, color: C.green.text, background: C.green.badge, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>Paid</span>
                : <span style={{ fontSize: 11, fontWeight: 600, color: C.red.text, background: C.red.badge, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>Pending</span>,
        },
        {
            title: 'Action', key: 'action', width: 70, align: 'center',
            render: (_, record) => (
                <Tooltip title="View payment history">
                    <Button
                        type="text"
                        size="small"
                        icon={<HistoryOutlined style={{ fontSize: 16, color: '#3b82f6' }} />}
                        onClick={() => handleOpenHistory(record)}
                        style={{ borderRadius: 6 }}
                        disabled={!record || !record.id}
                    />
                </Tooltip>
            ),
        },
    ]

    // ── render ────────────────────────────────────────────────────────────────
    const collectionPct = totals.totalFees ? Math.round((totals.totalPaid / totals.totalFees) * 100) : 0

    return (
        <>
            <Drawer
                open={open}
                onClose={onClose}
                placement="right"
                width={1060}
                footer={null}
                closeIcon={<CloseOutlined style={{ fontSize: 14 }} />}
                styles={{
                    header: { padding: '14px 0px', borderBottom: '1px solid #f0f0f0' },
                    body: { padding: 0, display: 'flex', flexDirection: 'column', background: '#f9fafb' },
                }}
                title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: C.blue.bg, border: `1px solid ${C.blue.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <DollarOutlined style={{ fontSize: 15, color: C.blue.text }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                                    Join Fees
                                    {selectedProgram && <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>· {selectedProgram.name}</span>}
                                </div>
                                {agentData && (
                                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Agent: {agentData.displayName || agentData.name}</div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {selectedRowKeys.length > 0 && (
                                <Button
                                    type="primary"
                                    icon={<CheckCircleOutlined />}
                                    onClick={handleOpenPayment}
                                    style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 7, fontWeight: 600, height: 34 }}
                                >
                                    Collect payment ({selectedRowKeys.length})
                                </Button>
                            )}
                            <Button
                                size="small" icon={<FilePdfOutlined />}
                                onClick={() => handleExport('pdf')}
                                loading={loading} disabled={!filteredMembers.length}
                                style={{ borderRadius: 6, color: '#dc2626', borderColor: '#dc2626' }}
                            >
                                PDF Export
                            </Button>
                            <Button
                                size="small" icon={<ExportOutlined />}
                                onClick={() => handleExport('csv')}
                                loading={loading} disabled={!filteredMembers.length}
                                style={{ borderRadius: 6 }}
                            >
                                CSV Export
                            </Button>
                        </div>
                    </div>
                }
            >
                {/* ── Top stats bar ── */}
                <div style={{ borderBottom: '1px solid #e5e7eb', padding: '0px 10px' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                        <StatCard label="Total members" value={originalTotals.total} color="gray" icon={<TeamOutlined />} />
                        <StatCard label="Fully paid"    value={originalTotals.paidCount} color="green" icon={<CheckCircleOutlined />} />
                        <StatCard label="Pending"       value={originalTotals.pendingCount} color="red" icon={<ClockCircleOutlined />} />
                        <StatCard label="Total fees"    value={fmt(totals.totalFees)} color="gray" icon={<DollarOutlined />} />
                        <StatCard label="Collected"     value={fmt(totals.totalPaid)} color="green" icon={<CheckCircleOutlined />} />
                        <StatCard label="Remaining"     value={fmt(totals.totalRemaining)} color="red" icon={<DollarOutlined />} />
                    </div>

                    {/* Collection progress */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>Collection progress</span>
                        <div style={{ flex: 1, height: 6, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${collectionPct}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 99, transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>{collectionPct}%</span>
                    </div>
                </div>

                {/* ── Filters ── */}
                <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Segmented
                        value={filterStatus}
                        onChange={(v) => { setFilterStatus(v); setSelectedRowKeys([]) }}
                        options={[
                            {
                                label: <Space size={4}><span>All</span><span style={{ fontSize: 11, fontWeight: 600, background: '#e5e7eb', color: '#374151', padding: '0 6px', borderRadius: 99 }}>{originalTotals.total}</span></Space>,
                                value: 'all',
                            },
                            {
                                label: <Space size={4}><CheckCircleOutlined style={{ color: '#16a34a' }} /><span>Paid</span><span style={{ fontSize: 11, fontWeight: 600, background: C.green.badge, color: C.green.text, padding: '0 6px', borderRadius: 99 }}>{originalTotals.paidCount}</span></Space>,
                                value: 'paid',
                            },
                            {
                                label: <Space size={4}><ClockCircleOutlined style={{ color: C.red.text }} /><span>Pending</span><span style={{ fontSize: 11, fontWeight: 600, background: C.red.badge, color: C.red.text, padding: '0 6px', borderRadius: 99 }}>{originalTotals.pendingCount}</span></Space>,
                                value: 'pending',
                            },
                        ]}
                        style={{ background: '#f3f4f6' }}
                    />
                    <Input
                        placeholder="Search by name, reg number, phone…"
                        prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
                        value={searchText}
                        onChange={e => { setSearchText(e.target.value); setSelectedRowKeys([]) }}
                        allowClear
                        style={{ flex: 1, maxWidth: 360, borderRadius: 7 }}
                    />
                    {filteredMembers.length !== (normalizedMembersData?.length || 0) && (
                        <span style={{ fontSize: 12, color: '#6b7280' }}>
                            Showing {filteredMembers.length} of {normalizedMembersData?.length || 0}
                        </span>
                    )}
                </div>

                {/* ── Selection banner ── */}
                {selectedRowKeys.length > 0 && (
                    <div style={{
                        background: C.blue.bg, borderBottom: `1px solid ${C.blue.border}`,
                        padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.blue.text }}>
                                {selectedRowKeys.length} member{selectedRowKeys.length !== 1 ? 's' : ''} selected
                            </span>
                            <span style={{ fontSize: 13, color: '#374151' }}>
                                Total due: <strong style={{ color: C.red.text }}>{fmt(totalSelectedDue)}</strong>
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <Button size="small" onClick={() => setSelectedRowKeys([])} style={{ borderRadius: 6 }}>Clear</Button>
                            <Button
                                size="small" type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={handleOpenPayment}
                                style={{ background: '#16a34a', borderColor: '#16a34a', borderRadius: 6, fontWeight: 600 }}
                            >
                                Collect {fmt(totalSelectedDue)}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Table ── */}
                <div style={{ flex: 1, overflow: 'auto', padding: '0 0 0px' }}>
                    <Table
                        columns={columns}
                        dataSource={filteredMembers}
                        rowKey={(_, i) => i}
                        size="small"
                        scroll={{ x: 900, y: 300 }}
                        pagination={{ pageSize: 25, size: 'small', showTotal: (t, [s, e]) => `${s}–${e} of ${t} members`, showSizeChanger: false }}
                        rowClassName={r => isFullyPaid(r) ? 'row-paid' : 'row-pending'}
                        style={{ background: '#fff' }}
                        summary={(pageData) => {
                            if (!pageData.length) return null
                            const fees = pageData.reduce((a, r) => a + toNumber(r.joinFees), 0)
                            const paid = pageData.reduce((a, r) => a + toNumber(r.joinFeesPaidAmount), 0)
                            const rem  = pageData.reduce((a, r) => a + getRemaining(r), 0)
                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: '#f9fafb' }}>
                                        <Table.Summary.Cell index={0} colSpan={5}>
                                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Page total ({pageData.length} members)</span>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right">
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{fmt(fees)}</span>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} align="right">
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{fmt(paid)}</span>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={3} align="right">
                                            <span style={{ fontSize: 13, fontWeight: 700, color: C.red.text }}>{fmt(rem)}</span>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={4} colSpan={3} />
                                    </Table.Summary.Row>
                                </Table.Summary>
                            )
                        }}
                    />
                </div>

                <style>{`
                    .row-paid td { background: #f0fdf4 !important; }
                    .row-pending td { background: #fff !important; }
                    .row-paid:hover td { background: #dcfce7 !important; }
                    .row-pending:hover td { background: #f9fafb !important; }
                    .ant-table-thead > tr > th {
                        background: #f3f4f6 !important;
                        font-size: 11px !important;
                        font-weight: 600 !important;
                        color: #6b7280 !important;
                        letter-spacing: 0.04em;
                        text-transform: uppercase;
                        border-bottom: 1px solid #e5e7eb !important;
                        padding: 8px 10px !important;
                    }
                    .ant-table-tbody > tr > td { padding: 8px 10px !important; border-bottom: 1px solid #f3f4f6 !important; }
                `}</style>
            </Drawer>

            <PaymentModal
                open={paymentModalOpen}
                onCancel={() => setPaymentModalOpen(false)}
                onSubmit={handleSubmitPayment}
                submitting={submitting}
                selectedMembers={selectedMembers}
                totalDue={totalSelectedDue}
                form={paymentForm}
                agentData={agentData}
            />

            <TransactionHistoryDrawer
                open={historyDrawerOpen}
                onClose={() => setHistoryDrawerOpen(false)}
                member={selectedMemberForHistory}
                programId={selectedProgram?.id}
                agentData={agentData}
                onDeleteSuccess={onSuccess}
            />

            <JoinFeesExportPDF
                open={pdfExportOpen}
                onClose={() => setPdfExportOpen(false)}
                members={filteredMembers}
                filterSummary={getFilterSummary()}
                programName={selectedProgram?.name}
                agentData={agentData}
                totals={totals}
                trustData={TrsutData}
                colors={pdfColors}
            />
        </>
    )
}

export default JoinFeesMemberList