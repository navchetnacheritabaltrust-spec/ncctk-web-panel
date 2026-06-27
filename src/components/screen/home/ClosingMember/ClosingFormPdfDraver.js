

import { db } from '@/lib/firebase';
import { Drawer, Spin, Alert, Button, Space } from 'antd';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc,
  arrayUnion 
} from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { LoadingOutlined, FilePdfOutlined, EditOutlined } from '@ant-design/icons';
import PaymentEditForm from './PaymentEditForm';
import ClosingFormViewer from '@/components/pdfcom/ClosingForm';
import ClosingFormPdf from '@/components/pdfcom/ClosingForm/ClosingFormPdf';

const ClosingFormPdfDrawer = ({ 
  open, 
  setOpen, 
  memberData, 
  selectedProgram, 
  closingMembers, 
  user 
}) => {
  const [payStatus, setPayStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [error, setError] = useState(null);

  const getSingleMemberPaymentStatus = async (memberId, programId, user) => {
    if (!memberId || !programId || !user) {
      setError('Missing required data');
      return null;
    }
    
    try {
      const paymentsRef = collection(db, `users/${user.uid}/programs/${programId}/payment_pending`);
      const q = query(paymentsRef, where('memberId', '==', memberId));
      const snapshot = await getDocs(q);
      
      let totalAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;
      let pendingCount = 0;
      let paidCount = 0;
      const paymentDetails = [];

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const amount = Number(data.payAmount) || 0;
        totalAmount += amount;
        
        if (data.status === 'paid') {
          paidAmount += amount;
          paidCount++;
        } else {
          pendingAmount += amount;
          pendingCount++;
        }

        paymentDetails.push({
          id: docSnap.id,
          amount,
          status: data.status || 'pending',
          dueDate: data.dueDate,
          paymentDate: data.paymentDate || "-",
          description: data.description || 'Payment'
        });
      });

      return {
        memberId,
        totalAmount,
        paidAmount,
        pendingAmount,
        pendingCount,
        paidCount,
        paymentDetails,
        summary: {
          total: totalAmount,
          paid: paidAmount,
          pending: pendingAmount,
          paidPercentage: totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0,
          pendingPercentage: totalAmount > 0 ? Math.round((pendingAmount / totalAmount) * 100) : 0
        }
      };
    } catch (error) {
      console.error('Error fetching member payment status:', error);
      setError('Failed to fetch payment data');
      return null;
    }
  };

  // Save payment data to Firebase
const savePaymentDataToFirebase = async (paymentData) => {
  // 1. Basic Validation
  if (!memberData || !user || !selectedProgram) {
    throw new Error('Missing required data for saving');
  }

  // Helper function to recursively remove undefined (Firestore safe)
  const cleanObject = (obj) => {
    const newObj = { ...obj };
    Object.keys(newObj).forEach((key) => {
      if (newObj[key] === undefined) {
        delete newObj[key];
      } else if (newObj[key] !== null && typeof newObj[key] === 'object' && !Array.isArray(newObj[key])) {
        newObj[key] = cleanObject(newObj[key]); // Recursive clean
      }
    });
    return newObj;
  };

  setSaving(true);
  try {
    // 2. Build the closing data with safe fallbacks
    const closingData = {
      memberContributed: Number(paymentData.memberContributed) || 0,
      membersCount: Number(paymentData.membersCount) || 0,
      amountGiven: Number(paymentData.amountGiven) || 0,
      paymentMode: paymentData.paymentMode || 'Cash',
      oldPending: Number(paymentData.oldPending) || 0,
      netAmount: Number(paymentData.netAmount) || 0,
      closingDate: new Date().toISOString(),
      closedBy: user.uid,
      closedByName: user.displayName || user.email || '',
      // Ensure these are never undefined (use null if not present)
      paymentDetails: payStatus?.paymentDetails || [],
      paymentSummary: payStatus?.summary || null 
    };

    // 3. Prepare the final update object
    const updateData = cleanObject({
      closingData: closingData,
      closingDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Add any other flags you need to set when a member is "closed"
    });

    console.log('Final clean data for Firestore:', updateData);

    // 4. Update Firestore
    const memberRef = doc(db, `users/${user.uid}/programs/${selectedProgram.id}/members`, memberData.id);
    
    await updateDoc(memberRef, updateData);
    
    console.log('✅ Successfully updated member document');

    return {
      ...closingData,
      memberId: memberData.id,
      memberName: memberData.displayName || 'N/A',
      registrationNumber: memberData.registrationNumber || 'N/A'
    };
  } catch (error) {
    console.error('❌ Error saving payment data:', error);
    throw error;
  } finally {
    setSaving(false);
  }
};
  // Handle saving payment data
  const handleSavePaymentData = async (data) => {
    try {
      const savedData = await savePaymentDataToFirebase(data);
      setPaymentData(savedData);
      setShowPdf(true);
      return savedData;
    } catch (error) {
      setError('Failed to save payment data');
      throw error;
    }
  };

  // Fetch payment data when drawer opens
  useEffect(() => {
    if (open && memberData && selectedProgram && user) {
      const fetchData = async () => {
        setLoading(true);
        setError(null);
        setShowPdf(false);
        setPaymentData(null);
        
        try {
          const paymentStatus = await getSingleMemberPaymentStatus(
            memberData.id, 
            selectedProgram.id, 
            user
          );
          
          if (paymentStatus) {
            setPayStatus(paymentStatus);
            
            // Check if this member already has closing data
            if (memberData.closingData) {
              setPaymentData(memberData.closingData);
              setShowPdf(true);
            }
          } else {
            setError('No payment data found for this member');
          }
        } catch (error) {
          console.error('Error fetching payment status:', error);
          setError('Failed to load payment data');
        } finally {
          setLoading(false);
        }
      };
      
      fetchData();
    }
  }, [memberData, selectedProgram, user, open]);

  // Reset states when drawer closes
  const handleCloseDrawer = () => {
    setOpen(false);
    setShowPdf(false);
    setPaymentData(null);
    setPayStatus(null);
    setError(null);
  };
const fileName = `ClosingForm_${memberData?.displayName+"_"+memberData?.registrationNumber || 'Member'}_${new Date().toISOString().split('T')[0]}.pdf`;
  return (
    <Drawer  
      title={fileName}
      placement="right"
      onClose={handleCloseDrawer}
      open={open}
      width={900}
      size='large'
      extra={
        <Space>
          {showPdf && paymentData && (
            <div className='flex gap-2 items-center'>

            <Button 
              icon={<EditOutlined />}
              onClick={() => setShowPdf(false)}
            >
              Edit Payment Data
            </Button>
              <PDFDownloadLink style={{
                background:"#1890ff",
                color:"#fff",
                border:"none",
                padding:"6px 15px",
                borderRadius:"4px",
                fontSize:"16px",
                cursor:"pointer",
            }} fileName={fileName} document={<ClosingFormPdf paymentData={paymentData} payStatus={payStatus} data={{
                    ...memberData,
                  ...paymentData,
                  dateJoin: memberData.createdAt || new Date().toLocaleDateString('en-GB')
            }} selectedProgram={selectedProgram}/>} >
                Download Pdf
            </PDFDownloadLink>
  
            </div>
          )}
          <Button onClick={handleCloseDrawer}>
            Close
          </Button>
        </Space>
      }
    >
      {loading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%' 
        }}>
          <Spin 
            indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
            tip="Loading payment data..."
          />
        </div>
      ) : error ? (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => {
              // Retry logic
              setError(null);
              setLoading(true);
              // Retry fetching data
              getSingleMemberPaymentStatus(memberData.id, selectedProgram.id, user)
                .then(setPayStatus)
                .catch(setError)
                .finally(() => setLoading(false));
            }}>
              Retry
            </Button>
          }
        />
      ) : !showPdf ? (
        // Show editing form
        <PaymentEditForm
          payStatus={payStatus}
          memberData={memberData}
          selectedProgram={selectedProgram}
          onSave={handleSavePaymentData}
          onCancel={() => setShowPdf(false)}
        />
      ) : (
        // Show PDF
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column' 
        }}>
   
          
          <div style={{ 
            flex: 1, 
            border: '1px solid #d9d9d9',
            borderRadius: 4,
          }}>
     
              <ClosingFormViewer 
                data={{
                  ...memberData,
                  ...paymentData,
                  dateJoin: memberData.createdAt || new Date().toLocaleDateString('en-GB')
                }}
                selectedProgram={selectedProgram}
                payStatus={payStatus}
                paymentData={paymentData}
              />
          </div>
          
      
        </div>
      )}

      {saving && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <Spin 
            size="large"
            tip="Saving payment data..."
          />
        </div>
      )}
    </Drawer>
  );
};

export default ClosingFormPdfDrawer;