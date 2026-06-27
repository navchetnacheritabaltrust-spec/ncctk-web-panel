import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import React from 'react';
import dayjs from 'dayjs';
import NotoSansDevanagari from '@/app/api/helperfile/static/font/NotoSansDevanagari';
import NotoSansDevanagariBold from '@/app/api/helperfile/static/font/NotoSansDevanagariBold';
import { pdfColors, TrsutData } from '@/lib/constentData';
import PdfHeaderCom from '../pdfcom/HeaderCom';

// Register fonts
Font.register({
  family: 'NotoSansDevanagari',
  fonts: [
    {
      src: NotoSansDevanagari,
      fontWeight: 'normal',
    },
    {
      src: NotoSansDevanagariBold,
      fontWeight: 'bold',
    }
  ]
});

const styles = StyleSheet.create({
  page: {
    backgroundColor:pdfColors.bgColor,
    fontFamily: 'NotoSansDevanagari',
    padding: 5,
    fontSize: 10,
  },
  outerBorder: {
    border: `2px solid ${pdfColors.borderColor}`,
    padding: 6,
    minHeight: '100%',
  },
  innerBorder: {
    border: `1px solid ${pdfColors.borderColor}`,
    padding: 10,
    minHeight: '100%',
  },
  
  // Header
  topText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  smallText: {
    fontSize: 10,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: 70,
    height: 70,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  mainTitle: {
    fontSize: 20,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  subTitle: {
    fontSize: 12,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  address: {
    fontSize: 9,
    color: pdfColors.headingColor,
    textAlign: 'center',
    marginBottom: 2,
  },
  phoneNumbers: {
    fontSize: 10,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  schemeBox: {
    backgroundColor: pdfColors.schemeColor,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  schemeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Agent Info
  agentInfoSection: {
    backgroundColor: '#f8f9fa',
    padding: 6,
    marginBottom: 6,
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  infoLabel: {
    fontSize: 8,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginRight: 3,
  },
  infoValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: pdfColors.headingColor,
  },
  
  // Table Section
  tableSectionTitle: {
    fontSize: 10,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginBottom: 4,
    paddingBottom: 2,
    borderBottom: `1.5px solid ${pdfColors.borderColor}`,
    textAlign: 'center',
  },
  
  // Table
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    marginBottom: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.schemeColor,
    borderBottomWidth: 1,
    borderBottomColor: '#d9d9d9',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
    minHeight: 18,
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  tableCell: {
    paddingVertical: 3,
    paddingHorizontal: 3,
    fontSize: 7,
    borderRightWidth: 0.5,
    borderRightColor: '#d9d9d9',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tableHeaderCell: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
    borderRightWidth: 0.5,
    borderRightColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Column Widths
  colSrNo: { width: '5%', alignItems: 'center' },
  colRegNo: { width: '10%', alignItems: 'center' },
  colName: { width: '18%', alignItems: 'flex-start' },
  colFatherName: { width: '15%', alignItems: 'flex-start' },
  colPhone: { width: '11%', alignItems: 'center' },
  colProgram: { width: '18%', alignItems: 'flex-start' },
  colAmountPending: { width: '11%', alignItems: 'flex-end' },
  colAmountPaid: { width: '11%', alignItems: 'flex-end' },
  colStatus: { width: '11%', alignItems: 'center' },
  
  // Text styles
  textLeft: { textAlign: 'left' },
  textCenter: { textAlign: 'center' },
  textRight: { textAlign: 'right' },
  
  smallTableText: {
    fontSize: 7,
    lineHeight: 1.1,
  },
  boldTableText: {
    fontSize: 7,
    fontWeight: 'bold',
    lineHeight: 1.1,
  },
  
  // Summary Rows
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderTop: `2px solid ${pdfColors.borderColor}`,
    minHeight: 22,
    alignItems: 'center',
  },
  summaryCell: {
    padding: 4,
    fontSize: 8,
    fontWeight: 'bold',
    borderRightWidth: 0.5,
    borderRightColor: '#d9d9d9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Total Row
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#1a0f5e',
    minHeight: 20,
    alignItems: 'center',
  },
  totalCell: {
    padding: 4,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
    borderRightWidth: 0.5,
    borderRightColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalLabel: {
    textAlign: 'left',
    paddingLeft: 6,
  },
  totalAmount: {
    fontSize: 9,
    textAlign: 'right',
    paddingRight: 6,
    fontWeight: 'bold',
  },

  // No Data Message
  noDataBox: {
    padding: 30,
    textAlign: 'center',
    backgroundColor: '#fafafa',
    borderRadius: 4,
    border: '1px dashed #d9d9d9',
  },
  noDataText: {
    fontSize: 11,
    color: '#8c8c8c',
  },
  
  // Notice
  noticeSection: {
    marginTop: 4,
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fff8e1',
    border: `1px solid ${pdfColors.borderColor}`,
    borderRadius: 3,
  },
  noticeText: {
    fontSize: 7,
    color: '#5d4037',
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 1.2,
  },
  
  // Footer
  footer: {
    marginTop: 4,
    width: '100%',
    paddingTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 7,
    color: '#8c8c8c',
    borderTop: `0.5px solid ${pdfColors.borderColor}`,
  },
  footerLeft: { flex: 1 },
  footerCenter: { flex: 1, textAlign: 'center' },
  footerRight: { flex: 1, textAlign: 'right' },
  
  // Member Info in Table
  memberInfo: {
    flexDirection: 'column',
  },
  memberName: {
    fontSize: 7,
    fontWeight: 'bold',
    color: pdfColors.headingColor,
    marginBottom: 1,
  },
  memberDetails: {
    fontSize: 6,
    color: '#666',
    lineHeight: 1.1,
  },  regCinText:{
    fontSize: 7.8,
    color: '#333',
      fontWeight: 'bold',
      letterSpacing: 0.2,
        marginBottom: 3,
  }

});

const AllPaymentPdf = ({ rowData = [], agentInfo = {} }) => {
  const currentDate = dayjs().format('DD/MM/YYYY');
  const currentTime = dayjs().format('HH:mm');
  
  // Calculate totals from aggregated data
  const totalPaid = rowData.reduce((sum, item) => sum + (item.totalPaid || 0), 0);
  const totalPending = rowData.reduce((sum, item) => sum + (item.totalPending || 0), 0);
  const totalMembers = new Set(rowData.map(item => item.registrationNumber)).size;
  const totalPrograms = new Set(rowData.map(item => item.programName)).size;
  const totalPaidCount = rowData.reduce((sum, item) => sum + (item.paidCount || 0), 0);
  const totalPendingCount = rowData.reduce((sum, item) => sum + (item.pendingCount || 0), 0);
  
  // Format currency
  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return `₹${num.toLocaleString('en-IN')}`;
  };
  
  // Render page header (only for first page)
  const renderPageHeader = () => (
    <>
    <PdfHeaderCom/>

      <View style={styles.agentInfoSection}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>एजेंट:</Text>
          <Text style={styles.infoValue}>
            {agentInfo?.displayName || 'N/A'} ({agentInfo?.phone || ''})
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>रिपोर्ट:</Text>
          <Text style={styles.infoValue}>सभी योजना भुगतान सारांश</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>दिनांक:</Text>
          <Text style={styles.infoValue}>{currentDate} {currentTime}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>कुल रिकॉर्ड:</Text>
          <Text style={styles.infoValue}>{rowData.length}</Text>
        </View>
      </View>
    </>
  );

  // Render table header
  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.tableHeaderCell, styles.colSrNo]}>
        <Text style={[styles.textCenter, styles.smallTableText]}>क्र.</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.colRegNo]}>
        <Text style={[styles.textCenter, styles.smallTableText]}>रजि. नं.</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.colName]}>
        <Text style={[styles.textLeft, styles.smallTableText]}>सदस्य नाम</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.colFatherName]}>
        <Text style={[styles.textLeft, styles.smallTableText]}>पिता/पति का नाम</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.colPhone]}>
        <Text style={[styles.textCenter, styles.smallTableText]}>फोन नं.</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.colProgram]}>
        <Text style={[styles.textLeft, styles.smallTableText]}>योजना</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.colAmountPending]}>
        <Text style={[styles.textRight, styles.smallTableText]}>बकाया राशि</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.colAmountPaid]}>
        <Text style={[styles.textRight, styles.smallTableText]}>भुगतान राशि</Text>
      </View>
      <View style={[styles.tableHeaderCell, styles.colStatus, { borderRightWidth: 0 }]}>
        <Text style={[styles.textCenter, styles.smallTableText]}>स्थिति</Text>
      </View>
    </View>
  );

  // Render table row
  const renderTableRow = (row, index) => {
    const hasPaid = row.totalPaid > 0;
    const hasPending = row.totalPending > 0;
    const hasBoth = row.status === 'both';
    
    return (
      <View 
        key={`row-${row.registrationNumber}-${row.programName}-${index}`}
        style={[
          styles.tableRow,
          index % 2 === 1 && styles.tableRowAlt,
        ]}
      >
        {/* Serial Number */}
        <View style={[styles.tableCell, styles.colSrNo]}>
          <Text style={[styles.textCenter, styles.smallTableText]}>
            {row.index}
          </Text>
        </View>
        
        {/* Registration Number */}
        <View style={[styles.tableCell, styles.colRegNo]}>
          <Text style={[styles.textCenter, styles.boldTableText]}>
            {row.registrationNumber || '-'}
          </Text>
        </View>
        
        {/* Member Name with village */}
        <View style={[styles.tableCell, styles.colName]}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>
              {row.memberName || '-'}
            </Text>
            <Text style={styles.memberDetails}>
              गाँव: {row.village || '-'}
            </Text>
          </View>
        </View>
        
        {/* Father Name */}
        <View style={[styles.tableCell, styles.colFatherName]}>
          <Text style={[styles.textLeft, styles.smallTableText]}>
            {row.fatherName || '-'}
          </Text>
        </View>
        
        {/* Phone */}
        <View style={[styles.tableCell, styles.colPhone]}>
          <Text style={[styles.textCenter, styles.smallTableText]}>
            {row.phone || '-'}
          </Text>
        </View>
        
        {/* Program Name */}
        <View style={[styles.tableCell, styles.colProgram]}>
          <Text style={[styles.textLeft, styles.boldTableText, { color: '#8B0000' }]}>
            {row.programName || '-'}
          </Text>
        </View>
        
        {/* Pending Amount */}
        <View style={[styles.tableCell, styles.colAmountPending]}>
          <Text style={[styles.textRight, styles.boldTableText, 
            { color: hasPending ? '#f5222d' : '#d9d9d9' }]}>
            {hasPending ? formatCurrency(row.totalPending) : '-'}
          </Text>
        </View>
        
        {/* Paid Amount */}
        <View style={[styles.tableCell, styles.colAmountPaid]}>
          <Text style={[styles.textRight, styles.boldTableText, 
            { color: hasPaid ? '#52c41a' : '#d9d9d9' }]}>
            {hasPaid ? formatCurrency(row.totalPaid) : '-'}
          </Text>
        </View>
        
        {/* Status */}
        <View style={[styles.tableCell, styles.colStatus, { borderRightWidth: 0 }]}>
          {hasBoth ? (
                <View style={{
              backgroundColor: '#fa8c16',
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 2,
            }}>
            <Text style={[ {  fontSize: 6, color: '#fff', fontWeight: 'bold' }]}>
              pending
            </Text>
                </View>
          ) : hasPaid ? (
            <View style={{
              backgroundColor: '#52c41a',
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 2,
            }}>
              <Text style={{
                fontSize: 6,
                color: '#fff',
                fontWeight: 'bold',
              }}>
                Paid
              </Text>
            </View>
          ) : hasPending ? (
            <View style={{
              backgroundColor: '#faad14',
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 2,
            }}>
              <Text style={{
                fontSize: 6,
                color: '#fff',
                fontWeight: 'bold',
              }}>
                Pending
              </Text>
            </View>
          ) : (
            <Text style={[styles.smallTableText, { color: '#d9d9d9' }]}>-</Text>
          )}
        </View>
      </View>
    );
  };

  // Render summary rows
  const renderSummaryRow = (label, value, color = '#1a0f5e') => (
    <View style={styles.summaryRow}>
      <View style={[styles.summaryCell, { width: '85%', textAlign: 'left' }]}>
        <Text style={{ textAlign: 'left', paddingLeft: 6, color: '#8B0000' }}>
          {label}
        </Text>
      </View>
      <View style={[styles.summaryCell, { width: '15%', borderRightWidth: 0 }]}>
        <Text style={{ textAlign: 'right', paddingRight: 6, color }}>
          {value}
        </Text>
      </View>
    </View>
  );

  // Render total row
  const renderTotalRow = () => (
    <View style={styles.totalRow}>
      <View style={[styles.totalCell, { width: '85%' }]}>
        <Text style={[styles.totalLabel, { fontSize: 8 }]}>
          कुल बकाया राशि:
        </Text>
      </View>
      <View style={[styles.totalCell, { 
        width: '15%', 
        borderRightWidth: 0,
        backgroundColor: '#8B0000'
      }]}>
        <Text style={[styles.totalAmount, { fontSize: 9 }]}>
          {formatCurrency(totalPending)}
        </Text>
      </View>
    </View>
  );

  // Handle empty data
  if (!rowData || rowData.length === 0) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.outerBorder}>
            <View style={styles.innerBorder}>
              {renderPageHeader()}
              
              <View style={styles.noDataBox}>
                <Text style={[styles.noDataText, { fontSize: 13, marginBottom: 6, fontWeight: 'bold' }]}>
                  कोई भुगतान रिकॉर्ड नहीं है
                </Text>
                <Text style={styles.noDataText}>
                  इस एजेंट के लिए कोई भुगतान रिकॉर्ड नहीं मिला
                </Text>
              </View>
              
              <View style={styles.noticeSection}>
                <Text style={styles.noticeText}>
                  यह दान स्वेच्छिक रूप से दिया गया है और किसी भी कारणवश इसकी वापसी नहीं की जाएगी।
                </Text>
              </View>
              
              <View style={styles.footer}>
                <Text style={styles.footerLeft}>
                  जनरेट: {currentDate} {currentTime}
                </Text>
                <Text style={styles.footerCenter}>
                  {TrsutData.name} © {dayjs().year()}
                </Text>
                <Text style={styles.footerRight}>
                  एजेंट ID: {agentInfo?.uid || 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        </Page>
      </Document>
    );
  }

  // Calculate rows per page
  const ROWS_PER_PAGE = 30;
  const totalPages = Math.ceil(rowData.length / ROWS_PER_PAGE);
  const pages = [];

  // Create pages
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIdx = pageNum * ROWS_PER_PAGE;
    const endIdx = Math.min(startIdx + ROWS_PER_PAGE, rowData.length);
    const pageData = rowData.slice(startIdx, endIdx);
    const isLastPage = pageNum === totalPages - 1;
    const isFirstPage = pageNum === 0;

    pages.push(
      <Page key={`page-${pageNum}`} size="A4" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            {/* Show header only on first page */}
            {isFirstPage && renderPageHeader()}
            
            {/* Always show table section title */}
            <Text style={styles.tableSectionTitle}>
              सभी योजना भुगतान सारांश {!isFirstPage && `(पृष्ठ ${pageNum + 1}/${totalPages})`}
            </Text>
            
            {/* Show page info for non-first pages */}
            {!isFirstPage && (
              <View style={{ marginBottom: 4 }}>
                <Text style={{ fontSize: 8, color: '#666', textAlign: 'center' }}>
                  पृष्ठ {pageNum + 1} / {totalPages} • एजेंट: {agentInfo?.displayName || 'N/A'} • {currentDate}
                </Text>
              </View>
            )}
            
            {/* Table header on every page */}
            <View style={styles.table}>
              {renderTableHeader()}
              {pageData.map((row, idx) => renderTableRow(row, startIdx + idx))}
            </View>
            
            {/* Summary on last page */}
            {isLastPage && (
              <>
                {renderSummaryRow('कुल सदस्य (अद्वितीय):', totalMembers.toString())}
                {renderSummaryRow('कुल योजना (अद्वितीय):', totalPrograms.toString())}
                {renderSummaryRow('भुगतान लेनदेन:', totalPaidCount.toString(), '#52c41a')}
                {renderSummaryRow('बकाया लेनदेन:', totalPendingCount.toString(), '#faad14')}
                {renderSummaryRow('कुल भुगतान राशि:', formatCurrency(totalPaid), '#52c41a')}
                {renderTotalRow()}
                
                <View style={styles.noticeSection}>
                  <Text style={styles.noticeText}>
                    यह दान स्वेच्छिक रूप से दिया गया है और किसी भी कारणवश इसकी वापसी नहीं की जाएगी।
                  </Text>
                </View>
              </>
            )}
            
            <View style={styles.footer}>
              <Text style={styles.footerLeft}>
                {!isFirstPage && `एजेंट: ${agentInfo?.displayName || 'N/A'}`}
              </Text>
              <Text style={styles.footerCenter}>
                पृष्ठ {pageNum + 1} / {totalPages}
              </Text>
              <Text style={styles.footerRight}>
                {currentDate} {currentTime}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    );
  }

  return <Document>{pages}</Document>;
};

export default AllPaymentPdf;