import React, { useState, useEffect } from 'react';
import { 
  Button, Drawer, Space, Form, Input, InputNumber, DatePicker, 
  Modal, Upload, Image, Row, Col, Divider, Card, App 
} from 'antd';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { 
  UploadOutlined, DeleteOutlined, FileImageOutlined, 
  CalculatorOutlined, SaveOutlined 
} from '@ant-design/icons';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@/lib/firebase';
import ClosingDrawerPdf from './ClosingDrawerPdf';
import { useSelector } from 'react-redux';
import { TrsutData } from '@/lib/constentData';

// Extend dayjs with custom parse format
dayjs.extend(customParseFormat);

const EditPdfDataForm = ({ open, onClose, memberData, selectedProgram, onSave, user }) => {
  const [form] = Form.useForm();
  const [previewPdf, setPreviewPdf] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const { message } = App.useApp();
      const agentList=useSelector((state)=>state.data.agentsList)
    const memberAgent=agentList.find((x)=>x.id===memberData?.agentId)
  // Default values for PDF data
  const defaultPdfData = {
    documentNumber: `SSS/${new Date().getFullYear()}/001`,
    date: dayjs().format('DD/MM/YYYY'),
    deathDate: dayjs().subtract(10, 'days').format('DD-MM-YYYY'),
    schemeType: selectedProgram?.hiname || 'सहयोग योजना भाग 2',
    
    memberInfo: {
      heir: memberData?.guardian || 'गौषान, गौता देवी',
      joiningDate: memberData?.dateJoin || '13-07-2019',
      membershipNumber: memberData?.registrationNumber || '851766',
      name: memberData?.displayName || 'सुजाराम / दाना राम, सोलंकी',
      address: memberData?.currentAddress || 'जन्सपुर, सिरोही, राजस्थान',
      mobile: memberData?.phone || '1234567890',
      totalServicesProvided: 259,
      totalContribution: 51800,
    },
    
    donations: [
      { description: '100 किस्त के सदस्य × 622', amount: 62200 },
      { description: '200 किस्त के सदस्य × 982', amount: 196400 },
    ],
    
    donationCalculations: {
      totalBeforeDeduction: 258600,
      deductionPercentage: 10,
      deductionAmount: 25860,
      finalAmount: 232740
    },
    
    recipientName: memberData?.addedByName || 'रामकुमार शर्मा',
    recipientRole: 'परिवार के प्रतिनिधि',
    organizationName: TrsutData.name,
    organizationTitle: 'संस्था अध्यक्ष',
    contactPhone1: '97238 78021',
    contactPhone2: '85118 78021',
    
    // Image URLs
    bannerImageUrl: '',
    logoImageUrl: '',
  };

  // Initialize form with data
  useEffect(() => {
    if (memberData?.pdfData) {
      // Parse existing data
      const pdfData = { ...memberData.pdfData };
      
      // Ensure donations array exists
      if (!pdfData.donations) {
        pdfData.donations = defaultPdfData.donations;
      }
      
      // Ensure donationCalculations exists
      if (!pdfData.donationCalculations) {
        pdfData.donationCalculations = defaultPdfData.donationCalculations;
      }
      
      // Convert date strings to dayjs objects
      if (pdfData.date) {
        try {
          const date = dayjs(pdfData.date, 'DD/MM/YYYY');
          pdfData.date = date.isValid() ? date : dayjs();
        } catch {
          pdfData.date = dayjs();
        }
      } else {
        pdfData.date = dayjs();
      }
      
      if (pdfData.deathDate) {
        try {
          const deathDate = dayjs(pdfData.deathDate, 'DD-MM-YYYY');
          pdfData.deathDate = deathDate.isValid() ? deathDate : dayjs().subtract(10, 'days');
        } catch {
          pdfData.deathDate = dayjs().subtract(10, 'days');
        }
      } else {
        pdfData.deathDate = dayjs().subtract(10, 'days');
      }
      
      form.setFieldsValue(pdfData);
    } else {
      // Set default values
      form.setFieldsValue({
        ...defaultPdfData,
        date: dayjs(),
        deathDate: dayjs().subtract(10, 'days'),
      });
    }
    
    // Reset image state
    setSelectedImage(null);
    setImagePreview(null);
  }, [memberData, form]);

  // Upload image to Firebase
  const uploadImageToFirebase = async (file, type) => {
    try {
      setUploading(true);
      
      const fileExtension = file.name.split('.').pop();
      const fileName = `${type}_${memberData.id}_${uuidv4()}.${fileExtension}`;
      
      const storageRef = ref(
        storage, 
        `users/${user.uid}/programs/${selectedProgram?.id}/members/${memberData.id}/pdf_images/${fileName}`
      );
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      message.success(`${type === 'banner' ? 'Banner' : 'Logo'} image uploaded successfully`);
      return downloadURL;
      
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (file, imageType) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      message.error('Invalid file type. Please upload JPG, PNG, or GIF files.');
      return false;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      message.error('File size too large. Maximum size is 5MB.');
      return false;
    }

    setSelectedImage({ file, type: imageType });
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    return false;
  };

  // Calculate donation totals
const calculateTotals = (donations, deductionPercentage) => {
  const totalBeforeDeduction =
    donations?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;

  // IMPORTANT FIX: allow 0%
  const percentage =
    deductionPercentage === 0
      ? 0
      : Number(deductionPercentage ?? 10);

  const deductionAmount = (totalBeforeDeduction * percentage) / 100;
  const finalAmount = totalBeforeDeduction - deductionAmount;
console.log(finalAmount,'finalAmount',totalBeforeDeduction,'totalBeforeDeduction',deductionAmount,'deductionAmount',percentage)
  return {
    totalBeforeDeduction,
    deductionAmount,
    finalAmount,
  };
};

  // Handle form submission
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      let imageUrl = null;
      
      // Upload image if selected
      if (selectedImage) {
        try {
          imageUrl = await uploadImageToFirebase(selectedImage.file, selectedImage.type);
        } catch (error) {
          message.error('Failed to upload image');
          return;
        }
      }
      
      // Format dates before saving
      const formattedValues = {
        ...values,
        date: values.date ? dayjs(values.date).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY'),
        deathDate: values.deathDate ? dayjs(values.deathDate).format('DD-MM-YYYY') : dayjs().subtract(10, 'days').format('DD-MM-YYYY'),
      };
      
      // Update image URL if uploaded
 formattedValues.bannerImageUrl =
  memberData?.pdfData?.bannerImageUrl || '';

formattedValues.logoImageUrl =
  memberData?.pdfData?.logoImageUrl || '';

// Override only if new image uploaded
if (imageUrl && selectedImage) {
  if (selectedImage.type === 'banner') {
    formattedValues.bannerImageUrl = imageUrl;
  }
  if (selectedImage.type === 'logo') {
    formattedValues.logoImageUrl = imageUrl;
  }
}
      
      // Calculate totals
      const donations = formattedValues.donations || defaultPdfData.donations;
      const deductionPercentage = formattedValues.donationCalculations?.deductionPercentage ?? 10;
      
      const calculatedTotals = calculateTotals(donations, deductionPercentage);
      
      // Update form values with calculated totals
      const updatedValues = {
        ...formattedValues,
        donationCalculations: {
          ...formattedValues.donationCalculations,
          ...calculatedTotals
        }
      };

      // Call parent save function
      if (onSave) {
        await onSave(updatedValues);
      }

      Modal.success({
        title: 'Success',
        content: 'PDF data saved successfully!',
      });

      onClose();
    } catch (error) {
      console.error('Form validation failed:', error);
      message.error('Please check all fields and try again.');
    }
  };

  // Add donation row
  const addDonationRow = () => {
    const donations = form.getFieldValue('donations') || [];
    form.setFieldsValue({
      donations: [...donations, { description: '', amount: 0 }]
    });
  };

  // Remove donation row
  const removeDonationRow = (index) => {
    const donations = form.getFieldValue('donations') || [];
    const newDonations = [...donations];
    newDonations.splice(index, 1);
    form.setFieldsValue({ donations: newDonations });
  };

  // Preview PDF
  const handlePreview = () => {
    setPreviewPdf(true);
  };

  // Get current form values for preview
  const getFormDataForPreview = () => {
    try {
      const values = form.getFieldsValue();
      
      // Format dates for preview
      const date = values.date ? dayjs(values.date).format('DD/MM/YYYY') : dayjs().format('DD/MM/YYYY');
      const deathDate = values.deathDate ? dayjs(values.deathDate).format('DD-MM-YYYY') : dayjs().subtract(10, 'days').format('DD-MM-YYYY');
      
      // Calculate totals for preview
      const donations = values.donations || defaultPdfData.donations;
const deductionPercentage =values.donationCalculations?.deductionPercentage ?? 10;
      const calculatedTotals = calculateTotals(donations, deductionPercentage);
      
      return {
        ...values,
        date,
        deathDate,
       donationCalculations: {
  deductionPercentage,
  totalBeforeDeduction: calculatedTotals.totalBeforeDeduction,
  deductionAmount: calculatedTotals.deductionAmount,
  finalAmount: calculatedTotals.finalAmount,
},
        bannerImageUrl: selectedImage?.type === 'banner' ? imagePreview : (values.bannerImageUrl || memberData?.pdfData?.bannerImageUrl || defaultPdfData.bannerImageUrl),
      };
    } catch (error) {
      console.error('Error getting form data:', error);
      return defaultPdfData;
    }
  };
const fileName=`${memberData?.displayName}_${selectedProgram?.name}_closing_details.pdf`
  return (
    <>
      <Drawer
        title="Edit PDF Data"
        placement="right"
        onClose={onClose}
        open={open}
        width={800}
        extra={
          <Space>
            <Button onClick={handlePreview} icon={<FileImageOutlined />}>
              Preview PDF
            </Button>
            <Button 
              onClick={handleSave} 
              type="primary" 
              icon={<SaveOutlined />}
              loading={uploading}
            >
              Save Changes
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
        >
          {/* Basic Information Section */}
          <Card title="Basic Information" size="small" className="mb-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Document Number"
                  name="documentNumber"
                  rules={[{ required: true, message: 'Please enter document number' }]}
                >
                  <Input placeholder="e.g., SSS/2026/001" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Scheme Type"
                  name="schemeType"
                >
                  <Input placeholder="e.g., सहयोग योजना भाग 2" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Date"
                  name="date"
                  rules={[{ required: true, message: 'Please select date' }]}
                >
                  <DatePicker 
                    format="DD/MM/YYYY" 
                    style={{ width: '100%' }}
                    placeholder="Select date"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Death / Marriega Date"
                  name="deathDate"
                  rules={[{ required: true, message: 'Please select death / Marriega date' }]}
                >
                  <DatePicker 
                    format="DD-MM-YYYY" 
                    style={{ width: '100%' }}
                    placeholder="Select death / Marriega date"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Member Information Section */}
          <Card title="Member Information" size="small" className="mb-4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Heir Name (वारिसदार)"
                  name={['memberInfo', 'heir']}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Total Services Provided"
                  name={['memberInfo', 'totalServicesProvided']}
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    min={0} 
                    placeholder="Enter number"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Total Contribution"
                  name={['memberInfo', 'totalContribution']}
                >
                  <InputNumber 
                    style={{ width: '100%' }} 
                    min={0} 
                    placeholder="Enter amount"
                    formatter={(value) => value ? `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                    parser={(value) => value ? value.replace(/₹\s?|(,*)/g, '') : ''}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Joining Date"
                  name={['memberInfo', 'joiningDate']}
                >
                  <Input 
                    placeholder="DD-MM-YYYY" 
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Membership Number"
                  name={['memberInfo', 'membershipNumber']}
                >
                  <Input placeholder="Enter membership number" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Mobile"
                  name={['memberInfo', 'mobile']}
                >
                  <Input placeholder="Enter mobile number" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="Full Name"
              name={['memberInfo', 'name']}
            >
              <Input.TextArea rows={2} placeholder="Enter full name" />
            </Form.Item>

            <Form.Item
              label="Address"
              name={['memberInfo', 'address']}
            >
              <Input.TextArea rows={3} placeholder="Enter complete address" />
            </Form.Item>
          </Card>

          {/* Donations Section */}
          <Card title="Donation Details" size="small" className="mb-4">
            <Form.List name="donations">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...restField }) => (
                    <div key={key} className="mb-3 p-3 border rounded bg-gray-50">
                      <Row gutter={16} align="middle">
                        <Col span={14}>
                          <Form.Item
                            {...restField}
                            name={[name, 'description']}
                            label="Description"
                            rules={[{ required: true, message: 'Please enter description' }]}
                          >
                            <Input placeholder="e.g., 100 किस्त के सदस्य × 622" />
                          </Form.Item>
                        </Col>
                        <Col span={8}>
                          <Form.Item
                            {...restField}
                            name={[name, 'amount']}
                            label="Amount (₹)"
                            rules={[{ required: true, message: 'Please enter amount' }]}
                          >
                            <InputNumber 
                              style={{ width: '100%' }} 
                              min={0}
                              placeholder="0"
                              formatter={(value) => value ? `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                              parser={(value) => value ? value.replace(/₹\s?|(,*)/g, '') : ''}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={2}>
                          <Button 
                            type="text" 
                            danger 
                            onClick={() => remove(name)}
                            icon={<DeleteOutlined />}
                            title="Remove this donation"
                          />
                        </Col>
                      </Row>
                    </div>
                  ))}
                  
                  <Button type="dashed" onClick={() => add()} block className="mt-2">
                    + Add Donation Item
                  </Button>
                </>
              )}
            </Form.List>

            <Divider>Deduction Settings</Divider>
            
            <Form.Item
              label="Deduction Percentage"
              name={['donationCalculations', 'deductionPercentage']}
              help="Enter percentage for deduction (e.g., 10 for 10%)"
            >
              <InputNumber 
                style={{ width: '100%' }} 
                min={0} 
                max={100}
                placeholder="10"
                formatter={(value) => value ? `${value}%` : ''}
                parser={(value) => value ? value.replace('%', '') : ''}
              />
            </Form.Item>
          </Card>

          {/* Image Upload Section */}
          <Card title="PDF Images" size="small" className="mb-4">
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item label="Banner Image">
                  <Upload
                    accept="image/*"
                    beforeUpload={(file) => handleImageSelect(file, 'banner')}
                    showUploadList={false}
                    maxCount={1}
                  >
                    <Button icon={<UploadOutlined />} block>
                      Upload Banner Image
                    </Button>
                  </Upload>
                  <div className="text-xs text-gray-500 mt-1">
                    Recommended size: 800x250px (JPG, PNG, GIF up to 5MB)
                  </div>
                  
                  {/* Current banner image preview */}
                  {!selectedImage && form.getFieldValue('bannerImageUrl') && (
                    <div className="mt-3">
                      <div className="text-sm text-gray-600 mb-1">Current Banner:</div>
                      <Image
                        src={form.getFieldValue('bannerImageUrl')}
                        alt="Current Banner"
                        width="100%"
                        height={150}
                        className="object-cover rounded"
                      />
                    </div>
                  )}
                  
                  {/* New banner image preview */}
                  {imagePreview && selectedImage?.type === 'banner' && (
                    <div className="mt-3">
                      <div className="text-sm text-gray-600 mb-1">New Banner Preview:</div>
                      <Image
                        src={imagePreview}
                        alt="Banner Preview"
                        width="100%"
                        height={150}
                        className="object-cover rounded"
                      />
                      <Button 
                        type="text" 
                        danger 
                        size="small"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                        className="mt-2"
                      >
                        Remove New Banner
                      </Button>
                    </div>
                  )}
                </Form.Item>
                <Form.Item name="bannerImageUrl" hidden>
  <Input />
</Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      </Drawer>

      {/* PDF Preview Drawer */}
      <Drawer
        title="PDF Preview"
        placement="right"
        onClose={() => setPreviewPdf(false)}
        open={previewPdf}
        width={900}
        size="large"
        extra={
          <div className=' flex items-center gap-2'>
            <Button onClick={() => setPreviewPdf(false)}>Close Preview</Button>
                 <PDFDownloadLink style={{
                                      background:"#1890ff",
                                      color:"#fff",
                                      border:"none",
                                      padding:"6px 15px",
                                      borderRadius:"4px",
                                      fontSize:"16px",
                                      cursor:"pointer",
                                  }} fileName={fileName} document={<ClosingDrawerPdf 
            data={{
              ...memberData,
               agentPhone: memberAgent?.phone,
              pdfData: getFormDataForPreview()
            }} 
            selectedProgram={selectedProgram} 
          />} >
                                      Download Pdf
                                  </PDFDownloadLink>
          </div>
        }
      >
        <PDFViewer style={{ width: '100%', height: '100vh', border: 'none' }}>
          <ClosingDrawerPdf 
            data={{
              ...memberData,
              agentPhone: memberAgent?.phone,
              pdfData: getFormDataForPreview()
            }} 
            selectedProgram={selectedProgram} 
          />
        </PDFViewer>
      </Drawer>
    </>
  );
};

export default EditPdfDataForm;