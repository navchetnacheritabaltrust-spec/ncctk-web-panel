"use client";
import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Tooltip, Divider, App, Skeleton } from 'antd';
import { FiPlusCircle, FiPhone, FiMail, FiMapPin, FiGlobe, FiTrash2, FiEdit2, FiExternalLink } from 'react-icons/fi';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { collection, addDoc, getDocs, query, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from '@/lib/AuthProvider';

// ─── Helper: strip undefined values recursively ───────────────────────────────
// Firestore throws if ANY field value is `undefined`. This replaces them with null.
const sanitize = (obj) => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, sanitize(v)])
  );
};

// ─── Social platform config ───────────────────────────────────────────────────
const SOCIAL_PLATFORMS = [
  { key: 'facebook',  label: 'Facebook',  Icon: FaFacebook,  color: '#1877F2', placeholder: 'https://facebook.com/yourpage' },
  { key: 'twitter',   label: 'Twitter',   Icon: FaTwitter,   color: '#1DA1F2', placeholder: 'https://twitter.com/yourhandle' },
  { key: 'instagram', label: 'Instagram', Icon: FaInstagram, color: '#E1306C', placeholder: 'https://instagram.com/yourprofile' },
  { key: 'linkedin',  label: 'LinkedIn',  Icon: FaLinkedin,  color: '#0A66C2', placeholder: 'https://linkedin.com/company/yourorg' },
  { key: 'youtube',   label: 'YouTube',   Icon: FaYoutube,   color: '#FF0000', placeholder: 'https://youtube.com/yourchannel' },
];

// ─── Small reusable section wrapper ──────────────────────────────────────────
const InfoCard = ({ icon: Icon, title, children, onEdit, loading }) => (
  <div style={{
    background: 'var(--color-bg, #fff)',
    border: '1px solid #f0f0f0',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    transition: 'box-shadow .2s',
  }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'}
  >
    {/* Card header */}
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 18px', borderBottom: '1px solid #f5f5f5',
      background: '#fafafa',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={15} color="#185FA5" />
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{title}</span>
      </div>
      {onEdit && (
        <Tooltip title={`Edit ${title}`}>
          <button onClick={onEdit} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 7, border: '1px solid #e8e8e8',
            background: '#fff', cursor: 'pointer', fontSize: 12,
            color: '#185FA5', fontWeight: 500, transition: 'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#EBF4FF'; e.currentTarget.style.borderColor = '#B5D4F4'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e8e8e8'; }}
          >
            <FiEdit2 size={12} /> Edit
          </button>
        </Tooltip>
      )}
    </div>
    {/* Card body */}
    <div style={{ padding: '16px 18px' }}>
      {loading ? <Skeleton active paragraph={{ rows: 2 }} title={false} /> : children}
    </div>
  </div>
);

// ─── Modal section wrapper ────────────────────────────────────────────────────
const ModalSection = ({ icon: Icon, title, children }) => (
  <div style={{
    border: '1px solid #f0f0f0', borderRadius: 12, padding: '16px 18px',
    marginBottom: 20, background: '#fafafa',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <Icon size={15} color="#185FA5" />
      <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>{title}</span>
    </div>
    {children}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Contact = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [contactData, setContactData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();
  const [contactId, setContactId] = useState(null);

  // ── Fetch ──
  const fetchContactData = async () => {
    if (!user?.uid) return;
    try {
      const contactRef = collection(db, "users", user.uid, "contact");
      const snapshot = await getDocs(query(contactRef));
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        setContactId(d.id);
        setContactData(d.data());
      }
    } catch (err) {
      console.error("Error fetching contact:", err);
      message.error("Failed to load contact information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContactData(); }, [user]);

  // ── Save ──
  const handleSubmit = async (values) => {
    if (!user?.uid) { message.error("User not authenticated!"); return; }
    setSaving(true);
    try {
      // FIX: replace every undefined with null before sending to Firestore
      const payload = sanitize({
        phones:  values.phones  || [],
        emails:  values.emails  || [],
        address: values.address || null,
        website: values.website || null,
        socialLinks: {
          facebook:  values.facebook  || null,
          twitter:   values.twitter   || null,
          instagram: values.instagram || null,
          linkedin:  values.linkedin  || null,
          youtube:   values.youtube   || null,
        },
        updatedAt: new Date(),
      });

      if (contactId) {
        await updateDoc(doc(db, "users", user.uid, "contact", contactId), payload);
      } else {
        await addDoc(collection(db, "users", user.uid, "contact"), {
          ...payload,
          createdAt: new Date(),
          createdBy: user.uid,
        });
      }

      message.success('Contact information saved successfully!');
      setIsModalOpen(false);
      fetchContactData();
    } catch (err) {
      console.error("Error saving contact:", err);
      message.error('Failed to save contact information');
    } finally {
      setSaving(false);
    }
  };

  // ── Open modal pre-filled ──
  const handleEdit = () => {
    form.setFieldsValue({
      phones:  contactData?.phones  || [],
      emails:  contactData?.emails  || [],
      address: contactData?.address || '',
      website: contactData?.website || '',
      ...(contactData?.socialLinks || {}),
    });
    setIsModalOpen(true);
  };

  const handleCancel = () => { form.resetFields(); setIsModalOpen(false); };

  // ── Derived ──
  const activeSocials = SOCIAL_PLATFORMS.filter(p => contactData?.socialLinks?.[p.key]);

  return (
    <div style={{ maxWidth: 900 }}>

      {/* ── Page header ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 28, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
            Contact Information
          </h1>
          <p style={{ color: '#888', marginTop: 4, fontSize: 14 }}>
            Manage your organisation's contact details and social presence
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 18px', borderRadius: 10,
            background: '#185FA5', border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: 14, fontWeight: 600,
            boxShadow: '0 2px 8px rgba(24,95,165,0.25)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#0C447C'}
          onMouseLeave={e => e.currentTarget.style.background = '#185FA5'}
        >
          <FiPlusCircle size={16} />
          {contactData ? 'Edit Contact Info' : 'Add Contact Info'}
        </button>
      </div>

      {/* ── Cards grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 18 }}>

        {/* Phone numbers */}
        <InfoCard icon={FiPhone} title="Contact Numbers" onEdit={handleEdit} loading={loading}>
          {(contactData?.phones?.length ?? 0) === 0 ? (
            <p style={{ color: '#bbb', fontSize: 13 }}>No phone numbers added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {contactData.phones.map((p, i) => (
                <div key={i} style={{
                  paddingBottom: i < contactData.phones.length - 1 ? 12 : 0,
                  borderBottom: i < contactData.phones.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{p.personName}</div>
                  {p.designation && (
                    <div style={{ fontSize: 12, color: '#999', marginTop: 1 }}>{p.designation}</div>
                  )}
                  <a href={`tel:${p.phone}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    marginTop: 4, color: '#185FA5', fontSize: 13, fontWeight: 500,
                    textDecoration: 'none',
                  }}>
                    <FiPhone size={12} /> {p.phone}
                  </a>
                </div>
              ))}
            </div>
          )}
        </InfoCard>

        {/* Email & website */}
        <InfoCard icon={FiMail} title="Email & Website" onEdit={handleEdit} loading={loading}>
          {(contactData?.emails?.length ?? 0) === 0 && !contactData?.website ? (
            <p style={{ color: '#bbb', fontSize: 13 }}>No email or website added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(contactData?.emails || []).map((e, i) => (
                <a key={i} href={`mailto:${e.email}`} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  color: '#185FA5', fontSize: 13, textDecoration: 'none',
                }}>
                  <FiMail size={13} color="#185FA5" /> {e.email}
                </a>
              ))}
              {contactData?.emails?.length > 0 && contactData?.website && (
                <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 10, marginTop: 2 }} />
              )}
              {contactData?.website && (
                <a href={contactData.website} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  color: '#185FA5', fontSize: 13, textDecoration: 'none',
                }}>
                  <FiGlobe size={13} color="#185FA5" />
                  {contactData.website.replace(/^https?:\/\//, '')}
                  <FiExternalLink size={11} color="#aaa" />
                </a>
              )}
            </div>
          )}
        </InfoCard>

        {/* Address */}
        <InfoCard icon={FiMapPin} title="Address" onEdit={handleEdit} loading={loading}>
          {contactData?.address ? (
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7, margin: 0 }}>
              {contactData.address}
            </p>
          ) : (
            <p style={{ color: '#bbb', fontSize: 13 }}>No address added yet.</p>
          )}
        </InfoCard>

        {/* Social media */}
        <InfoCard icon={FiGlobe} title="Social Media" onEdit={handleEdit} loading={loading}>
          {activeSocials.length === 0 ? (
            <p style={{ color: '#bbb', fontSize: 13 }}>No social links added yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {activeSocials.map(({ key, label, Icon, color }) => (
                <a
                  key={key}
                  href={contactData.socialLinks[key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 9,
                    border: '1px solid #f0f0f0', background: '#fafafa',
                    textDecoration: 'none', color: '#333', fontSize: 13, fontWeight: 500,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = color + '40'; e.currentTarget.style.color = color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.color = '#333'; }}
                >
                  <Icon size={15} color={color} />
                  {label}
                </a>
              ))}
            </div>
          )}
        </InfoCard>
      </div>

      {/* ── Modal ── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 2 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: '#EBF4FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <FiEdit2 size={15} color="#185FA5" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>Contact Details</div>
              <div style={{ fontSize: 12, color: '#999', fontWeight: 400 }}>Update your organisation's contact information</div>
            </div>
          </div>
        }
        open={isModalOpen}
        onCancel={handleCancel}
        footer={null}
        width={780}
        styles={{ body: { maxHeight: '72vh', overflowY: 'auto', paddingTop: 8 } }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>

          {/* Phone numbers */}
          <ModalSection icon={FiPhone} title="Phone Numbers">
            <Form.List name="phones">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <div key={key} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto',
                      gap: 8, marginBottom: 8, alignItems: 'flex-start',
                    }}>
                      <Form.Item name={[name, 'personName']} rules={[{ required: true, message: 'Name required' }]} style={{ margin: 0 }}>
                        <Input placeholder="Contact person name" size="middle" />
                      </Form.Item>
                      <Form.Item name={[name, 'phone']} rules={[{ required: true, message: 'Phone required' }]} style={{ margin: 0 }}>
                        <Input placeholder="Phone number" size="middle" />
                      </Form.Item>
                      <Form.Item name={[name, 'designation']} style={{ margin: 0 }}>
                        <Input placeholder="Designation (optional)" size="middle" />
                      </Form.Item>
                      <Button
                        type="text" danger
                        icon={<FiTrash2 size={14} />}
                        onClick={() => remove(name)}
                        style={{ marginTop: 1 }}
                      />
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<FiPlusCircle size={14} />}>
                    Add contact person
                  </Button>
                </>
              )}
            </Form.List>
          </ModalSection>

          {/* Email addresses */}
          <ModalSection icon={FiMail} title="Email Addresses">
            <Form.List name="emails">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name }) => (
                    <div key={key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                      <Form.Item
                        name={[name, 'email']}
                        rules={[
                          { required: true, message: 'Email required' },
                          { type: 'email', message: 'Enter a valid email' },
                        ]}
                        style={{ margin: 0, flex: 1 }}
                      >
                        <Input placeholder="Email address" size="middle" />
                      </Form.Item>
                      <Button
                        type="text" danger
                        icon={<FiTrash2 size={14} />}
                        onClick={() => remove(name)}
                        style={{ marginTop: 1 }}
                      />
                    </div>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<FiPlusCircle size={14} />}>
                    Add email address
                  </Button>
                </>
              )}
            </Form.List>
          </ModalSection>

          {/* Address */}
          <ModalSection icon={FiMapPin} title="Address">
            <Form.Item name="address" rules={[{ required: true, message: 'Address is required' }]} style={{ margin: 0 }}>
              <Input.TextArea rows={3} placeholder="Enter complete address" />
            </Form.Item>
          </ModalSection>

          {/* Website & social */}
          <ModalSection icon={FiGlobe} title="Website & Social Media">
            <Form.Item name="website" label="Website URL" style={{ marginBottom: 16 }}>
              <Input prefix={<FiGlobe size={13} color="#aaa" />} placeholder="https://www.example.com" />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {SOCIAL_PLATFORMS.map(({ key, label, Icon, color, placeholder }) => (
                <Form.Item
                  key={key}
                  name={key}
                  label={
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Icon size={13} color={color} /> {label}
                    </span>
                  }
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder={placeholder} />
                </Form.Item>
              ))}
            </div>
          </ModalSection>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
            <Button onClick={handleCancel} size="middle">Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              size="middle"
              style={{ background: '#185FA5', borderColor: '#185FA5' }}
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Contact;