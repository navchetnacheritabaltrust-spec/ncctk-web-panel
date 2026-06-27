import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ClientSideRowModelModule,
  ModuleRegistry,
  NumberEditorModule,
  NumberFilterModule,
  PaginationModule,
  RowSelectionModule,
  TextEditorModule,
  TextFilterModule,
  ValidationModule,
  RowStyleModule,
  CellStyleModule,
  CsvExportModule 
} from 'ag-grid-community';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import AllPaymentPdf from './AllPaymentPdf';
import { Button, Drawer, Select, Space, Tag } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getData } from '@/lib/services/firebaseService';
import { useDispatch, useSelector } from 'react-redux';

ModuleRegistry.registerModules([
  NumberEditorModule,
  TextEditorModule,
  TextFilterModule,
  NumberFilterModule,
  RowSelectionModule,
  PaginationModule,
  ClientSideRowModelModule,
  ValidationModule,
  RowStyleModule,
  CellStyleModule,
  CsvExportModule
]);

const { Option } = Select;

// ─── Status Badge ────────────────────────────────────────────────────────────
const StatusRenderer = ({ value }) => {
  if (!value) return null;
  const map = {
    paid:    { label: 'Paid',    bg: '#dcfce7', color: '#166534' },
    pending: { label: 'Pending', bg: '#fef9c3', color: '#854d0e' },
    both:    { label: 'Both',    bg: '#dbeafe', color: '#1e40af' },
  };
  const s = map[value] || {};
  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: 0.4,
      background: s.bg,
      color: s.color,
      display: 'inline-block'
    }}>
      {s.label}
    </span>
  );
};

const CurrencyRenderer = ({ value }) =>
  value ? `₹${Number(value).toLocaleString('en-IN')}` : '₹0';

// ─── Column Defs ─────────────────────────────────────────────────────────────
const COL_DEFS = [
  { headerName: '#',              field: 'index',              width: 60,  pinned: 'left', cellStyle: { fontWeight: 700, color: '#6b7280' } },
  { headerName: 'Reg. No.',       field: 'registrationNumber', width: 110, pinned: 'left', cellStyle: { fontWeight: 700 } },
  { headerName: 'Member Name',    field: 'memberName',         minWidth: 170, cellStyle: { fontWeight: 600 } },
  { headerName: 'Father Name',    field: 'fatherName',         minWidth: 140 },
  { headerName: 'Phone',          field: 'phone',              width: 130 },
  { headerName: 'Village',        field: 'village',            minWidth: 120 },
  { headerName: 'Program',        field: 'programName',        minWidth: 180, cellStyle: { fontWeight: 600, color: '#4f46e5' } },
  {
    headerName: 'Pending (₹)',  field: 'totalPending', width: 130,
    cellRenderer: CurrencyRenderer, type: 'numericColumn',
    cellStyle: { fontWeight: 700, color: '#dc2626' }
  },
  {
    headerName: 'Paid (₹)',     field: 'totalPaid',    width: 120,
    cellRenderer: CurrencyRenderer, type: 'numericColumn',
    cellStyle: { fontWeight: 700, color: '#059669' }
  },
  { headerName: 'Status',       field: 'status',       width: 100, cellRenderer: StatusRenderer },
  { headerName: 'Pending #',    field: 'pendingCount', width: 105, type: 'numericColumn', cellStyle: { background: '#fef3c7', fontWeight: 600 } },
  { headerName: 'Paid #',       field: 'paidCount',    width: 95,  type: 'numericColumn', cellStyle: { background: '#dcfce7', fontWeight: 600 } },
];

const DEFAULT_COL = { sortable: true, filter: true, resizable: true, flex: 1, minWidth: 100 };

// ─── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, color, sub }) => (
  <div style={{
    background: '#fff',
    border: '1px solid #f1f5f9',
    borderRadius: 12,
    padding: '14px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    minWidth: 130
  }}>
    <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</p>
    <p style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1, margin: 0 }}>{value}</p>
    {sub && <p style={{ fontSize: 11, color: '#cbd5e1', marginTop: 2 }}>{sub}</p>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AllPaymentStatus = ({ agentId, agentInfo }) => {
  const { user } = useAuth();
  const programList = useSelector((state) => state.data.programList);

  // Multi-select: array of program IDs. Default = first program only.
  const [selectedProgramIds, setSelectedProgramIds] = useState([]);

  const [rowData, setRowData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const gridRef = useRef();

  // Set default program once programList loads
  useEffect(() => {
    if (programList?.length > 0 && selectedProgramIds.length === 0) {
      setSelectedProgramIds([programList[0].id]);
    }
  }, [programList]);

  // Fetch when selection changes
  useEffect(() => {
    if (user?.uid && selectedProgramIds.length > 0) {
      fetchPaymentData(selectedProgramIds);
    } else {
      setRowData([]);
    }
  }, [selectedProgramIds, user?.uid]);

  // ── Core fetch (only selected programs) ──────────────────────────────────
  const fetchPaymentData = async (programIds) => {
    setIsLoading(true);
    try {
      const uid = user.uid;
      const aggregatedMap = {};

      // Run all programs in parallel for speed
      await Promise.all(
        programIds.map(async (programId) => {
          const programDoc = programList.find((p) => p.id === programId);
          if (!programDoc) return;
          const programData = programDoc;

          const [memberData, paymentsSnap] = await Promise.all([
            getData(
              `/users/${uid}/programs/${programId}/members`,
              [
                { field: 'agentId',      operator: '==', value: agentId },
                { field: 'active_flag',  operator: '==', value: true },
                { field: 'delete_flag',  operator: '==', value: false },
                { field: 'status',       operator: '==', value: 'accepted' },
              ],
              { field: 'createdAt', direction: 'desc' }
            ),
            getDocs(collection(db, `users/${uid}/programs/${programId}/payment_pending`)),
          ]);

          // Build a quick lookup: memberId → payments[]
          const paymentsByMember = {};
          paymentsSnap.forEach((pDoc) => {
            const p = pDoc.data();
            if (!paymentsByMember[p.memberId]) paymentsByMember[p.memberId] = [];
            paymentsByMember[p.memberId].push({ id: pDoc.id, ...p });
          });

          for (const memberDoc of memberData) {
            const memberId = memberDoc.id;
            const memberPayments = paymentsByMember[memberId];
            if (!memberPayments || memberPayments.length === 0) continue;

            // Aggregate per marriage
            let totalPaid = 0, totalPending = 0, paidCount = 0, pendingCount = 0;
            memberPayments.forEach((p) => {
              const amt = Number(p.payAmount || 0);
              if (p.status === 'paid') { totalPaid += amt; paidCount++; }
              else { totalPending += amt; pendingCount++; }
            });

            const key = `${memberDoc.registrationNumber}-${programId}`;
            aggregatedMap[key] = {
              registrationNumber: memberDoc.registrationNumber,
              memberName:  memberDoc.displayName,
              fatherName:  memberDoc.fatherName,
              phone:       memberDoc.phone,
              village:     memberDoc.village,
              programName: programData.name,
              programId,
              memberId,
              totalPaid,
              totalPending,
              paidCount,
              pendingCount,
              status:
                paidCount > 0 && pendingCount > 0 ? 'both'
                : paidCount > 0 ? 'paid'
                : 'pending',
            };
          }
        })
      );

      const result = Object.values(aggregatedMap).map((r, i) => ({ ...r, index: i + 1 }));
      setRowData(result);
    } catch (err) {
      console.error('Error fetching payment data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const totals = rowData.reduce(
    (acc, r) => ({
      paid:    acc.paid    + (r.totalPaid    || 0),
      pending: acc.pending + (r.totalPending || 0),
      paidCnt: acc.paidCnt + (r.paidCount   || 0),
      pendCnt: acc.pendCnt + (r.pendingCount || 0),
    }),
    { paid: 0, pending: 0, paidCnt: 0, pendCnt: 0 }
  );
  const uniqueMembers   = new Set(rowData.map((r) => r.registrationNumber)).size;
  const uniquePrograms  = new Set(rowData.map((r) => r.programName)).size;

  const getFileName = () => {
    const name = agentInfo?.displayName?.replace(/\s+/g, '_') || 'Agent';
    return `${name}_Payment_${dayjs().format('DDMMYYYY')}.pdf`;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '20px 24px', background: '#f8fafc', minHeight: '100vh' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: -0.5 }}>
            Payment Status
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
            {agentInfo?.displayName || 'Agent'} · {rowData.length} records across {uniquePrograms} program{uniquePrograms !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Multi-select program picker */}
          <Select
            mode="multiple"
            placeholder="Select Program(s)"
            style={{ minWidth: 260, maxWidth: 420 }}
            value={selectedProgramIds}
            onChange={setSelectedProgramIds}
            maxTagCount={2}
            allowClear
            size="large"
            dropdownRender={(menu) => (
              <div>
                <div
                  style={{ padding: '6px 12px', cursor: 'pointer', color: '#4f46e5', fontWeight: 600, borderBottom: '1px solid #f1f5f9', fontSize: 13 }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSelectedProgramIds(programList.map((p) => p.id));
                  }}
                >
                  ✓ Select All Programs
                </div>
                {menu}
              </div>
            )}
          >
            {programList.map((p) => (
              <Option key={p.id} value={p.id}>{p.name}</Option>
            ))}
          </Select>

          <button
            onClick={() => gridRef.current?.api?.exportDataAsCsv({ fileName: 'payment_status.csv' })}
            style={{
              padding: '8px 16px', background: '#10b981', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 5
            }}
          >
            ⬇ CSV
          </button>
          <button
            onClick={() => setOpen(true)}
            style={{
              padding: '8px 16px', background: '#4f46e5', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
              fontSize: 13, display: 'flex', alignItems: 'center', gap: 5
            }}
          >
            ⬇ PDF
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {rowData.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <SummaryCard label="Total Paid"     value={`₹${totals.paid.toLocaleString('en-IN')}`}    color="#059669" />
          <SummaryCard label="Total Pending"  value={`₹${totals.pending.toLocaleString('en-IN')}`} color="#dc2626" />
          <SummaryCard label="Paid Payments"  value={totals.paidCnt} color="#059669" sub="transactions" />
          <SummaryCard label="Pending Count"  value={totals.pendCnt} color="#f59e0b" sub="transactions" />
          <SummaryCard label="Members"        value={uniqueMembers}  color="#4f46e5" />
          <SummaryCard label="Programs"       value={uniquePrograms} color="#7c3aed" />
        </div>
      )}

      {/* ── No program selected ── */}
      {selectedProgramIds.length === 0 && !isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ fontSize: 16, fontWeight: 600 }}>Select a program to view payment data</p>
        </div>
      )}

      {/* ── Grid ── */}
      {selectedProgramIds.length > 0 && (
        <div
          className="ag-theme-alpine"
          style={{
            height: 'calc(100vh - 280px)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0'
          }}
        >
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            loading={isLoading}
            defaultColDef={DEFAULT_COL}
            columnDefs={COL_DEFS}
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[20, 50, 100, 200]}
            enableCellTextSelection
            ensureDomOrder
            animateRows
            overlayLoadingTemplate='<span style="font-size:14px;color:#6b7280;font-weight:600">Loading payment data…</span>'
            overlayNoRowsTemplate='<span style="font-size:14px;color:#6b7280">No payment records found for selected program(s)</span>'
          />
        </div>
      )}

      {/* ── PDF Drawer ── */}
      <Drawer
        title={<span style={{ fontWeight: 700, fontSize: 15 }}>{getFileName()}</span>}
        width={820}
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        destroyOnHidden
        footer={
          <Space style={{ float: 'right' }}>
            <Button onClick={() => setOpen(false)} size="large">Cancel</Button>
            <PDFDownloadLink
              document={
                <AllPaymentPdf
                  rowData={rowData}
                  agentInfo={{
                    ...agentInfo,
                    uid: user?.uid,
                    displayName: agentInfo?.displayName || user?.displayName,
                    phone: agentInfo?.phone || user?.phoneNumber,
                  }}
                />
              }
              fileName={getFileName()}
            >
              {({ loading }) => (
                <Button type="primary" icon={<DownloadOutlined />} size="large" loading={loading}>
                  Download PDF
                </Button>
              )}
            </PDFDownloadLink>
          </Space>
        }
      >
        <PDFViewer style={{ width: '100%', height: '100vh', border: 'none' }}>
          <AllPaymentPdf
            rowData={rowData}
            agentInfo={{
              ...agentInfo,
              uid: user?.uid,
              displayName: agentInfo?.displayName || user?.displayName,
              phone: agentInfo?.phone || user?.phoneNumber,
            }}
          />
        </PDFViewer>
      </Drawer>
    </div>
  );
};

export default AllPaymentStatus;