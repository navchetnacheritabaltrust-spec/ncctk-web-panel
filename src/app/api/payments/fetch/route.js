// app/api/payments/fetch/route.js
import { NextResponse } from 'next/server';
import admin from '../../admin';

const adminDb = admin.firestore();
const adminAuth = admin.auth();

// ── Token verify ───────────────────────────────────────────────────────────
async function verifyToken(request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.split('Bearer ')[1];
  if (!token) return { uid: null, error: 'Unauthorized' };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, error: null };
  } catch {
    return { uid: null, error: 'Invalid or expired token' };
  }
}

export async function GET(request) {
  try {
    // 1. Auth
    const { uid, error: authError } = await verifyToken(request);
    if (authError) return NextResponse.json({ error: authError }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');
    if (!programId) return NextResponse.json({ error: 'programId required' }, { status: 400 });

    const basePath = `users/${uid}/programs/${programId}`;

    // 2. All 3 queries PARALLEL + field projection (less data from Firestore = faster)
    const [membersSnap, pendingSnap, txSnap] = await Promise.all([
      adminDb.collection(`${basePath}/members`)
        .where('active_flag', '==', true)
        .where('delete_flag', '==', false)
        .where('status', '==', 'accepted')
        .orderBy('createdAt', 'desc')
        .get(),

      // Only fetch fields needed for stats — huge payload reduction
      adminDb.collection(`${basePath}/payment_pending`)
        .where('delete_flag', '==', false)
        .select('memberId', 'status')
        .get(),

      // Only fetch fields needed for sum
      adminDb.collection(`${basePath}/transactions`)
        .where('status', '==', 'completed')
        .where('delete_flag', '==', false)
        .select('payerId', 'amount')
        .get(),
    ]);

    // 3. Pre-group by memberId — O(n) instead of O(n²) filter inside loop
    const pendingByMember = {};
    for (const doc of pendingSnap.docs) {
      const { memberId, status } = doc.data();
      if (!pendingByMember[memberId]) {
        pendingByMember[memberId] = { total: 0, pending: 0, paid: 0 };
      }
      pendingByMember[memberId].total++;
      if (status === 'pending') pendingByMember[memberId].pending++;
      if (status === 'paid')    pendingByMember[memberId].paid++;
    }

    const paidAmtByMember = {};
    for (const doc of txSnap.docs) {
      const { payerId, amount } = doc.data();
      paidAmtByMember[payerId] = (paidAmtByMember[payerId] || 0) + (amount || 0);
    }

    // 4. Enrich members — single pass, no nested loops
    let summaryTotalAmt = 0, summaryTotalPaid = 0, summaryTotalPending = 0, summaryWithPending = 0;

    const enriched = membersSnap.docs.map((d) => {
      const member = { id: d.id, ...d.data() };
      const payAmount  = member.payAmount || 200;
      const stats      = pendingByMember[member.id] || { total: 0, pending: 0, paid: 0 };
      const totalPaid  = paidAmtByMember[member.id] || 0;
      const totalAmt   = stats.total * payAmount;
      const totalPend  = Math.max(0, totalAmt - totalPaid);
      const paidPct    = totalAmt > 0 ? Math.round((totalPaid / totalAmt) * 100) : 0;

      summaryTotalAmt     += totalAmt;
      summaryTotalPaid    += totalPaid;
      summaryTotalPending += totalPend;
      if (totalPend > 0) summaryWithPending++;

      return {
        ...member,
        key: member.id,
        payAmount,
        closingCount:        stats.total,
        pendingClosingCount: stats.pending,
        paidClosingCount:    stats.paid,
        totalAmount:         totalAmt,
        totalPaid,
        totalPending:        totalPend,
        paidPct,
      };
    });

    return NextResponse.json({
      members: enriched,
      summary: {
        total:              enriched.length,
        totalAmount:        summaryTotalAmt,
        totalPaid:          summaryTotalPaid,
        totalPending:       summaryTotalPending,
        membersWithPending: summaryWithPending,
      },
    });
  } catch (err) {
    console.error('[payments/fetch]', err);
    return NextResponse.json({ error: 'Server error', details: err.message }, { status: 500 });
  }
}