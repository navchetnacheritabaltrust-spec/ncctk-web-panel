// app/api/closing-payment-status/route.js
import { NextResponse } from 'next/server';
import admin from '../admin';

const adminDb = admin.firestore();
const adminAuth = admin.auth();

// ── Auth helper ───────────────────────────────────────────────────────────────
async function verifyToken(request) {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return { uid: null, error: 'Unauthorized' };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, error: null };
  } catch {
    return { uid: null, error: 'Invalid or expired token' };
  }
}

// ── Timestamp → ms helper ─────────────────────────────────────────────────────
function toMs(val) {
  if (!val) return null;
  if (typeof val === 'object' && 'seconds' in val) return val.seconds * 1000;
  if (val?.toDate) return val.toDate().getTime();
  if (typeof val === 'string' && val.includes('-')) {
    const [d, m, y] = val.split('-');
    return new Date(`${y}-${m}-${d}`).getTime();
  }
  return null;
}

// ── Core logic ────────────────────────────────────────────────────────────────
async function fetchClosingPaymentStatus(uid, agentId, programId) {
  const base = adminDb
    .collection('users')
    .doc(uid)
    .collection('programs')
    .doc(programId);

  // ── Step 1: Fire agent-members + agent-payments queries in PARALLEL ────────
  const [membersSnap, paymentsSnap] = await Promise.all([
    base
      .collection('members')
      .where('agentId', '==', agentId)
      .where('active_flag', '==', true)
      .where('delete_flag', '==', false)
      .where('status', '==', 'accepted')
      .get(),

    base
      .collection('payment_pending')
      .where('memberDetails.agentId', '==', agentId)
      .get(),
  ]);

  // ── Step 2: Collect unique closingMemberIds ────────────────────────────────
  const allPayments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const uniqueClosingIds = [
    ...new Set(allPayments.map((p) => p.closingMemberId).filter(Boolean)),
  ];

  // ── Step 3: Batch-fetch ALL closing member docs in PARALLEL (one round-trip) 
  // Old mobile code did these one-by-one inside a forEach — N sequential reads.
  // Server does them all concurrently with Promise.all.
  const closingMemberDocs = await Promise.all(
    uniqueClosingIds.map((cid) =>
      base.collection('members').doc(cid).get()
    )
  );

  // ── Step 4: Build closing-member lookup map ────────────────────────────────
  const closingMemberMap = {};
  closingMemberDocs.forEach((docSnap) => {
    if (!docSnap.exists) return;
    const d = docSnap.data();
    closingMemberMap[docSnap.id] = {
      id: docSnap.id,
      displayName: d.displayName || 'Unknown',
      fatherName: d.fatherName || '',
      registrationNumber: d.registrationNumber || 'N/A',
      phone: d.phone || 'N/A',
      village: d.village || 'N/A',
      district: d.district || '',
      photoURL: d.photoURL || null,
      // Timestamps as ms — safe JSON, zero parsing work on mobile
      closing_date: toMs(d.closing_date),
      marriage_date: toMs(d.marriage_date),
    };
  });

  // ── Step 5: Group payments by agent memberId ───────────────────────────────
  const paymentsByMember = {};
  allPayments.forEach((p) => {
    const mid = p.memberId;
    if (!mid) return;
    if (!paymentsByMember[mid]) paymentsByMember[mid] = [];
    paymentsByMember[mid].push(p);
  });

  // ── Step 6: Build enriched member list ────────────────────────────────────
  const members = [];

  membersSnap.forEach((memberDoc) => {
    const mid = memberDoc.id;
    const md = memberDoc.data();
    const memberPayments = paymentsByMember[mid];
    if (!memberPayments?.length) return;

    // Group payments by closingMemberId
    const closingMap = {};
    let totalPaid = 0;
    let totalPending = 0;

    memberPayments.forEach((payment) => {
      const cid = payment.closingMemberId;
      const amount = Number(payment.payAmount) || 0;

      if (!closingMap[cid]) {
        closingMap[cid] = {
          closingMemberId: cid,
          closingMemberDetails: closingMemberMap[cid] || null,
          paidList: [],
          pendingList: [],
          totalPaid: 0,
          totalPending: 0,
        };
      }

      const item = {
        id: payment.id,
        amount,
        status: payment.status,
        dueDate: toMs(payment.dueDate),
        createdAt: toMs(payment.createdAt),
      };

      if (payment.status === 'paid') {
        closingMap[cid].paidList.push(item);
        closingMap[cid].totalPaid += amount;
        totalPaid += amount;
      } else {
        closingMap[cid].pendingList.push(item);
        closingMap[cid].totalPending += amount;
        totalPending += amount;
      }
    });

    const closingForms = Object.values(closingMap);
    const pendingCount = closingForms.reduce((s, f) => s + f.pendingList.length, 0);
    const completedCount = closingForms.reduce((s, f) => s + f.paidList.length, 0);

    members.push({
      memberId: mid,
      memberName: md.displayName || 'Unknown',
      registrationNumber: md.registrationNumber || 'N/A',
      phone: md.phone || 'N/A',
      village: md.village || 'N/A',
      fatherName: md.fatherName || '',
      photoURL: md.photoURL || null,
      district: md.district || '',
      closingForms,
      paymentStats: {
        pendingCount,
        completedCount,
        pendingAmount: totalPending,
        completedAmount: totalPaid,
        totalAmount: totalPaid + totalPending,
      },
      totalFormsCount: pendingCount + completedCount,
      totalClosingMembers: closingForms.length,
    });
  });

  // Sort by total amount desc (same as original)
  members.sort((a, b) => b.paymentStats.totalAmount - a.paymentStats.totalAmount);

  // ── Pre-computed summary so mobile never has to reduce over large arrays ───
  const summary = members.reduce(
    (acc, m) => {
      acc.totalMembers++;
      acc.totalClosing += m.totalClosingMembers;
      acc.totalPending += m.paymentStats.pendingCount;
      acc.totalCompleted += m.paymentStats.completedCount;
      acc.totalPendingAmt += m.paymentStats.pendingAmount;
      acc.totalCollected += m.paymentStats.completedAmount;
      acc.totalAmt += m.paymentStats.totalAmount;
      return acc;
    },
    {
      totalMembers: 0,
      totalClosing: 0,
      totalPending: 0,
      totalCompleted: 0,
      totalPendingAmt: 0,
      totalCollected: 0,
      totalAmt: 0,
    }
  );

  return { members, summary, total: members.length };
}

// ── GET /api/closing-payment-status?agentId=X&programId=Y ────────────────────
export async function GET(request) {
  const startTime = Date.now();

  try {
    const {  error: authError } = await verifyToken(request);
    if (authError) return NextResponse.json({ error: authError }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const programId = searchParams.get('programId');
    const uid = searchParams.get('uid');


    if (!agentId || !programId) {
      return NextResponse.json(
        { error: 'agentId and programId are required' },
        { status: 400 }
      );
    }

    const data = await Promise.race([
      fetchClosingPaymentStatus(uid, agentId, programId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 25000)
      ),
    ]);

    console.log(
      `[GET /api/closing-payment-status] ${data.total} members in ${Date.now() - startTime}ms`
    );

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch (err) {
    console.error('[GET /api/closing-payment-status]', err);
    const status = err.message === 'Database query timeout' ? 504 : 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}

// ── POST /api/closing-payment-status ─────────────────────────────────────────
export async function POST(request) {
  const startTime = Date.now();

  try {
    const { uid, error: authError } = await verifyToken(request);
    if (authError) return NextResponse.json({ error: authError }, { status: 401 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { agentId, programId } = body;
    if (!agentId || !programId) {
      return NextResponse.json(
        { error: 'agentId and programId are required' },
        { status: 400 }
      );
    }

    const data = await Promise.race([
      fetchClosingPaymentStatus(uid, agentId, programId),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout')), 25000)
      ),
    ]);

    console.log(
      `[POST /api/closing-payment-status] ${data.total} members in ${Date.now() - startTime}ms`
    );

    return NextResponse.json(data);
  } catch (err) {
    console.error('[POST /api/closing-payment-status]', err);
    const status = err.message === 'Database query timeout' ? 504 : 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}