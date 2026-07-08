// app/api/closing-members/route.js
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

// ── Core data fetching logic ──────────────────────────────────────────────────
async function fetchClosingMembersData(uid, agentId, programId) {
  const base = adminDb
    .collection('users')
    .doc(uid)
    .collection('programs')
    .doc(programId);

  // ── Run BOTH queries in PARALLEL (not sequential) ─────────────────────────
  const [membersSnap, paymentsSnap] = await Promise.all([
    base
      .collection('members')
      .where('active_flag', '==', true)
      .where('delete_flag', '==', false)
      .where('marriage_flag', '==', true)
      .where('status', 'in', ['closed', 'accepted'])
      .orderBy('closingAt', 'desc')
      .get(),

    base
      .collection('payment_pending')
      .where('memberDetails.agentId', '==', agentId)
      .get(),
  ]);

  // ── Build payments stats map (keyed by closingMemberId) ───────────────────
  // Do all number crunching on the server — zero work left for the mobile app
  const statsMap = {};

  paymentsSnap.forEach((doc) => {
    const p = doc.data();
    const key = p.closingMemberId;
    if (!key) return;

    if (!statsMap[key]) {
      statsMap[key] = {
        paid: 0,
        pending: 0,
        collectedAmount: 0,
        pendingAmount: 0,
      };
    }

    const amt = Number(p.payAmount) || 0;

    if (p.status === 'paid') {
      statsMap[key].paid++;
      statsMap[key].collectedAmount += amt;
    } else if (p.status === 'pending') {
      statsMap[key].pending++;
      statsMap[key].pendingAmount += amt;
    }
  });

  // ── Enrich members with pre-computed stats ────────────────────────────────
  const members = [];

  membersSnap.forEach((doc) => {
    const m = doc.data();
    const stats = statsMap[doc.id] ?? {
      paid: 0,
      pending: 0,
      collectedAmount: 0,
      pendingAmount: 0,
    };

    const totalPayments = stats.paid + stats.pending;
    const completionPct =
      totalPayments > 0 ? Math.round((stats.paid / totalPayments) * 100) : 0;

    members.push({
      // Identity
      id: doc.id,
      displayName: m.displayName || null,
      registrationNumber: m.registrationNumber || null,
      phone: m.phone || null,
      village: m.village || null,
      photoURL: m.photoURL || null,
      fatherName: m.fatherName || null,

      // Dates (send as ms timestamp — safe for JSON, easy on mobile)
      closing_date: m.closing_date
        ? typeof m.closing_date === 'object' && 'seconds' in m.closing_date
          ? m.closing_date.seconds * 1000
          : null
        : null,
      closingAt: m.closingAt
        ? typeof m.closingAt === 'object' && 'seconds' in m.closingAt
          ? m.closingAt.seconds * 1000
          : null
        : null,

      // Program refs
      programId: m.programId || m.program || programId,

      // Pre-computed payment stats
      paymentStats: {
        paid: stats.paid,
        pending: stats.pending,
      },
      totalPayments,
      totalCollected: stats.collectedAmount,
      totalPending: stats.pendingAmount,
      completionPct,

      // Convenience flag for the UI
      allPaid: stats.paid > 0 && stats.pending === 0,
      hasPayments: totalPayments > 0,

      // Status derived server-side
      paymentStatus:
        totalPayments === 0
          ? 'none'
          : stats.paid > 0 && stats.pending === 0
          ? 'paid'
          : stats.paid > 0
          ? 'partial'
          : 'pending',
    });
  });

  // ── Summary totals (so mobile never has to reduce over 200 items) ─────────
  const summary = members.reduce(
    (acc, m) => {
      acc.totalMembers++;
      acc.totalPaidCount += m.paymentStats.paid;
      acc.totalPendingCount += m.paymentStats.pending;
      acc.totalCollected += m.totalCollected;
      acc.totalPendingAmount += m.totalPending;
      return acc;
    },
    {
      totalMembers: 0,
      totalPaidCount: 0,
      totalPendingCount: 0,
      totalCollected: 0,
      totalPendingAmount: 0,
    }
  );

  return { members, summary, total: members.length };
}

// ── GET /api/closing-members?agentId=X&programId=Y ───────────────────────────
export async function GET(request) {
  const startTime = Date.now();

  try {
    const { error: authError } = await verifyToken(request);
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

    const fetchPromise = fetchClosingMembersData(uid, agentId, programId);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 25000)
    );

    const data = await Promise.race([fetchPromise, timeoutPromise]);

    console.log(
      `[GET /api/closing-members] ${data.total} members in ${Date.now() - startTime}ms`
    );

    return NextResponse.json(data, {
      headers: {
        // Cache for 30 s on CDN edge — adjust or remove if you need real-time data
        'Cache-Control': 'private, max-age=30',
      },
    });
  } catch (err) {
    console.error('[GET /api/closing-members]', err);
    const status = err.message === 'Database query timeout' ? 504 : 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}

// ── POST /api/closing-members ─────────────────────────────────────────────────
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

    const fetchPromise = fetchClosingMembersData(uid, agentId, programId);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 25000)
    );

    const data = await Promise.race([fetchPromise, timeoutPromise]);

    console.log(
      `[POST /api/closing-members] ${data.total} members in ${Date.now() - startTime}ms`
    );

    return NextResponse.json(data);
  } catch (err) {
    console.error('[POST /api/closing-members]', err);
    const status = err.message === 'Database query timeout' ? 504 : 500;
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status });
  }
}