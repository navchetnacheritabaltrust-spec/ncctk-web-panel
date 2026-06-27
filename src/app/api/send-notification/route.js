import { NextResponse } from "next/server";
import admin from "../admin";

export async function POST(req) {
    try {
        const { token, title, body, data } = await req.json();

        const message = {
            token,
            notification: {
                title,
                body,
            },
            data: data || {},
              android: {
        notification: {
          channelId: 'marriage-custom-channel' || "default_channel",  // 👈 ADD HERE
          sound: "notification",
          priority: "high",
        }
      },
        };

        const response = await admin.messaging().send(message);
        return NextResponse.json({ success: true, response });

    } catch (error) {
        console.error("FCM Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
