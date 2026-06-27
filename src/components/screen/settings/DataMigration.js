"use client";

import React, { useState, useCallback } from "react";
import {
  Button, Select, Card, Table, Tag, Alert, Spin,
  Typography, Divider, Space, Statistic, Row, Col, Modal,
  Collapse, List, App,
} from "antd";
import {
  CloudUploadOutlined, DeleteOutlined, EyeOutlined,
  WarningOutlined, InfoCircleOutlined,
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useAuth } from "@/lib/AuthProvider";

const { Title, Text } = Typography;

const FILE_OPTIONS = [
  { label: "Vivah (विवाह)", value: "vivah" },
  { label: "Mamera (मामेरा)", value: "mamera" },
  { label: "Suraksha (सुरक्षा)", value: "surksha" },
];

const FILE_LABELS = { vivah: "Vivah", mamera: "Mamera", surksha: "Suraksha" };

const DataMigration = () => {
  const { user } = useAuth();
  const programList = useSelector((state) => state.data.programList || []);
  const { message } = App.useApp();

  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState(["vivah", "mamera", "surksha"]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);

  const handlePreview = useCallback(async () => {
    if (!selectedProgram) { message.warning("Select a program first"); return; }
    setLoading(true);
    setPreview(null);
    setResult(null);
    try {
      const res = await fetch("/api/migrations-data");
      const data = await res.json();
      if (data.success) setPreview(data.preview);
      else message.error(data.error || "Preview failed");
    } catch {
      message.error("Failed to connect");
    }
    setLoading(false);
  }, [selectedProgram, message]);

  const handleMigrate = useCallback(async () => {
    if (!selectedProgram || !user) return;
    setConfirmModal({
      title: "Confirm Migration",
      content: `Migrate ${selectedFiles.map((f) => FILE_LABELS[f]).join(", ")} → "${selectedProgram.name}". Records missing name/phone/joinDate/DOB will be skipped.`,
      onOk: async () => {
        setConfirmModal(null);
        setLoading(true);
        setResult(null);
        try {
          const res = await fetch("/api/migrations-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.uid, programId: selectedProgram.id, files: selectedFiles }),
          });
          const data = await res.json();
          if (data.success) { setResult(data); message.success(`${data.summary.totalMigrated} members added`); }
          else message.error(data.message || data.error || "Migration failed");
        } catch { message.error("Failed to connect"); }
        setLoading(false);
      },
    });
  }, [selectedProgram, user, selectedFiles, message]);

  const handleRevert = useCallback(async () => {
    if (!selectedProgram || !user) return;
    setConfirmModal({
      title: "Revert Migration",
      content: `DELETE all members migrated via this tool in "${selectedProgram.name}" + their login accounts. Cannot be undone!`,
      danger: true,
      onOk: async () => {
        setConfirmModal(null);
        setLoading(true);
        try {
          const res = await fetch("/api/migrations-data", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.uid, programId: selectedProgram.id }),
          });
          const data = await res.json();
          if (data.success) { setResult(null); message.success(`Reverted: ${data.deletedCount} removed`); }
          else message.error(data.message || data.error || "Revert failed");
        } catch { message.error("Failed to connect"); }
        setLoading(false);
      },
    });
  }, [selectedProgram, user, message]);

  const renderPreview = () => {
    if (!preview) return null;
    const allValid = Object.values(preview).reduce((s, f) => s + f.validCount, 0);
    const allInvalid = Object.values(preview).reduce((s, f) => s + f.invalidCount, 0);
    return (
      <div className="space-y-4 mt-4">
        <Row gutter={16}>
          <Col span={8}><Card size="small"><Statistic title="Total Records" value={allValid + allInvalid} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Valid (will migrate)" value={allValid} valueStyle={{ color: "#16a34a" }} /></Card></Col>
          <Col span={8}><Card size="small"><Statistic title="Invalid (will skip)" value={allInvalid} valueStyle={{ color: "#dc2626" }} /></Card></Col>
        </Row>
        <Collapse items={Object.entries(preview).map(([key, file]) => ({
          key,
          label: `${FILE_LABELS[key]} (${file.validCount} valid / ${file.invalidCount} invalid)`,
          children: (
            <div className="space-y-3">
              {file.invalidSamples?.length > 0 && (
                <Alert type="warning" showIcon message={`${file.invalidCount} records will be skipped`}
                  description={
                    <List size="small" dataSource={file.invalidSamples} renderItem={(item) => (
                      <List.Item>
                        <Text code>#{item.index}</Text> {item.displayName || "(no name)"}
                        {item.missingName && <Tag color="red">missing name</Tag>}
                        {item.missingPhone && <Tag color="red">missing phone</Tag>}
                        {item.missingJoinDate && <Tag color="red">missing join date</Tag>}
                        {item.missingDob && <Tag color="orange">missing/invalid DOB</Tag>}
                      </List.Item>
                    )} />
                  } />
              )}
              <Collapse ghost items={[{
                key: "agents", label: `Unique Agents (${file.uniqueAgents?.length || 0})`,
                children: <div className="flex flex-wrap gap-1">{(file.uniqueAgents || []).map((a) => <Tag key={a}>{a}</Tag>)}</div>,
              }]} />
              <Table size="small" dataSource={file.sample} rowKey="index" pagination={false}
                columns={[
                  { title: "#", dataIndex: "index", width: 50 },
                  { title: "Name", dataIndex: "displayName", width: 150 },
                  { title: "Phone", dataIndex: "phone", width: 120 },
                  { title: "DOB", dataIndex: "bobDate", width: 100, render: (v) => v || <Text type="danger">INVALID</Text> },
                  { title: "Join Date", dataIndex: "dateJoin", width: 100, render: (v) => v || <Text type="danger">INVALID</Text> },
                  { title: "Agent", dataIndex: "agentRaw", width: 150, ellipsis: true },
                ]} />
            </div>
          ),
        }))} />
      </div>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    const { summary, tables } = result;
    return (
      <div className="space-y-4 mt-4">
        <Alert type={summary.totalErrors > 0 ? "warning" : "success"} showIcon message="Migration Complete"
          description={
            <Row gutter={16}>
              <Col span={6}><Statistic title="Migrated" value={summary.totalMigrated} valueStyle={{ color: "#16a34a" }} /></Col>
              <Col span={6}><Statistic title="Skipped" value={summary.totalSkipped} /></Col>
              <Col span={6}><Statistic title="Errors" value={summary.totalErrors} valueStyle={{ color: summary.totalErrors > 0 ? "#dc2626" : undefined }} /></Col>
              <Col span={6}><Statistic title="Final Count" value={summary.finalMemberCount} /></Col>
            </Row>
          } />
        <Collapse items={Object.entries(tables).map(([key, table]) => ({
          key,
          label: `${FILE_LABELS[key]} — ${table.success} added, ${table.skipped} skipped, ${table.errors} errors`,
          children: (
            <Table size="small" dataSource={table.details} rowKey={(r) => `${r.index}-${r.status}`} pagination={{ pageSize: 10 }}
              columns={[
                { title: "#", dataIndex: "index", width: 50 },
                { title: "Name", dataIndex: "name", width: 150, ellipsis: true },
                { title: "Status", dataIndex: "status", width: 100, render: (v) => {
                  const color = v === "migrated" ? "green" : v === "skipped" ? "orange" : "red";
                  return <Tag color={color}>{v}</Tag>;
                }},
                { title: "Reg No", dataIndex: "regNo", width: 100 },
                { title: "Agent", dataIndex: "agentName", width: 150, ellipsis: true },
                { title: "Reason/Error", dataIndex: "reason", width: 200, ellipsis: true, render: (v) => v || "" },
              ]} />
          ),
        }))} />
      </div>
    );
  };

  return (
    <div>
      <Card>
        <Title level={4}>Data Migration</Title>
        <Text type="secondary">
          Migrate member data from JSON files (vivah.json, mamera.json, surksha.json)
          to a selected program. Records missing name, phone, join date, or DOB are skipped automatically.
        </Text>
        <Divider />
        <Space direction="vertical" className="w-full" size="middle">
          <div>
            <Text strong>Select Program</Text>
            <Select className="w-full mt-1" size="large" placeholder="Choose a program"
              value={selectedProgram?.id || undefined}
              onChange={(id) => setSelectedProgram(programList.find((p) => p.id === id) || null)}
              options={programList.map((p) => ({ label: p.name, value: p.id }))} />
          </div>
          <div>
            <Text strong>Files to Migrate</Text>
            <Select className="w-full mt-1" mode="multiple" size="large"
              value={selectedFiles} onChange={setSelectedFiles} options={FILE_OPTIONS} />
          </div>
          <Divider />
          <Space>
            <Button icon={<EyeOutlined />} onClick={handlePreview} loading={loading} disabled={!selectedProgram}>Preview</Button>
            <Button type="primary" icon={<CloudUploadOutlined />} onClick={handleMigrate}
              loading={loading} disabled={!selectedProgram || selectedFiles.length === 0}>Start Migration</Button>
            <Button danger icon={<DeleteOutlined />} onClick={handleRevert}
              loading={loading} disabled={!selectedProgram}>Revert</Button>
          </Space>
        </Space>
        {loading && (
          <div className="text-center py-10">
            <Spin size="large" />
            <div className="mt-4"><Text strong>Processing... this may take a few minutes</Text></div>
          </div>
        )}
        {!loading && preview && renderPreview()}
        {!loading && result && renderResult()}
      </Card>

      <Modal title={confirmModal?.title} open={!!confirmModal}
        onOk={confirmModal?.onOk} onCancel={() => setConfirmModal(null)}
        okText="Confirm" cancelText="Cancel" okButtonProps={{ danger: confirmModal?.danger }}>
        <div className="flex items-start gap-3">
          {confirmModal?.danger
            ? <WarningOutlined style={{ fontSize: 24, color: "#dc2626" }} />
            : <InfoCircleOutlined style={{ fontSize: 24, color: "#1890ff" }} />}
          <Text>{confirmModal?.content}</Text>
        </div>
      </Modal>
    </div>
  );
};

export default DataMigration;
