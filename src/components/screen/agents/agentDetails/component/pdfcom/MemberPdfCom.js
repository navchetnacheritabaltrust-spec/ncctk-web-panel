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

// Register Devanagari Font
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

// Create styles matching the certificate theme
const styles = StyleSheet.create({
  page: {
    backgroundColor: pdfColors.bgColor,
    fontFamily: 'NotoSansDevanagari',
    padding: 2,
    display: 'flex',
    flexDirection: 'column',
  },
  outerBorder: {
    border: `4px solid ${pdfColors.borderColor}`,
    padding: 5,
    height: '100%',
    position: 'relative',
    borderRadius: 4,
    flex: 1,
  },
  innerBorder: {
    border: `2px solid ${pdfColors.borderColor}`,
    padding: 12,
    height: '100%',
    borderRadius: 2,
    position: 'relative',
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  topText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  smallText: {
    fontSize: 9,
    color: pdfColors.smallTextColor || '#8B0000',
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  logoImage1: {
    width: 70,
    height: 60,
    borderRadius: 4,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: -4,
  },
  mainTitle: {
    fontSize: 22,
    color: pdfColors.mainTitleColor || '#8B0000',
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  subTitle: {
    fontSize: 11,
    color: pdfColors.subTitleColor || '#000',
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  address: {
    fontSize: 8,
    color: pdfColors.addressColor || '#333',
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 1.2,
    paddingHorizontal: 8,
  },
  phoneNumbers: {
    fontSize: 8,
    color: pdfColors.phoneColor || '#000',
    fontWeight: 'bold',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  schemeBox: {
    backgroundColor: pdfColors.schemeColor || '#1a0f5e',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 12,
    alignSelf: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginTop: 2,
  },
  schemeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  watermark: {
    position: 'absolute',
    top: '70mm',
    left: '42mm',
    width: '120mm',
    height: '120mm',
    opacity: 0.06,
    zIndex: 0,
    // transform: 'translate(-50%, -50%)',
  },    
  watermarkImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  agentInfoSection: {
    marginBottom: 5,
    paddingHorizontal: 10,
    flexShrink: 0,
  },
  agentInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 9,
    color: pdfColors.infoLabelColor || '#8B0000',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: pdfColors.infoValueColor || '#1a0f5e',
    textAlign: 'right',
  },
  filterInfoSection: {
    backgroundColor: '#fff0f6',
    padding: 6,
    borderRadius: 4,
    border: '1px solid #ffd6e7',
    marginBottom: 8,
    flexShrink: 0,
  },
  filterInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 9,
    color: pdfColors.filterLabelColor || '#8B0000',
    fontWeight: 'bold',
  },
  filterValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: pdfColors.filterValueColor || '#1a0f5e',
  },
  summarySection: {
    marginBottom: 8,
    padding: 6,
    backgroundColor: pdfColors.summaryColor || '#1a0f5e',
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  summaryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalCountBox: {
    backgroundColor: pdfColors.totalCountColor || '#d4af37',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 3,
  },
  totalCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  
  // Program Header Styles
  programHeader: {
    backgroundColor: pdfColors.programHeaderColor || '#1a0f5e',
    padding: 8,
    borderRadius: 4,
    marginBottom: 10,
    borderLeft: '5px solid ' + (pdfColors.programHeaderBorderColor || '#d4af37'),
    flexShrink: 0,
  },
  programTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 3,
  },
  programStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  programStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  programStatLabel: {
    fontSize: 9,
    color: pdfColors.programHeaderBorderColor || '#d4af37',
    fontWeight: 'bold',
    marginRight: 4,
  },
  programStatValue: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  
  // Table Styles
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#dee2e6',
    marginBottom: 15,
    flexGrow: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.schemeColor || '#8B0000',
    color: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    minHeight: 20,
    backgroundColor: 'transparent',
  },
  tableCell: {
    padding: 6,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: '#dee2e6',
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 8,
    fontWeight: 'bold',
    borderRightWidth: 1,
    borderRightColor: '#dee2e6',
  },
  
  // Column Widths
  colSerial: {
    width: '7%',
    textAlign: 'center',
  },
  colName: {
    width: '28%',
  },
  colFatherName: {
    width: '22%',
  },
  colJati: {
    width: '15%',
  },
  colPhone: {
    width: '18%',
  },
  colVillage: {
    width: '20%',
  },
  
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#666666',
    borderTop: '1px solid ' + (pdfColors.totalCountColor || '#d4af37'),
    paddingTop: 6,
  },
  generatedInfo: {
    textAlign: 'left',
    fontSize: 7,
  },
  pageNumber: {
    textAlign: 'center',
    flex: 1,
    fontSize: 7,
  },
  
  // Empty Section
  emptySection: {
    padding: 20,
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
  },

  // Table Container for proper height management
  tableContainer: {
    flexGrow: 1,
    marginBottom: 10,
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

const MemberListPdf = ({ 
  members = [], 
  agentInfo = null, 
  programInfo = null, 
  programList = [],
  dateRange = null,
  searchText = ''
}) => {
  const currentDate = new Date().toLocaleDateString('hi-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const currentTime = new Date().toLocaleTimeString('hi-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // Check if it's all programs or single program
  const isAllPrograms = programInfo?.hiname === 'सभी योजना';
  
  // Group members by program and split into pages if too many members
  const groupMembersByProgram = () => {
    const grouped = {};
    const MEMBERS_PER_PAGE = 20; // Maximum members per page
    
    if (isAllPrograms) {
      // If "All Programs", group by programId
      members.forEach(member => {
        const programId = member.programId || 'unknown';
        if (!grouped[programId]) {
          grouped[programId] = {
            programData: member.programData || programList.find(p => p.id === programId) || {},
            members: [],
            pages: []
          };
        }
        grouped[programId].members.push(member);
      });
      
      // Split members into pages if too many
      Object.keys(grouped).forEach(programId => {
        const programGroup = grouped[programId];
        const totalMembers = programGroup.members.length;
        
        if (totalMembers === 0) {
          programGroup.pages = [[]];
        } else if (totalMembers <= MEMBERS_PER_PAGE) {
          programGroup.pages = [programGroup.members];
        } else {
          // Split members into multiple pages
          const pages = [];
          for (let i = 0; i < totalMembers; i += MEMBERS_PER_PAGE) {
            pages.push(programGroup.members.slice(i, i + MEMBERS_PER_PAGE));
          }
          programGroup.pages = pages;
        }
      });
      
      // Sort by program name
      return Object.values(grouped).sort((a, b) => {
        const nameA = a.programData.hiname || a.programData.englishName || '';
        const nameB = b.programData.hiname || b.programData.englishName || '';
        return nameA.localeCompare(nameB);
      });
    } else {
      // If single program, just return as array with direct members
      const programGroup = {
        programData: programInfo,
        members: members,
        pages: []
      };
      
      const totalMembers = members.length;
      if (totalMembers === 0) {
        programGroup.pages = [[]];
      } else if (totalMembers <= MEMBERS_PER_PAGE) {
        programGroup.pages = [members];
      } else {
        // Split members into multiple pages
        const pages = [];
        for (let i = 0; i < totalMembers; i += MEMBERS_PER_PAGE) {
          pages.push(members.slice(i, i + MEMBERS_PER_PAGE));
        }
        programGroup.pages = pages;
      }
      
      return [programGroup];
    }
  };

  const groupedPrograms = groupMembersByProgram();
  const totalMembers = members.length;

  // Format date for display
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('hi-IN');
  };

  // Determine village/city from data
  const getVillage = (member) => {
    return member.village || member.city || member.state || 'N/A';
  };

  // Calculate total number of pages
  const calculateTotalPages = () => {
    if (isAllPrograms) {
      let totalPages = 1; // First summary page
      groupedPrograms.forEach(programGroup => {
        totalPages += programGroup.pages.length;
      });
      return totalPages;
    } else {
      // For single program, start from page 1 with members list
      let totalPages = 0;
      groupedPrograms.forEach(programGroup => {
        totalPages += programGroup.pages.length;
      });
      return totalPages || 1; // At least 1 page even if empty
    }
  };

  const totalPages = calculateTotalPages();

  // Render Members Table
  const renderMembersTable = (membersList, startIndex = 0) => {
    if (membersList.length === 0) {
      return (
        <View style={styles.emptySection}>
          <Text style={styles.emptyText}>
            इस योजना में कोई सदस्य उपलब्ध नहीं है
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.table}>
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <View style={[styles.tableHeaderCell, styles.colSerial]}>
            <Text>क्र.</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colName]}>
            <Text>सदस्य का नाम</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colFatherName]}>
            <Text>पिता का नाम</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colJati]}>
            <Text>जाति </Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colPhone]}>
            <Text>फोन नंबर</Text>
          </View>
          <View style={[styles.tableHeaderCell, styles.colVillage, { borderRightWidth: 0 }]}>
            <Text>गाँव/शहर</Text>
          </View>
        </View>
        
        {/* Table Rows */}
        {membersList.map((member, index) => (
          <View 
            key={member.id || index} 
            style={[
              styles.tableRow,
              { 
                backgroundColor: 'transparent',
              }
            ]}
          >
            {/* Serial Number */}
            <View style={[styles.tableCell, styles.colSerial]}>
              <Text style={{ textAlign: 'center' }}>{startIndex + index + 1}</Text>
            </View>
            
            {/* Name */}
            <View style={[styles.tableCell, styles.colName]}>
              <Text style={{ fontWeight: 'bold' }}>
                {member.displayName || 'N/A'}
              </Text>
              {member.registrationNumber && (
                <Text style={{ fontSize: 6, color: '#666', marginTop: 2 }}>
                  Reg No: {member.registrationNumber}
                </Text>
              )}
            
            </View>
            
            {/* Father's Name */}
            <View style={[styles.tableCell, styles.colFatherName]}>
              <Text>{member.fatherName || 'N/A'}</Text>
            </View>
            
            {/* Jati (Surname) */}
            <View style={[styles.tableCell, styles.colJati]}>
              <Text>{member.jati || 'N/A'}</Text>
            </View>
            
            {/* Phone Number */}
            <View style={[styles.tableCell, styles.colPhone]}>
              <Text>{member.phone || 'N/A'}</Text>
            </View>
            
            {/* Village/City */}
            <View style={[styles.tableCell, styles.colVillage, { borderRightWidth: 0 }]}>
              <Text>{getVillage(member)}</Text>
              {member.state && (
                <Text style={{ fontSize: 6, color: '#666', marginTop: 2 }}>
                  {member.state}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render Filter Information Section
  const renderFilterInfo = () => {
    const hasFilters = dateRange || searchText;
    
    if (!hasFilters) return null;

    return (
      <View style={styles.filterInfoSection}>
        <View style={styles.filterInfoRow}>
          <Text style={styles.filterLabel}>लागू किए गए फिल्टर्स:</Text>
          <View>
            {dateRange && (
              <Text style={styles.filterValue}>
                दिनांक सीमा: {formatDate(dateRange[0])} से {formatDate(dateRange[1])} तक
              </Text>
            )}
            {searchText && (
              <Text style={styles.filterValue}>
                खोज: {searchText}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render Common Page Header
  const renderPageHeader = (showProgramHeader = false, programName = '', programGroup = null) => {
    return (
      <>
        {/* Top Text */}
        {/* <View style={styles.topText}>
         {
          TrsutData.topTitle.map((text, index) => (
            <Text key={index} style={styles.smallText}>{text}</Text>
          ))
         }
        </View> */}

        {/* Watermark */}
        <View style={styles.watermark}>
          <Image src={TrsutData.logo} style={styles.watermarkImage} />
        </View>

      <PdfHeaderCom/>

        {/* Agent Information */}
        <View style={styles.agentInfoSection}>
          <View style={styles.agentInfoRow}>
            <Text style={styles.infoLabel}>एजेंट नाम:</Text>
            <Text style={styles.infoValue}>
              {agentInfo?.name || 'N/A'}
              {agentInfo?.phone && ` (${agentInfo.phone})`}
            </Text>
          </View>
          
          <View style={styles.agentInfoRow}>
            <Text style={styles.infoLabel}>योजना:</Text>
            <Text style={styles.infoValue}>
              {isAllPrograms ? 'सभी योजना' : programInfo?.hiname || programInfo?.englishName || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Filter Information */}
        {renderFilterInfo()}
      </>
    );
  };

  // If it's a single program, start directly with members list
  if (!isAllPrograms) {
    let currentPageIndex = 0;
    
    return (
      <Document>
        {groupedPrograms.map((programGroup, programIndex) => {
          const programName = programGroup.programData.hiname || programGroup.programData.englishName || 'Unknown Program';
          
          return programGroup.pages.map((pageMembers, pageIndex) => {
            currentPageIndex++;
            const startIndex = pageIndex * 20; // 25 members per page
            
            return (
              <Page 
                key={`${programIndex}-${pageIndex}`} 
                size="A4" 
                orientation="portrait" 
                style={styles.page}
              >
                <View style={styles.outerBorder}>
                  <View style={styles.innerBorder}>
                    {renderPageHeader(true, programName, programGroup)}
                    
                    {/* Members Table */}
                    <View style={styles.tableContainer}>
                      {renderMembersTable(pageMembers, startIndex)}
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                      <Text style={styles.generatedInfo}>
                        जनरेट किया गया: {currentDate} {currentTime}
                      </Text>
                      <Text style={styles.pageNumber}>
                        पृष्ठ {currentPageIndex} का {totalPages}
                      </Text>
                      <Text style={styles.generatedInfo}>
                        {TrsutData.name} © 2026
                      </Text>
                    </View>
                  </View>
                </View>
              </Page>
            );
          });
        })}
      </Document>
    );
  }

  // If it's All Programs, show summary page first
  let currentPageIndex = 1;
  
  return (
    <Document>
      {/* Main Header Page (Only for All Programs) */}
      <Page size="A4" orientation="portrait" style={styles.page}>
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            {renderPageHeader(false)}
            
            {/* Overall Summary Section */}
            <View style={styles.summarySection}>
              <Text style={styles.summaryText}>
                कुल सदस्यों की संख्या: {totalMembers}
              </Text>
              <View style={styles.totalCountBox}>
                <Text style={styles.totalCountText}>
                  {groupedPrograms.length} योजना
                </Text>
              </View>
            </View>

            {/* Program-wise Summary Table */}
            <View style={[styles.table, { marginBottom: 20, flexGrow: 0 }]}>
              <View style={styles.tableHeader}>
                <View style={[styles.tableHeaderCell, { width: '7%' }]}>
                  <Text>क्र.</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: '63%', borderRightWidth: 0 }]}>
                  <Text>योजना का नाम</Text>
                </View>
                <View style={[styles.tableHeaderCell, { width: '30%', borderRightWidth: 0,textAlign:'center' }]}>
                  <Text>कुल सदस्य</Text>
                </View>
              </View>
              
              {groupedPrograms.map((programGroup, index) => {
                const totalMembersInProgram = programGroup.members.length;
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.tableRow,
                      { backgroundColor: 'transparent' }
                    ]}
                  >
                    <View style={[styles.tableCell, { width: '7%', textAlign: 'center' }]}>
                      <Text>{index + 1}</Text>
                    </View>
                    <View style={[styles.tableCell, { width: '63%', borderRightWidth: 0 }]}>
                      <Text style={{ fontWeight: 'bold' }}>
                        {programGroup.programData.hiname || programGroup.programData.englishName || 'Unknown Program'}
                      </Text>
                    </View>
                    <View style={[styles.tableCell, { width: '30%', textAlign: 'center', borderRightWidth: 0 }]}>
                      <Text>{totalMembersInProgram}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.generatedInfo}>
                जनरेट किया गया: {currentDate} {currentTime}
              </Text>
              <Text style={styles.pageNumber}>
                पृष्ठ {currentPageIndex} का {totalPages}
              </Text>
              <Text style={styles.generatedInfo}>
               {TrsutData.name} © 2026
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* Program-wise Member Details Pages (Only for All Programs) */}
      {groupedPrograms.map((programGroup, programIndex) => {
        const programName = programGroup.programData.hiname || programGroup.programData.englishName || 'Unknown Program';
        
        return programGroup.pages.map((pageMembers, pageIndex) => {
          currentPageIndex++;
          const startIndex = pageIndex * 20; // 25 members per page
          
          return (
            <Page 
              key={`${programIndex}-${pageIndex}`} 
              size="A4" 
              orientation="portrait" 
              style={styles.page}
            >
              <View style={styles.outerBorder}>
                <View style={styles.innerBorder}>
                  {renderPageHeader(true, programName, programGroup)}
                  
                  {/* Members Table */}
                  <View style={styles.tableContainer}>
                    {renderMembersTable(pageMembers, startIndex)}
                  </View>

                  {/* Footer */}
                  <View style={styles.footer}>
                    <Text style={styles.generatedInfo}>
                      योजना: {programName}
                    </Text>
                    <Text style={styles.pageNumber}>
                      पृष्ठ {currentPageIndex} का {totalPages}
                    </Text>
                    <Text style={styles.generatedInfo}>
                      {TrsutData.name} © 2026
                    </Text>
                  </View>
                </View>
              </View>
            </Page>
          );
        });
      })}
    </Document>
  );
};

export default MemberListPdf;