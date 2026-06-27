import { NextResponse } from 'next/server';
const sendEmail = require('@/lib/sendEmail'); // Adjust path if needed

export async function POST(req) {
  try {
    const body = await req.json();
    const { to, subject, htmlContent, textContent, attachments } = body;

    if (!to || !subject || !htmlContent) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    await sendEmail(to, subject, htmlContent, textContent, attachments);
    return NextResponse.json({ success: true, message: 'Email sent successfully.' });
  } catch (error) {
    console.log(error,"error")
    return NextResponse.json({ error: error.message || 'Failed to send email.' }, { status: 500 });
  }
}