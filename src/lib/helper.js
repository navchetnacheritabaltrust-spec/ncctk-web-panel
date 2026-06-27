import {
    doc,
    runTransaction,
    collection,
    where,
    query,
    getDocs,
    increment, 
  getDoc,
  
} from "firebase/firestore";
import { auth, db } from "./firebase";

// मान लीजिए कि 'db' आपकी Firebase इनिशियलाइज़ेशन फ़ाइल से आयात किया गया है
// import { db } from "./firebase"; 

// एक उदाहरण generateUnique4Digit फ़ंक्शन (हालांकि ट्रांजेक्शन में अब इसका उपयोग नहीं किया जाता है)
let used4DigitNumbers = new Set(); // यह केवल उदाहरण के लिए है
export function genUnique4DigitByTime() {
    const now = Date.now().toString(); // timestamp
    const last4 = now.slice(-4);       // last 4 digits
    return Number(last4);
}
export function generate6DigitRegNo() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);

  return (array[0] % 900000) + 100000; // always 6 digit
}

export function generateUnique4Digit() {
    let num;
    do {
        num = Math.floor(1000 + Math.random() * 9000);
    } while (used4DigitNumbers.has(num));
    used4DigitNumbers.add(num);
    return num;
}

/**
 * परमाणु रूप से सदस्य बनाता है और प्रोग्राम और एजेंट दोनों काउंटरों को बढ़ाता है।
 * @param {string} programDocPath - प्रोग्राम दस्तावेज़ का पूर्ण पथ।
 * @param {string} memberCollectionPath - सदस्य सबकलेक्शन का पूर्ण पथ।
 * @param {object} memberData - सदस्य डेटा जिसमें registrationNumber/memberNumber शामिल नहीं है।
 * @param {string | null} agentId - एजेंट का ID, यदि लागू हो।
 */
export async function createMemberInTransaction(
    programDocPath,
    memberCollectionPath,
    memberData,
    agentId
) {
    const programDocRef = doc(db, programDocPath);

    // Agent Document Reference
    let agentDocRef = null;
    if (agentId) {
        const userUid = programDocPath.split('/')[2];
        agentDocRef = doc(db, `users/${userUid}/agents`, agentId);
    }

    return await runTransaction(db, async (transaction) => {

        // **********************************************
        // 1. ALL READS
        // **********************************************

        // Read Program Document
        const programDoc = await transaction.get(programDocRef);
        if (!programDoc.exists()) {
            throw new Error("Program Document does not exist!");
        }

        // Read Agent Document (if agentId exists)
        let agentDoc = null;
        if (agentId && agentDocRef) {
            agentDoc = await transaction.get(agentDocRef);
        }

        // **********************************************
        // 2. DATA PROCESSING
        // **********************************************

        // Calculate new member number
        const currentMemberCount = programDoc.data().memberCount || 0;
        const newMemberCount = currentMemberCount + 1;
        
        // Generate registration number
        const newRegistrationNumber = 'R' + generate6DigitRegNo();

        // Prepare member data
        const newMemberData = {
            ...memberData,
            registrationNumber: newRegistrationNumber,
            memberNumber: newMemberCount,
        };

        // **********************************************
        // 3. ALL WRITES
        // **********************************************

        // Update program document counter
        transaction.update(programDocRef, {
            memberCount: newMemberCount
        });

        // Update agent document program-specific counter
        if (agentId && agentDoc && agentDoc.exists()) {
            const programId = memberData.programId;
            const programCounts = agentDoc.data().programCounts || {};
            const currentProgramCount = programCounts[programId] || 0;
            const newProgramCount = parseInt(currentProgramCount) + 1;

            transaction.update(agentDocRef, {
                [`programCounts.${programId}`]: newProgramCount
            });
        }

        // Create new member document
        const memberCollectionRef = collection(db, memberCollectionPath);
        const newMemberDocRef = doc(memberCollectionRef);
        const memberId = newMemberDocRef.id;

        transaction.set(newMemberDocRef, newMemberData);

        // Return member data with ID
        return {
            ...newMemberData,
            id: memberId
        };
    });
}

/**
 * Check if Aadhaar number already exists in a specific program
 * @param {string} memberCollectionPath - Path to members collection (e.g., `/users/{uid}/programs/{programId}/members`)
 * @param {string} aadhaarNo - 12-digit Aadhaar number to check
 * @returns {Promise<boolean>} - Returns true if Aadhaar exists, false otherwise
 */
export const checkAadhaarExists = async (memberCollectionPath, aadhaarNo) => {
  try {
    // Create a query to check if aadhaarNo exists
    const membersRef = collection(db, memberCollectionPath);
    const q = query(
      membersRef, 
      where("status", "==", "accepted"), // Only check accepted members
      where('aadhaarNo', '==', aadhaarNo),
      where('delete_flag', '==', false) // Only check active members
    );
    
    const querySnapshot = await getDocs(q);
    
    // If any documents are found, Aadhaar already exists
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking Aadhaar existence:', error);
    throw error;
  }
};

// Alternative version with more details (optional)
/**
 * Check Aadhaar and get member details if exists
 * @param {string} memberCollectionPath - Path to members collection
 * @param {string} aadhaarNo - 12-digit Aadhaar number
 * @returns {Promise<{exists: boolean, member: object|null}>}
 */
export const checkAadhaarExistsWithDetails = async (memberCollectionPath, aadhaarNo) => {
  try {
    const membersRef = collection(db, memberCollectionPath);
    const q = query(
      membersRef, 
      where('aadhaarNo', '==', aadhaarNo),
      where('delete_flag', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { exists: false, member: null };
    }
    
    // Get the first matching member's data
    const memberDoc = querySnapshot.docs[0];
    return {
      exists: true,
      member: {
        id: memberDoc.id,
        ...memberDoc.data()
      }
    };
  } catch (error) {
    console.error('Error checking Aadhaar with details:', error);
    throw error;
  }
};


export async function acceptMemberWithCounterUpdate(
    userUid,
    programId,
    memberId,
    memberData,
    agentId = null
) {
    const programDocPath = `users/${userUid}/programs/${programId}`;
    const memberDocPath = `users/${userUid}/programs/${programId}/members/${memberId}`;
    
    const programDocRef = doc(db, programDocPath);
    const memberDocRef = doc(db, memberDocPath);

    // Agent document reference
    let agentDocRef = null;
    if (agentId) {
        agentDocRef = doc(db, `users/${userUid}/agents`, agentId);
    }

    return await runTransaction(db, async (transaction) => {
        // **********************************************
        // 1. READ ALL DOCUMENTS FIRST
        // **********************************************
        
        const programDoc = await transaction.get(programDocRef);
        if (!programDoc.exists()) {
            throw new Error("Program Document does not exist!");
        }

        const memberDoc = await transaction.get(memberDocRef);
        if (!memberDoc.exists()) {
            throw new Error("Member Document does not exist!");
        }

        let agentDoc = null;
        if (agentId && agentDocRef) {
            agentDoc = await transaction.get(agentDocRef);
            if (!agentDoc.exists()) {
                throw new Error("Agent Document does not exist!");
            }
        }

        // **********************************************
        // 2. PROCESS DATA AND COUNTERS
        // **********************************************
        
        const currentMemberCount = programDoc.data().memberCount || 0;
        const newMemberCount = parseInt(currentMemberCount) + 1;

        // Generate registration number
        const newRegistrationNumber = 'R' + generate6DigitRegNo();

        // Prepare updated member data
        const updatedMemberData = {
            ...memberData,
            registrationNumber: newRegistrationNumber,
            memberNumber: newMemberCount,
            acceptedAt: new Date().toISOString(), // Optional: add acceptance timestamp
            status: 'accepted' // Optional: update status
        };

        // **********************************************
        // 3. PERFORM ALL WRITES
        // **********************************************
        
        // 3a. Update program member count
        transaction.update(programDocRef, {
            memberCount: newMemberCount,
            updatedAt: new Date().toISOString() // Optional: update timestamp
        });

        // 3b. Update agent program-specific counter if agent exists
        if (agentId && agentDoc && agentDoc.exists()) {
            const programCounts = agentDoc.data().programCounts || {};
            const currentProgramCount = programCounts[programId] || 0;
            const newProgramCount = currentProgramCount + 1;

            transaction.update(agentDocRef, {
                [`programCounts.${programId}`]: newProgramCount,
                updatedAt: new Date().toISOString() // Optional: update timestamp
            });
        }

        // 3c. Update member document with new data
        transaction.update(memberDocRef, updatedMemberData);

        // **********************************************
        // 4. RETURN COMPLETE DATA WITH MEMBER ID
        // **********************************************
        
        return {
            ...updatedMemberData,
            id: memberId,                    // Return the member ID
            memberId: memberId,              // Also return as memberId for clarity
            memberNumber: newMemberCount,
            registrationNumber: newRegistrationNumber
        };
    });
}

export async function updateMemberStatus(
    userUid,
    programId,
    memberId,
    updateData
) {
    const memberDocPath = `users/${userUid}/programs/${programId}/members/${memberId}`;
    const memberDocRef = doc(db, memberDocPath);

    try {
        await runTransaction(db, async (transaction) => {
            const memberDoc = await transaction.get(memberDocRef);
            if (!memberDoc.exists()) {
                throw new Error("Member Document does not exist!");
            }
            
            transaction.update(memberDocRef, updateData);
        });
        
        return updateData;
    } catch (error) {
        console.error('Error updating member status:', error);
        throw error;
    }
}

export const sendFirebaseNotification = async (token,title,body,image,data) => {

  const dataFormate={
          message: {
        token: token,
        // The 'data' payload is typical for silent or background messages, 
        // or for custom handling on the client (like in Expo/React Native).
        data: {
          channelId: 'marriage-custom-channel',
          url:"/(tabs)",
          body: JSON.stringify(data || {}),
          // The next two fields are often required for Expo managed apps
          scopeKey:"@sss_trust_app/sssevasansthan",
          experienceId: "@sss_trust_app/sssevasansthan" 
        },
        "notification": {
      "title": title,
      "body": body,
      "image":image || "",
      // "channelId": "marriage-custom-channel"
    }, 
      
    }
  }
   try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataFormate),
      });

      const res = await response.json();
      
      if (res.success) {
        return true
      } else {
        return false
      }
    } catch (error) {
      console.error('Error sending Firebase notification:', error);
    }
}


export async function toggleMemberBlockStatus(
  userUid,
  programId,
  memberId,
  agentId = null,
  message
) {
  const programDocRef = doc(db, `users/${userUid}/programs/${programId}`);
  const memberDocRef = doc(
    db,
    `users/${userUid}/programs/${programId}/members/${memberId}`
  );

  let agentDocRef = null;
  if (agentId) {
    agentDocRef = doc(db, `users/${userUid}/agents`, agentId);
  }

  return await runTransaction(db, async (transaction) => {
    // 🔹 READS
    const programDoc = await transaction.get(programDocRef);
    if (!programDoc.exists()) throw new Error("Program not found");

    const memberDoc = await transaction.get(memberDocRef);
    if (!memberDoc.exists()) throw new Error("Member not found");

    let agentDoc = null;
    if (agentDocRef) {
      agentDoc = await transaction.get(agentDocRef);
    }

    const memberData = memberDoc.data();
    const programCount = programDoc.data().memberCount || 0;
    const InActiveCount = programDoc.data().inactivemembercount || 0;

   
    let newStatus;
    let activeFlag;
    let countChange; // +1 or -1
    let inactiveCount

    // 🔁 TOGGLE LOGIC
    if (memberData.status === "blocked") {
      newStatus = "accepted";
      activeFlag = true;
      countChange = +1;
      inactiveCount=-1
    } else {
      newStatus = "blocked";
      activeFlag = false;
      countChange = -1;
      inactiveCount=+1
    }

    // 🔹 UPDATE PROGRAM COUNT
    transaction.update(programDocRef, {
      memberCount: Math.max(programCount + countChange, 0),
      inactivemembercount:Math.max(InActiveCount + inactiveCount, 0)
    });

    // 🔹 UPDATE AGENT COUNT
    if (agentDoc && agentDoc.exists()) {
      const programCounts = agentDoc.data().programCounts || {};
      const currentAgentCount = programCounts[programId] || 0;

      transaction.update(agentDocRef, {
        [`programCounts.${programId}`]: Math.max(
          currentAgentCount + countChange,
          0
        ),
      });
    }

    // 🔹 UPDATE MEMBER
    transaction.update(memberDocRef, {
      status: newStatus,
      active_flag: activeFlag,
      updatedAt: new Date(),
    });
    if(message){
      message?.success("Member Blocked Successfully")
    }

    return {
      memberId,
      status: newStatus,
      active_flag: activeFlag,
      countChange,
      inactiveCount
    };
  });
}

export async function updateCounts(
  userUid,
  programId,
  agentId = null,
  countChange = 1
) {
  const programDocRef = doc(db, `users/${userUid}/programs/${programId}`);
  const agentDocRef = agentId
    ? doc(db, `users/${userUid}/agents/${agentId}`)
    : null;

  return await runTransaction(db, async (transaction) => {

    // ✅ FIRST: ALL READS
    const programSnap = await transaction.get(programDocRef);

    if (!programSnap.exists()) {
      throw new Error("Program not found");
    }

    let agentSnap = null;
    if (agentDocRef) {
      agentSnap = await transaction.get(agentDocRef);
    }

    // ✅ SECOND: ALL WRITES

    const currentCount = programSnap.data().memberCount || 0;
    const newCount = currentCount + countChange;

    transaction.update(programDocRef, {
      memberCount: newCount < 0 ? 0 : newCount,
    });

    if (agentDocRef && agentSnap?.exists()) {
      const programCounts = agentSnap.data().programCounts || {};
      const currentAgentCount = programCounts[programId] || 0;
      const newAgentCount = currentAgentCount + countChange;

      transaction.update(agentDocRef, {
        [`programCounts.${programId}`]:
          newAgentCount < 0 ? 0 : newAgentCount,
      });
    }

    console.log("updated count done");
    return { success: true };
  });
}


export async function getAgentMemberPaystatus({
  userId,
  programId,
  agentId,
  closingGroupId, // Add this parameter
}) {
  // 1️⃣ Ensure user is logged in
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");

  // 2️⃣ Get Firebase ID Token
  const token = await user.getIdToken(true);
  const URl = process.env.NEXT_PUBLIC_GET_AGENT_PAY_STATUS_URL;

  // Build URL with query params
  let url = `${URl}?userId=${userId}&programId=${programId}&agentId=${agentId}`;
  if (closingGroupId && closingGroupId !== 'all') {
    url += `&closingGroupId=${closingGroupId}`;
  }

  // 3️⃣ Call Cloud Function
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Request failed");
  }

  return res.json();
}


export const fetchSingleMemberMarriageReport = async ({
  userId,
  programId,
  memberId
}) => {
  try {
    if (!userId || !programId || !memberId) {
      throw new Error("userId, programId and memberId required");
    }

    // 🔹 1️⃣ Fetch Member
    const memberRef = doc(
      db,
      `users/${userId}/programs/${programId}/members/${memberId}`
    );

    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
      throw new Error("Member not found");
    }

    const memberData = memberSnap.data();

    const member = {
      memberId,
      ...memberData,
      marriages: [],
      summary: {
        totalMarriages: 0,
        pendingMarriages: 0,
        paidMarriages: 0,
        pendingAmount: 0,
        paidAmount: 0
      }
    };

    // 🔹 2️⃣ Fetch Payments for this Member
    const paymentRef = collection(
      db,
      `users/${userId}/programs/${programId}/payment_pending`
    );

    const q = query(
      paymentRef,
      where("memberId", "==", memberId),
      where("delete_flag", "==", false)
    );

    const paymentSnap = await getDocs(q);

    paymentSnap.forEach((docSnap) => {
      const payment = docSnap.data();

      const marriageData = {
        paymentId: docSnap.id,
        payerMemberId: payment.memberId,
        closingMemberId: payment.closingMemberId,
        closingMemberName: payment.closingMemberName || "",
        closingRegNo: payment.closingRegNo || "NA",
        closingFatherName: payment.closingFatherName || "NA",
        closingJati: payment.jati || "NA",
        closingVillage: payment.village || "NA",
        marriageDate: payment.closing_date || "",
        paymentFor: payment.paymentFor || "Marriage Case",
        closingPhone: payment.phone || "NA",
        status: payment.status || "pending",
        amount: payment.payAmount || 0,
        createdDate: payment.createdDate || "",
        updatedDate: payment.updatedDate || ""
      };

      member.marriages.push(marriageData);

      // 🔹 Summary calculation
      if (payment.status === "pending") {
        member.summary.pendingMarriages++;
        member.summary.pendingAmount += payment.payAmount || 0;
      } else if (payment.status === "paid") {
        member.summary.paidMarriages++;
        member.summary.paidAmount += payment.payAmount || 0;
      }

      member.summary.totalMarriages++;
    });

    // 🔹 Sort marriages (pending first, then latest)
    member.marriages.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "pending" ? -1 : 1;
      }
      return new Date(b.createdDate) - new Date(a.createdDate);
    });

    return {
      success: true,
      report: {
        ...member,
        totalAmount:
          member.summary.pendingAmount +
          member.summary.paidAmount
      },
      summary: {
        totalMembers: 1,
        totalPending: member.summary.pendingMarriages,
        totalPaid: member.summary.paidMarriages,
        totalPendingAmount: member.summary.pendingAmount,
        totalPaidAmount: member.summary.paidAmount,
        totalAmount:
          member.summary.pendingAmount +
          member.summary.paidAmount
      }
    };

  } catch (error) {
    console.error("Single member report error:", error);
    throw error;
  }
};