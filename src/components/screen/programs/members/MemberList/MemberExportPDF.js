'use client'
/**
 * MemberExportPDF
 * ─────────────────────────────────────────────────────────────────────────────
 * Print-ready HTML member report with full TrustData branding.
 *
 * Props
 *   open          boolean    – modal visibility
 *   onClose       () => void
 *   members       Member[]   – already-filtered array
 *   filterSummary string     – human-readable active-filter string
 *   programName   string     – program name shown in header
 *   trustData     object     – TrustData config (name, address, contact, logos…)
 *   pdfColors     object     – pdfColors config
 */

import React, { useRef, useEffect } from 'react';
import { Modal, Button, Tag } from 'antd';
import { PrinterOutlined, CloseOutlined, FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { pdfColors, TrsutData } from '@/lib/constentData';

// ── badge helpers (inline HTML strings) ───────────────────────────────────────
const feesBadge = (done) => done
    ? `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:700;
        background:#dcfce7;color:#166534;border:1px solid #86efac;">✓ Paid</span>`
    : `<span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:700;
        background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">⏳ Pending</span>`;

// ── main HTML builder ──────────────────────────────────────────────────────────
const buildPrintHTML = ({ members, filterSummary, programName, trustData, colors }) => {
    const now     = dayjs().format('DD/MM/YYYY hh:mm A');
    const total   = members.length;
    const paid    = members.filter(m => m.joinFeesDone).length;
    const pending = total - paid;
    const male    = members.filter(m => m.gender === 'male').length;
    const female  = members.filter(m => m.gender === 'female').length;

    // resolve logo – could be base64 string or URL
    const logoSrc = typeof trustData.logo === 'string' ? trustData.logo : '';
    const rightLogoSrc = typeof trustData.RightLogo === 'string' ? trustData.RightLogo : '';

    const topTitles = (trustData.topTitle || [])
        .map(t => `<div class="top-title">${t}</div>`).join('');

    const rows = members.map((m, i) => `
        <tr class="${i % 2 === 1 ? 'alt-row' : ''}">
            <td class="td-center td-num">${i + 1}</td>
            <td class="td-name">
                <div class="member-name">${m.displayName || '—'}</div>
                <div class="member-reg">${m.registrationNumber ? `# ${m.registrationNumber}` : ''}</div>
            </td>
            <td class="td">${m.fatherName || '—'}</td>
            <td class="td">${m.jati || '—'}</td>
            <td class="td">${m.phone || '—'}</td>
            <td class="td">${m.state || '—'}</td>
            <td class="td-center">${m.ageGroupRange || '—'}</td>
            <td class="td-center">${m.dateJoin || '—'}</td>
            <td class="td-center">${feesBadge(m.joinFeesDone)}</td>
        </tr>
    `).join('');

    const filterPills = filterSummary
        ? filterSummary.split(' · ').map(f => `<span class="f-pill">${f}</span>`).join('')
        : '';

    return `<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8"/>
<title>Member Report – ${trustData.name}</title>
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
   LETTERHEAD HEADER - IMPROVED
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
.lh-top-titles{
    display:flex;
    justify-content:center;
    gap:30px;
    margin-bottom:8px;
}
.top-title{
    font-size:13px;
    font-weight:600;
    color:${colors.headingColor};
    font-family:'Noto Sans Devanagari',sans-serif;
    letter-spacing:0.3px;
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
.lh-reg{
    font-size:10px;
    color:#9ca3af;
    margin-top:5px;
    font-style:italic;
}

/* ── report title bar - IMPROVED ── */
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

/* ── stat cards - IMPROVED ── */
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
    transition:all 0.2s;
}
.stat-label{
    font-size:10px;
    font-weight:700;
    text-transform:uppercase;
    letter-spacing:.07em;
    margin-bottom:5px;
}
.stat-value{
    font-size:30px;
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
.card-male   { border-color:#93c5fd; background: linear-gradient(135deg, #eff6ff 0%, #fff 100%); }
.card-male   .stat-label{ color:#1e40af; }
.card-male   .stat-value{ color:#1d4ed8; }
.card-female { border-color:#f9a8d4; background: linear-gradient(135deg, #fdf2f8 0%, #fff 100%); }
.card-female .stat-label{ color:#9d174d; }
.card-female .stat-value{ color:#be185d; }

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

/* ── table - IMPROVED with better spacing ── */
table{
    width:100%;
    border-collapse:collapse;
    font-size:11.5px;
    border:1px solid #e5e7eb;
    border-radius:10px;
    overflow:hidden;
    box-shadow:0 1px 3px rgba(0,0,0,0.05);
}
thead tr{
    background: linear-gradient(135deg, ${colors.schemeColor} 0%, ${colors.headingColor} 100%);
}
thead th{
    padding:10px 12px;
    text-align:left;
    font-size:10.5px;
    font-weight:700;
    text-transform:uppercase;
    letter-spacing:.06em;
    color:#fff;
    white-space:nowrap;
    border-right:1px solid rgba(255,255,255,0.15);
}
thead th:last-child{ border-right:none; }
.td,.td-center,.td-name,.td-num{
    padding:9px 12px;
    border-bottom:1px solid #f1f5f9;
    border-right:1px solid #f1f5f9;
    color:#374151;
    vertical-align:middle;
}
.td-center{ text-align:center; }
.td-num{ text-align:center; color:#9ca3af; font-size:11px; width:40px; font-weight:600; }
.td-name{ min-width:140px; }
.alt-row td{ background:#fafafa; }
tbody tr:hover td{ background:#fefce8; }
tbody tr:last-child td{ border-bottom:none; }
.member-name{ font-weight:700; font-size:12px; color:${colors.schemeColor}; }
.member-reg{ font-size:9.5px; color:#9ca3af; margin-top:2px; font-family:monospace; }

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
        margin:1cm 1.2cm; 
        size: A4 landscape;
    }
    thead{ display:table-header-group; }
    tr{ page-break-inside:avoid; }
    .letterhead{ break-after:avoid; }
    .stats-row{ break-after:avoid; }
    tbody tr:hover td{ background:transparent; }
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
        📋 MEMBER DIRECTORY REPORT
        ${programName ? `<span class="rt-program">${programName}</span>` : ''}
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
            <div class="stat-label">Fees Paid</div>
            <div class="stat-value">${paid}</div>
            <div class="stat-sub">${total ? Math.round(paid/total*100) : 0}% completion</div>
        </div>
        <div class="stat-card card-pend">
            <div class="stat-label">Fees Pending</div>
            <div class="stat-value">${pending}</div>
            <div class="stat-sub">${total ? Math.round(pending/total*100) : 0}% pending</div>
        </div>
        <div class="stat-card card-male">
            <div class="stat-label">Male Members</div>
            <div class="stat-value">${male}</div>
            <div class="stat-sub">${total ? Math.round(male/total*100) : 0}% of total</div>
        </div>
        <div class="stat-card card-female">
            <div class="stat-label">Female Members</div>
            <div class="stat-value">${female}</div>
            <div class="stat-sub">${total ? Math.round(female/total*100) : 0}% of total</div>
        </div>
    </div>

    <!-- Active filters -->
    ${filterPills ? `
    <div class="filter-bar">
        <strong>🔍 Active Filters:</strong>
        ${filterPills}
    </div>` : ''}

    <!-- Table - Removed Status, Gender, Created By columns -->
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Member Name / Reg. No</th>
                <th>Father's Name</th>
                <th>Surname/Caste</th>
                <th>Phone Number</th>
                <th>State</th>
                <th>Age Group</th>
                <th>Join Date</th>
                <th>Fee Status</th>
            </tr>
        </thead>
        <tbody>
            ${rows || '<tr><td colspan="9" style="text-align:center;padding:32px;color:#9ca3af;">📭 No records found</td></tr>'}
        </tbody>
    </table>

    <!-- Footer -->
    <div class="page-footer">
        <div class="pf-left">© ${trustData.name || ''}</div>
        <div class="pf-mid">🔒 Confidential - For Internal Use Only</div>
        <div class="pf-right">📄 Page 1 of 1</div>
    </div>

</div><!-- /body-content -->
</body>
</html>`;
};

// ── React component ────────────────────────────────────────────────────────────
const MemberExportPDF = ({
    open,
    onClose,
    members      = [],
    filterSummary= '',
    programName  = '',
    trustData    = TrsutData,
    colors       = pdfColors,
}) => {
    const iframeRef = useRef(null);

    // rebuild & inject HTML whenever the modal opens or data changes
    useEffect(() => {
        if (!open) return;
        // small tick to ensure iframe is mounted
        const timer = setTimeout(() => {
            const iframe = iframeRef.current;
            if (!iframe) return;
            const html = buildPrintHTML({ members, filterSummary, programName, trustData, colors });
            const doc  = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) return;
            doc.open();
            doc.write(html);
            doc.close();
        }, 80);
        return () => clearTimeout(timer);
    }, [open, members, filterSummary, programName, trustData, colors]);

    const handlePrint = () => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
    };

    const total   = members.length;
    const pending = members.filter(m => !m.joinFeesDone).length;

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
                    <span className="font-semibold text-gray-800">Export Member Report</span>
                    {programName && <Tag color="purple">{programName}</Tag>}
                    <Tag color="blue">{total} records</Tag>
                    {pending > 0 && <Tag color="red">{pending} fees pending</Tag>}
                </div>
            }
            footer={
                <div className="flex items-center justify-between px-1 py-0.5 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                        <FilePdfOutlined className="text-red-400" />
                        <span className="font-semibold text-gray-700">{total} members</span>
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
            {/* Grey surround so the white A4 "page" looks like a document preview */}
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
                        title="Member Report Preview"
                        src="about:blank"
                        style={{ width: '100%', height: '76vh', border: 'none', display: 'block' }}
                    />
                </div>
            </div>
        </Modal>
    );
};

export default MemberExportPDF;