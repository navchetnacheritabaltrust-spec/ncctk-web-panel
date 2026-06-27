import { NextResponse } from 'next/server';
const sendEmail = require('@/lib/sendEmail'); // Adjust path if needed

// In-memory store for OTPs (for demo; use Redis/DB for production)
const otpStore = new Map();
const OTP_EXPIRY_MS = 60 * 1000; // 1 minute

export async function POST(req) {
  try {
    const body = await req.json();
    const { action, email, otp } = body;

    if (action === "send") {
      if (!email) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
      }
      // Generate OTP and expiry
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + OTP_EXPIRY_MS;
      otpStore.set(email, { otp: generatedOtp, expiresAt });

      // Send OTP via email
      await sendEmail(
        email,
        "Your OTP Code",
        `<h2>Your OTP is: <span style="color:green">${generatedOtp}</span></h2><p>This OTP is valid for 1 minute.</p>`,
        `Your OTP is: ${generatedOtp} (valid for 1 minute)`
      );

      return NextResponse.json({ success: true, message: "OTP sent to email." });
    }

    if (action === "verify") {
      if (!email || !otp) {
        return NextResponse.json({ error: "Email and OTP are required." }, { status: 400 });
      }
      const record = otpStore.get(email);
      if (
        record &&
        record.otp === otp &&
        Date.now() <= record.expiresAt
      ) {
        otpStore.delete(email); // Remove OTP after successful verification
        return NextResponse.json({ success: true, message: "OTP verified." });
      } else if (record && Date.now() > record.expiresAt) {
        otpStore.delete(email); // Remove expired OTP
        return NextResponse.json({ error: "OTP expired." }, { status: 400 });
      } else {
        return NextResponse.json({ error: "Invalid OTP." }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Server error." }, { status: 500 });
  }
}