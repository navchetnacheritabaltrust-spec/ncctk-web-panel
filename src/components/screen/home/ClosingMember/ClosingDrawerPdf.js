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
import { useSelector } from 'react-redux';
import { pdfColors, TrsutData } from '@/lib/constentData';
import PdfHeaderCom from '../../agents/agentDetails/component/pdfcom/HeaderCom';

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

const styles = StyleSheet.create({
  page: {
    backgroundColor: pdfColors.bgColor,
    fontFamily: 'NotoSansDevanagari',
    padding: 15,
  },
  outerBorder: {
    border: `4px solid ${pdfColors.borderColor}`,
    padding: 5,
    height: '100%',
    borderRadius: 4,
  },
  innerBorder: {
    border: `2px solid ${pdfColors.borderColor}`,
    padding: 10,
    height: '100%',
    borderRadius: 2,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  
  // Header Styles
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
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  address: {
    fontSize: 9,
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  phoneNumbers: {
    fontSize: 10,
    color: '#000',
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
  
  // Date Info Section
  dateInfoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: `1px solid ${pdfColors.borderColor}`,
  },
  dateText: {
    fontSize: 9,
    color: '#333',
    fontWeight: 'bold',
  },
  schemeTypeText: {
    fontSize: 10,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
  },
  deathDateText: {
    fontSize: 9,
    color: '#333',
    fontWeight: 'bold',
  },
  
  // Banner Image
  bannerImage: {
    width: '100%',
    height: 250,
    marginBottom: 10,
    objectFit: 'fill',
  },
  
  // Description Section
  descriptionSection: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
    borderLeft: `3px solid ${pdfColors.headingColor}`,
  },
  descriptionText: {
    fontSize: 12,
    lineHeight: 1.6,
    color: '#333',
    textAlign: 'justify',
    fontWeight: 'bold',
  },
  
  // TWO COLUMN LAYOUT
  twoColumnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  
  leftColumn: {
    width: '48%',
  },
  
  rightColumn: {
    width: '48%',
  },
  
  // Section Title
  sectionTitle: {
    fontSize: 11,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: `2px solid ${pdfColors.borderColor}`,
  },
  
  // Member Information
  memberInfoBox: {
    backgroundColor: '#fff8f0',
    padding: 10,
    borderRadius: 4,
    border: `1px solid ${pdfColors.borderColor}`,
  },
  
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    fontSize: 11,
    color: '#666',
    width: '42%',
    fontWeight: 'bold',
  },
  infoValue: {
    fontSize: 11,
    color: '#000',
    width: '58%',
  },
  
  // Service Stats
  serviceStats: {
    backgroundColor: '#fff8e1',
    padding: 8,
    borderRadius: 4,
    marginTop: 8,
    border: `1px solid ${pdfColors.borderColor}`,
  },
  statText: {
    fontSize: 9,
    color: '#333',
    marginBottom: 3,
    fontWeight: 'bold',
  },
  
  // Donation Section
  donationBox: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 4,
    border: '1px solid #87ceeb',
  },
  
  donationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: '1px dashed #87ceeb',
  },
  donationTextContainer: {
    width: '70%',
  },
  donationText: {
    fontSize: 11,
    color: '#333',
    lineHeight: 1.4,
  },
  donationAmount: {
    fontSize: 11,
    color: '#000',
    fontWeight: 'bold',
    width: '30%',
    textAlign: 'right',
  },
  
  // Calculations
  calculationSection: {
    marginTop: 4,
    // paddingTop: 8,
    // borderTop: '2px dashed #87ceeb',
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingVertical: 3,
  },
  calculationLabel: {
    fontSize: 11,
    color: '#555',
  },
  calculationValue: {
    fontSize: 11,
    color: '#000',
    fontWeight: 'bold',
  },
  
  // Total Section
  totalAmountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTop: '2px solid #0066cc',
    backgroundColor: '#e3f2fd',
    padding: 10,
    borderRadius: 4,
  },
  totalLabel: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 13,
    color: '#8B0000',
    fontWeight: 'bold',
  },
  
  // Footer Section
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 12,
    paddingHorizontal: 4,
    borderTop: `1px solid ${pdfColors.borderColor}`,
  },
  footerBox: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '48%',
  },
  footerValue: {
    fontSize: 11,
    color: '#000',
    fontWeight: 'bold',
    borderBottom: '1px solid #333',
    paddingBottom: 8,
    minWidth: 120,
    textAlign: 'center',
    marginBottom: 4,
  },
  footerLabel: {
    fontSize: 11,
    color: pdfColors.headingColor,
    fontWeight: 'bold',
    marginTop: 2,
  },
  
  // Bottom Contact
  bottomContactInfo: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTop: '1px dashed #ccc',
  },
  
  serialNumber: {
    position: 'absolute',
    top: 5,
    right: 10,
    fontSize: 8,
    color: '#999',
  },
});

const ClosingDrawerPdf = ({ data, selectedProgram }) => {
     
  // Get PDF data from props or use default
  const pdfData = data?.pdfData || {
    documentNumber: `SSS/${new Date().getFullYear()}/001`,
    date: new Date().toLocaleDateString('en-IN'),
    deathDate: new Date().toLocaleDateString('en-IN'),
    schemeType: selectedProgram?.hiname || 'सहयोग योजना भाग 2',
    
    memberInfo: {
      heir: data?.guardian || 'गौषान, गौता देवी',
      joiningDate: data?.dateJoin || '13-07-2019',
      membershipNumber: data?.registrationNumber || '851766',
      name: data?.displayName || 'सुजाराम / दाना राम, सोलंकी',
      address: data?.currentAddress || 'जन्सपुर, सिरोही, राजस्थान',
      mobile: data?.phone || '1234567890',
      totalServicesProvided: 259,
      totalContribution: 51800,
    },
    
    donations: [
      { description: '100 किस्त के सदस्य × 622', amount: 62200 },
      { description: '200 किस्त के सदस्य × 982', amount: 196400 },
    ],
    
    donationCalculations: {
      totalBeforeDeduction: 258600,
      deductionPercentage: 10,
      deductionAmount: 25860,
      finalAmount: 232740
    },
    
    recipientName: data?.addedByName || 'रामकुमार शर्मा',
    recipientRole: 'परिवार के प्रतिनिधि',
    organizationName: TrsutData.name,
    organizationTitle: 'संस्था अध्यक्ष',
    contactPhone1: TrsutData.contact,
    contactPhone2: TrsutData.contact,
    
    bannerImageUrl: '',
  };

  console.log(data,'data')

  // Format numbers with Indian numbering system
  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  };

  // Calculate donation totals if not provided
  const getCalculations = () => {
    if (pdfData.donationCalculations?.totalBeforeDeduction) {
      return pdfData.donationCalculations;
    }
    
    // Calculate from donations array
    const totalBeforeDeduction = pdfData.donations?.reduce((sum, item) => 
      sum + (Number(item.amount) || 0), 0) || 0;
    
    const deductionPercentage = 10;
    const deductionAmount = (totalBeforeDeduction * deductionPercentage) / 100;
    const finalAmount = totalBeforeDeduction - deductionAmount;
    
    return {
      totalBeforeDeduction,
      deductionPercentage,
      deductionAmount,
      finalAmount
    };
  };

  const titelYojna=selectedProgram?.isSuraksha ? 'दिवंगत' : 'विवाह';

  const calculations = getCalculations();
  const getDesctions=()=>{
    if(selectedProgram?.isSuraksha){
      return      <View style={styles.descriptionSection}>
  <Text style={styles.descriptionText}>
    दिनांक {data.pdfData.date} को, समाज के सभी सम्मानित मेहमानों की उपस्थिति में, संस्था के एक सदस्य की मृत्यु
  </Text>

  <Text style={styles.descriptionText}>
    पर नियमानुसार सहायता राशि प्रदान की गई। संस्थान उन सदस्यों की सम्मानपूर्वक श्रद्धांजलि अर्पित करती है,
  </Text>

  <Text style={styles.descriptionText}>
    जिन्होंने अपने जीवनकाल में सेवा कार्य में सक्रिय भूमिका निभाई और समाज के उत्थान में योगदान दिया संस्थान
  </Text>

  <Text style={styles.descriptionText}>
   के अन्य सदस्यों द्वारा सहायतार्थ डोनेशन राशि एकत्रित  की गई, जिसे दिवंगत सदस्य के परिवार को सौंपा गया।
  </Text>

</View>
    }else{
      return <View style={styles.descriptionSection}>
  <Text style={styles.descriptionText}>
    दिनांक {data.pdfData.date} विवाह है और ,समाज के सभी सम्मानित मेहमानों की उपस्थिति में,नियमानुसार
  </Text>

  <Text style={styles.descriptionText}>
    सहायता राशि प्रदान की गई। अपनी संस्थान ने सभी बेटे और बेटिया तन मन से हर विवाह में योगदान 
  </Text>

  <Text style={styles.descriptionText}>
 दे रहे है जिससे यह सेवा संभव हो पाई है। उनके अथक प्रयास और समर्पण से संस्थान अपने उद्देश्यों को 
  </Text>

  <Text style={styles.descriptionText}>
 सफलतापूर्वक पूरा कर रही है।
  </Text>

</View>
    }
  }

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        <Text style={styles.serialNumber}>Doc No: {pdfData.documentNumber}</Text>
        
        <View style={styles.outerBorder}>
          <View style={styles.innerBorder}>
            {/* Header Section */}
        <PdfHeaderCom/>
            
            <View style={styles.headerSection}>
           
              
              <View style={styles.centerContent}>
             
             
                <View style={styles.schemeBox}>
                  <Text style={styles.schemeText}>डोनैशन पत्र</Text>
                </View>
              </View> 
              
           
            </View>
            
            {/* Date Information Section */}
            <View style={styles.dateInfoSection}>
              <Text style={styles.dateText}>दिनांक : {pdfData.date}</Text>
              <Text style={styles.schemeTypeText}>{pdfData.schemeType}</Text>
              <Text style={styles.deathDateText}>{titelYojna} दिनांक : {pdfData.deathDate}</Text>
            </View>
            
            {/* Banner Image */}
            <Image 
              src={pdfData.bannerImageUrl || "/Images/BannerImg.jpeg"}
              style={styles.bannerImage}
            />
            
            {/* Description Section */}
        {getDesctions()}
            {/* TWO COLUMN LAYOUT */}
            <View style={styles.twoColumnContainer}>
              
              {/* LEFT COLUMN - Member Information */}
              <View style={styles.leftColumn}>
                <Text style={styles.sectionTitle}>सदस्य की जानकारी</Text>
                
                <View style={styles.memberInfoBox}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>वारिसदार :</Text>
                    <Text style={styles.infoValue}>{pdfData.memberInfo.heir}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>नाम :</Text>
                    <Text style={styles.infoValue}>{pdfData.memberInfo.name}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>सदस्यता क्रमांक :</Text>
                    <Text style={styles.infoValue}>{pdfData.memberInfo.membershipNumber}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>जुड़ने की तिथि :</Text>
                    <Text style={styles.infoValue}>{pdfData.memberInfo.joiningDate}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>पता :</Text>
                    <Text style={styles.infoValue}>{pdfData.memberInfo.address}</Text>
                  </View>
                  
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>मोबाईल नंबर :</Text>
                    <Text style={styles.infoValue}>{pdfData.memberInfo.mobile}</Text>
                  </View>
                </View>
                
                {/* Service Statistics */}
                <View style={styles.serviceStats}>
                  <Text style={styles.statText}>
                    इनकी तरफ से कुल सदस्यों को सेवा दी : {pdfData.memberInfo.totalServicesProvided}
                  </Text>
                  <Text style={styles.statText}>
                    इनकी तरफ से कुल योगदान राशि दी गई : ₹{formatNumber(pdfData.memberInfo.totalContribution)}
                  </Text>
                </View>
              </View>
              
              {/* RIGHT COLUMN - Donation Details */}
              <View style={styles.rightColumn}>
                <Text style={styles.sectionTitle}>डोनेशन का विवरण</Text>
                
                <View style={styles.donationBox}>
                  {/* Donation Items */}
                  {pdfData.donations?.map((donation, index) => (
                    <View key={index} style={styles.donationItem}>
                      <View style={styles.donationTextContainer}>
                        <Text style={styles.donationText}>{donation.description}</Text>
                      </View>
                      <Text style={styles.donationAmount}>
                        ₹{formatNumber(donation.amount)}
                      </Text>
                    </View>
                  ))}
                  
                  {/* Calculations */}
                  <View style={styles.calculationSection}>
                    <View style={styles.calculationRow}>
                      <Text style={styles.calculationLabel}>कुल डोनेशन राशि</Text>
                      <Text style={styles.calculationValue}>
                        ₹{formatNumber(calculations.totalBeforeDeduction)}
                      </Text>
                    </View>
                    {
                      calculations.deductionPercentage > 0 && <View style={styles.calculationRow}>
                      <Text style={styles.calculationLabel}>
                        {calculations.deductionPercentage}% खर्च कटौती
                      </Text>
                      <Text style={styles.calculationValue}>
                        - ₹{formatNumber(calculations.deductionAmount)}
                      </Text>
                    </View>
                    }
                    
                  </View>
                  
                  {/* Total */}
                  <View style={styles.totalAmountSection}>
                    <Text style={styles.totalLabel}>कुल प्राप्त राशि</Text>
                    <Text style={styles.totalAmount}>
                      ₹{formatNumber(calculations.finalAmount)}
                    </Text>
                  </View>
                </View>
              </View>
              
            </View>
            
            {/* Footer Section */}
            <View style={styles.footerSection}>
              {/* Agent */}
              <View style={styles.footerBox}>
                <Text style={styles.footerValue}>
                  {data?.addedByName || 'कार्यकर्ता का नाम'} ({data?.agentPhone || 'मोबाइल नंबर'})
                </Text>
                <Text style={styles.footerLabel}>कार्यकर्ता</Text>
              </View>

              {/* Organization */}
              <View style={styles.footerBox}>
                <Text style={styles.footerValue}>{TrsutData.name}</Text>
                <Text style={styles.footerLabel}>संस्थान</Text>
              </View>
            </View>

            <Text style={styles.bottomContactInfo}>
              संपर्क करें: {TrsutData.contact}
            </Text>
            
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default ClosingDrawerPdf;