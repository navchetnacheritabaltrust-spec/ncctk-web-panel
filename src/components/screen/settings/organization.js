'use client'
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Upload, Button, Card, Tooltip, Progress, Divider, App } from 'antd';
import { FiImage, FiPlusCircle, FiEdit2, FiInfo, FiUpload, FiPhone, FiMail, FiGlobe, FiMapPin, FiUser, FiAward, FiFileText } from 'react-icons/fi';
import { useAuth } from '@/lib/AuthProvider';
import { db, storage } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const { TextArea } = Input;

// ─── Default Trust Data ───────────────────────────────────────────────────────
export const TrustData = {
    name: "श्री वासुदेव जनसेवा एजुकेशन एंड चैरिटेबल ट्रस्ट",
    cityState: "गुजरात-राजस्थान",
    address: "श्री कुलदेवी स्टील फर्नीचर शोरूम शॉपिंग में, मार्केटयार्ड के सामने, लाखणी-थराद हाईवे, लाखणी, तह. लाखणी, बनासकांठा (वाव-थराद)",
    contact: "9979627618 / 9724133283 / 9924663176",
    contactPerson: "उत्तमसिंह डी. राजपूत",
    trustPresident: "उत्तमसिंह डी. राजपूत",
    email: "",
    website: "",
    regNo: "Guj/7039/BK",
    govtRegNo: "",
    about: "",
    logo: "/Images/logovjse.jpeg",
    RightLogo: null,
    headerImg: "/Images/headerImg.png",
    banner: null,
    trustStamp: null,
    topTitle: ["॥ श्री गणेशाय नमः ॥", "|| जय माताजी ||"],
};

// ─── Upload helper with progress ─────────────────────────────────────────────
const uploadToStorage = (
    file,
    path,
    onProgress
) =>
    new Promise((resolve, reject) => {
        const storageRef = ref(storage, path);
        const task = uploadBytesResumable(storageRef, file);
        task.on(
            'state_changed',
            (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
    });

// ─── Info Row for display ─────────────────────────────────────────────────────
const InfoRow = ({ icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-3 border-b last:border-0 border-[var(--gray-200)]">
            <span className="mt-0.5 text-[var(--primary-blue)] shrink-0">{icon}</span>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-300)] mb-0.5">{label}</p>
                <p className="text-[var(--foreground)] text-sm leading-relaxed">{value}</p>
            </div>
        </div>
    );
};

// ─── Image Preview ────────────────────────────────────────────────────────────
const ImagePreview = ({ src, alt, fallback }) => (
    <div className="w-full h-32 rounded-xl border-2 border-[var(--gray-200)] flex items-center justify-center bg-gray-50 overflow-hidden">
        <img
            src={src || fallback}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            onError={(e) => { e.target.src = fallback; }}
        />
    </div>
);

// ─── Upload Field with progress ───────────────────────────────────────────────
const UploadField = ({ label, fieldName, form, uid, currentUrl, onUploaded }) => {
    const [progress, setProgress] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(undefined);
    const { message } = App.useApp();

    useEffect(() => {
        setPreviewUrl(currentUrl);
    }, [currentUrl]);

    const handleUpload = async (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) { message.error('Only image files allowed!'); return false; }
        if (file.size / 1024 / 1024 > 2) { message.error('Image must be < 2MB!'); return false; }

        setProgress(0);
        try {
            const path = `organizations/${uid}/${fieldName}/${Date.now()}_${file.name}`;
            const url = await uploadToStorage(file, path, setProgress);
            setPreviewUrl(url);
            onUploaded(url);
            message.success(`${label} uploaded!`);
        } catch (err) {
            message.error(`Failed to upload ${label}`);
            console.error(err);
        } finally {
            setProgress(null);
        }
        return false;
    };

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium text-[var(--gray-400)]">{label}</p>
            {previewUrl && (
                <div className="w-full h-24 rounded-lg overflow-hidden border border-[var(--gray-200)] mb-2">
                    <img src={previewUrl} alt={label} className="w-full h-full object-contain bg-gray-50" />
                </div>
            )}
            <Upload
                listType="picture"
                maxCount={1}
                showUploadList={false}
                beforeUpload={handleUpload}
            >
                <Button icon={<FiUpload />} size="small" className="w-full">
                    {previewUrl ? `Change ${label}` : `Upload ${label}`}
                </Button>
            </Upload>
            {progress !== null && (
                <Progress percent={progress} size="small" status={progress < 100 ? 'active' : 'success'} />
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Organization = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { user } = useAuth();
    const { message } = App.useApp();

    const [orgData, setOrgData] = useState(TrustData);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [uploadedUrls, setUploadedUrls] = useState({});

    // ── Fetch existing data on mount ──
    useEffect(() => {
        if (!user?.uid) return;
        const fetch = async () => {
            try {
                const snap = await getDoc(doc(db, "users", user.uid, "organizations", "trustInfo"));
                if (snap.exists()) {
                    setOrgData({ ...TrustData, ...snap.data() });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setFetching(false);
            }
        };
        fetch();
    }, [user?.uid]);

    const handleEdit = () => {
        form.setFieldsValue({
            name: orgData.name,
            about: orgData.about,
            govtRegNo: orgData.govtRegNo,
            cityState: orgData.cityState,
            address: orgData.address,
            contact: orgData.contact,
            contactPerson: orgData.contactPerson,
            trustPresident: orgData.trustPresident,
            email: orgData.email,
            website: orgData.website,
            regNo: orgData.regNo,
            topTitle: Array.isArray(orgData.topTitle) ? orgData.topTitle.join(', ') : orgData.topTitle,
        });
        setUploadedUrls({
            logo: orgData.logo || undefined,
            banner: orgData.banner || orgData.headerImg || undefined,
            trustStamp: orgData.trustStamp || undefined,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (values) => {
        if (!user?.uid) { message.error("Not authenticated!"); return; }
        setLoading(true);
        try {
            const topTitleArray = typeof values.topTitle === 'string'
                ? values.topTitle.split(',').map((t) => t.trim()).filter(Boolean)
                : values.topTitle || TrustData.topTitle;

            const data = {
                name: values.name || TrustData.name,
                about: values.about || "",
                govtRegNo: values.govtRegNo || "",
                cityState: values.cityState || TrustData.cityState,
                address: values.address || TrustData.address,
                contact: values.contact || TrustData.contact,
                contactPerson: values.contactPerson || TrustData.contactPerson,
                trustPresident: values.trustPresident || TrustData.trustPresident,
                email: values.email || "",
                website: values.website || "",
                regNo: values.regNo || TrustData.regNo,
                topTitle: topTitleArray,
                logo: uploadedUrls.logo || orgData.logo || TrustData.logo,
                banner: uploadedUrls.banner || orgData.banner || null,
                headerImg: uploadedUrls.banner || orgData.headerImg || TrustData.headerImg,
                trustStamp: uploadedUrls.trustStamp || orgData.trustStamp || null,
                updatedAt: new Date().toISOString(),
                updatedBy: user.uid,
            };

            await setDoc(doc(db, "users", user.uid, "organizations", "trustInfo"), data, { merge: true });

            setOrgData(data);
            message.success('Organization saved successfully!');
            setIsModalOpen(false);
            form.resetFields();
            setUploadedUrls({});
        } catch (err) {
            console.error(err);
            message.error("Failed to save: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const logoSrc = orgData.logo;
    const bannerSrc = orgData.headerImg || orgData.banner;
    const topTitles = Array.isArray(orgData.topTitle) ? orgData.topTitle : orgData.topTitle ? [orgData.topTitle] : [];

    return (
        <div className="space-y-6">

            {/* ── Page Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--foreground)]">Organization Settings</h1>
                    <p className="text-[var(--gray-300)] mt-1">Manage your trust's profile, media, and contact info</p>
                </div>
                <Button
                    type="primary"
                    size="large"
                    icon={<FiEdit2 className="mr-2" />}
                    onClick={handleEdit}
                    loading={fetching || loading}
                    className="bg-[var(--primary-blue)] hover:bg-[var(--primary-dark)]"
                >
                    Edit Organization Info
                </Button>
            </div>

            {/* ── Hero Banner ── */}
            {bannerSrc && (
                <div className="relative rounded-2xl overflow-hidden h-48 shadow-md">
                    <img src={bannerSrc} alt="Banner" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    {topTitles.length > 0 && (
                        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                            {topTitles.map((t, i) => (
                                <span key={i} className="bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/30">
                                    {t}
                                </span>
                            ))}
                        </div>
                    )}
                    {logoSrc && (
                        <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-white shadow-lg border-2 border-white overflow-hidden">
                            <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
                        </div>
                    )}
                </div>
            )}

            {/* ── Trust Name Card ── */}
            <Card className="shadow-sm border-l-4 border-l-[var(--primary-blue)]" loading={fetching}>
                <div className="flex items-start gap-4">
                    {!bannerSrc && logoSrc && (
                        <div className="w-20 h-20 rounded-xl border-2 border-[var(--gray-200)] overflow-hidden shrink-0">
                            <img src={logoSrc} alt="Logo" className="w-full h-full object-contain bg-gray-50" />
                        </div>
                    )}
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-[var(--foreground)] leading-snug">{orgData.name}</h2>
                        {orgData.cityState && (
                            <p className="text-[var(--gray-300)] mt-1 flex items-center gap-1 text-sm">
                                <FiMapPin size={13} /> {orgData.cityState}
                            </p>
                        )}
                        {orgData.regNo && (
                            <span className="inline-block mt-2 bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] text-xs font-semibold px-3 py-1 rounded-full">
                                Reg. No: {orgData.regNo}
                            </span>
                        )}
                    </div>
                </div>

                {orgData.about && (
                    <>
                        <Divider className="my-4" />
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-300)] mb-2">About</p>
                            <p className="text-[var(--foreground)] text-sm leading-relaxed whitespace-pre-line">{orgData.about}</p>
                        </div>
                    </>
                )}
            </Card>

            {/* ── Info Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Basic Info */}
                <Card
                    loading={fetching}
                    title={
                        <span className="flex items-center gap-2 text-base font-semibold">
                            <FiInfo className="text-[var(--primary-blue)]" /> Basic Information
                        </span>
                    }
                    extra={<Button type="text" icon={<FiEdit2 />} onClick={handleEdit} className="text-[var(--primary-blue)]" />}
                    className="shadow-sm hover:shadow-md transition-shadow"
                >
                    <InfoRow icon={<FiAward size={16} />} label="Registration No." value={orgData.regNo} />
                    <InfoRow icon={<FiFileText size={16} />} label="Govt. Reg. No." value={orgData.govtRegNo} />
                    <InfoRow icon={<FiMapPin size={16} />} label="City / State" value={orgData.cityState} />
                    <InfoRow icon={<FiMapPin size={16} />} label="Address" value={orgData.address} />
                    {topTitles.length > 0 && (
                        <div className="py-3 border-b last:border-0 border-[var(--gray-200)]">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-300)] mb-2">Top Titles</p>
                            <div className="flex flex-wrap gap-2">
                                {topTitles.map((t, i) => (
                                    <span key={i} className="bg-[var(--primary-blue)]/10 text-[var(--primary-blue)] text-xs px-2 py-0.5 rounded-full">{t}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </Card>

                {/* Contact Info */}
                <Card
                    loading={fetching}
                    title={
                        <span className="flex items-center gap-2 text-base font-semibold">
                            <FiUser className="text-[var(--primary-blue)]" /> Contact & Leadership
                        </span>
                    }
                    extra={<Button type="text" icon={<FiEdit2 />} onClick={handleEdit} className="text-[var(--primary-blue)]" />}
                    className="shadow-sm hover:shadow-md transition-shadow"
                >
                    <InfoRow icon={<FiUser size={16} />} label="Trust President" value={orgData.trustPresident} />
                    <InfoRow icon={<FiUser size={16} />} label="Contact Person" value={orgData.contactPerson} />
                    <InfoRow icon={<FiPhone size={16} />} label="Phone Numbers" value={orgData.contact} />
                    <InfoRow icon={<FiMail size={16} />} label="Email" value={orgData.email} />
                    <InfoRow icon={<FiGlobe size={16} />} label="Website" value={orgData.website} />
                </Card>

                {/* Media Assets */}
                <Card
                    loading={fetching}
                    title={
                        <span className="flex items-center gap-2 text-base font-semibold">
                            <FiImage className="text-[var(--primary-blue)]" /> Media Assets
                        </span>
                    }
                    extra={<Button type="text" icon={<FiEdit2 />} onClick={handleEdit} className="text-[var(--primary-blue)]" />}
                    className="shadow-sm hover:shadow-md transition-shadow lg:col-span-2"
                >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-300)]">Logo</p>
                            <ImagePreview
                                src={logoSrc}
                                alt="Logo"
                                fallback="https://via.placeholder.com/128?text=Logo"
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-300)]">Header Banner</p>
                            <ImagePreview
                                src={bannerSrc}
                                alt="Banner"
                                fallback="https://via.placeholder.com/400x128?text=Banner"
                            />
                        </div>
                        {orgData.trustStamp && (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--gray-300)]">Trust Stamp</p>
                                <ImagePreview
                                    src={orgData.trustStamp}
                                    alt="Stamp"
                                    fallback="https://via.placeholder.com/128?text=Stamp"
                                />
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* ── Edit Modal ── */}
            <Modal
                title={<h3 className="text-xl font-semibold">Edit Organization Details</h3>}
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); setUploadedUrls({}); }}
                footer={null}
                width={820}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit} className="mt-4">
                    <div className="max-h-[65vh] overflow-y-auto px-1 space-y-4">

                        {/* Basic Info */}
                        <div className="bg-[var(--gray-50)] p-4 rounded-xl">
                            <h4 className="text-sm font-semibold text-[var(--gray-400)] mb-4 uppercase tracking-wide">Basic Information</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Form.Item label="Organization Name" name="name" className="sm:col-span-2"
                                    rules={[{ required: true, message: 'Required' }]}>
                                    <Input placeholder="Organization name" className="h-10" />
                                </Form.Item>
                                <Form.Item label="Registration Number" name="regNo" rules={[{ required: true, message: 'Required' }]}>
                                    <Input placeholder="e.g. Guj/7039/BK" className="h-10" />
                                </Form.Item>
                                <Form.Item label="Govt. Registration Number" name="govtRegNo">
                                    <Input placeholder="Government reg no." className="h-10" />
                                </Form.Item>
                                <Form.Item label="City / State" name="cityState">
                                    <Input placeholder="e.g. Gujarat-Rajasthan" className="h-10" />
                                </Form.Item>
                                <Form.Item label="Top Titles (comma-separated)" name="topTitle">
                                    <Input placeholder="॥ श्री गणेशाय नमः ॥, || जय माताजी ||" className="h-10" />
                                </Form.Item>
                                <Form.Item label="Address" name="address" className="sm:col-span-2">
                                    <TextArea rows={2} placeholder="Complete address" className="resize-none" />
                                </Form.Item>
                                <Form.Item label="About Organization" name="about" className="sm:col-span-2">
                                    <TextArea rows={4} placeholder="Describe the trust's mission, activities, and history..." className="resize-none" />
                                </Form.Item>
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="bg-[var(--gray-50)] p-4 rounded-xl">
                            <h4 className="text-sm font-semibold text-[var(--gray-400)] mb-4 uppercase tracking-wide">Contact & Leadership</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Form.Item label="Trust President" name="trustPresident">
                                    <Input placeholder="Trust president name" className="h-10" />
                                </Form.Item>
                                <Form.Item label="Contact Person" name="contactPerson">
                                    <Input placeholder="Contact person name" className="h-10" />
                                </Form.Item>
                                <Form.Item label="Phone Numbers" name="contact">
                                    <Input placeholder="9999999999 / 8888888888" className="h-10" />
                                </Form.Item>
                                <Form.Item label="Email" name="email">
                                    <Input type="email" placeholder="email@example.com" className="h-10" />
                                </Form.Item>
                                <Form.Item label="Website" name="website" className="sm:col-span-2">
                                    <Input placeholder="https://www.example.com" className="h-10" />
                                </Form.Item>
                            </div>
                        </div>

                        {/* Media — uploads happen immediately, URLs stored in state */}
                        {user?.uid && (
                            <div className="bg-[var(--gray-50)] p-4 rounded-xl">
                                <h4 className="text-sm font-semibold text-[var(--gray-400)] mb-1 uppercase tracking-wide">Media Assets</h4>
                                <p className="text-xs text-[var(--gray-300)] mb-4">Images upload to Firebase Storage immediately when selected. Max 2 MB per image.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <UploadField
                                        label="Logo"
                                        fieldName="logo"
                                        form={form}
                                        uid={user.uid}
                                        currentUrl={uploadedUrls.logo}
                                        onUploaded={(url) => setUploadedUrls(prev => ({ ...prev, logo: url }))}
                                    />
                                    <UploadField
                                        label="Header Banner"
                                        fieldName="banner"
                                        form={form}
                                        uid={user.uid}
                                        currentUrl={uploadedUrls.banner}
                                        onUploaded={(url) => setUploadedUrls(prev => ({ ...prev, banner: url }))}
                                    />
                                    <UploadField
                                        label="Trust Stamp"
                                        fieldName="trustStamp"
                                        form={form}
                                        uid={user.uid}
                                        currentUrl={uploadedUrls.trustStamp}
                                        onUploaded={(url) => setUploadedUrls(prev => ({ ...prev, trustStamp: url }))}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--gray-200)]">
                        <Button onClick={() => { setIsModalOpen(false); form.resetFields(); setUploadedUrls({}); }}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={loading}
                            className="bg-[var(--primary-blue)] hover:bg-[var(--primary-dark)]">
                            Save Changes
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Organization;