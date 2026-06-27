import CertificateViewer from '@/components/pdfcom/Certificates';
import Certificate from '@/components/pdfcom/Certificates/CertificateCom';
import CertificateServerSide from '@/components/pdfcom/Certificates/CertificateComServerSide';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button, Drawer, Space, Typography } from 'antd'
import React from 'react'
import { useSelector } from 'react-redux';

const MemberCertificateCom = ({
    open,
    onClose,
    memberData,         
}) => {
    const { Title } = Typography;
    const [isLoading, setIsLoading] = React.useState(false);
  const selectedProgram = useSelector((state) => state.data.selectedProgram);
  const agentList=useSelector((state)=>state.data.agentsList)
    const fileName = memberData ? `${memberData.displayName.replaceAll(" ","_")+"_"+memberData?.registrationNumber || 'Member'}_Certificate.pdf` : 'Certificate.pdf';


    const memberAgent=agentList.find((x)=>x.id===memberData?.agentId)
  return (
    <div>
        <Drawer
        title={<Title level={4} style={{ margin: 0 }}>{fileName}</Title>}
        width={800}
        placement="right"
        onClose={onClose}
        open={open}
        maskClosable={false}
        destroyOnHidden
        keyboard={false}
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={onClose} size="large" >
              रद्द करें
            </Button>
            <PDFDownloadLink style={{
                background:"#1890ff",
                color:"#fff",
                border:"none",
                padding:"6px 15px",
                borderRadius:"4px",
                fontSize:"16px",
                cursor:"pointer",
            }} fileName={fileName} document={<CertificateServerSide data={{...memberData,agentPhone:memberAgent?.phone,agentCode:memberAgent?.agentCode}} selectedProgram={selectedProgram} />} >
                Download Pdf
            </PDFDownloadLink>
         
          </Space>
        }
      > 
      <CertificateViewer memberData={{...memberData,agentPhone:memberAgent?.phone,agentCode:memberAgent?.agentCode}} selectedProgram={selectedProgram}/>
      </Drawer>
    </div>
  )
}

export default MemberCertificateCom