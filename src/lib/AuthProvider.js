"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase"; // Make sure db is exported from firebase.js
import { message } from "antd";
import { redirect } from "next/navigation";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Fetch additional user data from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
          if (userDoc.exists()) {
            // Combine Firebase Auth user with Firestore data
            setUser({
                tokens:firebaseUser?.stsTokenManager,
              ...userDoc.data()
            });
          } else {
            // If no Firestore document exists, just use Firebase Auth user
            setUser(firebaseUser);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        messageApi.error("Failed to load user data");
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [messageApi]);

  // useEffect(() => {
  //   if (!loading && !user) {
  //     messageApi.error("You need to be logged in to access this page");
  //     redirect("/auth/login");
  //   }
  // }, [user, loading, messageApi]);

  return (
    <AuthContext.Provider value={{ user, loading, messageApi }}>
      {contextHolder}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}