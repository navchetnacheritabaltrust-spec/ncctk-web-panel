import {
    Drawer, Card, Row, Col, Tag, Progress, Empty, Timeline, Typography,
    App
} from 'antd'
import {
    CloseOutlined, HistoryOutlined, 
    CheckCircleOutlined, DeleteOutlined
} from '@ant-design/icons'
import React, { useState, useEffect } from 'react'
import { useAuth } from '@/lib/AuthProvider'
import dayjs from 'dayjs'
import { getData, deleteData, updateData } from '@/lib/services/firebaseService'

const { Text } = Typography

// ─── colour tokens ───────────────────────────────────────────────────────────
const C = {
    green:  { bg: '#f0faf4', border: '#b7e4c7', text: '#1a7f45', badge: '#d1fae5' },
    red:    { bg: '#fff5f5', border: '#fecaca', text: '#c0392b', badge: '#fee2e2' },
    blue:   { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badge: '#dbeafe' },
    amber:  { bg: '#fffbeb', border: '#fde68a', text: '#b45309', badge: '#fef3c7' },
    gray:   { bg: '#f9fafb', border: '#e5e7eb', text: '#374151', badge: '#f3f4f6' },
}

const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN')}`

const TransactionHistoryDrawer = ({ open, onClose, member, programId, onDeleteSuccess }) => {
    const { user } = useAuth()
    const { message, modal } = App.useApp()
    const [transactions, setTransactions] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (open && member && programId && user && member.id) {
            fetchTransactions()
        }
    }, [open, member, programId, user])

    const fetchTransactions = async () => {
        setLoading(true)
        try {
            const path = `/users/${user.uid}/programs/${programId}/joinFeesTransactions`
            const allTransactions = await getData(path)
            
            // Filter transactions for this specific member
            const memberTransactions = Object.entries(allTransactions || {})
                .map(([id, data]) => ({ id, ...data }))
                .filter(txn => txn.memberId === member.id)
                .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))
            
            setTransactions(memberTransactions)
        } catch (error) {
            console.error('Error fetching transactions:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteTransaction = (txn) => {
        modal.confirm({
            title: 'Delete Transaction',
            content: `Are you sure you want to delete this payment of ${fmt(txn.amount)}? The member's paid amount will be reverted and pending amount will increase.`,
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const path = `/users/${user.uid}/programs/${programId}/joinFeesTransactions`
                    await deleteData(path, txn.id)

                    const currentPaid = member?.joinFeesPaidAmount || 0
                    const totalFees = member?.joinFees || 0
                    const newPaid = Math.max(0, currentPaid - (txn.amount || 0))

                    await updateData(
                        `/users/${user.uid}/programs/${programId}/members`,
                        member.id,
                        {
                            joinFeesPaidAmount: newPaid,
                            joinFeesRemainingAmount: totalFees - newPaid,
                            joinFeesDone: newPaid >= totalFees,
                        }
                    )

                    await fetchTransactions()
                    if (onDeleteSuccess) onDeleteSuccess()
                    message.success('Transaction deleted successfully')
                } catch (error) {
                    console.error('Error deleting transaction:', error)
                    message.error('Failed to delete transaction')
                }
            }
        })
    }

    // Add null checks here
    if (!member) return null

    const totalPaid = transactions.reduce((sum, txn) => sum + (txn.amount || 0), 0)
    const remaining = (member?.joinFees || 0) - totalPaid
    const isMemberFullyPaid = (member?.joinFeesPaidAmount || 0) >= (member?.joinFees || 0)

    return (
        <Drawer
            open={open}
            onClose={onClose}
            placement="right"
            width={500}
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ 
                        width: 40, height: 40, borderRadius: 10, 
                        background: C.blue.bg, border: `1px solid ${C.blue.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <CloseOutlined style={{ fontSize: 20, color: C.blue.text }} />
                    </div>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
                            Payment History
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>
                            {member?.displayName || 'Unknown Member'}
                        </div>
                    </div>
                </div>
            }
            closeIcon={<CloseOutlined style={{ fontSize: 14 }} />}
            styles={{
                header: { padding: '16px 20px', borderBottom: '1px solid #f0f0f0' },
                body: { padding: '20px', background: '#f9fafb' }
            }}
        >
            {/* Member Summary */}
            <Card size="small" style={{ marginBottom: 20, borderRadius: 10, border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>Fee Summary</Text>
                    <Tag color={isMemberFullyPaid ? 'success' : 'error'}>
                        {isMemberFullyPaid ? 'Fully Paid' : 'Pending'}
                    </Tag>
                </div>
                <Row gutter={16}>
                    <Col span={12}>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Total Fees</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#374151' }}>{fmt(member?.joinFees || 0)}</div>
                    </Col>
                    <Col span={12}>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Total Paid</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{fmt(totalPaid)}</div>
                    </Col>
                </Row>
                {remaining > 0 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Remaining</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626' }}>{fmt(remaining)}</div>
                    </div>
                )}
            </Card>

            {/* Transactions Timeline */}
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <HistoryOutlined style={{ color: '#6b7280' }} />
                    <Text strong style={{ fontSize: 14 }}>Transaction History</Text>
                    <Tag>{transactions.length} payment{transactions.length !== 1 ? 's' : ''}</Tag>
                </div>
                
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Progress type="circle" percent={100} size={40} status="active" />
                    </div>
                ) : transactions.length === 0 ? (
                    <Empty 
                        description="No payment transactions found"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        style={{ marginTop: 40 }}
                    />
                ) : (
                    <Timeline
                        items={transactions.map((txn, index) => ({
                            key: index,
                            color: 'green',
                            dot: <CheckCircleOutlined style={{ fontSize: 14 }} />,
                            children: (
                                <div style={{ 
                                    marginBottom: 16, 
                                    padding: '12px', 
                                    background: '#fff', 
                                    borderRadius: 8,
                                    border: '1px solid #e5e7eb',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                                                {fmt(txn.amount)}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                                                {txn.paymentDate ? dayjs(txn.paymentDate.toDate()).format('DD MMM YYYY, hh:mm A') : 'Date not available'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Tag color={txn.paymentMode === 'cash' ? 'blue' : 'purple'} style={{ fontSize: 11 }}>
                                                {txn.paymentMode === 'cash' ? '💰 CASH' : '💳 ONLINE'}
                                            </Tag>
                                            <DeleteOutlined
                                                onClick={() => handleDeleteTransaction(txn)}
                                                style={{ fontSize: 14, color: '#ef4444', cursor: 'pointer', opacity: 0.6 }}
                                                onMouseEnter={e => e.target.style.opacity = 1}
                                                onMouseLeave={e => e.target.style.opacity = 0.6}
                                            />
                                        </div>
                                    </div>
                                    
                                    {txn.transactionId && (
                                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                                            <Text type="secondary">Txn ID: </Text>
                                            <Text copyable style={{ fontSize: 11 }}>{txn.transactionId}</Text>
                                        </div>
                                    )}
                                    
                                    {txn.note && (
                                        <div style={{ 
                                            fontSize: 11, color: '#6b7280', 
                                            padding: '6px 8px', background: '#f9fafb', 
                                            borderRadius: 4, marginTop: 6 
                                        }}>
                                            <Text type="secondary">Note: </Text>
                                            {txn.note}
                                        </div>
                                    )}
                                    
                                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8, display: 'flex', gap: 12 }}>
                                        <span>Created by: {txn.createdByName || txn.createdBy || 'System'}</span>
                                        {txn.agentId && <span>Agent ID: {txn.agentId}</span>}
                                    </div>
                                </div>
                            )
                        }))}
                    />
                )}
            </div>
        </Drawer>
 
)
}

export default TransactionHistoryDrawer