import { Button, Drawer, Space } from 'antd'
import React from 'react'
import ClosingDrawerPdf from './ClosingDrawerPdf'
import { PDFViewer } from '@react-pdf/renderer'
import { useSelector } from 'react-redux'

const ClosingBannerImageDrawer = ({open,onClose,memberData,selectedProgram}) => {
      const agentList=useSelector((state)=>state.data.agentsList)


    const memberAgent=agentList.find((x)=>x.id===memberData?.agentId)
  return (
    <div>
       <Drawer  
      title={"Closing Banner Image"}
      placement="right"
      onClose={onClose}
      open={open}
      width={900}
      size='large'
      extra={
        <Space>

          <Button onClick={onClose}>
            Close
          </Button>
        </Space>
      }
    >
       <PDFViewer style={{ width: '100%', height: '100vh', border: 'none' }}>
        <ClosingDrawerPdf data={{...memberData,agentPhone:memberAgent?.phone}} selectedProgram={selectedProgram} />
       </PDFViewer>
    </Drawer>
    </div>
  )
}

export default ClosingBannerImageDrawer
