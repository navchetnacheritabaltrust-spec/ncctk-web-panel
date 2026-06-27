'use client'
import React, { use, useState } from 'react';
import { 
    Drawer, 
    Table, 
    Tag, 
    Typography, 
    Card, 
    Statistic, 
    Row, 
    Col,
    Tabs,
    Space,
    Badge,
    Button,
    Divider
} from 'antd';
import { 
    DollarOutlined, 
    CheckCircleOutlined, 
    ClockCircleOutlined,
    CalendarOutlined,
    CreditCardOutlined,
    WalletOutlined,
    DownloadOutlined
} from '@ant-design/icons';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import SingleMemberPendingPaymentPdf from './PendingPaymentPdf';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
const { Title, Text } = Typography;
const { TabPane } = Tabs;

function MemberPaymentDetails({ visible, onClose, memberData, paymentReport, loading = false }) {
    const [activeTab, setActiveTab] = useState('1');
    console.log(paymentReport,'paymentReport')
    const selectedProgram = useSelector((state) => state.data.selectedProgram);
    const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

// Update download function
const handleDownloadPDF = () => {
    setPdfPreviewOpen(true);
};
    if (!memberData || !paymentReport) return null;
    const { report, summary } = paymentReport;
    const member = memberData;

    // Format currency
    const formatCurrency = (amount) => {
        return `₹${amount?.toFixed(2) || '0.00'}`;
    };

    // Get status color and icon
    const getStatusInfo = (status) => {
        switch(status) {
            case 'paid':
                return { color: 'success', icon: <CheckCircleOutlined />, text: 'Paid' };
            case 'pending':
                return { color: 'warning', icon: <ClockCircleOutlined />, text: 'Pending' };
            default:
                return { color: 'default', icon: null, text: status };
        }
    };

    // Columns for marriages table
    const marriageColumns = [
        {
            title: 'Closings Date',
            dataIndex: 'marriageDate',
            key: 'marriageDate',
            render: (date) => date || '-',
            width: 120,
        },
        {
            title: 'Beneficiary',
            key: 'beneficiary',
            render: (_, record) => (
                <div>
                    <div className="font-medium">{record.paymentFor || '-'}</div>
                    <div className="text-xs text-gray-500">
                        Reg: {record.closingRegNo || '-'}
                    </div>
                </div>
            ),
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => (
                <Text strong className="text-green-600">
                    {formatCurrency(amount)}
                </Text>
            ),
            align: 'right',
            sorter: (a, b) => a.amount - b.amount,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const { color, icon, text } = getStatusInfo(status);
                return (
                    <Tag icon={icon} color={color}>
                        {text}
                    </Tag>
                );
            },
            filters: [
                { text: 'Paid', value: 'paid' },
                { text: 'Pending', value: 'pending' },
            ],
            onFilter: (value, record) => record.status === value,
        },
    ];


  const getFileName = () => {
    const namePart = member.displayName.replace(/\s+/g, '_');
    const datePart = dayjs().format('YYYYMMDD_HHmmss');
    return `Payment_Report_${namePart}_${datePart}.pdf`;
  }
    return (
        <Drawer
            title={
                <div>
                    <Title level={4} style={{ margin: 0 }}>
                        Payment Details: {member.displayName}
                    </Title>
                    <Text type="secondary">{member.registrationNumber}</Text>
                </div>
            }
            placement="right"
            width={700}
            onClose={onClose}
            open={visible}
            loading={loading}
            extra={
                <div className='flex items-center gap-2'>
                       <Button type="primary" onClick={handleDownloadPDF}>
                    Pending PDF Download
                </Button>
                <Button onClick={onClose}>Close</Button>
                    </div>
                
             
            }
        >
            {/* Summary Cards */}
            <Row gutter={16} className="mb-6">
                <Col span={8}>
                    <Card size="small" className="bg-blue-50">
                        <Statistic
                            title="Total Marriages"
                            value={report?.summary?.totalMarriages || 0}
                            prefix={<CalendarOutlined />}
                            valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" className="bg-green-50">
                        <Statistic
                            title="Paid"
                            value={report?.summary?.paidAmount || 0}
                            precision={2}
                            prefix={<DollarOutlined />}
                            valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                        />
                        <div className="text-xs text-gray-500">
                            {report?.summary?.paidMarriages || 0} Closings
                        </div>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" className="bg-orange-50">
                        <Statistic
                            title="Pending"
                            value={report?.summary?.pendingAmount || 0}
                            precision={2}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#fa8c16', fontSize: '20px' }}
                        />
                        <div className="text-xs text-gray-500">
                            {report?.summary?.pendingMarriages || 0} Closings
                        </div>
                    </Card>
                </Col>
            </Row>

          

            {/* Marriage Payments Table */}
            <Card 
                title={
                    <Space>
                        <CreditCardOutlined />
                        <span>Closings Payments</span>
                        <Badge 
                            count={report.marriages?.length || 0} 
                            style={{ backgroundColor: '#1890ff' }}
                        />
                    </Space>
                }
                className="mb-4"
            >
                <Table
                    columns={marriageColumns}
                    dataSource={report.marriages || []}
                    rowKey="paymentId"
                    pagination={false}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    summary={() => (
                        <Table.Summary fixed>
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={2}>
                                    <Text strong>Total Amount:</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={1}>
                                    <Text strong className="text-green-600">
                                        {formatCurrency(summary?.totalAmount || 0)}
                                    </Text>
                                </Table.Summary.Cell>
                               
                            </Table.Summary.Row>
                        </Table.Summary>
                    )}
                />
            </Card>

        <Drawer
                title={getFileName()}
                width={800}
                placement="right"
                onClose={() => setPdfPreviewOpen(false)}
                open={pdfPreviewOpen}
                maskClosable={false}
                destroyOnHidden={true}
                keyboard={false}
                footer={
                    <Space style={{ float: 'right' }}>
                        <Button onClick={() => setPdfPreviewOpen(false)} size="large">
                            Cancel
                        </Button>
                        <PDFDownloadLink
                          document={
                    <SingleMemberPendingPaymentPdf
                        memberData={member}
                        paymentReport={paymentReport}
                        programInfo={selectedProgram}
                    />
                }
                            fileName={getFileName()}
                        >
                            {({ loading }) => (
                                <Button 
                                    type="primary" 
                                    icon={<DownloadOutlined />} 
                                    size="large"
                                    loading={loading}
                                  
                                >
                                    Download PDF members
                                </Button>
                            )}
                        </PDFDownloadLink>
                    </Space>
                }
            >
                <PDFViewer style={{ width: '100%', height: '100vh', border: 'none' }}>
                  <SingleMemberPendingPaymentPdf
            memberData={member}
            paymentReport={paymentReport}
            programInfo={selectedProgram}
        />
                </PDFViewer>
            </Drawer>
        </Drawer>
    );
}

export default MemberPaymentDetails;