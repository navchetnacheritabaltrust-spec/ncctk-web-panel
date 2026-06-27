'use client'
import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  pdf
} from '@react-pdf/renderer';
import NotoSansDevanagari from '@/app/api/helperfile/static/font/NotoSansDevanagari';
import NotoSansDevanagariBold from '@/app/api/helperfile/static/font/NotoSansDevanagariBold';
import { pdfColors, TrsutData } from '@/lib/constentData';
import PdfHeaderCom from '@/components/screen/agents/agentDetails/component/pdfcom/HeaderCom';

Font.register({
  family: 'NotoSansDevanagari',
  fonts: [
    { src: NotoSansDevanagari, fontWeight: 'normal' },
    { src: NotoSansDevanagariBold, fontWeight: 'bold' },
  ]
});

const ROWS_PER_PAGE = 15; // Reduced to accommodate header and footer properly

const styles = StyleSheet.create({
  page: {
    backgroundColor: pdfColors.bgColor,
    fontFamily: 'NotoSansDevanagari',
    padding: 14,
    fontSize: 10,
  },
  outerBorder: {
    border: `2px solid ${pdfColors.borderColor}`,
    padding: 5,
    minHeight: '100%',
  },
  innerBorder: {
    border: `1px solid ${pdfColors.borderColor}`,
    padding: 8,
    minHeight: '100%',
  },

  // Header
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
  logoImage: { width: 65, height: 65 },
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
    fontSize: 11,
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  address: {
    fontSize: 8,
    color: '#444',
    textAlign: 'center',
    marginBottom: 2,
  },
  phoneNumbers: {
    fontSize: 9,
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

  // Member Info Card
  memberCard: {
    flexDirection: 'row',
    backgroundColor: '#fff8f8',
    marginBottom: 10,
    borderRadius: 4,
    border: `1.5px solid ${pdfColors.borderColor}`,
    overflow: 'hidden',
  },
  memberPhotoBox: {
    width: 80,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRight: `1px solid ${pdfColors.borderColor}`,
    padding: 5,
  },
  memberPhotoImg: {
    width: 70,
    height: 75,
    borderRadius: 3,
  },
  memberPhotoPlaceholder: {
    width: 70,
    height: 75,
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
    padding: 8,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: '1px solid #f0d9a0',
  },
  memberName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: pdfColors.headingColor,
  },
  memberRegBadge: {
    backgroundColor: pdfColors.regBadgeColor || '#1a0f5e',
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
    marginBottom: 6,
  },
  memberInfoGridItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberInfoLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#555',
    marginRight: 3,
    minWidth: 45,
  },
  memberInfoValue: {
    fontSize: 8,
    color: pdfColors.infoValueColor || '#000',
    fontWeight: 'bold',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: pdfColors.statsColor || '#8B0000',
    borderRadius: 3,
    padding: 5,
    justifyContent: 'space-around',
    marginTop: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 7,
    color: '#ffccc7',
    marginBottom: 1,
  },
  statValue: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },

  // Table
  tableSectionTitle: {
    fontSize: 10,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginBottom: 4,
    paddingBottom: 2,
    borderBottom: `1.5px solid ${pdfColors.borderColor}`,
    textAlign: 'center',
  },

  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    marginBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.schemeColor || '#8B0000',
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 22,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e8e8e8',
  },
  tableRowAlt: { backgroundColor: '#fafafa' },
  tableRowEmpty: { backgroundColor: '#fdfdfd' },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontSize: 8,
    borderRightWidth: 0.5,
    borderRightColor: '#d9d9d9',
    justifyContent: 'center',
  },
  tableHeaderCell: {
    paddingVertical: 5,
    paddingHorizontal: 3,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff',
    borderRightWidth: 0.5,
    borderRightColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
  },

  // Column widths
  colSerial:      { width: '6%' },
  colDate:        { width: '12%' },
  colBeneficiary: { width: '22%' },
  colFatherName:  { width: '18%' },
  colRegNo:       { width: '12%' },
  colAmount:      { width: '12%' },
  colStatus:      { width: '12%' },

  textLeft:   { textAlign: 'left' },
  textCenter: { textAlign: 'center' },
  textRight:  { textAlign: 'right' },

  // Summary Box
  summaryBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f4ff',
    borderRadius: 5,
    border: `1px solid ${pdfColors.borderColor}`,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#555',
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: pdfColors.infoValueColor || '#000',
  },

  // Notice
  noticeSection: {
    marginTop: 8,
    paddingVertical: 5,
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
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 7,
    color: '#8c8c8c',
    borderTop: `0.5px solid ${pdfColors.borderColor}`,
    paddingTop: 3,
  },
});

const SingleMemberPendingPaymentPdf = ({ memberData, paymentReport, programInfo = {} }) => {
  if (!memberData || !paymentReport) return null;

  const { report } = paymentReport;
  const member = memberData;
  
  // Filter ONLY pending marriages
  const allMarriages = report.marriages || [];
  const pendingMarriages = allMarriages.filter(m => m.status === 'pending');
  
  // Calculate summary for pending only
  const pendingSummary = {
    totalPending: pendingMarriages.length,
    totalPendingAmount: pendingMarriages.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0),
    totalMarriages: report.summary?.totalMarriages || 0,
    paidMarriages: report.summary?.paidMarriages || 0,
    paidAmount: report.summary?.paidAmount || 0
  };

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

  // Get status in Hindi
  const getStatusHindi = (status) => {
    return status === 'paid' ? 'भुगतान किया' : 'बकाया';
  };

  // Split pending marriages into chunks for multiple pages
  const chunks = [];
  for (let i = 0; i < pendingMarriages.length; i += ROWS_PER_PAGE) {
    chunks.push(pendingMarriages.slice(i, i + ROWS_PER_PAGE));
  }
  
  // If no pending marriages, create one empty chunk
  if (chunks.length === 0) {
    chunks.push([]);
  }

  // Render page header
  const renderPageHeader = () => (
    <>
      <View style={styles.topText}>
      {
        TrsutData.topTitle.map((text, index) => (
          <Text key={index} style={styles.smallText}>{text}</Text>
        ))
      }
      </View>
      <View style={styles.headerSection}>
        <Image src="/Images/krinshnaImage.jpg" style={styles.logoImage} />
        <View style={styles.centerContent}>
          <Text style={styles.mainTitle}>{TrsutData.name}</Text>
          {
           TrsutData.cityState && <Text style={styles.subTitle}>{TrsutData.cityState}</Text> 
          }
          <Text style={styles.address}>{TrsutData.address}</Text>
          <Text style={styles.phoneNumbers}>{TrsutData.contact}</Text>
          <View style={styles.schemeBox}>
            <Text style={styles.schemeText}>बकाया भुगतान रिपोर्ट</Text>
          </View>
        </View>
        <Image src={TrsutData.logo} style={[styles.logoImage, { width: 80 }]} />
      </View>
    </>
  );

  // Render member card
  const renderMemberCard = () => (
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
            {member.displayName} {member.jati || ''}
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
          <View style={styles.memberInfoGridItem}>
            <Text style={styles.memberInfoLabel}>योजना:</Text>
            <Text style={styles.memberInfoValue}>{member.programName || programInfo?.name || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>कुल समापन</Text>
            <Text style={styles.statValue}>{pendingSummary.totalPending || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>बकाया</Text>
            <Text style={styles.statValue}>{pendingSummary.totalPending}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>बकाया राशि</Text>
            <Text style={styles.statValue}>{formatCurrency(pendingSummary.totalPendingAmount)}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  // Render payment table (only pending payments)
  const renderPaymentTable = (data, startIndex, pageChunkIndex, totalChunks) => {
    const isLastPage = pageChunkIndex === totalChunks - 1;
    
    return (
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <View style={[styles.tableHeaderCell, styles.colSerial]}>
            <Text style={styles.textCenter}>क्र.</Text>
          </View>
         
          <View style={[styles.tableHeaderCell, styles.colBeneficiary]}>
            <Text style={styles.textLeft}>नाम</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colFatherName]}>
            <Text style={styles.textLeft}>पिता/पति</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colRegNo]}>
            <Text style={styles.textCenter}>रजि. नं.</Text>
          </View>
           <View style={[styles.tableHeaderCell, styles.colDate]}>
            <Text style={styles.textCenter}>तिथि</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colAmount]}>
            <Text style={styles.textRight}>राशि</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colStatus, { borderRightWidth: 0 }]}>
            <Text style={styles.textCenter}>स्थिति</Text>
          </View>
        </View>

        {data.map((marriage, index) => (
          <View
            key={marriage.paymentId || index}
            style={[styles.tableRow, (startIndex + index) % 2 === 1 && styles.tableRowAlt]}
          >
            <View style={[styles.tableCell, styles.colSerial]}>
              <Text style={styles.textCenter}>{startIndex + index + 1}</Text>
            </View>
           
            <View style={[styles.tableCell, styles.colBeneficiary]}>
              <Text style={styles.textLeft}>{marriage.paymentFor || '-'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colFatherName]}>
              <Text style={styles.textLeft}>{marriage.closingFatherName || '-'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colRegNo]}>
              <Text style={styles.textCenter}>{marriage.closingRegNo || '-'}</Text>
            </View>
             <View style={[styles.tableCell, styles.colDate]}>
              <Text style={styles.textCenter}>{marriage.marriageDate || '-'}</Text>
            </View>
            <View style={[styles.tableCell, styles.colAmount]}>
              <Text style={[styles.textRight, { color: '#cf1322' }]}>
                {formatCurrency(marriage.amount)}
              </Text>
            </View>
            <View style={[styles.tableCell, styles.colStatus, { borderRightWidth: 0 }]}>
              <Text style={styles.textCenter}>
                बकाया
              </Text>
            </View>
          </View>
        ))}

        {/* Empty filler rows to maintain layout */}
        {data.length < ROWS_PER_PAGE && Array.from({ length: ROWS_PER_PAGE - data.length }).map((_, i) => (
          <View key={`empty-${i}`} style={[styles.tableRow, styles.tableRowEmpty]}>
            <View style={[styles.tableCell, styles.colSerial]}><Text> </Text></View>
            <View style={[styles.tableCell, styles.colBeneficiary]}><Text> </Text></View>
            <View style={[styles.tableCell, styles.colFatherName]}><Text> </Text></View>
            <View style={[styles.tableCell, styles.colRegNo]}><Text> </Text></View>
            <View style={[styles.tableCell, styles.colDate]}><Text> </Text></View>
            <View style={[styles.tableCell, styles.colAmount]}><Text> </Text></View>
            <View style={[styles.tableCell, styles.colStatus, { borderRightWidth: 0 }]}><Text> </Text></View>
          </View>
        ))}
      </View>
    );
  };

  // Build all pages
  const allPages = [];

  // If no pending marriages, show message
  if (pendingMarriages.length === 0) {
    allPages.push(
      <Page key="no-pending" size="A4" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            {/* {renderPageHeader()} */}
            <PdfHeaderCom/>
            {renderMemberCard()}
            
            <View style={{ padding: 30, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#8B0000', marginBottom: 10 }}>कोई बकाया भुगतान नहीं है</Text>
              <Text style={{ fontSize: 10, color: '#666' }}>इस सदस्य का कोई भी भुगतान बकाया नहीं है</Text>
            </View>

            <View style={styles.noticeSection}>
              <Text style={styles.noticeText}>
                यह दान स्वेच्छिक रूप से दिया गया है और किसी भी कारणवश इसकी वापसी नहीं की जाएगी।
              </Text>
            </View>

            <View style={styles.footer}>
              <Text style={{ flex: 1 }}>{member.displayName} ({member.registrationNumber})</Text>
              <Text style={{ flex: 1, textAlign: 'center' }}>पृष्ठ 1</Text>
              <Text style={{ flex: 1, textAlign: 'right' }}>{currentDate}</Text>
            </View>
          </View>
        </View>
      </Page>
    );
  } else {
    // Main payment pages for pending marriages
    chunks.forEach((chunk, chunkIndex) => {
      const startIndex = chunkIndex * ROWS_PER_PAGE;
      const isLastPage = chunkIndex === chunks.length - 1;

      allPages.push(
        <Page key={`page-${chunkIndex + 1}`} size="A4" style={styles.page} wrap>
          <View style={styles.outerBorder}>
            <View style={styles.innerBorder}>
              {/* {renderPageHeader()} */}
            <PdfHeaderCom/>
              
              {/* Member card only on first page */}
              {chunkIndex === 0 && renderMemberCard()}

              <Text style={styles.tableSectionTitle}>
                बकाया भुगतान विवरण {chunks.length > 1 ? `(पृष्ठ ${chunkIndex + 1}/${chunks.length})` : ''}
              </Text>

              {renderPaymentTable(chunk, startIndex, chunkIndex, chunks.length)}

              {/* Summary for last page */}
              {isLastPage && (
                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>कुल बकाया समापन:</Text>
                    <Text style={[styles.summaryValue, { color: '#cf1322' }]}>
                      {pendingSummary.totalPending}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>कुल बकाया राशि:</Text>
                    <Text style={[styles.summaryValue, { color: '#cf1322', fontSize: 10 }]}>
                      {formatCurrency(pendingSummary.totalPendingAmount)}
                    </Text>
                  </View>
                
                </View>
              )}

              <View style={styles.noticeSection}>
                <Text style={styles.noticeText}>
                  यह दान स्वेच्छिक रूप से दिया गया है और किसी भी कारणवश इसकी वापसी नहीं की जाएगी।
                </Text>
              </View>

              <View style={styles.footer}>
                <Text style={{ flex: 1 }}>{member.displayName} ({member.registrationNumber})</Text>
                <Text style={{ flex: 1, textAlign: 'center' }}>पृष्ठ {chunkIndex + 1}</Text>
                <Text style={{ flex: 1, textAlign: 'right' }}>{currentDate}</Text>
              </View>
            </View>
          </View>
        </Page>
      );
    });
  }

  return <Document>{allPages}</Document>;
};

export default SingleMemberPendingPaymentPdf;