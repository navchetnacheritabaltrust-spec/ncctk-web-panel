import { JWT } from 'google-auth-library';
import { NextResponse } from 'next/server';

async function getAccessTokenAsync() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('Firebase Admin Private Key is not set in environment variables.');
  }
  
  // Replace escaped newlines with actual newline characters
  const keyWithNewlines = privateKey.replace(/\\n/g, '\n');

  return new Promise((resolve, reject) => {
    const jwtClient = new JWT({
      email: process.env.FIREBASE_CLIENT_EMAIL,
      key: keyWithNewlines,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    jwtClient.authorize((err, tokens) => {
      if (err) {
        reject(new Error(`JWT authorization failed: ${err.message}`));
        return;
      }
      if (!tokens || !tokens.access_token) {
        reject(new Error('Failed to retrieve access token.'));
        return;
      }
      resolve(tokens.access_token);
    });
  });
}

/**
 * Next.js API Route handler for POST requests.
 * Sends an FCM v1 notification to a specific device token.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const token = body.message.token;
    
    // Add these logs
    console.log('Received token:', token);
    console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    console.log('Full message body:', JSON.stringify(body, null, 2));
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Device token is required for FCM notifications'
      }, { status: 400 });
    }
    const firebaseAccessToken = await getAccessTokenAsync();
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!projectId) {
        throw new Error('Firebase Project ID is not set in environment variables.');
    }

    // Message payload following the FCM v1 protocol
    const messageBody = {
...body,
  }

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firebaseAccessToken}`,
          'Content-Type': 'application/json',
          // 'Accept' and 'Accept-encoding' are often redundant for simple JSON APIs
        },
        body: JSON.stringify(messageBody),
      }
    );

    const resultJson = await response.json();
    
    if (response.status !== 200) {
      console.error('FCM API Error:', resultJson);
      // Return a 500 status with the error from the FCM API
      return NextResponse.json({
        success: false,
        error: `FCM message failed. Status: ${response.status}`,
        details: resultJson.error || 'Unknown error'
      }, { status: 500 });
    }
    
    console.log('Successfully sent message:', resultJson);

    return NextResponse.json({
      success: true,
      messageId: resultJson.name, // The message ID is typically under the 'name' key
      message: 'Notification sent successfully'
    });

  } catch (error) {
    console.error('Error in POST handler:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'An unexpected error occurred'
    }, { status: 500 });
  }
}