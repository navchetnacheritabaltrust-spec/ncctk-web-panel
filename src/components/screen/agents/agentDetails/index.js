"use client";
import { Button, Card, Descriptions, Drawer, Input, Modal, Select, Tabs, Typography } from 'antd'

import { FilePdfOutlined } from '@ant-design/icons';
import Image from 'next/image';
import React from 'react'
import AgentMembers from './component/AgentMembers';
import MemberPayStatus from './MemberPaystatus/MemberPayStatus';
import AllPaymentStatus from './component/AllPaymentStatus/AllPaymentStatus';
import Transactions from './component/Transactions';
const { TabPane } = Tabs;
const { Search } = Input;
const { Title, Text } = Typography;
const { Option } = Select;
const AgentDetails = ({selectedAgent,isViewModalVisible,setIsViewModalVisible}) => {

      const renderAgentInfo = () => (
    <Card className="rounded-lg mb-4 shadow-md">
      <div className="flex items-center space-x-4">
        <div className="flex flex-col space-y-4">
          <Image
            src={selectedAgent.photoURL}
            alt={selectedAgent.displayName}
            className="rounded-lg w-[150px] h-[160px] object-cover cursor-pointer"
            width={150}
            height={160}
            priority
          />
          {selectedAgent.signatureURL && (
            <Image
              src={selectedAgent.signatureURL}
              alt="Agent Signature"
              className="rounded-lg w-[150px] h-[60px] object-contain cursor-pointer"
              width={150}
              height={60}
              onClick={() => {
                Modal.info({
                  title: 'Agent Signature',
                  content: (
                    <img
                      src={selectedAgent.signatureURL}
                      alt="Agent Signature"
                      style={{ width: '100%', height: 'auto' }}
                    />
                  ),
                  width: 'max-content',
                });
              }}
            />
          )}
        </div>
        <div className="flex-grow">
          <div className="flex justify-between items-start mb-4">
            <Descriptions layout="vertical" bordered column={2} size="small">
              <Descriptions.Item label="Name">{selectedAgent.displayName}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedAgent.email}</Descriptions.Item>
              <Descriptions.Item label="Phone">{selectedAgent.phone}</Descriptions.Item>
              <Descriptions.Item label="Joining Date">{selectedAgent.dateJoin}</Descriptions.Item>
              <Descriptions.Item label="Agent Password">{selectedAgent.password || ""}</Descriptions.Item>

            </Descriptions>
            
          </div>
        </div>
      </div>
    </Card>
  );

  const renderAgentAddress = () => (
    <Card className="rounded-lg mb-4 shadow-md">
      <Descriptions
        layout="vertical"
        bordered
        size="small"
        column={4}
        items={[
          { key: '1', label: 'Address', children: <p>{selectedAgent.address}</p> },
          { key: '2', label: 'City', children: <p>{selectedAgent.city}</p> },
          { key: '3', label: 'State', children: <p>{selectedAgent.state}</p> },
          { key: '4', label: 'Pincode', children: <p>{selectedAgent.pinCode}</p> },
        ]}
      />
    </Card>
  );

  const renderAgentDocuments = () => (
    <Card className="rounded-lg mb-4 shadow-md">
      <Title level={5}>Documents</Title>
      <div className="flex flex-wrap gap-4">
        {selectedAgent.documentURLs && selectedAgent.documentURLs.map((url, index) => (
          <div key={index} className="w-24 h-24 relative">
            {url.toLowerCase().includes('.pdf') ? (
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => window.open(url, '_blank')}
                className="w-full h-full flex items-center justify-center"
              >
                View PDF
              </Button>
            ) : (
              <Image
                src={url}
                alt={`Document ${index + 1}`}
                layout="fill"
                objectFit="cover"
                className="rounded-lg cursor-pointer"
                onClick={() => {

                    window.open(url,"_blank")
                //   Modal.info({
                //     title: `Document ${index + 1}`,
                //     content: (
                //       <img
                //         src={url}
                //         alt={`Document ${index + 1}`}
                //         style={{ width: '100%', height: 'auto' }}
                //       />
                //     ),
                //     width: 'max-content',
                //   });
                }}
              />
            )}
          </div>
        ))}
      </div>
    </Card>
  );
  return (
    <div>
              <Drawer
        title={`Agent Details (${selectedAgent?.displayName})`}
        placement="right"
        onClose={() => setIsViewModalVisible(false)}
        footer={[
       
        ]}
        open={isViewModalVisible}
        width={1220}
        destroyOnHidden
      >

        {selectedAgent && (
          <Tabs defaultActiveKey="1" className="agent-details-tabs">
            <TabPane tab="Basic Info" key="1">
              {renderAgentInfo()}
              {renderAgentAddress()}
            </TabPane>
            <TabPane tab="Documents" key="2">
              {renderAgentDocuments()}
            </TabPane>
            <TabPane tab="Added Members" key="3">
           {/* <AgentMembers agentId={selectedAgent.id} /> */}
           <AgentMembers  agentId={selectedAgent.id} agentInfo={selectedAgent} />
            </TabPane>
              <TabPane tab="Members Pay Status" key="4">
           <MemberPayStatus agentId={selectedAgent.id} agentInfo={selectedAgent}/>
            </TabPane>

                  <TabPane tab="All Pay Status" key="5">
           {/* <MemberPayStatus agentId={selectedAgent.id} agentInfo={selectedAgent}/> */}
           <AllPaymentStatus agentId={selectedAgent.id} agentInfo={selectedAgent} />
            </TabPane>
            <TabPane tab="Transactions" key="6">
            <Transactions  agentId={selectedAgent.id} agentInfo={selectedAgent} />
            </TabPane>
          </Tabs>
        )}
       </Drawer>
    </div>
  )
}

export default AgentDetails