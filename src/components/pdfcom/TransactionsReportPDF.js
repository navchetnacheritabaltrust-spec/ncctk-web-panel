// component/pdfcom/TransactionsReportPDF.jsx
// ✅ Multi-page support, no cut rows, proper column widths, clean design
import React, { memo } from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import NotoSansDevanagari from '@/app/api/helperfile/static/font/NotoSansDevanagari';
import NotoSansDevanagariBold from '@/app/api/helperfile/static/font/NotoSansDevanagariBold';
import { TrsutData } from '@/lib/constentData';

Font.register({
  family: 'NotoSansDevanagari',
  fonts: [
    { src: NotoSansDevanagari, fontWeight: 'normal' },
    { src: NotoSansDevanagariBold, fontWeight: 'bold' },
  ],
});

// ─── A4 Portrait: 595 × 842 pt, padding 20 → content width = 555pt ──────────
// Column widths must sum to exactly 555
const COL = {
  no:     28,   // S.No
  date:   46,   // Date
  payer:  108,  // Payer (name + reg)
  benef:  108,  // Beneficiary (name + reg)
  amount: 58,   // Amount ₹
  method: 46,   // Method pill
  trx:    80,   // TRX ID
  ref:    81,   // Reference  → 28+46+108+108+58+46+80+81 = 555 ✓
};

const COLORS = {
  maroon:     '#8B0000',
  navy:       '#1a1a4e',
  gold:       '#c9a227',
  lightGold:  '#f5e9c3',
  rowEven:    '#fdf8f0',
  rowOdd:     '#ffffff',
  green:      '#15803d',
  greenBg:    '#dcfce7',
  blue:       '#1d4ed8',
  blueBg:     '#dbeafe',
  headerText: '#ffffff',
  border:     '#e5e7eb',
  subText:    '#9ca3af',
  footerBg:   '#f9fafb',
  totalBg:    '#1a1a4e',
};

const S = StyleSheet.create({
  page: {
    backgroundColor: '#fff',
    fontFamily: 'NotoSansDevanagari',
    paddingTop: 20,
    paddingBottom: 40,   // room for fixed footer
    paddingHorizontal: 20,
    fontSize: 8,
  },

  // ── Outer decorative border ──
  outerBorder: {
    border: `2px solid ${COLORS.gold}`,
    padding: 3,
    flex: 1,
  },
  innerBorder: {
    border: `1px solid ${COLORS.gold}`,
    padding: 8,
    flex: 1,
    flexDirection: 'column',
  },

  // ── Header ──
  topStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  topText: { fontSize: 7.5, color: COLORS.maroon, fontWeight: 'bold' },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  logo: { width: 68, height: 68, objectFit: 'contain' },
  centerBlock: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  orgName:  { fontSize: 19, color: COLORS.maroon, fontWeight: 'bold', marginBottom: 1 },
  orgCity:  { fontSize: 10, color: '#222', fontWeight: 'bold', marginBottom: 1 },
  orgAddr:  { fontSize: 7.5, color: '#555', textAlign: 'center', marginBottom: 1 },
  orgPhone: { fontSize: 8.5, color: '#222', fontWeight: 'bold', marginBottom: 4 },
  reportBadge: {
    backgroundColor: COLORS.maroon,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 4,
  },
  reportBadgeText: { fontSize: 9, color: '#fff', fontWeight: 'bold' },

  // ── Info bar ──
  infoBar: {
    backgroundColor: '#eef2ff',
    borderLeft: `3px solid ${COLORS.maroon}`,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 5,
    borderRadius: 2,
  },
  infoItem:  { flexDirection: 'row', alignItems: 'center', marginBottom: 1 },
  infoLabel: { fontSize: 7.5, color: COLORS.maroon, fontWeight: 'bold', marginRight: 3 },
  infoValue: { fontSize: 7.5, color: COLORS.navy, fontWeight: 'bold' },

  // ── Filter strip ──
  filterBar: {
    backgroundColor: '#fffde7',
    border: `1px solid #fde68a`,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  filterText: { fontSize: 7, color: '#78350f' },

  // ── Summary cards ──
  summaryRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  summaryCard: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 6,
    alignItems: 'center',
    border: `1px solid ${COLORS.border}`,
  },
  summaryLabel: { fontSize: 6.5, color: COLORS.subText, marginBottom: 2, textAlign: 'center' },
  summaryValue: { fontSize: 13, fontWeight: 'bold', textAlign: 'center' },

  // ── Table ──
  tableWrapper: {
    border: `1px solid ${COLORS.border}`,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },

  // Header row
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.navy,
    minHeight: 24,
    alignItems: 'center',
  },
  th: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 7,
    paddingHorizontal: 3,
    paddingVertical: 5,
    textAlign: 'center',
    borderRight: '0.5px solid rgba(255,255,255,0.15)',
    letterSpacing: 0.2,
  },
  thLeft: { textAlign: 'left' },
  thRight: { textAlign: 'right' },
  thLast: { borderRight: 0 },

  // Data rows — wrap={false} prevents mid-row page breaks
  tableRow: {
    flexDirection: 'row',
    borderBottom: `0.5px solid ${COLORS.border}`,
    minHeight: 26,
    alignItems: 'stretch',
  },
  rowEven: { backgroundColor: COLORS.rowEven },
  rowOdd:  { backgroundColor: COLORS.rowOdd },

  // Cell base
  td: {
    fontSize: 7.5,
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRight: `0.5px solid ${COLORS.border}`,
    justifyContent: 'center',
  },
  tdLast:  { borderRight: 0 },
  tLeft:   { textAlign: 'left' },
  tCenter: { textAlign: 'center' },
  tRight:  { textAlign: 'right' },
  subText: { fontSize: 6.5, color: COLORS.subText, marginTop: 1 },
  monoText:{ fontFamily: 'Courier', letterSpacing: -0.3 },

  // Amount
  amtText: { fontSize: 8, fontWeight: 'bold', color: COLORS.green, textAlign: 'right' },

  // Method pills
  cashPill: {
    backgroundColor: COLORS.greenBg,
    color: COLORS.green,
    fontSize: 7,
    fontWeight: 'bold',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    textAlign: 'center',
  },
  onlinePill: {
    backgroundColor: COLORS.blueBg,
    color: COLORS.blue,
    fontSize: 7,
    fontWeight: 'bold',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    textAlign: 'center',
  },

  // Total row
  totalRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.totalBg,
    minHeight: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  totalCell: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },

  // ── Notice ──
  notice: {
    backgroundColor: '#fffde7',
    border: `1px solid #fde68a`,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  noticeText: {
    fontSize: 8,
    color: '#78350f',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 1.4,
  },

  // ── Footer (fixed, appears on every page) ──
  footer: {
    position: 'absolute',
    bottom: 14,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: `0.5px solid ${COLORS.gold}`,
    paddingTop: 4,
  },
  footerText: { fontSize: 6.5, color: '#9ca3af' },
  pageNum:    { fontSize: 6.5, color: '#9ca3af' },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt   = (n) => `₹${(n || 0).toLocaleString('hi-IN')}`;
const fmtD  = (d) => (d ? dayjs(d).format('DD/MM/YY') : '-');
const trunc = (s, n) => (!s ? '-' : s.length > n ? s.slice(0, n - 1) + '…' : s);

// ─── Reusable page header (shown on every page via fixed=true on wrapper) ──
const PageHeader = memo(({ programInfo, summary, currentDate, currentTime }) => (
  <View>
    {/* Decorative top strip */}
    <View style={S.topStrip}>
    {
      TrsutData.topTitle.map((item,index)=>(
        <Text key={index} style={S.topText}>{item}</Text>
      ))
    }
    </View>

    {/* Logo + title */}
    <View style={S.headerRow}>
      <Image src={TrsutData.logo} style={S.logo} />
      <View style={S.centerBlock}>
        <Text style={S.orgName}>{TrsutData.name}</Text>
        <Text style={S.orgCity}>{TrsutData.cityState}</Text>
        <Text style={S.orgAddr}>{TrsutData.address}</Text>
        <Text style={S.orgPhone}>{TrsutData.contact}</Text>
        <View style={S.reportBadge}>
          <Text style={S.reportBadgeText}>लेन-देन रिपोर्ट</Text>
        </View>
      </View>
      <Image src={TrsutData.logo} style={S.logo} />
    </View>

    {/* Info bar */}
    <View style={S.infoBar}>
      <View style={S.infoItem}>
        <Text style={S.infoLabel}>योजना:</Text>
        <Text style={S.infoValue}>{trunc(programInfo?.name || programInfo?.hiname || 'N/A', 28)}</Text>
      </View>
      <View style={S.infoItem}>
        <Text style={S.infoLabel}>तिथि:</Text>
        <Text style={S.infoValue}>{currentDate}  {currentTime}</Text>
      </View>
      <View style={S.infoItem}>
        <Text style={S.infoLabel}>कुल लेन-देन:</Text>
        <Text style={S.infoValue}>{summary.totalTransactions}</Text>
      </View>
      <View style={S.infoItem}>
        <Text style={S.infoLabel}>कुल राशि:</Text>
        <Text style={S.infoValue}>{fmt(summary.totalAmount)}</Text>
      </View>
    </View>
  </View>
));

// ─── Table column header row ──────────────────────────────────────────────────
const TableHead = memo(() => (
  <View style={S.tableHeader} fixed>
    <Text style={[S.th, { width: COL.no }]}>क्र.</Text>
    <Text style={[S.th, S.thLeft, { width: COL.trx }]}>TRX ID</Text>
    <Text style={[S.th, { width: COL.date }]}>तिथि</Text>
    <Text style={[S.th, S.thLeft, { width: COL.payer }]}>भुगतानकर्ता</Text>
    <Text style={[S.th, S.thLeft, { width: COL.benef }]}>लाभार्थी</Text>
    <Text style={[S.th, S.thRight, { width: COL.amount }]}>राशि (₹)</Text>
    <Text style={[S.th, { width: COL.method }]}>विधि</Text>
    <Text style={[S.th, S.thLeft, S.thLast, { width: COL.ref }]}>रेफरेंस / नोट</Text>
  </View>
));

// ─── Single data row — wrap={false} keeps row intact across pages ─────────────
const DataRow = memo(({ t, idx }) => {
  const isEven = idx % 2 === 0;
  return (
    <View style={[S.tableRow, isEven ? S.rowEven : S.rowOdd]} wrap={false}>
      {/* S.No */}
      <View style={[S.td, { width: COL.no, alignItems: 'center' }]}>
        <Text style={{ ...S.tCenter, fontSize: 7, color: '#9ca3af' }}>{idx + 1}</Text>
      </View>

      {/* TRX ID */}
      <View style={[S.td, { width: COL.trx }]}>
        <Text style={[S.monoText, { fontSize: 6.5, color: '#374151' }]}>
          {trunc(t.transactionNumber, 14)}
        </Text>
      </View>

      {/* Date */}
      <View style={[S.td, { width: COL.date }]}>
        <Text style={S.tCenter}>{fmtD(t.paymentDate)}</Text>
      </View>

      {/* Payer */}
      <View style={[S.td, { width: COL.payer }]}>
        <Text style={[S.tLeft, { fontWeight: 'bold', fontSize: 7.5 }]}>
          {trunc(t.payerName, 18)}
        </Text>
        {t.payerRegistrationNumber ? (
          <Text style={[S.subText, S.monoText]}>{t.payerRegistrationNumber}</Text>
        ) : null}
      </View>

      {/* Beneficiary */}
      <View style={[S.td, { width: COL.benef }]}>
        <Text style={[S.tLeft, { fontWeight: 'bold', fontSize: 7.5 }]}>
          {trunc(t.marriageMemberName, 18)}
        </Text>
        {t.marriageRegistrationNumber ? (
          <Text style={[S.subText, S.monoText]}>{t.marriageRegistrationNumber}</Text>
        ) : null}
      </View>

      {/* Amount */}
      <View style={[S.td, { width: COL.amount }]}>
        <Text style={S.amtText}>{fmt(t.amount)}</Text>
      </View>

      {/* Method pill */}
      <View style={[S.td, { width: COL.method, alignItems: 'center' }]}>
        <Text style={t.paymentMethod === 'cash' ? S.cashPill : S.onlinePill}>
          {t.paymentMethod === 'cash' ? 'नकद' : 'ऑनलाइन'}
        </Text>
      </View>

      {/* Reference / Note */}
      <View style={[S.td, S.tdLast, { width: COL.ref }]}>
        {t.onlineReference ? (
          <Text style={[S.tLeft, S.monoText, { fontSize: 7 }]}>
            {trunc(t.onlineReference, 16)}
          </Text>
        ) : null}
        {t.note ? (
          <Text style={[S.subText, { fontSize: 6.5 }]}>{trunc(t.note, 18)}</Text>
        ) : (!t.onlineReference ? <Text style={{ color: COLORS.subText, fontSize: 7 }}>—</Text> : null)}
      </View>
    </View>
  );
});

// ─── Main Document ────────────────────────────────────────────────────────────
const TransactionsReportPDF = ({
  transactions = [],
  summary,
  programInfo,
  filters,
  generatedDate,
}) => {
  const now         = new Date();
  const currentDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const cashTotal   = transactions.filter(t => t.paymentMethod === 'cash').reduce((s, t) => s + (t.amount || 0), 0);
  const onlineTotal = transactions.filter(t => t.paymentMethod !== 'cash').reduce((s, t) => s + (t.amount || 0), 0);
  const avg         = summary?.totalTransactions > 0 ? (summary.totalAmount / summary.totalTransactions) : 0;

  const getFilterText = () => {
    const parts = [];
    if (filters?.dateRange?.start && filters?.dateRange?.end)
      parts.push(`तिथि: ${filters.dateRange.start} – ${filters.dateRange.end}`);
    if (filters?.paymentMethod && filters.paymentMethod !== 'all')
      parts.push(`विधि: ${filters.paymentMethod === 'cash' ? 'नकद' : 'ऑनलाइन'}`);
    if (filters?.searchText)
      parts.push(`खोज: "${filters.searchText}"`);
    return parts.length ? `फ़िल्टर: ${parts.join('  |  ')}` : 'कोई फ़िल्टर नहीं — सभी लेन-देन';
  };

  return (
    <Document title="Transactions Report" author={TrsutData.name}>
      <Page size="A4" style={S.page}>
        <View style={S.outerBorder}>
          <View style={S.innerBorder}>

            {/* ── Header (repeated on each page via fixed) ── */}
            <PageHeader
              programInfo={programInfo}
              summary={summary}
              currentDate={currentDate}
              currentTime={currentTime}
            />

            {/* ── Filters ── */}
            <View style={S.filterBar}>
              <Text style={S.filterText}>{getFilterText()}</Text>
            </View>

            {/* ── Summary Cards ── */}
            <View style={S.summaryRow}>
              <View style={[S.summaryCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                <Text style={S.summaryLabel}>कुल लेन-देन</Text>
                <Text style={[S.summaryValue, { color: COLORS.blue }]}>{summary?.totalTransactions ?? 0}</Text>
              </View>
              <View style={[S.summaryCard, { backgroundColor: '#dcfce7', borderColor: '#86efac' }]}>
                <Text style={S.summaryLabel}>कुल राशि</Text>
                <Text style={[S.summaryValue, { color: COLORS.green, fontSize: 11 }]}>{fmt(summary?.totalAmount)}</Text>
              </View>
              <View style={[S.summaryCard, { backgroundColor: '#fef9c3', borderColor: '#fde68a' }]}>
                <Text style={S.summaryLabel}>नकद राशि</Text>
                <Text style={[S.summaryValue, { color: '#a16207', fontSize: 11 }]}>{fmt(cashTotal)}</Text>
              </View>
              <View style={[S.summaryCard, { backgroundColor: '#ede9fe', borderColor: '#c4b5fd' }]}>
                <Text style={S.summaryLabel}>ऑनलाइन राशि</Text>
                <Text style={[S.summaryValue, { color: '#6d28d9', fontSize: 11 }]}>{fmt(onlineTotal)}</Text>
              </View>
              <View style={[S.summaryCard, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
                <Text style={S.summaryLabel}>औसत राशि</Text>
                <Text style={[S.summaryValue, { color: '#c2410c', fontSize: 11 }]}>{fmt(avg)}</Text>
              </View>
            </View>

            {/* ── Table ── */}
            <View style={S.tableWrapper}>
              {/* Header row — fixed so it repeats on every page */}
              <TableHead />

              {/* Data rows — wrap={false} on each row prevents cutting */}
              {transactions.map((t, i) => (
                <DataRow key={t.id || i} t={t} idx={i} />
              ))}

              {/* ── Total row ── */}
              <View style={S.totalRow} wrap={false}>
                <View style={{ width: COL.no + COL.trx + COL.date + COL.payer + COL.benef }}>
                  <Text style={[S.totalCell, { textAlign: 'right', paddingRight: 6 }]}>कुल योग →</Text>
                </View>
                <View style={{ width: COL.amount }}>
                  <Text style={[S.totalCell, { textAlign: 'right', color: '#86efac' }]}>
                    {fmt(summary?.totalAmount)}
                  </Text>
                </View>
                <View style={{ width: COL.method + COL.ref }}>
                  <Text style={[S.totalCell, { textAlign: 'center', fontSize: 7, color: 'rgba(255,255,255,0.6)' }]}>
                    {summary?.totalTransactions} entries
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Notice ── */}
            <View style={S.notice}>
              <Text style={S.noticeText}>
                यह दान स्वेच्छिक रूप से दिया गया है और किसी भी कारणवश इसकी वापसी नहीं की जाएगी।
              </Text>
            </View>

          </View>
        </View>

        {/* ── Fixed footer — appears on every page ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>जनरेट: {generatedDate || `${currentDate} ${currentTime}`}</Text>
          <Text style={S.footerText}>{TrsutData.name} © {new Date().getFullYear()}</Text>
          <Text style={S.pageNum} render={({ pageNumber, totalPages }) => `पृष्ठ ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

export default memo(TransactionsReportPDF);