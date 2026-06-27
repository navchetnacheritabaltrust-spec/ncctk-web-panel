'use client'
/**
 * JoinFeesExportPDF
 * ─────────────────────────────────────────────────────────────────────────────
 * Print-ready HTML report for Join Fees collection with full TrustData branding.
 */

import React, { useRef, useEffect } from 'react';
import { Modal, Button, Tag } from 'antd';
import { PrinterOutlined, CloseOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { pdfColors, TrsutData } from '@/lib/constentData';

// ── Safe number conversion helper ─────────────────────────────────────────────
const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
};

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (v) => `₹${toNumber(v).toLocaleString('en-IN')}`;

const isFullyPaid = (m) => {
    const paid = toNumber(m?.joinFeesPaidAmount);
    const total = toNumber(m?.joinFees);
    return paid >= total;
};

const getRemaining = (m) => {
    const paid = toNumber(m?.joinFeesPaidAmount);
    const total = toNumber(m?.joinFees);
    return Math.max(0, total - paid);
};

// ── badge helpers (inline HTML strings) ───────────────────────────────────────
const feesBadge = (member) => {
    const done = isFullyPaid(member);
    return done
        ? `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:700;
            background:#dcfce7;color:#166534;border:1px solid #86efac;">✓ Paid</span>`
        : `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:700;
            background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">⏳ Pending (${fmt(getRemaining(member))})</span>`;
};

// ── main HTML builder ──────────────────────────────────────────────────────────
const buildPrintHTML = ({ members, filterSummary, programName, agentData, totals, trustData, colors }) => {
    const now = dayjs().format('DD/MM/YYYY hh:mm A');
    const total = members.length;
    
    // Normalize all members data first
    const normalizedMembers = members.map(m => ({
        ...m,
        joinFees: toNumber(m?.joinFees),
        joinFeesPaidAmount: toNumber(m?.joinFeesPaidAmount),
        joinFeesRemainingAmount: toNumber(m?.joinFeesRemainingAmount)
    }));
    
    const paidCount = normalizedMembers.filter(m => isFullyPaid(m)).length;
    const pendingCount = total - paidCount;
    
    // Calculate totals with proper number conversion
    const totalFees = totals.totalFees || normalizedMembers.reduce((sum, m) => sum + toNumber(m.joinFees), 0);
    const totalPaid = totals.totalPaid || normalizedMembers.reduce((sum, m) => sum + toNumber(m.joinFeesPaidAmount), 0);
    const totalRemaining = totals.totalRemaining || normalizedMembers.reduce((sum, m) => sum + getRemaining(m), 0);
    const collectionPct = totalFees ? Math.round((totalPaid / totalFees) * 100) : 0;

    // resolve logo
    const rightLogoSrc = typeof trustData.RightLogo === 'string' ? trustData.RightLogo : '';

    const rows = normalizedMembers.map((m, i) => {
        const joinFees = toNumber(m.joinFees);
        const joinFeesPaidAmount = toNumber(m.joinFeesPaidAmount);
        const remaining = getRemaining(m);
        
        return `
        <tr class="${i % 2 === 1 ? 'alt-row' : ''}">
            <td class="td-center td-num">${i + 1}</td>
            <td class="td-name">
                <div class="member-name">${m.displayName || '—'}</div>
                <div class="member-reg">${m.registrationNumber ? `# ${m.registrationNumber}` : ''}</div>
            </td>
            <td class="td">${m.fatherName || '—'}</td>
            <td class="td">${m.village || '—'}</td>
            <td class="td">${m.phone || '—'}</td>
            <td class="td-center td-number">${fmt(joinFees)}</td>
            <td class="td-center td-number" style="color:#16a34a;font-weight:600;">${fmt(joinFeesPaidAmount)}</td>
            <td class="td-center td-number" style="color:#dc2626;font-weight:600;">${fmt(remaining)}</td>
            <td class="td-center">${feesBadge(m)}</td>
        </tr>
    `}).join('');

    const filterPills = filterSummary
        ? filterSummary.split(' · ').map(f => `<span class="f-pill">${f}</span>`).join('')
        : '';

    return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8"/>
<title>Join Fees Report – ${trustData.name}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');

*{margin:0;padding:0;box-sizing:border-box;}

body{
    font-family:'Inter','Noto Sans Devanagari',sans-serif;
    background:#fff;
    color:#1a0f5e;
    font-size:12px;
}

/* ══════════════════════════════════
   LETTERHEAD HEADER
══════════════════════════════════ */
.letterhead{
    border-bottom: 3px solid ${colors.borderColor};
    padding: 20px 28px 16px;
    position: relative;
    background: linear-gradient(to bottom, #ffffff 0%, #fefefe 100%);
}
.letterhead::before{
    content:'';
    position:absolute;
    top:0; left:0; right:0;
    height:4px;
    background: linear-gradient(90deg, ${colors.headingColor} 0%, ${colors.schemeColor} 50%, ${colors.headingColor} 100%);
}

.lh-inner{
    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:20px;
}
.lh-logo{
    flex-shrink:0;
    width:80px;
    height:80px;
    object-fit:contain;
}
.lh-logo-right{
    flex-shrink:0;
    width:70px;
    height:70px;
    object-fit:contain;
}
.lh-headerImg{
    width:100%;
    height:200px;
    object-fit:fill;
}
.lh-center{
    flex:1;
    text-align:center;
}
.lh-org-name{
    font-size:22px;
    font-weight:800;
    color:${colors.headingColor};
    font-family:'Noto Sans Devanagari',sans-serif;
    line-height:1.2;
    margin-bottom:6px;
    letter-spacing:-0.3px;
}
.lh-tagline{
    font-size:11px;
    color:${colors.schemeColor};
    font-weight:600;
    margin-bottom:8px;
    letter-spacing:0.5px;
}
.lh-address{
    font-size:10.5px;
    color:#4b5563;
    font-family:'Noto Sans Devanagari',sans-serif;
    line-height:1.4;
    max-width:600px;
    margin:0 auto 6px;
}
.lh-contact-row{
    display:flex;
    justify-content:center;
    align-items:center;
    gap:24px;
    flex-wrap:wrap;
    margin-top:6px;
}
.lh-contact-item{
    font-size:10.5px;
    color:${colors.schemeColor};
    display:flex;
    align-items:center;
    gap:5px;
}
.lh-contact-item span.label{
    font-weight:700;
    color:${colors.headingColor};
}

/* ── report title bar ── */
.report-title-bar{
    background: linear-gradient(135deg, ${colors.schemeColor} 0%, ${colors.headingColor} 100%);
    color:#fff;
    padding:12px 28px;
    display:flex;
    align-items:center;
    justify-content:space-between;
}
.report-title-bar .rt-left{
    font-size:15px;
    font-weight:700;
    letter-spacing:0.5px;
    display:flex;
    align-items:center;
    gap:12px;
}
.report-title-bar .rt-right{
    font-size:11px;
    opacity:0.9;
    font-weight:500;
}
.rt-program{
    background:rgba(255,255,255,0.2);
    border-radius:20px;
    padding:3px 12px;
    font-size:11px;
    font-weight:600;
}

/* ── body padding ── */
.body-content{
    padding:20px 28px 24px;
}

/* ── stat cards ── */
.stats-row{
    display:flex;
    gap:12px;
    margin-bottom:20px;
}
.stat-card{
    flex:1;
    border-radius:12px;
    padding:12px 16px;
    border:1.5px solid;
}
.stat-label{
    font-size:10px;
    font-weight:700;
    text-transform:uppercase;
    letter-spacing:.07em;
    margin-bottom:5px;
}
.stat-value{
    font-size:28px;
    font-weight:800;
    line-height:1;
}
.stat-sub{
    font-size:10px;
    margin-top:4px;
    opacity:0.7;
}
.card-total  { border-color:${colors.borderColor}; background: linear-gradient(135deg, #fff0f6 0%, #fff 100%); }
.card-total  .stat-label{ color:${colors.headingColor}; }
.card-total  .stat-value{ color:${colors.headingColor}; }
.card-paid   { border-color:#86efac; background: linear-gradient(135deg, #f0fdf4 0%, #fff 100%); }
.card-paid   .stat-label{ color:#166534; }
.card-paid   .stat-value{ color:#16a34a; }
.card-pend   { border-color:#fca5a5; background: linear-gradient(135deg, #fef2f2 0%, #fff 100%); }
.card-pend   .stat-label{ color:#991b1b; }
.card-pend   .stat-value{ color:#dc2626; }
.card-collected { border-color:#93c5fd; background: linear-gradient(135deg, #eff6ff 0%, #fff 100%); }
.card-collected .stat-label{ color:#1e40af; }
.card-collected .stat-value{ color:#1d4ed8; }
.card-remaining { border-color:#f9a8d4; background: linear-gradient(135deg, #fdf2f8 0%, #fff 100%); }
.card-remaining .stat-label{ color:#9d174d; }
.card-remaining .stat-value{ color:#be185d; }

/* Collection progress */
.collection-progress{
    margin-bottom:20px;
    padding:12px 16px;
    background:#f8fafc;
    border-radius:10px;
    border-left:4px solid ${colors.schemeColor};
}
.progress-bar-container{
    display:flex;
    align-items:center;
    gap:12px;
}
.progress-label{
    font-size:12px;
    font-weight:600;
    color:${colors.headingColor};
    white-space:nowrap;
}
.progress-bar-bg{
    flex:1;
    height:8px;
    border-radius:99px;
    background:#e5e7eb;
    overflow:hidden;
}
.progress-bar-fill{
    height:100%;
    background:linear-gradient(90deg, #22c55e, #16a34a);
    border-radius:99px;
    transition:width 0.4s;
}
.progress-percentage{
    font-size:12px;
    font-weight:700;
    color:#16a34a;
    white-space:nowrap;
}

/* ── filter bar ── */
.filter-bar{
    display:flex;
    align-items:center;
    gap:8px;
    flex-wrap:wrap;
    background:#f8fafc;
    border:1px solid #e2e8f0;
    border-left:4px solid ${colors.borderColor};
    border-radius:0 8px 8px 0;
    padding:8px 14px;
    margin-bottom:20px;
    font-size:11px;
    color:#475569;
}
.filter-bar strong{ color:${colors.headingColor}; margin-right:6px; font-size:11px; }
.f-pill{
    display:inline-block;
    padding:2px 10px;
    border-radius:20px;
    background:#fce7f3;
    color:${colors.headingColor};
    font-size:10.5px;
    font-weight:700;
    border:1px solid ${colors.borderColor};
}

/* ── table ── */
table{
    width:100%;
    border-collapse:collapse;
    font-size:11px;
    border:1px solid #e5e7eb;
    border-radius:10px;
    overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,0.05);
}
thead tr{
    background: linear-gradient(135deg, ${colors.schemeColor} 0%, ${colors.headingColor} 100%);
}
thead th{
    padding:10px 10px;
    text-align:left;
    font-size:10px;
    font-weight:700;
    text-transform:uppercase;
    letter-spacing:.06em;
    color:#fff;
    white-space:nowrap;
    border-right:1px solid rgba(255,255,255,0.15);
}
thead th:last-child{ border-right:none; }
.td,.td-center,.td-name,.td-num{
    padding:8px 10px;
    border-bottom:1px solid #f1f5f9;
    border-right:1px solid #f1f5f9;
    color:#374151;
    vertical-align:middle;
}
.td-center{ text-align:center; }
.td-number{ text-align:right; }
.td-num{ text-align:center; color:#9ca3af; font-size:11px; width:40px; font-weight:600; }
.td-name{ min-width:140px; }
.alt-row td{ background:#fafafa; }
tbody tr:hover td{ background:#fefce8; }
tbody tr:last-child td{ border-bottom:none; }
.member-name{ font-weight:700; font-size:12px; color:${colors.schemeColor}; }
.member-reg{ font-size:9.5px; color:#9ca3af; margin-top:2px; font-family:monospace; }

/* Table summary - Grand Total */
.table-grand-total{
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    font-weight:700;
    border-top:2px solid ${colors.schemeColor};
    border-bottom:1px solid #e5e7eb;
}
.table-grand-total td{
    padding:10px 10px;
    font-size:12px;
}
.grand-total-label{
    text-align:right;
    font-weight:700;
    color:${colors.headingColor};
    text-transform:uppercase;
    font-size:11px;
    letter-spacing:0.5px;
}
.grand-total-value{
    font-weight:800;
    font-size:13px;
}
.grand-total-value-paid{
    color:#16a34a;
}
.grand-total-value-remaining{
    color:#dc2626;
}

/* ── page footer ── */
.page-footer{
    margin-top:24px;
    padding-top:12px;
    border-top:2px solid ${colors.borderColor};
    display:flex;
    justify-content:space-between;
    align-items:center;
    font-size:10px;
}
.pf-left{ color:${colors.headingColor}; font-weight:700; }
.pf-mid{ color:#9ca3af; font-size:9px; }
.pf-right{ color:${colors.schemeColor}; font-weight:600; }

/* ══════════════════════════════════
   PRINT RULES
══════════════════════════════════ */
@media print{
    body{ font-size:11px; }
    .no-print{ display:none!important; }
    @page{ 
        margin:0.8cm 1cm; 
        size: A4 landscape;
    }
    thead{ display:table-header-group; }
    tr{ page-break-inside:avoid; }
    .letterhead{ break-after:avoid; }
    .stats-row{ break-after:avoid; }
    tbody tr:hover td{ background:transparent; }
    .table-grand-total{
        background: #f0f9ff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
}
</style>
</head>
<body>

<!-- ══ LETTERHEAD ══════════════════════════════════════════════════ -->
<div class="letterhead">
    <div class="lh-inner">
        <img src="${TrsutData.headerImg}" class="lh-headerImg" alt="Organization Logo"/>
        ${rightLogoSrc ? `<img src="${rightLogoSrc}" class="lh-logo-right" alt="Right Logo"/>` : '<div style="width:70px"></div>'}
    </div>
</div>

<!-- ══ REPORT TITLE BAR ════════════════════════════════════════════ -->
<div class="report-title-bar">
    <div class="rt-left">
        💰 JOIN FEES COLLECTION REPORT
        ${programName ? `<span class="rt-program">${programName}</span>` : ''}
        ${agentData ? `<span class="rt-program" style="background:rgba(255,255,255,0.15)">👤 ${agentData.displayName || agentData.name}</span>` : ''}
    </div>
    <div class="rt-right">📅 Generated: ${now} &nbsp;|&nbsp; 👥 Total: ${total} members</div>
</div>

<!-- ══ BODY ════════════════════════════════════════════════════════ -->
<div class="body-content">

    <!-- Stat cards -->
    <div class="stats-row">
        <div class="stat-card card-total">
            <div class="stat-label">Total Members</div>
            <div class="stat-value">${total}</div>
            <div class="stat-sub">in this report</div>
        </div>
        <div class="stat-card card-paid">
            <div class="stat-label">Fully Paid</div>
            <div class="stat-value">${paidCount}</div>
            <div class="stat-sub">${total ? Math.round(paidCount/total*100) : 0}% of total</div>
        </div>
        <div class="stat-card card-pend">
            <div class="stat-label">Pending</div>
            <div class="stat-value">${pendingCount}</div>
            <div class="stat-sub">${total ? Math.round(pendingCount/total*100) : 0}% pending</div>
        </div>
        <div class="stat-card card-collected">
            <div class="stat-label">Total Collected</div>
            <div class="stat-value">${fmt(totalPaid)}</div>
            <div class="stat-sub">of ${fmt(totalFees)}</div>
        </div>
        <div class="stat-card card-remaining">
            <div class="stat-label">Remaining</div>
            <div class="stat-value">${fmt(totalRemaining)}</div>
            <div class="stat-sub">yet to collect</div>
        </div>
    </div>

    <!-- Collection progress bar -->
    <div class="collection-progress">
        <div class="progress-bar-container">
            <span class="progress-label">📊 Collection Progress</span>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${collectionPct}%;"></div>
            </div>
            <span class="progress-percentage">${collectionPct}%</span>
        </div>
    </div>

    <!-- Active filters -->
    ${filterPills ? `
    <div class="filter-bar">
        <strong>🔍 Active Filters:</strong>
        ${filterPills}
    </div>` : ''}

    <!-- Table -->
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Member Name / Reg. No</th>
                <th>Father's Name</th>
                <th>Village</th>
                <th>Phone</th>
                <th>Total Fees</th>
                <th>Paid Amount</th>
                <th>Remaining</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
            ${rows || '<tr><td colspan="9" style="text-align:center;padding:32px;color:#9ca3af;">📭 No records found</td></tr>'}
        </tbody>
        <tfoot>
            <tr class="table-grand-total">
                <td colspan="5" class="grand-total-label">GRAND TOTAL (All ${total} Members):</td>
                <td class="td-number grand-total-value">${fmt(totalFees)}</td>
                <td class="td-number grand-total-value grand-total-value-paid">${fmt(totalPaid)}</td>
                <td class="td-number grand-total-value grand-total-value-remaining">${fmt(totalRemaining)}</td>
                <td class="td-center"></td>
            </tr>
        </tfoot>
    </table>

    <!-- Footer -->
    <div class="page-footer">
        <div class="pf-left">© ${trustData.name || ''}</div>
        <div class="pf-mid">🔒 Confidential - Join Fees Collection Report</div>
        <div class="pf-right">📄 End of Report</div>
    </div>

</div><!-- /body-content -->
</body>
</html>`;
};

// ── React component ────────────────────────────────────────────────────────────
const JoinFeesExportPDF = ({
    open,
    onClose,
    members = [],
    filterSummary = '',
    programName = '',
    agentData = null,
    totals = {},
    trustData = TrsutData,
    colors = pdfColors,
}) => {
    const iframeRef = useRef(null);

    // rebuild & inject HTML whenever the modal opens or data changes
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            const iframe = iframeRef.current;
            if (!iframe) return;
            const html = buildPrintHTML({ members, filterSummary, programName, agentData, totals, trustData, colors });
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) return;
            doc.open();
            doc.write(html);
            doc.close();
        }, 80);
        return () => clearTimeout(timer);
    }, [open, members, filterSummary, programName, agentData, totals, trustData, colors]);

    const handlePrint = () => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    };

    const total = members.length;
    const pendingCount = members.filter(m => !isFullyPaid(m)).length;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            width="92vw"
            style={{ top: 16, maxWidth: 1280 }}
            styles={{ body: { padding: 0 }, header: { paddingBottom: 12 } }}
            destroyOnClose
            title={
                <div className="flex items-center gap-2 flex-wrap">
                    <FilePdfOutlined className="text-red-500 text-lg" />
                    <span className="font-semibold text-gray-800">Export Join Fees Report</span>
                    {programName && <Tag color="purple">{programName}</Tag>}
                    {agentData && <Tag color="cyan">{agentData.displayName || agentData.name}</Tag>}
                    <Tag color="blue">{total} members</Tag>
                    {pendingCount > 0 && <Tag color="red">{pendingCount} pending</Tag>}
                </div>
            }
            footer={
                <div className="flex items-center justify-between px-1 py-0.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                        <FilePdfOutlined className="text-red-400" />
                        <span className="font-semibold text-gray-700">{total} members</span>
                        <span className="text-gray-400">·</span>
                        <span className="font-semibold text-green-600">{fmt(totals.totalPaid || 0)} collected</span>
                        {filterSummary && (
                            <>
                                <span className="text-gray-400">·</span>
                                <span className="text-blue-600">{filterSummary}</span>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button icon={<CloseOutlined />} onClick={onClose}>
                            Close
                        </Button>
                        <Button
                            type="primary"
                            icon={<PrinterOutlined />}
                            onClick={handlePrint}
                            className="bg-blue-700 hover:bg-blue-800 border-blue-700"
                        >
                            Print / Save as PDF
                        </Button>
                    </div>
                </div>
            }
        >
            <div
                className="bg-gray-200 border-t border-gray-300"
                style={{ height: '80vh', overflowY: 'auto', padding: '12px' }}
            >
                <div style={{
                    background: '#fff',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.14)',
                    borderRadius: 4,
                    minHeight: '100%',
                }}>
                    <iframe
                        ref={iframeRef}
                        title="Join Fees Report Preview"
                        src="about:blank"
                        style={{ width: '100%', height: '76vh', border: 'none', display: 'block' }}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default JoinFeesExportPDF;