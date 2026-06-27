"use client";
import React, { useState } from 'react';
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth";
import { useAuth } from '@/lib/AuthProvider';
import { App } from 'antd';
import { auth } from '@/lib/firebase';

const PasswordChange = () => {
  const { user } = useAuth();
   const {message}=App.useApp();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);


  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      message.error("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      message.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      message.error("New password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {

      const authUser =  auth.currentUser; // support both merged and raw user
      const credential = EmailAuthProvider.credential(authUser.email, currentPassword);
      await reauthenticateWithCredential(auth, credential);
      await updatePassword(auth, newPassword);
      message.success("Password updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
        console.log(error,"error")
      message.error(error.message || "Failed to update password.");
    }
    setLoading(false);
  };

  return (
    <form className="mt-6" onSubmit={handlePasswordChange}>
      <h4 className="text-lg font-medium text-gray-700 mb-4">Password Management</h4>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input 
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input 
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input 
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
          />
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 cursor-pointer py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default PasswordChange;