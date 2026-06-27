'use client'
import React, { useState, useEffect } from 'react'
import {
    Button, Card, Form, Input, Modal, Upload,
    Table, Tag, Tooltip, Progress, Popconfirm, App, Empty
} from 'antd'
import {
    FiPlusCircle, FiTrash2, FiEye, FiUpload,
    FiFileText, FiEdit2, FiShield, FiDownload
} from 'react-icons/fi'
import { useAuth } from '@/lib/AuthProvider'
import { db, storage } from '@/lib/firebase'
import {
    collection, addDoc, getDocs, deleteDoc,
    doc, updateDoc, query, orderBy, serverTimestamp
} from 'firebase/firestore'
import {
    ref, uploadBytesResumable, getDownloadURL, deleteObject
} from 'firebase/storage'
import dayjs from 'dayjs'

const { TextArea } = Input

// ─── PDF Upload Field ─────────────────────────────────────────────────────────
const PdfUploadField = ({
    uid,
    value,
    onChange,
}) => {
    const [progress, setProgress] = useState(null)
    const [fileName, setFileName] = useState(value?.name || '')
    const { message } = App.useApp()

    const handleUpload = async (file) => {
        if (file.type !== 'application/pdf') {
            message.error('Only PDF files are allowed!')
            return false
        }
        if (file.size / 1024 / 1024 > 10) {
            message.error('PDF must be smaller than 10 MB!')
            return false
        }

        const path = `policies/${uid}/${Date.now()}_${file.name}`
        const storageRef = ref(storage, path)
        const task = uploadBytesResumable(storageRef, file)

        setProgress(0)
        setFileName(file.name)

        task.on(
            'state_changed',
            (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            (err) => {
                message.error('Upload failed: ' + err.message)
                setProgress(null)
            },
            async () => {
                const url = await getDownloadURL(task.snapshot.ref)
                onChange?.({ url, name: file.name, path })
                setProgress(null)
                message.success('PDF uploaded successfully!')
            }
        )
        return false // prevent antd auto-upload
    }

    const handleRemove = () => {
        onChange?.(null)
        setFileName('')
        setProgress(null)
    }

    if (value?.url) {
        return (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)]">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                    <FiFileText size={20} className="text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{value.name}</p>
                    <p className="text-xs text-[var(--gray-300)]">PDF uploaded</p>
                </div>
                <div className="flex gap-2">
                    <Tooltip title="Preview PDF">
                        <Button
                            type="text" size="small"
                            icon={<FiEye className="text-[var(--primary-blue)]" />}
                            onClick={() => window.open(value.url, '_blank')}
                        />
                    </Tooltip>
                    <Tooltip title="Remove PDF">
                        <Button
                            type="text" size="small"
                            icon={<FiTrash2 className="text-red-400" />}
                            onClick={handleRemove}
                        />
                    </Tooltip>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            <Upload
                accept=".pdf"
                maxCount={1}
                showUploadList={false}
                beforeUpload={handleUpload}
            >
                <Button
                    icon={<FiUpload className="mr-2" />}
                    className="w-full h-24 border-dashed border-2 border-[var(--gray-200)] hover:border-[var(--primary-blue)] flex-col gap-1"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 80 }}
                >
                    <span className="text-sm font-medium">Click to upload PDF</span>
                    <span className="text-xs text-[var(--gray-300)]">Max 10 MB · PDF only</span>
                </Button>
            </Upload>
            {progress !== null && (
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-[var(--gray-300)]">
                        <span className="truncate">{fileName}</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress percent={progress} size="small" status={progress < 100 ? 'active' : 'success'} showInfo={false} />
                </div>
            )}
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────
const RulePolicy = () => {
    const { user } = useAuth()
    const { message } = App.useApp()
    const [form] = Form.useForm()

    const [policies, setPolicies] = useState([])
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingPolicy, setEditingPolicy] = useState(null)
    const [pdfValue, setPdfValue] = useState(null)

    // ── Fetch ──
    const fetchPolicies = async () => {
        if (!user?.uid) return
        try {
            const ref = collection(db, 'users', user.uid, 'policies')
            const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')))
            setPolicies(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        } catch (err) {
            console.error(err)
            message.error('Failed to load policies')
        } finally {
            setFetching(false)
        }
    }

    useEffect(() => { fetchPolicies() }, [user?.uid])

    // ── Open Add Modal ──
    const openAdd = () => {
        setEditingPolicy(null)
        form.resetFields()
        setPdfValue(null)
        setIsModalOpen(true)
    }

    // ── Open Edit Modal ──
    const openEdit = (policy) => {
        setEditingPolicy(policy)
        form.setFieldsValue({
            title: policy.title,
            description: policy.description,
            status: policy.status,
        })
        setPdfValue(policy.pdfUrl ? { url: policy.pdfUrl, name: policy.pdfName || 'document.pdf', path: policy.storagePath || '' } : null)
        setIsModalOpen(true)
    }

    // ── Submit ──
    const handleSubmit = async (values) => {
        if (!user?.uid) { message.error('Not authenticated'); return }
        setLoading(true)
        try {
            const data = {
                title: values.title,
                description: values.description || '',
                status: values.status || 'active',
                pdfUrl: pdfValue?.url || null,
                pdfName: pdfValue?.name || null,
                storagePath: pdfValue?.path || null,
                updatedAt: serverTimestamp(),
            }

            if (editingPolicy) {
                await updateDoc(doc(db, 'users', user.uid, 'policies', editingPolicy.id), data)
                message.success('Policy updated!')
            } else {
                await addDoc(collection(db, 'users', user.uid, 'policies'), {
                    ...data,
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                })
                message.success('Policy added!')
            }

            setIsModalOpen(false)
            form.resetFields()
            setPdfValue(null)
            setEditingPolicy(null)
            fetchPolicies()
        } catch (err) {
            console.error(err)
            message.error('Failed to save policy: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // ── Delete ──
    const handleDelete = async (policy) => {
        if (!user?.uid) return
        try {
            // Delete PDF from Storage if exists
            if (policy.storagePath) {
                try { await deleteObject(ref(storage, policy.storagePath)) } catch (_) {}
            }
            await deleteDoc(doc(db, 'users', user.uid, 'policies', policy.id))
            message.success('Policy deleted!')
            fetchPolicies()
        } catch (err) {
            message.error('Failed to delete: ' + err.message)
        }
    }

    // ── Table Columns ──
    const columns = [
        {
            title: '#',
            width: 50,
            render: (_, __, i) => (
                <span className="text-[var(--gray-300)] text-sm font-medium">{i + 1}</span>
            ),
        },
        {
            title: 'Title',
            dataIndex: 'title',
            render: (title, record) => (
                <div>
                    <p className="font-semibold text-[var(--foreground)] text-sm">{title}</p>
                    {record.description && (
                        <p className="text-xs text-[var(--gray-300)] mt-0.5 line-clamp-2 max-w-xs">
                            {record.description}
                        </p>
                    )}
                </div>
            ),
        },
        {
            title: 'PDF',
            dataIndex: 'pdfUrl',
            width: 100,
            render: (url, record) =>
                url ? (
                    <Tooltip title={record.pdfName || 'View PDF'}>
                        <Button
                            size="small"
                            type="text"
                            icon={<FiFileText className="text-red-500" />}
                            onClick={() => window.open(url, '_blank')}
                            className="flex items-center gap-1 text-red-500 hover:text-red-600"
                        >
                            <span className="text-xs">View</span>
                        </Button>
                    </Tooltip>
                ) : (
                    <span className="text-xs text-[var(--gray-300)]">—</span>
                ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 90,
            render: (status) => (
                <Tag color={status === 'active' ? 'green' : 'default'} className="capitalize text-xs">
                    {status || 'active'}
                </Tag>
            ),
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            width: 120,
            render: (ts) => (
                <span className="text-xs text-[var(--gray-300)]">
                    {ts?.seconds ? dayjs(ts.seconds * 1000).format('DD MMM YYYY') : '—'}
                </span>
            ),
        },
        {
            title: 'Actions',
            width: 100,
            render: (_, record) => (
                <div className="flex items-center gap-1">
                    <Tooltip title="Edit">
                        <Button
                            type="text" size="small"
                            icon={<FiEdit2 size={14} className="text-[var(--primary-blue)]" />}
                            onClick={() => openEdit(record)}
                        />
                    </Tooltip>
                    {record.pdfUrl && (
                        <Tooltip title="Download PDF">
                            <Button
                                type="text" size="small"
                                icon={<FiDownload size={14} className="text-[var(--gray-300)]" />}
                                onClick={() => window.open(record.pdfUrl, '_blank')}
                            />
                        </Tooltip>
                    )}
                    <Popconfirm
                        title="Delete this policy?"
                        description="This will also delete the uploaded PDF."
                        onConfirm={() => handleDelete(record)}
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Delete">
                            <Button
                                type="text" size="small"
                                icon={<FiTrash2 size={14} className="text-red-400" />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </div>
            ),
        },
    ]

    return (
        <div className="space-y-6">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-[var(--primary-blue)]/10 flex items-center justify-center">
                            <FiShield size={16} className="text-[var(--primary-blue)]" />
                        </div>
                        <h1 className="text-2xl font-bold text-[var(--foreground)]">Rules & Policies</h1>
                    </div>
                    <p className="text-[var(--gray-300)] text-sm pl-10">
                        Manage organization rules, policies and upload PDF documents
                    </p>
                </div>
                <Button
                    type="primary"
                    size="large"
                    icon={<FiPlusCircle className="mr-1.5" />}
                    onClick={openAdd}
                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-dark)] shrink-0"
                >
                    Add Policy
                </Button>
            </div>

            {/* ── Stats Row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Total Policies', value: policies.length, color: 'var(--primary-blue)' },
                    { label: 'Active', value: policies.filter(p => p.status !== 'draft').length, color: '#22c55e' },
                    { label: 'With PDF', value: policies.filter(p => p.pdfUrl).length, color: '#ef4444' },
                ].map((stat) => (
                    <Card key={stat.label} className="shadow-sm" size="small">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                                style={{ backgroundColor: stat.color + '18', color: stat.color }}
                            >
                                {stat.value}
                            </div>
                            <span className="text-sm text-[var(--gray-300)] font-medium">{stat.label}</span>
                        </div>
                    </Card>
                ))}
            </div>

            {/* ── Table ── */}
            <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
                <Table
                    dataSource={policies}
                    columns={columns}
                    rowKey="id"
                    loading={fetching}
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    locale={{
                        emptyText: (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <span className="text-[var(--gray-300)]">
                                        No policies yet. Click <strong>Add Policy</strong> to create one.
                                    </span>
                                }
                            />
                        ),
                    }}
                    scroll={{ x: 600 }}
                />
            </Card>

            {/* ── Add / Edit Modal ── */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[var(--primary-blue)]/10 flex items-center justify-center">
                            <FiShield size={14} className="text-[var(--primary-blue)]" />
                        </div>
                        <span className="text-lg font-semibold text-[var(--foreground)]">
                            {editingPolicy ? 'Edit Policy' : 'Add New Policy'}
                        </span>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); setPdfValue(null); setEditingPolicy(null) }}
                footer={null}
                width={600}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4 space-y-1">

                    {/* Title */}
                    <Form.Item
                        label={<span className="font-medium">Policy Title</span>}
                        name="title"
                        rules={[{ required: true, message: 'Please enter a title' }]}
                    >
                        <Input
                            placeholder="e.g. Privacy Policy, Terms of Service, Code of Conduct"
                            className="h-10"
                            maxLength={120}
                            showCount
                        />
                    </Form.Item>

                    {/* Description */}
                    <Form.Item
                        label={<span className="font-medium">Description</span>}
                        name="description"
                    >
                        <TextArea
                            placeholder="Brief description of what this policy covers..."
                            rows={4}
                            className="resize-none"
                            maxLength={500}
                            showCount
                        />
                    </Form.Item>

                    {/* Status */}
                    <Form.Item
                        label={<span className="font-medium">Status</span>}
                        name="status"
                        initialValue="active"
                    >
                        <div className="flex gap-3">
                            {(['active', 'draft']).map((s) => (
                                <label
                                    key={s}
                                    className="flex items-center gap-2 cursor-pointer select-none"
                                >
                                    <input
                                        type="radio"
                                        name="status"
                                        value={s}
                                        defaultChecked={s === 'active'}
                                        onChange={() => form.setFieldValue('status', s)}
                                        className="accent-[var(--primary-blue)]"
                                    />
                                    <span className="capitalize text-sm font-medium text-[var(--foreground)]">{s}</span>
                                </label>
                            ))}
                        </div>
                    </Form.Item>

                    {/* PDF Upload */}
                    <Form.Item label={<span className="font-medium">Policy Document (PDF)</span>}>
                        <PdfUploadField
                            uid={user?.uid || 'temp'}
                            value={pdfValue}
                            onChange={setPdfValue}
                        />
                    </Form.Item>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--gray-200)] mt-2">
                        <Button onClick={() => { setIsModalOpen(false); form.resetFields(); setPdfValue(null); setEditingPolicy(null) }}>
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            icon={editingPolicy ? <FiEdit2 className="mr-1" /> : <FiPlusCircle className="mr-1" />}
                            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-dark)]"
                        >
                            {editingPolicy ? 'Update Policy' : 'Add Policy'}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    )
}

export default RulePolicy