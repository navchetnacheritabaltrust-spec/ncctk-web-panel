import React from 'react';
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFViewer, 
  Font,
  Image
} from '@react-pdf/renderer';

import NotoSansDevanagari from '@/app/api/helperfile/static/font/NotoSansDevanagari';
import NotoSansDevanagariBold from '@/app/api/helperfile/static/font/NotoSansDevanagariBold';
import { pdfColors, TrsutData } from '@/lib/constentData';
// Register Devanagari Font
Font.register({
  family: 'NotoSansDevanagari',
  fonts: [
    {
      src:NotoSansDevanagari ,
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
    padding: 12,
  },
  outerBorder: {
    border: `4px solid ${pdfColors.borderColor}`,
    padding: 5,
    height: '100%',
    borderRadius: 4,
  },
  innerBorder: {
    border: `2px solid ${pdfColors.borderColor}`,
    padding: 9,
    height: '100%',
    borderRadius: 2,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  topText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  smallText: {
    fontSize: 8,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 20,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 12,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 3,
  },
  address: {
    fontSize: 8,
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 1.4,
    maxWidth: '85%',
  },
  phoneNumbers: {
    fontSize: 8.5,
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  schemeBox: {
    backgroundColor: pdfColors.schemeColor,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginBottom: 2,
  },
  schemeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  photoBox: {
    position: 'absolute',
    right: 9,
    top: 115,
    border: '1.5px solid #333',
    width: 60,
    height: 60,
    backgroundColor: '#f8f8f8',
    borderRadius: 3,
    overflow: 'hidden',
    zIndex:100,
  },
  extraImageURLBox:{
 position: 'absolute',
    right: 9,
    top: 180,
    border: '1.5px solid #333',
    width: 60,
    height: 60,
    backgroundColor: '#f8f8f8',
    borderRadius: 3,
    overflow: 'hidden',
    zIndex:100,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex:100,

  },
  photoLabel: {
    fontSize: 8,
    textAlign: 'center',
    color: '#666',
    paddingTop: 28,
  },
  formSection: {
    marginTop: 8,
    flex: 1,
    paddingHorizontal: 4,
  },
  serialNumber: {
    position: 'absolute',
    top: -8,
    right: 18,
    fontSize: 10,
    color: '#000',
    fontWeight: 'bold',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'flex-start',
  },
  fullRow: {
    flexDirection: 'row',
    marginBottom: 5,
    width: '80%',
    alignItems: 'flex-start',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  halfField: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginRight: '2%',
  },
  label: {
    fontSize: 9,
    color: '#000',
    marginRight: 4,
    whiteSpace: 'nowrap',
  },
  value: {
    fontSize: 9.5,
    color: '#000',
    fontWeight: 'bold',
    borderBottom: '1px dotted #333',
    paddingBottom: 3,
    paddingHorizontal: 5,
    minHeight: 15,
    flex: 1,
    textTransform:'capitalize'
  },
  valueFixed: {
    fontSize: 9.5,
    color: '#000',
    fontWeight: 'bold',
    borderBottom: '1px dotted #333',
    paddingBottom: 3,
    paddingHorizontal: 5,
    minHeight: 15,
  },
  detailsBox: {
    marginTop: 5,
    marginBottom: 5,
    fontSize: 7.5,
    color: '#000',
    textAlign: 'justify',
    lineHeight: 1.4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f9f9f9',
    borderRadius: 3,
    border: '0.5px solid #ddd',
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 8,
    paddingHorizontal: 4,
    borderTop: '1px solid #e0e0e0',
  },
  footerBox: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '48%',
  },
  footerValue: {
    fontSize: 9,
    color: '#000',
    fontWeight: 'bold',
    borderBottom: '1px solid #333',
    paddingBottom: 8,
    minWidth: 110,
    textAlign: 'center',
    marginBottom: 3,
  },
  footerLabel: {
    fontSize: 8.5,
    color: '#000',
    fontWeight: 'bold',
    marginTop: 2,
  },
watermark: {
        position: 'absolute',
        // A5 width: 148mm. (148mm - 70mm) / 2 = 39mm
        left: '32mm', 
        // A5 height: 210mm. (210mm - 60mm) / 2 = 75mm
        top: '60mm', 
        width: '70mm',
        height: '60mm',
        opacity: 0.08,
        zIndex: 0,
        // Optional: Adding flexibility for border padding
        // You might need to adjust '39mm' and '75mm' slightly 
        // to account for the border/page padding in your 'page' and 'outerBorder' styles.
    },
  watermarkImage: {
    width: '100%',
    height: '100%',
  },
  highlightAmount: {
    backgroundColor: '#fff3cd',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    borderBottom: 'none',
  },
  twoColumnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    width: '80%',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  amountLabel: {
    fontSize: 9,
    color: '#000',
    marginRight: 4,
  },
  amountValue: {
    fontSize: 9.5,
    color: '#000',
    fontWeight: 'bold',
    backgroundColor: '#fff3cd',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
    minWidth: 60,
    textAlign: 'center',
  },
  regCinText:{
    fontSize: 7.8,
    color: '#333',
      fontWeight: 'bold', 
      letterSpacing: 0.2,
       marginBottom: 3,
    }
});function formatToHundreds(num) {
  return (num / 100).toFixed(2);
}

const RegFormPdf = ({data, selectedProgram}) => {
  return (
    <Document>
      <Page size="A5" orientation="portrait" style={styles.page}>
        <View style={styles.outerBorder}>
          <Text style={styles.serialNumber}>{data.registrationNumber}</Text>
          <View style={styles.innerBorder}>
            {/* Top Prayer Text */}
            <View style={styles.topText}>
             {
              TrsutData.topTitle.map((text, index) => (
                <Text key={index} style={styles.smallText}>{text}</Text>
              ))
             }
            </View>

            {/* Watermark */}
            {(
              <View style={styles.watermark}>
                <Image src={TrsutData.logo} style={styles.watermarkImage} />
              </View>
            )}

            {/* Header Section */}
            <View style={styles.headerSection}>
              <Text style={styles.mainTitle}>{TrsutData.name}</Text>

                {TrsutData.cityState && (
                  <Text style={styles.subTitle}>{TrsutData.cityState}</Text>
                )}
                {TrsutData.regNo && (
                  <Text style={styles.regCinText}>{TrsutData.regNo}</Text>
                )}
                {TrsutData.address && (
                  <Text style={styles.address}>{TrsutData.address}</Text>
                )}
                    {TrsutData.contact && (
                      <Text style={styles.phoneNumbers}>{TrsutData.contact}</Text>
                    )}
       
              <View style={styles.schemeBox}>
                <Text style={styles.schemeText}>सदस्यता फॉर्म</Text>
              </View>
            </View>

            {/* Photo Box */}
            <View style={styles.photoBox}>
              {data.photoURL ? (
                <Image src={data.photoURL} style={styles.photoImage} />
              ) : (
                <Text style={styles.photoLabel}>सदस्य फोटो</Text>
              )}
            </View>
            <View style={styles.extraImageURLBox}>
              {data.extraImageURL ? (
                <Image src={data.extraImageURL} style={styles.photoImage} />
              ) : (
                <Text style={styles.photoLabel}>सदस्य फोटो</Text>
              )}
            </View>

            {/* Form Fields */}
            <View style={styles.formSection}>
              {/* Registration Number and Date - Two Columns */}
              <View style={styles.twoColumnRow}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>सदस्यता क्रमांक:</Text>
                  <Text style={[styles.valueFixed, { minWidth: 65 }]}>{data.registrationNumber}</Text>
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>दिनांक:</Text>
                  <Text style={[styles.valueFixed, { minWidth: 80 }]}>{data.dateJoin}</Text>
                </View>
              </View>

              {/* Name */}
              <View style={styles.fullRow}>
                <View style={styles.field}>
                  <Text style={styles.label}>नाम:</Text>
                  <Text style={[styles.value,{
                    width:"80%"
                  }]}>{data.displayName}</Text>
                </View>
              </View>

              {/* Father/Husband Name */}
              <View style={styles.fullRow}>
                <View style={styles.field}>
                  <Text style={styles.label}>पिता/पति का नाम:</Text>
                  <Text style={styles.value}>{data.fatherName}</Text>
                </View>
              </View>

              {/* Gotra, Jati - Two Columns */}
              <View style={styles.twoColumnRow}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>गोत्र:</Text>
                  <Text style={styles.value}>{data.gotra}</Text>
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>जाति:</Text>
                  <Text style={styles.value}>{data.jati}</Text>
                </View>
              </View>

              {/* Date of Birth */}
              <View style={styles.fullRow}>
                <View style={styles.field}>
                  <Text style={styles.label}>जन्म दिनांक:</Text>
                  <Text style={styles.value}>{data.bobDate}</Text>
                </View>
              </View>

              {/* Mobile Number */}
              <View style={[styles.fullRow,{width:'100%'}]}>
                <View style={styles.field}>
                  <Text style={styles.label}>मोबाईल नंबर:</Text>
                  <Text style={styles.value}>{data.phone}</Text>
                </View>
              </View>

              {/* Aadhaar Number */}
              <View style={[styles.fullRow,{width:'100%'}]}>
                <View style={styles.field}>
                  <Text style={styles.label}>आधार नंबर:</Text>
                  <Text style={styles.value}>{data.aadhaarNo}</Text>
                </View>
              </View>

              {/* Village/City */}
              <View style={[styles.fullRow,{width:'100%'}]}>
                <View style={styles.field}>
                  <Text style={styles.label}>गाँव/शहर का नाम:</Text>
                  <Text style={styles.value}>{data.village}</Text>
                </View>
              </View>

              {/* District and State - Two Columns */}
              <View style={[styles.twoColumnRow,{width:'100%'}]}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>जिला:</Text>
                  <Text style={styles.value}>{data.district}</Text>
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>राज्य:</Text>
                  <Text style={styles.value}>{data.state}</Text>
                </View>
              </View>

              {/* Guardian Details - Two Columns */}
              <View style={[styles.twoColumnRow,{width:'100%'}]}>
                <View style={[styles.halfField, { width: '60%' }]}>
                  <Text style={styles.label}>वारिसदार का नाम:</Text>
                  <Text style={styles.value}>{data.guardian}</Text>
                </View>
                <View style={[styles.halfField, { width: '38%', marginRight: 0 }]}>
                  <Text style={styles.label}>संबंध:</Text>
                  <Text style={styles.value}>{data.guardianRelation}</Text>
                </View>
              </View>

              {/* Join Fees and Scheme Name - Two Columns */}
              <View style={[styles.twoColumnRow,{width:'100%'}]}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>सदस्यता शुल्क:</Text>
                  <Text style={styles.amountValue}>₹{formatToHundreds(data.joinFees)}/- {data.joinFeesDone?'':'बकाया'}</Text>
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>योजना नाम:</Text>
                  <Text style={styles.value}>{selectedProgram.hiname}</Text>
                </View>
              </View>

              {/* Payment Amount */}
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>
                  प्रत्येक {selectedProgram.isSuraksha ? 'मृत्यु' : 'विवाह'} पर सहयोग राशि:
                </Text>
                <Text style={styles.amountValue}>₹{data.payAmount}/-</Text>
                <Text style={[styles.amountLabel, { marginLeft: 4 }]}>रुपये</Text>
              </View>

              {/* Age Group and Location Group - Two Columns */}
              <View style={styles.twoColumnRow}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>आयु वर्ग:</Text>
                  <Text style={styles.value}>{data.ageGroupRange}</Text>
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>स्थान समूह:</Text>
                  <Text style={styles.value}>{data.locationGroup}</Text>
                </View>
              </View>
            </View>

            {/* Details/Note Section */}
            {selectedProgram.noteLine && (
              <View style={styles.detailsBox}>
                <Text>{selectedProgram.noteLine}</Text>
              </View>
            )}

            {/* Footer Section */}
            <View style={styles.footerSection}>
              {/* Agent */}
              <View style={styles.footerBox}>
                <Text style={styles.footerValue}>
                  {data.addedByName} ({data.agentPhone})
                </Text>
                <Text style={styles.footerLabel}>कार्यकर्ता</Text>
              </View>

              {/* Organization */}
              <View style={styles.footerBox}>
                <Text style={styles.footerValue}>{TrsutData.trustPresident}</Text>
                <Text style={styles.footerLabel}>संस्थापक</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};
export default RegFormPdf;