import { NextResponse } from "next/server";
import admin from "../admin";

const db = admin.firestore();
const auth = admin.auth();

/**
 * CREATE MEMBER ACCOUNT
 * POST
 */
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      memberId,
      displayName,
      photoURL,
      password,
      programId,
      registrationNumber,
      memberCollectionPath,
      createdBy
    } = body;

    if (!memberId || !registrationNumber) {
      return NextResponse.json(
        { success: false, message: "memberId and registrationNumber required" },
        { status: 400 }
      );
    }

    const email = `${registrationNumber}@gmail.com`;

    // check if auth already exists
    try {
      const existingUser = await auth.getUser(memberId);

      return NextResponse.json({
        success: true,
        message: "User already exists",
        user: existingUser
      });
    } catch (err) {
      // user not found -> create
    }

    const user = await auth.createUser({
      uid: memberId,
      email,
      emailVerified: true,
      displayName: displayName || "",
      photoURL: photoURL || null,
      password: password || "Member@123"
    });

    // custom claims
    await auth.setCustomUserClaims(memberId, {
      role: "member",
      programId: programId || "",
      createdBy: createdBy || "",
      displayName: displayName || "",
      email: email,
      photoURL: photoURL || null
    });

    // update firestore member doc
    const memberRef = db.collection(memberCollectionPath).doc(memberId);
    const memberDoc = await memberRef.get();

    if (memberDoc.exists) {
      await memberRef.update({
        uid: memberId,
        account_flag: true,
        password: password || "Member@123"
      });
    }

    return NextResponse.json({
      success: true,
      message: "Member account created successfully",
      user
    });

  } catch (error) {
    console.error("CREATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * UPDATE PASSWORD
 * PUT
 */
export async function PUT(req) {
  try {
    const body = await req.json();
    const { memberId, newPassword } = body;

    if (!memberId || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "memberId and newPassword required"
        },
        { status: 400 }
      );
    }

    await auth.updateUser(memberId, {
      password: newPassword
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    console.error("PASSWORD UPDATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE MEMBER ACCOUNT
 * DELETE
 */
export async function DELETE(req) {
  try {
    const body = await req.json();
    const { memberId,memberCollectionPath } = body;

    if (!memberId) {
      return NextResponse.json(
        {
          success: false,
          message: "memberId required"
        },
        { status: 400 }
      );
    }

    // delete auth user
    await auth.deleteUser(memberId);

    // update firestore member document
    const memberRef = db.collection(memberCollectionPath).doc(memberId);
    const memberDoc = await memberRef.get();

    if (memberDoc.exists) {
      await memberRef.update({
        account_flag: false,
        uid: null
      });
    }

    return NextResponse.json({
      success: true,
      message: "Member account deleted successfully"
    });

  } catch (error) {
    console.error("DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message
      },
      { status: 500 }
    );
  }
}