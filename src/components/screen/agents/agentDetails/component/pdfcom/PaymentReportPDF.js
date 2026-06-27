// PaymentStatusPDF.js - IMPROVED VERSION with fixed 15 rows, empty rows, proper total
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image
} from '@react-pdf/renderer';
import NotoSansDevanagari from '@/app/api/helperfile/static/font/NotoSansDevanagari';
import NotoSansDevanagariBold from '@/app/api/helperfile/static/font/NotoSansDevanagariBold';
import { pdfColors, TrsutData } from '@/lib/constentData';
import PdfHeaderCom from './HeaderCom';

Font.register({
  family: 'NotoSansDevanagari',
  fonts: [
    { src: NotoSansDevanagari, fontWeight: 'normal' },
    { src: NotoSansDevanagariBold, fontWeight: 'bold' },
  ]
});

const ROWS_PER_PAGE = 15;

const styles = StyleSheet.create({
  page: {
    backgroundColor:pdfColors.bgColor,
    fontFamily: 'NotoSansDevanagari',
    padding: 14,
    fontSize: 10,
  },
  outerBorder: {
    border: `2px solid ${pdfColors.borderColor}`,
    padding: 5,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  innerBorder: {
    border: `1px solid ${pdfColors.borderColor}`,
    padding: 8,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },

  // ─── Header ───
  topText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  smallText: {
    fontSize: 9,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  logoImage: { width: 85, height: 85 },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  mainTitle: {
    fontSize: 24,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subTitle: {
    fontSize: 15,
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  address: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
    marginBottom: 2,
  },
  phoneNumbers: {
    fontSize: 11,
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  schemeBox: {
    backgroundColor: pdfColors.schemeColor,
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 12,
  },
  schemeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },

  // ─── Agent Info Bar ───
  agentInfoSection: {
    backgroundColor: '#f0f4ff',
    padding: 6,
    marginBottom: 7,
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    borderLeft: '3px solid #8B0000',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 11,
    color: '#8B0000',
    fontWeight: 'bold',
    marginRight: 3,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a0f5e',
  },

  // ─── Member Card ───
  memberCard: {
    flexDirection: 'row',
    backgroundColor: '#fff8f8',
    marginBottom: 7,
    borderRadius: 4,
    border: '1.5px solid #d4af37',
    overflow: 'hidden',
  },
  memberPhotoBox: {
    width: 70,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRight: '1px solid #d4af37',
    padding: 5,
  },
  memberPhotoImg: {
    width: 60,
    height: 65,
    borderRadius: 3,
  },
  memberPhotoPlaceholder: {
    width: 60,
    height: 65,
    backgroundColor: '#e8e8e8',
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    border: '1px dashed #bbb',
  },
  memberPhotoText: {
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
  memberDetails: {
    flex: 1,
    padding: 7,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingBottom: 4,
    borderBottom: '1px solid #f0d9a0',
  },
  memberName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8B0000',
  },
  memberRegBadge: {
    backgroundColor: '#1a0f5e',
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  memberRegText: {
    fontSize: 8,
    color: '#fff',
    fontWeight: 'bold',
  },
  memberInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 5,
  },
  memberInfoGridItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  memberInfoLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#555',
    marginRight: 3,
    minWidth: 40,
  },
  memberInfoValue: {
    fontSize: 11,
    color: '#1a0f5e',
    fontWeight: 'bold',
  },
  memberStatsRow: {
    flexDirection: 'row',
    backgroundColor: pdfColors.schemeColor,
    borderRadius: 3,
    padding: 5,
    justifyContent: 'space-around',
  },
  memberStatItem: {
    alignItems: 'center',
  },
  memberStatLabel: {
    fontSize: 7.5,
    color: '#ffccc7',
    marginBottom: 1,
  },
  memberStatValue: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },

  // ─── Table Section Title ───
  tableSectionTitle: {
    fontSize: 10,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginBottom: 4,
    paddingBottom: 3,
    borderBottom: `1.5px solid ${pdfColors.borderColor}`,
    textAlign: 'center',
  },

  // ─── Table ───
  tableWrapper: {
    flex: 1,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: pdfColors.borderColor,
    marginBottom: 4,
  },

  // Table Header — taller, more readable
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.schemeColor,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 22,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  tableRowAlt: { backgroundColor: '#fdf6f0' },
  tableRowEmpty: { backgroundColor: '#fdfdfd' },

  tableCell: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 9,
    borderRightWidth: 0.5,
    borderRightColor: '#d9d9d9',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // Header cells — larger font, more padding, clear labels
  tableHeaderCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Column widths
  colSerial:       { width: '5%',  alignItems: 'center' },
  colMarriageName: { width: '20%', alignItems: 'flex-start' },
  colFatherName:   { width: '18%', alignItems: 'flex-start' },
  colRegNo:        { width: '10%', alignItems: 'center' },
  colDate:         { width: '10%', alignItems: 'center' },
  colPhone:        { width: '12%', alignItems: 'center' },
  colVillage:      { width: '15%', alignItems: 'center' },
  colAmount:       { width: '8%', alignItems: 'flex-end' },

  textLeft:   { textAlign: 'left' },
  textCenter: { textAlign: 'center' },
  textRight:  { textAlign: 'right' },

  // Data text — slightly bigger than before
  dataText:       { fontSize: 9, lineHeight: 1.2 },
  dataBoldText:   { fontSize: 9, fontWeight: 'bold', lineHeight: 1.2 },
  emptyTableText: { fontSize: 8, color: '#e8e8e8' },

  // Total Row
  totalRow: {
    flexDirection: 'row',
    backgroundColor: pdfColors.schemeColor,
    minHeight: 24,
    alignItems: 'center',
  },
  totalCell: {
    padding: 5,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
  },

  // ─── Notice — fixed at bottom ───
  noticeSection: {
    marginTop: 'auto',
    marginBottom: 10,         // leave room for footer
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#fff8e1',
    border: `1px solid ${pdfColors.borderColor}`,
    borderRadius: 3,
  },
  noticeText: {
    fontSize: 11,
    color: '#5d4037',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 1.4,
  },

  // ─── Footer ───
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 8,
    color: '#8c8c8c',
    borderTop: `0.5px solid ${pdfColors.borderColor}`,
    paddingTop: 4,
  },
  footerLeft:   { flex: 1 },
  footerCenter: { flex: 1, textAlign: 'center' },
  footerRight:  { flex: 1, textAlign: 'right' },

  // No Data
  noDataBox: {
    padding: 30,
    textAlign: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 4,
    border: '1px dashed #d9d9d9',
  },
  noDataText: { fontSize: 11, color: '#8c8c8c' },

  // ─── Summary Page ───
  summaryPage: {
    backgroundColor: '#ffffff',
    fontFamily: 'NotoSansDevanagari',
    padding: 20,
    fontSize: 10,
  },
  summaryHeader: {
    fontSize: 16,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  summarySection: { marginBottom: 15 },
  summaryTitle: {
    fontSize: 12,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottom: `1px solid ${pdfColors.borderColor}`,
    paddingBottom: 4,
  },
  summaryInfoRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  summaryInfoLabel: {
    width: '40%',
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryInfoValue: {
    width: '60%',
    fontSize: 10,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
  },
  grandTotalBox: {
    backgroundColor: pdfColors.schemeColor,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  grandTotalText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  regCinText:{
    fontSize: 7.8,
    color: '#333',
      fontWeight: 'bold',
      letterSpacing: 0.2,
        marginBottom: 3,
  },
  headerImg: {
    width: '100%',
    height: 110,
    objectFit: 'fill',
    },
});

const PaymentStatusPDF = ({
  data = [],
  summary = {},
  agentInfo = {},
  programInfo = {},
  filters = {}
}) => {
  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });

  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return `₹${num.toLocaleString('hi-IN')}`;
  };

  const calculateMemberStats = (member) => {
    if (!member.marriages || member.marriages.length === 0) {
      return { pendingMarriages: [], totalMarriages: 0, pendingCount: 0, pendingAmount: 0, totalAmount: 0 };
    }
    const totalMarriages = member.marriages.length;
    const pendingMarriages = member.marriages.filter(m => m.status === 'pending');
    const totalAmount = member.marriages.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
    return {
      pendingMarriages,
      totalMarriages,
      pendingCount: pendingMarriages.length,
      pendingAmount: pendingMarriages.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0),
      totalAmount
    };
  };

  const membersWithPending = data.filter(member => {
    const stats = calculateMemberStats(member);
    return stats.pendingCount > 0;
  });

  const calculateOverallTotals = () => {
    let totalPendingMarriages = 0, totalPendingAmount = 0, totalAllMarriages = 0, totalAllAmount = 0;
    membersWithPending.forEach(member => {
      const stats = calculateMemberStats(member);
      totalPendingMarriages += stats.pendingCount;
      totalPendingAmount += stats.pendingAmount;
      totalAllMarriages += stats.totalMarriages;
      totalAllAmount += stats.totalAmount;
    });
    return {
      totalPendingMarriages, totalPendingAmount, totalAllMarriages, totalAllAmount,
      paidMarriages: totalAllMarriages - totalPendingMarriages,
      paidAmount: totalAllAmount - totalPendingAmount
    };
  };

  const overallTotals = calculateOverallTotals();

  // ─── Page Header ───
  const renderPageHeader = () => (
    <>
 
      <View style={styles.headerSection}>
        <Image src={TrsutData.headerImg} style={styles.headerImg} />
        {/* <Image src={TrsutData.logo} style={styles.logoImage} />
        <View style={styles.centerContent}>
          <Text style={styles.mainTitle}>{TrsutData.name}</Text>
          {
            TrsutData.cityState &&  <Text style={styles.subTitle}>{TrsutData.cityState}</Text>
          }
         {
            TrsutData.regNo &&   <Text style={styles.regCinText}>
                                           {TrsutData.regNo}
                                          </Text>
         }
          
          <Text style={styles.address}>{TrsutData.address}</Text>
          <Text style={styles.phoneNumbers}>{TrsutData.contact}</Text>
          <View style={styles.schemeBox}>
            <Text style={styles.schemeText}>बकाया भुगतान रिपोर्ट</Text>
          </View>
        </View>
        <Image src={TrsutData.logo} style={[styles.logoImage, { width: 100 }]} /> */}
      </View>
      <View style={styles.agentInfoSection}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>एजेंट:</Text>
          <Text style={styles.infoValue}>{agentInfo?.agentName || agentInfo?.displayName || 'N/A'} ({agentInfo.phone || ''})</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>योजना:</Text>
          <Text style={styles.infoValue}>{programInfo?.name || programInfo?.hiname || 'N/A'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>दिनांक:</Text>
          <Text style={styles.infoValue}>{currentDate}</Text>
        </View>
      </View>
    </>
  );

  // ─── Member Card ───
  const renderMemberCard = (member, stats) => (
    <View style={styles.memberCard}>
      <View style={styles.memberPhotoBox}>
        {member.photoURL ? (
          <Image src={member.photoURL} style={styles.memberPhotoImg} />
        ) : (
          <View style={styles.memberPhotoPlaceholder}>
            <Text style={styles.memberPhotoText}>{'फोटो\nनहीं'}</Text>
          </View>
        )}
      </View>
      <View style={styles.memberDetails}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>
            {member.displayName} {member.surname || ''}
          </Text>
          <View style={styles.memberRegBadge}>
            <Text style={styles.memberRegText}>रजि. {member.registrationNumber || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.memberInfoGrid}>
          <View style={styles.memberInfoGridItem}>
            <Text style={styles.memberInfoLabel}>पिता/पति:</Text>
            <Text style={styles.memberInfoValue}>{member.fatherName || 'N/A'}</Text>
          </View>
          <View style={styles.memberInfoGridItem}>
            <Text style={styles.memberInfoLabel}>फोन:</Text>
            <Text style={styles.memberInfoValue}>{member.phone || 'N/A'}</Text>
          </View>
          <View style={styles.memberInfoGridItem}>
            <Text style={styles.memberInfoLabel}>गाँव:</Text>
            <Text style={styles.memberInfoValue}>{member.village || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.memberStatsRow}>
          <View style={styles.memberStatItem}>
            <Text style={styles.memberStatLabel}>कुल समापन</Text>
            <Text style={styles.memberStatValue}>{stats.totalMarriages}</Text>
          </View>
          <View style={styles.memberStatItem}>
            <Text style={styles.memberStatLabel}>बकाया समापन</Text>
            <Text style={styles.memberStatValue}>{stats.pendingCount}</Text>
          </View>
          <View style={styles.memberStatItem}>
            <Text style={styles.memberStatLabel}>बकाया राशि</Text>
            <Text style={styles.memberStatValue}>{formatCurrency(stats.pendingAmount)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // ─── Marriage Table — improved header readability, fills space ───
  const renderMarriageTable = (marriages, startIndex, showTotal, memberStats) => {
    const fillerCount = Math.max(0, ROWS_PER_PAGE - marriages.length);

    return (
      <View style={styles.table}>
        {/* ── Table Header ── */}
        <View style={styles.tableHeader}>
          <View style={[styles.tableHeaderCell, styles.colSerial]}>
            <Text style={styles.textCenter}>क्र.</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colMarriageName]}>
            <Text style={styles.textLeft}>नाम</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colFatherName]}>
            <Text style={styles.textLeft}>पिता / पति</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colRegNo]}>
            <Text style={styles.textCenter}>रजि. नं.</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colDate]}>
            <Text style={styles.textCenter}>तिथि</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colPhone]}>
            <Text style={styles.textCenter}>फोन नं.</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colVillage]}>
            <Text style={styles.textCenter}>गाँव</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colAmount, { borderRightWidth: 0 }]}>
            <Text style={styles.textRight}>राशि (₹)</Text>
          </View>
        </View>

        {/* ── Data Rows ── */}
        {marriages.map((marriage, index) => (
          <View
            key={marriage.paymentId || index}
            style={[styles.tableRow, (startIndex + index) % 2 === 1 && styles.tableRowAlt]}
          >
            <View style={[styles.tableCell, styles.colSerial]}>
              <Text style={[styles.textCenter, styles.dataText]}>{startIndex + index + 1}</Text>
            </View>
            <View style={[styles.tableCell, styles.colMarriageName]}>
              <Text style={[styles.textLeft, styles.dataBoldText]}>{marriage.paymentFor || '-'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colFatherName]}>
              <Text style={[styles.textLeft, styles.dataText]}>{marriage.closingFatherName || '-'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colRegNo]}>
              <Text style={[styles.textCenter, styles.dataText]}>{marriage.closingRegNo || '-'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colDate]}>
              <Text style={[styles.textCenter, styles.dataText]}>{marriage.marriageDate || '-'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colPhone]}>
              <Text style={[styles.textCenter, styles.dataText]}>{marriage.closingPhone || '-'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colVillage]}>
              <Text style={[styles.textCenter, styles.dataText]}>{marriage.closingVillage || '-'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colAmount, { borderRightWidth: 0 }]}>
              <Text style={[styles.textRight, styles.dataBoldText, { color: '#cf1322' }]}>
                {formatCurrency(marriage.amount)}
              </Text>
            </View>
          </View>
        ))}

        {/* ── Empty Filler Rows ── */}
        {Array.from({ length: fillerCount }).map((_, i) => (
          <View
            key={`empty-${i}`}
            style={[styles.tableRow, (startIndex + marriages.length + i) % 2 === 1 && styles.tableRowAlt, styles.tableRowEmpty]}
          >
            <View style={[styles.tableCell, styles.colSerial]}>
              <Text style={[styles.textCenter, styles.emptyTableText]}>—</Text>
            </View>
            {['colMarriageName','colFatherName','colRegNo','colDate','colPhone','colVillage'].map((col, ci) => (
              <View key={ci} style={[styles.tableCell, styles[col]]}>
                <Text style={styles.emptyTableText}> </Text>
              </View>
            ))}
            <View style={[styles.tableCell, styles.colAmount, { borderRightWidth: 0 }]}>
              <Text style={styles.emptyTableText}> </Text>
            </View>
          </View>
        ))}

        {/* ── Total Row ── */}
        {showTotal && memberStats && (
          <View style={styles.totalRow}>
            <View style={[styles.totalCell, { width: '88%', paddingLeft: 10 }]}>
              <Text style={{ fontSize: 9, color: '#fff', fontWeight: 'bold' }}>
                कुल बकाया ({memberStats.pendingCount} समापन) — इस पृष्ठ पर {marriages.length} रिकॉर्ड
              </Text>
            </View>
            <View style={[styles.totalCell, {
              width: '12%',
              borderRightWidth: 0,
              backgroundColor: '#8B0000',
              alignItems: 'flex-end',
              paddingRight: 8,
            }]}>
              <Text style={{ fontSize: 10, color: '#fff', fontWeight: 'bold' }}>
                {formatCurrency(memberStats.pendingAmount)}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  // ─── Empty State ───
  if (!membersWithPending || membersWithPending.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={[styles.outerBorder]}>
            <View style={styles.innerBorder}>
              <PdfHeaderCom/>
              <View style={styles.noDataBox}>
                <Text style={[styles.noDataText, { fontSize: 13, marginBottom: 6, fontWeight: 'bold' }]}>
                  कोई बकाया भुगतान नहीं है
                </Text>
                <Text style={styles.noDataText}>
                  इस एजेंट के लिए कोई बकाया भुगतान रिकॉर्ड नहीं मिला
                </Text>
              </View>

              {/* Notice pushed to bottom */}
              <View style={styles.noticeSection}>
                <Text style={styles.noticeText}>
                  यह दान स्वेच्छिक रूप से दिया गया है और किसी भी कारणवश इसकी वापसी नहीं की जाएगी।
                </Text>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerLeft}>जनरेट: {currentDate} {currentTime}</Text>
                <Text style={styles.footerCenter}>{TrsutData.name || 'N/A'} © 2026</Text>
                <Text style={styles.footerRight}>एजेंट ID: {agentInfo?.agentId || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  // ─── Build All Pages ───
  const allPages = [];
  let globalPageNumber = 0;

  membersWithPending.forEach((member) => {
    const stats = calculateMemberStats(member);
    const pendingMarriages = stats.pendingMarriages;

    const chunks = [];
    for (let i = 0; i < pendingMarriages.length; i += ROWS_PER_PAGE) {
      chunks.push(pendingMarriages.slice(i, i + ROWS_PER_PAGE));
    }
    if (chunks.length === 0) chunks.push([]);

    const totalPagesForMember = chunks.length;

    chunks.forEach((chunk, chunkIdx) => {
      globalPageNumber++;
      const isFirstPage = chunkIdx === 0;
      const isLastPage = chunkIdx === totalPagesForMember - 1;
      const startIndex = chunkIdx * ROWS_PER_PAGE;

      allPages.push(
        <Page
          key={`member-${member.memberId}-page-${chunkIdx + 1}`}
          size="A4"
          style={styles.page}
        >
          {/* Outer + inner borders use flex so content fills height */}
          <View style={styles.outerBorder}>
            <View style={styles.innerBorder}>
              {renderPageHeader()}

              {isFirstPage && renderMemberCard(member, stats)}

              {!isFirstPage && (
                <Text style={[styles.tableSectionTitle, { marginBottom: 4 }]}>
                  {member.displayName} — बकाया समापन (जारी) — पृष्ठ {chunkIdx + 1}/{totalPagesForMember}
                </Text>
              )}

              <Text style={styles.tableSectionTitle}>
                बकाया समापन भुगतान विवरण — पृष्ठ {chunkIdx + 1}/{totalPagesForMember}
              </Text>

              {renderMarriageTable(chunk, startIndex, isLastPage, isLastPage ? stats : null)}

              {/* Notice is pushed down via marginTop: 'auto' in its style */}
              <View style={styles.noticeSection}>
                <Text style={styles.noticeText}>
                  यह दान स्वेच्छिक रूप से दिया गया है और किसी भी कारणवश इसकी वापसी नहीं की जाएगी।
                </Text>
              </View>

              {/* Absolute footer */}
              <View style={styles.footer}>
                <Text style={styles.footerLeft}>
                  {member.displayName} ({member.registrationNumber})
                </Text>
                <Text style={styles.footerCenter}>पृष्ठ {globalPageNumber}</Text>
                <Text style={styles.footerRight}>{currentDate}</Text>
              </View>
            </View>
          </View>
        </Page>
      );
    });
  });

  // ─── Summary Page ───
  globalPageNumber++;
  allPages.push(
    <Page key="summary-page" size="A4" style={styles.summaryPage}>
      <View style={styles.outerBorder}>
        <View style={styles.innerBorder}>
          {renderPageHeader()}

          <Text style={styles.summaryHeader}>रिपोर्ट संपूर्ण सारांश</Text>

          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>एजेंट जानकारी</Text>
            <View style={styles.summaryInfoRow}>
              <Text style={styles.summaryInfoLabel}>एजेंट का नाम:</Text>
              <Text style={styles.summaryInfoValue}>{agentInfo?.agentName || agentInfo?.displayName || 'N/A'}</Text>
            </View>
            <View style={styles.summaryInfoRow}>
              <Text style={styles.summaryInfoLabel}>एजेंट फोन:</Text>
              <Text style={styles.summaryInfoValue}>{agentInfo.phone || 'N/A'}</Text>
            </View>
            <View style={styles.summaryInfoRow}>
              <Text style={styles.summaryInfoLabel}>योजना:</Text>
              <Text style={styles.summaryInfoValue}>{programInfo?.name || programInfo?.hiname || 'N/A'}</Text>
            </View>
            <View style={styles.summaryInfoRow}>
              <Text style={styles.summaryInfoLabel}>रिपोर्ट तिथि:</Text>
              <Text style={styles.summaryInfoValue}>{currentDate} {currentTime}</Text>
            </View>
          </View>

          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>सांख्यिकी सारांश</Text>
            {[
              ['कुल सदस्य:', membersWithPending.length, '#1a0f5e'],
              ['कुल समापन:', overallTotals.totalAllMarriages, '#1a0f5e'],
              ['भुगतान समापन:', overallTotals.paidMarriages, '#52c41a'],
              ['बकाया समापन:', overallTotals.totalPendingMarriages, '#f5222d'],
              ['भुगतान राशि:', formatCurrency(overallTotals.paidAmount), '#52c41a'],
              ['बकाया राशि:', formatCurrency(overallTotals.totalPendingAmount), '#f5222d'],
            ].map(([label, value, color]) => (
              <View key={label} style={styles.summaryInfoRow}>
                <Text style={styles.summaryInfoLabel}>{label}</Text>
                <Text style={[styles.summaryInfoValue, { color }]}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.grandTotalBox}>
            <Text style={[styles.grandTotalText, { marginBottom: 4 }]}>
              रिपोर्ट कुल बकाया राशि
            </Text>
            <Text style={[styles.grandTotalText, { fontSize: 18 }]}>
              {formatCurrency(overallTotals.totalPendingAmount)}
            </Text>
          </View>

          {/* Notice pushed to bottom */}
          <View style={styles.noticeSection}>
            <Text style={styles.noticeText}>
              यह दान स्वेच्छिक रूप से दिया गया है और किसी भी कारणवश इसकी वापसी नहीं की जाएगी।
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerLeft}>सारांश रिपोर्ट</Text>
            <Text style={styles.footerCenter}>पृष्ठ {globalPageNumber}</Text>
            <Text style={styles.footerRight}>{currentDate}</Text>
          </View>
        </View>
      </View>
    </Page>
  );

  return <Document>{allPages}</Document>;
};

export default PaymentStatusPDF;