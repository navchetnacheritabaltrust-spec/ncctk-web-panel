import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthProvider';
import { useDispatch, useSelector } from 'react-redux';
import { Button, DatePicker, Select, Table, Tag, Typography, Segmented, message } from 'antd';
import { PrinterOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { setSelectedProgram } from '@/redux/slices/commonSlice';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Text } = Typography;
dayjs.extend(isBetween);

/* ─── Deep sanitizer ───────────────────────────────────────────────── */
const deepSanitize = (value) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object' && typeof value.toDate === 'function')
    return value.toDate().toISOString();
  if (typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value)
    return new Date(value.seconds * 1000).toISOString();
  if (typeof value === 'object' && (value._key !== undefined || value.firestore !== undefined || value.type === 'document'))
    return value.path ?? value.id ?? '[ref]';
  if (Array.isArray(value)) return value.map(deepSanitize);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepSanitize(v);
    return out;
  }
  return value;
};

const sanitizeDocument = (doc) => {
  const raw = doc.data();
  const result = { id: doc.id };
  for (const [k, v] of Object.entries(raw)) result[k] = deepSanitize(v);
  return result;
};

/* ─── PDF — proper A4 portrait ────────────────────────────────────── */
const printPDF = ({ transactions, summary, agentInfo, selectedProgram, customStart, customEnd, quickRange }) => {
  const dateLabel =
    quickRange !== 'custom'
      ? quickRange.charAt(0).toUpperCase() + quickRange.slice(1)
      : `${customStart ? dayjs(customStart).format('DD MMM YYYY') : '—'} to ${customEnd ? dayjs(customEnd).format('DD MMM YYYY') : '—'}`;

  const rows = transactions.map((t, i) => `
    <tr class="${i % 2 === 1 ? 'alt' : ''}">
      <td class="center num">${i + 1}</td>
      <td class="mono">${getId(t.transactionId) || '-'}</td>
      <td class="center">${t.paymentDate ? dayjs(t.paymentDate).format('DD/MM/YYYY') : '-'}</td>
      <td>
        <div class="cell-name">${t.memberDetails?.displayName || '-'}</div>
        <div class="cell-sub">${t.memberDetails?.registrationNumber || ''}</div>
      </td>
      <td>
        <div class="cell-name">${t.paymentFor || '-'}</div>
        <div class="cell-sub">${t.closingRegNo || ''}</div>
      </td>
      <td class="right amount">&#8377;${(t.payAmount || t.amount || 0).toLocaleString('en-IN')}</td>
      <td class="center">
        <span class="badge ${t.paymentMethod === 'cash' ? 'cash' : 'online'}">
          ${t.paymentMethod === 'cash' ? 'Cash' : 'Online'}
        </span>
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Transaction Report</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 10pt;
    color: #1a1a2e;
    background: #fff;
  }

  /* A4 page wrapper */
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 13mm 13mm 18mm 13mm;
    background: #fff;
    margin: 0 auto;
  }

  /* Header */
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding-bottom: 9pt; border-bottom: 2pt solid #1d2a4a; margin-bottom: 11pt;
  }
  .brand-title { font-size: 15pt; font-weight: 700; color: #1d2a4a; }
  .brand-sub   { font-size: 8.5pt; color: #6b7280; margin-top: 2pt; }
  .meta        { text-align: right; }
  .meta-label  { font-size: 7pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #9ca3af; }
  .meta-value  { font-size: 8.5pt; color: #374151; font-weight: 500; margin-bottom: 5pt; }

  /* Summary */
  .summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 6pt; margin-bottom: 11pt; }
  .card { border-radius: 5pt; border: 0.75pt solid #e2e8f0; padding: 7pt 9pt; background: #f8fafc; }
  .card-label { font-size: 6.5pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #94a3b8; margin-bottom: 2pt; }
  .card-value { font-size: 12pt; font-weight: 800; line-height: 1; }
  .card-count { font-size: 7pt; color: #94a3b8; margin-top: 2pt; }
  .card-total  { background: #f0fdf4; border-color: #86efac; } .card-total  .card-value { color: #16a34a; }
  .card-cash   .card-value { color: #d97706; }
  .card-online .card-value { color: #7c3aed; }
  .card-txns   .card-value { color: #1d2a4a; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; table-layout: fixed; }
  colgroup col.c0 { width: 22pt; }
  colgroup col.c1 { width: 105pt; }
  colgroup col.c2 { width: 52pt; }
  colgroup col.c3 { width: 78pt; }
  colgroup col.c4 { width: 78pt; }
  colgroup col.c5 { width: 62pt; }
  colgroup col.c6 { width: 45pt; }

  thead tr { background: #1d2a4a; }
  thead th { color: #fff; font-size: 7pt; font-weight: 700; letter-spacing: 0.4pt; padding: 6pt 6pt; text-align: left; white-space: nowrap; overflow: hidden; }
  thead th.center { text-align: center; } thead th.right { text-align: right; }
  tbody tr   { border-bottom: 0.5pt solid #f1f5f9; }
  tbody tr.alt td { background: #f8fafc; }
  tbody td   { padding: 4.5pt 6pt; vertical-align: middle; }
  td.center { text-align: center; } td.right { text-align: right; }
  td.num    { color: #94a3b8; font-size: 7.5pt; }
  td.mono   { font-family: 'Courier New', monospace; font-size: 7.5pt; color: #64748b; word-break: break-all; }
  td.amount { font-weight: 700; color: #16a34a; font-size: 9pt; white-space: nowrap; }
  .cell-name { font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cell-sub  { font-size: 7pt; color: #94a3b8; font-family: 'Courier New', monospace; margin-top: 1pt; }

  .badge { display: inline-block; padding: 1.5pt 5pt; border-radius: 20pt; font-weight: 700; font-size: 6.5pt; letter-spacing: 0.3pt; text-transform: uppercase; }
  .badge.cash   { background: #fef3c7; color: #d97706; }
  .badge.online { background: #ede9fe; color: #7c3aed; }

  .total-row td { background: #f0fdf4 !important; font-weight: 700; border-top: 1.5pt solid #bbf7d0; padding: 5.5pt 6pt; }
  .total-row .amount { color: #16a34a; font-size: 9.5pt; }

  /* Fixed footer on every printed page */
  .footer {
    position: fixed; bottom: 8mm; left: 13mm; right: 13mm;
    display: flex; justify-content: space-between;
    font-size: 7pt; color: #9ca3af;
    border-top: 0.5pt solid #e2e8f0; padding-top: 4pt;
  }

  @media print {
    @page { size: A4 portrait; margin: 0; }
    body  { width: 210mm; }
    .page { page-break-after: always; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    thead { display: table-header-group; }
    tbody tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="brand-title">Transaction Report</div>
      <div class="brand-sub">
        ${selectedProgram?.name ? `Program: <strong>${selectedProgram.name}</strong>` : ''}
        ${agentInfo?.displayName ? ` &nbsp;&middot;&nbsp; Agent: <strong>${agentInfo.displayName}</strong>` : ''}
      </div>
    </div>
    <div class="meta">
      <div class="meta-label">Period</div>
      <div class="meta-value">${dateLabel}</div>
      <div class="meta-label">Generated</div>
      <div class="meta-value">${dayjs().format('DD MMM YYYY, hh:mm A')}</div>
    </div>
  </div>

  <div class="summary">
    <div class="card card-txns">
      <div class="card-label">Transactions</div>
      <div class="card-value">${summary.totalTransactions}</div>
      <div class="card-count">total records</div>
    </div>
    <div class="card card-cash">
      <div class="card-label">Cash</div>
      <div class="card-value">&#8377;${summary.cashAmount.toLocaleString('en-IN')}</div>
      <div class="card-count">${summary.cashCount} txns</div>
    </div>
    <div class="card card-online">
      <div class="card-label">Online</div>
      <div class="card-value">&#8377;${summary.onlineAmount.toLocaleString('en-IN')}</div>
      <div class="card-count">${summary.onlineCount} txns</div>
    </div>
    <div class="card card-total">
      <div class="card-label">Total Collected</div>
      <div class="card-value">&#8377;${summary.totalAmount.toLocaleString('en-IN')}</div>
      <div class="card-count">all methods</div>
    </div>
  </div>

  <table>
    <colgroup>
      <col class="c0"/><col class="c1"/><col class="c2"/>
      <col class="c3"/><col class="c4"/><col class="c5"/><col class="c6"/>
    </colgroup>
    <thead>
      <tr>
        <th class="center">#</th>
        <th>TRX ID</th>
        <th class="center">Date</th>
        <th>Payer</th>
        <th>Closing Member</th>
        <th class="right">Amount</th>
        <th class="center">Method</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="5" style="text-align:right;font-size:8pt;color:#374151;">
          Total &mdash; ${summary.totalTransactions} records
        </td>
        <td class="right amount">&#8377;${summary.totalAmount.toLocaleString('en-IN')}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <span>Confidential &mdash; Generated by platform</span>
    <span>${dayjs().format('DD/MM/YYYY HH:mm')}</span>
  </div>

</div>
<script>setTimeout(() => { window.print(); }, 350);</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Please allow pop-ups to print the report.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
};

/* ─── Quick range config ───────────────────────────────────────────── */
const QUICK_RANGES = {
  today:  { label: 'Today',  start: () => dayjs().startOf('day'),   end: () => dayjs().endOf('day')   },
  week:   { label: 'Week',   start: () => dayjs().startOf('week'),  end: () => dayjs().endOf('week')  },
  month:  { label: 'Month',  start: () => dayjs().startOf('month'), end: () => dayjs().endOf('month') },
  custom: { label: 'Custom', start: null, end: null },
};
const getId = (input) => {
  if (!input || typeof input !== "string") return null;

  // Agar "/" hi nahi hai → direct ID hai
  if (!input.includes("/")) {
    return input;
  }

  const parts = input.split("/").filter(Boolean);

  if (parts.length < 2) return null;

  // Firestore document path check (even segments)
  if (parts.length % 2 === 0) {
    return parts[parts.length - 1];
  }

  return null;
};
/* ─── Main Component ───────────────────────────────────────────────── */
const Transactions = ({ agentId, agentInfo }) => {
  const programList     = useSelector((state) => state.data.programList);
  const { user }        = useAuth();
  const dispatch        = useDispatch();
  const selectedProgram = useSelector((state) => state.data.selectedProgram);

  const [transactions,  setTransactions]  = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [quickRange,    setQuickRange]    = useState('month');

  // *** KEY FIX: store raw dayjs objects, NOT ISO strings ***
  // RangePicker must always receive dayjs instances or null — never strings
  const [customStart, setCustomStart] = useState(null); // dayjs | null
  const [customEnd,   setCustomEnd]   = useState(null); // dayjs | null

  const [paymentMethod, setPaymentMethod] = useState('all');

  /* ISO strings for Firestore — derived, never stored */
  const rangeStartISO = useMemo(() => {
    if (quickRange !== 'custom') return QUICK_RANGES[quickRange].start().toISOString();
    return customStart ? customStart.startOf('day').toISOString() : null;
  }, [quickRange, customStart]);

  const rangeEndISO = useMemo(() => {
    if (quickRange !== 'custom') return QUICK_RANGES[quickRange].end().toISOString();
    return customEnd ? customEnd.endOf('day').toISOString() : null;
  }, [quickRange, customEnd]);

  /* Fetch */
  const fetchTransactions = useCallback(async () => {
    if (!user)                { message.error('User not authenticated'); return; }
    if (!agentId)             { setTransactions([]); return; }
    if (!selectedProgram?.id) { setTransactions([]); return; }
    // Wait until both custom dates are chosen
    if (quickRange === 'custom' && (!customStart || !customEnd)) { setTransactions([]); return; }

    setLoading(true);
    try {
      const ref         = collection(db, `users/${user.uid}/programs/${selectedProgram.id}/payment_pending`);
      const constraints = [
        where("memberDetails.agentId", "==", agentId),
        where("status", "==", "paid"),
      ];
      if (paymentMethod !== 'all') constraints.push(where("paymentMethod", "==", paymentMethod));
      if (rangeStartISO) constraints.push(where("paymentDate", ">=", rangeStartISO));
      if (rangeEndISO)   constraints.push(where("paymentDate", "<=", rangeEndISO));
      constraints.push(orderBy("paymentDate", "desc"));

      const snapshot = await getDocs(query(ref, ...constraints));
      const data = snapshot.docs.map(doc => {
        const s = sanitizeDocument(doc);
        return { ...s, payAmount: s.payAmount || s.amount || 0 };
      });
      console.log(data,'data')
      setTransactions(data);
    } catch (err) {
      console.error(err);
      message.error('Failed to load transactions. ' + (err?.message || ''));
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [agentId, selectedProgram?.id, rangeStartISO, rangeEndISO, paymentMethod, user, quickRange, customStart, customEnd]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  /* Handlers */
  const handleProgramSelect = useCallback((pid) => {
    if (!pid || pid === selectedProgram?.id) return;
    const prog = programList.find(p => p.id === pid);
    if (prog) dispatch(setSelectedProgram(prog));
  }, [selectedProgram, programList, dispatch]);

  const handleSegmentChange = (val) => {
    setQuickRange(val);
    // Clear custom dates when leaving custom mode
    if (val !== 'custom') { setCustomStart(null); setCustomEnd(null); }
  };

  // dates is [dayjsObj, dayjsObj] | null — keep them as dayjs, do NOT convert
  const handleRangeChange = (dates) => {
    if (!dates) { setCustomStart(null); setCustomEnd(null); }
    else        { setCustomStart(dates[0] ?? null); setCustomEnd(dates[1] ?? null); }
  };

  /* Summary */
  const summary = useMemo(() => {
    const cashTxns   = transactions.filter(t => t.paymentMethod === 'cash');
    const onlineTxns = transactions.filter(t => t.paymentMethod !== 'cash');
    return {
      totalAmount:       transactions.reduce((s, t) => s + (t.payAmount || 0), 0),
      totalTransactions: transactions.length,
      cashCount:         cashTxns.length,
      onlineCount:       onlineTxns.length,
      cashAmount:        cashTxns.reduce((s, t)  => s + (t.payAmount || 0), 0),
      onlineAmount:      onlineTxns.reduce((s, t) => s + (t.payAmount || 0), 0),
    };
  }, [transactions]);

  const dateLabel = useMemo(() => {
    if (quickRange !== 'custom') return QUICK_RANGES[quickRange].label;
    if (customStart && customEnd)
      return `${customStart.format('DD MMM')} – ${customEnd.format('DD MMM YYYY')}`;
    return 'Custom (select dates)';
  }, [quickRange, customStart, customEnd]);

  /* Columns */
  const columns = useMemo(() => [
    {
      title: '#', key: 'index', width: 48, align: 'center',
      render: (_, __, i) => <span className="trx-index">{i + 1}</span>,
    },
    {
      title: 'TRX ID', dataIndex: 'transactionId', key: 'transactionId', width: 180,
      render: (val) => <span className="trx-mono">{getId(val) || '-'}</span>,
    },
    {
      title: 'Date', dataIndex: 'paymentDate', key: 'paymentDate', width: 90,
      sorter: (a, b) => new Date(a.paymentDate || 0) - new Date(b.paymentDate || 0),
      render: (val) => val
        ? <span className="trx-date">{dayjs(val).format('DD/MM/YY')}</span>
        : <span className="trx-dim">-</span>,
    },
    {
      title: 'Payer', key: 'payer', width: 155,
      render: (_, r) => (
        <div>
          <div className="trx-name">{r.memberDetails?.displayName || '-'}</div>
          <div className="trx-sub">{r.memberDetails?.registrationNumber || ''}</div>
        </div>
      ),
    },
    {
      title: 'Closing Member', key: 'closing', width: 150,
      render: (_, r) => (
        <div>
          <div className="trx-name">{r.paymentFor || '-'}</div>
          <div className="trx-sub">{r.closingRegNo || ''}</div>
        </div>
      ),
    },
    {
      title: 'Amount', dataIndex: 'payAmount', key: 'payAmount', width: 110, align: 'right',
      sorter: (a, b) => (a.payAmount || 0) - (b.payAmount || 0),
      render: (val) => <span className="trx-amount">₹{(val || 0).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Method', dataIndex: 'paymentMethod', key: 'paymentMethod', width: 90, align: 'center',
      render: (val) => (
        <Tag className={`trx-tag trx-tag-${val === 'cash' ? 'cash' : 'online'}`}>
          {val === 'cash' ? 'Cash' : 'Online'}
        </Tag>
      ),
    },
  ], []);

  /* RangePicker value — MUST be [dayjs, dayjs] or null, never strings */
  const pickerValue = (customStart && customEnd) ? [customStart, customEnd] : null;

  return (
    <div className="trx-root">

      {/* ── Header ── */}
      <div className="trx-header">
        <div className="trx-header-left">
          <div className="trx-title">Transactions</div>
          <div className="trx-subtitle">
            {selectedProgram?.name && <><span className="trx-pill">{selectedProgram.name}</span>{' · '}</>}
            {agentInfo?.name && <span>{agentInfo.name}</span>}
            {' · '}{dateLabel}
          </div>
        </div>
        <div className="trx-header-actions">
          <Button icon={<ReloadOutlined />} onClick={fetchTransactions} loading={loading} size="small" className="trx-btn-ghost">
            Refresh
          </Button>
          <Button
            icon={<PrinterOutlined />}
            onClick={() => printPDF({ transactions, summary, agentInfo, selectedProgram, customStart, customEnd, quickRange })}
            size="small"
            className="trx-btn-primary"
            disabled={transactions.length === 0}
          >
            Print / PDF
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="trx-cards">
        <div className="trx-card trx-card-purple">
          <div className="trx-card-label">Total Collected</div>
          <div className="trx-card-value">₹{summary.totalAmount.toLocaleString('en-IN')}</div>
          <div className="trx-card-sub">{summary.totalTransactions} records</div>
        </div>
        <div className="trx-card trx-card-amber">
          <div className="trx-card-label">Cash</div>
          <div className="trx-card-value">₹{summary.cashAmount.toLocaleString('en-IN')}</div>
          <div className="trx-card-sub">{summary.cashCount} transactions</div>
        </div>
        <div className="trx-card trx-card-blue">
          <div className="trx-card-label">Online</div>
          <div className="trx-card-value">₹{summary.onlineAmount.toLocaleString('en-IN')}</div>
          <div className="trx-card-sub">{summary.onlineCount} transactions</div>
        </div>
        <div className="trx-card trx-card-green">
          <div className="trx-card-label">Avg per TRX</div>
          <div className="trx-card-value">
            ₹{summary.totalTransactions > 0
              ? Math.round(summary.totalAmount / summary.totalTransactions).toLocaleString('en-IN')
              : 0}
          </div>
          <div className="trx-card-sub">per transaction</div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="trx-filters">
        <div className="trx-filters-left">
          <FilterOutlined style={{ color: '#94a3b8', fontSize: 13 }} />

          <Select
            placeholder="Select Program"
            size="small"
            style={{ width: 190 }}
            onChange={handleProgramSelect}
            value={selectedProgram?.id}
            disabled={loading}
          >
            {programList.map(p => <Option key={p.id} value={p.id}>{p.name}</Option>)}
          </Select>

          <div className="trx-divider" />

          <Segmented
            size="small"
            value={quickRange}
            onChange={handleSegmentChange}
            options={[
              { label: 'Today',  value: 'today'  },
              { label: 'Week',   value: 'week'   },
              { label: 'Month',  value: 'month'  },
              { label: 'Custom', value: 'custom' },
            ]}
            className="trx-segmented"
          />

          {/* RangePicker: value is always [dayjs, dayjs] or null — this is what fixes the bug */}
          {quickRange === 'custom' && (
            <RangePicker
              size="small"
              placeholder={['From date', 'To date']}
              format="DD/MM/YY"
              value={pickerValue}
              onChange={handleRangeChange}
              allowClear
              style={{ width: 215 }}
              getPopupContainer={(trigger) => trigger.parentElement}
            />
          )}

          <Select size="small" value={paymentMethod} onChange={setPaymentMethod} style={{ width: 120 }}>
            <Option value="all">All Methods</Option>
            <Option value="cash">Cash</Option>
            <Option value="online">Online</Option>
          </Select>
        </div>

        <div className="trx-filters-right">
          <span className="trx-count-badge">{summary.totalTransactions} records</span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="trx-table-wrap">
        <Table
          columns={columns}
          dataSource={transactions}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ x: 820, y: 'calc(100vh - 460px)' }}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100, 200],
            showTotal: (total, range) => `${range[0]}–${range[1]} of ${total}`,
            size: 'small',
            style: { padding: '10px 16px', margin: 0, borderTop: '1px solid #f1f5f9' },
          }}
          rowClassName={(_, i) => i % 2 === 1 ? 'trx-alt' : ''}
          locale={{
            emptyText: (
              <div className="trx-empty">
                <div className="trx-empty-icon">📭</div>
                <div className="trx-empty-title">No transactions found</div>
                <div className="trx-empty-sub">
                  {quickRange === 'custom' && (!customStart || !customEnd)
                    ? 'Select a start and end date above to load transactions'
                    : 'Try adjusting the date range or filters'}
                </div>
              </div>
            ),
          }}
          summary={() => (
            <Table.Summary fixed="bottom">
              <Table.Summary.Row className="trx-summary-row">
                <Table.Summary.Cell index={0} colSpan={5} align="right">
                  <Text strong style={{ fontSize: 12, color: '#475569' }}>
                    Total · {summary.totalTransactions} records
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} align="right">
                  <Text strong style={{ color: '#16a34a', fontSize: 13 }}>
                    ₹{summary.totalAmount.toLocaleString('en-IN')}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} />
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </div>

      {/* ── Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap');

        .trx-root { display:flex; flex-direction:column; gap:14px; font-family:'DM Sans',sans-serif; }

        .trx-header { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; }
        .trx-title  { font-size:18px; font-weight:800; color:#0f172a; letter-spacing:-0.4px; }
        .trx-subtitle { font-size:12px; color:#94a3b8; margin-top:2px; }
        .trx-pill   { display:inline-block; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:20px; padding:1px 8px; font-size:11px; font-weight:600; color:#475569; }
        .trx-header-actions { display:flex; gap:8px; }
        .trx-btn-ghost   { border-color:#e2e8f0!important; color:#64748b!important; font-family:'DM Sans',sans-serif!important; font-weight:500!important; border-radius:8px!important; }
        .trx-btn-primary { background:#1d2a4a!important; border-color:#1d2a4a!important; color:#fff!important; font-family:'DM Sans',sans-serif!important; font-weight:600!important; border-radius:8px!important; }
        .trx-btn-primary:hover { background:#273861!important; border-color:#273861!important; }

        .trx-cards { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        @media(max-width:900px){ .trx-cards { grid-template-columns:repeat(2,1fr); } }
        .trx-card { padding:14px 18px; border-radius:12px; border:1px solid transparent; }
        .trx-card-label { font-size:10px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; opacity:0.7; margin-bottom:5px; }
        .trx-card-value { font-size:20px; font-weight:800; line-height:1; letter-spacing:-0.5px; }
        .trx-card-sub   { font-size:10px; margin-top:4px; opacity:0.65; }
        .trx-card-purple { background:#faf5ff; border-color:#e9d5ff; color:#7c3aed; }
        .trx-card-amber  { background:#fffbeb; border-color:#fde68a; color:#d97706; }
        .trx-card-blue   { background:#eff6ff; border-color:#bfdbfe; color:#2563eb; }
        .trx-card-green  { background:#f0fdf4; border-color:#bbf7d0; color:#16a34a; }

        .trx-filters { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 14px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; flex-wrap:wrap; }
        .trx-filters-left { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .trx-divider { width:1px; height:24px; background:#e2e8f0; flex-shrink:0; }
        .trx-count-badge { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:20px; padding:3px 10px; font-size:11px; font-weight:600; color:#64748b; }
        .trx-segmented .ant-segmented-item-selected { background:#1d2a4a!important; color:#fff!important; }

        .trx-table-wrap { background:#fff; border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; }
        .ant-table-thead > tr > th { background:#1d2a4a!important; color:#fff!important; font-family:'DM Sans',sans-serif!important; font-size:11px!important; font-weight:700!important; letter-spacing:0.3px!important; padding:10px 12px!important; border-bottom:none!important; }
        .ant-table-thead > tr > th::before { background-color:rgba(255,255,255,0.1)!important; }
        .ant-table-tbody > tr > td { border-bottom:1px solid #f1f5f9!important; padding:8px 12px!important; }
        .trx-alt > td { background:#f8fafc!important; }
        .ant-table-tbody > tr:hover > td { background:#f0f4ff!important; }
        .ant-table-summary > tr > td { border-top:2px solid #e2e8f0!important; background:#f8fafc!important; }
        .trx-summary-row td { padding:10px 12px!important; }

        .trx-index  { font-size:11px; color:#94a3b8; font-family:'DM Mono',monospace; }
        .trx-mono   { font-family:'DM Mono',monospace; font-size:10.5px; color:#64748b; }
        .trx-date   { font-size:12px; font-weight:500; color:#374151; }
        .trx-dim    { color:#94a3b8; }
        .trx-name   { font-size:12px; font-weight:600; color:#1e293b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px; }
        .trx-sub    { font-family:'DM Mono',monospace; font-size:10px; color:#94a3b8; margin-top:1px; }
        .trx-amount { font-size:13px; font-weight:800; color:#16a34a; font-variant-numeric:tabular-nums; }
        .trx-tag    { border-radius:20px!important; font-weight:700!important; font-size:10px!important; padding:1px 9px!important; margin:0!important; border:none!important; }
        .trx-tag-cash   { background:#fef3c7!important; color:#d97706!important; }
        .trx-tag-online { background:#ede9fe!important; color:#7c3aed!important; }

        .trx-empty      { padding:48px 0; text-align:center; }
        .trx-empty-icon { font-size:36px; margin-bottom:10px; }
        .trx-empty-title { font-size:14px; font-weight:700; color:#64748b; margin-bottom:4px; }
        .trx-empty-sub  { font-size:12px; color:#94a3b8; }

        .ant-select-selector { border-radius:8px!important; border-color:#e2e8f0!important; font-family:'DM Sans',sans-serif!important; }
        .ant-picker { border-radius:8px!important; border-color:#e2e8f0!important; font-family:'DM Sans',sans-serif!important; }
        .ant-segmented { border-radius:8px!important; background:#f1f5f9!important; }
        .ant-segmented-item { font-family:'DM Sans',sans-serif!important; font-size:12px!important; font-weight:500!important; }
        .ant-table-pagination { font-family:'DM Sans',sans-serif!important; }
        .ant-pagination-item-active { border-color:#1d2a4a!important; }
        .ant-pagination-item-active a { color:#1d2a4a!important; }
        .ant-picker-dropdown { z-index:9999!important; }
      `}</style>
    </div>
  );
};

export default Transactions;