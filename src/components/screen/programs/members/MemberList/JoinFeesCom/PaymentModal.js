import {
    Drawer, Button, Form, Select, DatePicker, Input, Space, Tag, Tooltip
} from 'antd'
import {
    DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
    InfoCircleOutlined, CloseOutlined, WalletOutlined, BankOutlined,
    QrcodeOutlined, TeamOutlined, SwapRightOutlined
} from '@ant-design/icons'
import React, { useState, useMemo, useEffect } from 'react'

const { Option } = Select
const { TextArea } = Input

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`
const pct = (paid, total) => total ? Math.round((paid / total) * 100) : 0
const getRemaining = (m) => Math.max(0, (m.joinFees || 0) - (m.joinFeesPaidAmount || 0))
const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

const AVATAR_COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#d97706', '#059669', '#2563eb', '#dc2626']
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

// ─── tiny sub-components ──────────────────────────────────────────────────────

const Avatar = ({ name, size = 32 }) => (
    <div style={{
        width: size, height: size, borderRadius: '50%',
        background: avatarColor(name),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: size * 0.34, fontWeight: 700, flexShrink: 0,
        letterSpacing: '-0.02em',
    }}>
        {initials(name)}
    </div>
)

const StatPill = ({ label, value, bg, border, textColor }) => (
    <div style={{
        flex: 1, background: bg, border: `1px solid ${border}`,
        borderRadius: 10, padding: '9px 12px', minWidth: 0,
    }}>
        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {label}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: textColor, marginTop: 2, whiteSpace: 'nowrap' }}>
            {value}
        </div>
    </div>
)

const AllocBadge = ({ amount, maxAmount }) => {
    if (amount === 0)
        return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#f3f4f6', color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>Not paying</span>
    if (amount >= maxAmount)
        return <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#d1fae5', color: '#065f46', fontWeight: 600, whiteSpace: 'nowrap' }}>Full clear ✓</span>
    return (
        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#dbeafe', color: '#1e40af', fontWeight: 600, whiteSpace: 'nowrap' }}>
            Partial · {fmt(maxAmount - amount)} left
        </span>
    )
}

// ─── Main PaymentModal ─────────────────────────────────────────────────────────

const PaymentModal = ({
    open, onCancel, onSubmit, submitting,
    selectedMembers, form, agentData,
}) => {
    const [mode, setMode] = useState(null)

    // per-member allocation amounts (keyed by member index)
    const [allocations, setAllocations] = useState({})

    // when members change, seed allocations to full dues
    useEffect(() => {
        if (!open) return
        const init = {}
        selectedMembers.forEach((m, i) => {
            init[i] = getRemaining(m)
        })
        setAllocations(init)
    }, [open, selectedMembers.length])

    const totalAllocated = useMemo(
        () => Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0),
        [allocations]
    )

    const totalDue = useMemo(
        () => selectedMembers.reduce((s, m) => s + getRemaining(m), 0),
        [selectedMembers]
    )

    const setAlloc = (idx, raw) => {
        const max = getRemaining(selectedMembers[idx])
        const val = Math.min(Math.max(0, Number(raw) || 0), max)
        setAllocations(prev => ({ ...prev, [idx]: val }))
    }

    const handleSubmit = () => {
        onSubmit(allocations)
    }

    // bar color
    const barColor = (p) => p === 100 ? '#22c55e' : '#3b82f6'

    return (
        <Drawer
            open={open}
            onClose={onCancel}
            placement="right"
            width={560}
            closeIcon={<CloseOutlined style={{ fontSize: 13 }} />}
            styles={{
                header: { padding: '13px 20px', borderBottom: '1px solid #f0f0f0' },
                body: { padding: 0 },
                footer: { padding: '13px 20px', borderTop: '1px solid #f0f0f0' },
            }}
            footer={
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button onClick={onCancel} style={{ flex: 1, height: 40, borderRadius: 8, fontWeight: 500 }}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        loading={submitting}
                        onClick={handleSubmit}
                        icon={<CheckCircleOutlined />}
                        style={{
                            flex: 2, height: 40, borderRadius: 8,
                            background: '#16a34a', borderColor: '#16a34a',
                            fontWeight: 700, fontSize: 14,
                        }}
                    >
                        Confirm &amp; process {fmt(totalAllocated)}
                    </Button>
                </div>
            }
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 9,
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <DollarOutlined style={{ fontSize: 17, color: '#16a34a' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Collect payment</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
                            {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}
                            {agentData ? ` · Agent: ${agentData.displayName || agentData.name}` : ''}
                        </div>
                    </div>
                </div>
            }
        >
            <div style={{ padding: '18px 20px 0' }}>
                {/* ── Summary stats ── */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <StatPill label="Members"    value={selectedMembers.length}       bg="#eff6ff" border="#bfdbfe" textColor="#1d4ed8" />
                    <StatPill label="Total due"  value={fmt(totalDue)}                bg="#fff5f5" border="#fecaca" textColor="#b91c1c" />
                    <StatPill label="Allocating" value={fmt(totalAllocated)}          bg="#f0fdf4" border="#bbf7d0" textColor="#15803d" />
                </div>

                {/* ── Allocation banner ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 8,
                }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Per-member allocation
                    </div>
                    <Tooltip title="Edit individual amounts. Defaults to full dues per member.">
                        <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, cursor: 'help' }}>
                            <InfoCircleOutlined style={{ fontSize: 11 }} />
                            Custom or full dues
                        </span>
                    </Tooltip>
                </div>

                {/* ── Member allocation rows ── */}
                <div style={{
                    border: '1px solid #e5e7eb', borderRadius: 10,
                    overflow: 'hidden', marginBottom: 18, background: '#fff',
                }}>
                    {selectedMembers.map((member, idx) => {
                        const due     = getRemaining(member)
                        const paid    = member.joinFeesPaidAmount || 0
                        const total   = member.joinFees || 0
                        const existPct = pct(paid, total)
                        const allocAmt = allocations[idx] ?? due

                        return (
                            <div
                                key={member.id || idx}
                                style={{
                                    padding: '11px 14px',
                                    borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none',
                                    background: allocAmt >= due ? '#f0fdf4' : '#fff',
                                    transition: 'background 0.2s',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Avatar name={member.displayName} size={32} />

                                    {/* member info + progress */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {member.displayName}
                                            </span>
                                            {member.registrationNumber && (
                                                <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>#{member.registrationNumber}</span>
                                            )}
                                        </div>
                                        {/* existing payment progress */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 99,
                                                    width: `${existPct}%`,
                                                    background: barColor(existPct),
                                                    transition: 'width .3s',
                                                }} />
                                            </div>
                                            <span style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                {fmt(paid)} paid · {fmt(due)} due
                                            </span>
                                        </div>
                                    </div>

                                    {/* amount input + badge */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                        <AllocBadge amount={allocAmt} maxAmount={due} />
                                        {/* custom amount input */}
                                        <div style={{ position: 'relative' }}>
                                            <span style={{
                                                position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
                                                fontSize: 12, color: '#6b7280', pointerEvents: 'none', zIndex: 1,
                                            }}>₹</span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={due}
                                                value={allocAmt}
                                                onChange={e => setAlloc(idx, e.target.value)}
                                                style={{
                                                    width: 110, height: 32,
                                                    border: `1px solid ${allocAmt >= due ? '#86efac' : '#d1d5db'}`,
                                                    borderRadius: 7,
                                                    paddingLeft: 22, paddingRight: 8,
                                                    fontSize: 13, fontWeight: 600,
                                                    background: allocAmt >= due ? '#f0fdf4' : '#fff',
                                                    color: allocAmt >= due ? '#15803d' : allocAmt > 0 ? '#1d4ed8' : '#374151',
                                                    outline: 'none',
                                                    transition: 'border-color 0.15s, background 0.15s',
                                                    appearance: 'textfield',
                                                    MozAppearance: 'textfield',
                                                }}
                                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                                onBlur={e => e.target.style.borderColor = allocAmt >= due ? '#86efac' : '#d1d5db'}
                                            />
                                        </div>
                                        {due > 0 && (
                                            <button
                                                onClick={() => setAlloc(idx, due)}
                                                style={{
                                                    fontSize: 10, color: '#6b7280', background: 'none',
                                                    border: 'none', cursor: 'pointer', padding: 0,
                                                    textDecoration: 'underline', textUnderlineOffset: 2,
                                                }}
                                            >
                                                max {fmt(due)}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}

                    {/* ── Footer total ── */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', background: '#f9fafb',
                        borderTop: '1px solid #e5e7eb',
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Total to collect</span>
                            {totalAllocated < totalDue && (
                                <span style={{ fontSize: 11, color: '#9ca3af' }}>
                                    {fmt(totalDue - totalAllocated)} unallocated
                                </span>
                            )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#b91c1c' }}>{fmt(totalAllocated)}</div>
                            {totalAllocated < totalDue && (
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>of {fmt(totalDue)} total</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Divider ── */}
                <div style={{ height: 1, background: '#f3f4f6', marginBottom: 16 }} />

                {/* ── Form fields ── */}
                <Form form={form} layout="vertical" requiredMark={false} size="middle">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
                        <Form.Item
                            name="paymentDate"
                            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Payment date</span>}
                            rules={[{ required: true, message: 'Required' }]}
                            style={{ marginBottom: 12 }}
                        >
                            <DatePicker style={{ width: '100%', borderRadius: 8 }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item
                            name="paymentMode"
                            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Payment mode</span>}
                            rules={[{ required: true, message: 'Required' }]}
                            style={{ marginBottom: 12 }}
                        >
                            <Select
                                placeholder="Select mode"
                                style={{ borderRadius: 8 }}
                                onChange={v => setMode(v)}
                            >
                                <Option value="cash"><Space><WalletOutlined />Cash</Space></Option>
                                <Option value="online"><Space><BankOutlined />Online / UPI</Space></Option>
                            </Select>
                        </Form.Item>
                    </div>

                    {mode === 'online' && (
                        <Form.Item
                            name="transactionId"
                            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>Transaction ID / UTR</span>}
                            rules={[{ required: true, message: 'Please enter transaction ID' }]}
                            style={{ marginBottom: 12 }}
                        >
                            <Input
                                prefix={<QrcodeOutlined style={{ color: '#9ca3af' }} />}
                                placeholder="Enter transaction ID or UTR number"
                                style={{ borderRadius: 8 }}
                            />
                        </Form.Item>
                    )}

                    <Form.Item
                        name="note"
                        label={
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                                Note <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                            </span>
                        }
                        style={{ marginBottom: 0 }}
                    >
                        <TextArea
                            rows={2}
                            placeholder="Any remarks about this payment…"
                            style={{ borderRadius: 8, resize: 'none' }}
                        />
                    </Form.Item>
                </Form>

                {/* ── Info banner ── */}
                <div style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 8, padding: '9px 12px',
                    marginTop: 14, marginBottom: 20,
                }}>
                    <InfoCircleOutlined style={{ color: '#b45309', fontSize: 13, marginTop: 1, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                        Each member defaults to their full due. Edit amounts to collect partial payments.
                        Members fully cleared will be auto-marked as paid.
                    </span>
                </div>
            </div>
        </Drawer>
    )
}

export default PaymentModal