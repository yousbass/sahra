import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { User, LogOut, Crown, Mail, Loader2, Edit2, Save, X, Camera, Phone, Shield, Key, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile } from '@/lib/firestore';
import { 
  updatePassword, 
  reauthenticateWithCredential, 
  EmailAuthProvider,
  FirebaseError
} from 'firebase/auth';
import { toast } from 'sonner';

export default function Profile() {
  const navigate = useNavigate();
  const { userData, loading, signOut, becomeHost, user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [saving, setSaving] = useState(false);

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (userData) {
      setEditedName(userData.displayName || '');
      setEditedPhone(userData.phone || '');
      setEditedBio(userData.bio || '');
    }
  }, [userData]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const handleBecomeHost = async () => {
    await becomeHost();
  };

  const startEditing = () => {
    setEditedName(userData?.displayName || '');
    setEditedPhone(userData?.phone || '');
    setEditedBio(userData?.bio || '');
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedName(userData?.displayName || '');
    setEditedPhone(userData?.phone || '');
    setEditedBio(userData?.bio || '');
  };

  const saveProfile = async () => {
    if (!userData || !user) return;

    setSaving(true);
    try {
      const updates = {
        displayName: editedName,
        phone: editedPhone,
        bio: editedBio,
      };

      // Update in Firestore
      await updateUserProfile(user.uid, updates);
      
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      
      // Reload to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== CHANGING PASSWORD ===');
    
    if (!user) {
      toast.error('You must be signed in to change password');
      return;
    }

    // Validation
    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password');
      return;
    }

    try {
      setChangingPassword(true);

      // Step 1: Reauthenticate user with current password
      console.log('Step 1: Reauthenticating user...');
      const credential = EmailAuthProvider.credential(
        user.email!,
        currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      console.log('✅ Reauthentication successful');

      // Step 2: Update password
      console.log('Step 2: Updating password...');
      await updatePassword(user, newPassword);
      console.log('✅ Password updated successfully');

      // Success!
      toast.success('Password changed successfully!');
      
      // Clear form and close dialog
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordDialogOpen(false);
      
    } catch (error) {
      console.error('❌ Password change error:', error);
      
      // Handle specific Firebase errors
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (firebaseError.code === 'auth/weak-password') {
        toast.error('New password is too weak. Use at least 6 characters.');
      } else if (firebaseError.code === 'auth/requires-recent-login') {
        toast.error('For security, please sign out and sign in again before changing password');
      } else if (firebaseError.code === 'auth/network-request-failed') {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error(firebaseError.message || 'Failed to change password');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-terracotta-600 animate-spin" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-full mx-auto flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Sahra</h2>
            <p className="text-gray-700 font-medium mb-6">Sign in to access your profile and bookings</p>
            <Button
              onClick={() => navigate('/signin')}
              className="w-full h-12 bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold shadow-lg"
            >
              Sign In
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const memberSince = userData.createdAt 
    ? new Date(userData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Recently';

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4">
      <div className="max-w-4xl mx-auto pt-8 pb-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-700 font-medium">Manage your account settings and preferences</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Card */}
            <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                {!isEditing ? (
                  <Button
                    onClick={startEditing}
                    variant="outline"
                    size="sm"
                    className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50 font-semibold"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={cancelEditing}
                      variant="outline"
                      size="sm"
                      className="border-2 border-sand-300 text-gray-700 hover:bg-sand-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      onClick={saveProfile}
                      disabled={saving}
                      size="sm"
                      className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Profile Picture */}
              <div className="flex items-center gap-6 mb-6 pb-6 border-b border-sand-300">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-sand-300 flex items-center justify-center shadow-lg hover:bg-sand-50 transition-colors">
                      <Camera className="w-4 h-4 text-gray-700" />
                    </button>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{userData.displayName}</h3>
                  <p className="text-sm text-gray-600 font-medium">Member since {memberSince}</p>
                  {userData.isHost && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-gradient-to-r from-terracotta-500 to-terracotta-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      <Crown className="w-3 h-3" />
                      Host
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-terracotta-600" />
                    Full Name
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Enter your full name"
                      className="border-sand-300 focus:border-terracotta-500 text-gray-900"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{userData.displayName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-terracotta-600" />
                    Email Address
                  </Label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-800 font-medium">{userData.email}</p>
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                      <Shield className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    Contact support to change your email address
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4 text-terracotta-600" />
                    Phone Number
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      placeholder="+973 1234 5678"
                      className="border-sand-300 focus:border-terracotta-500 text-gray-900"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{userData.phone || 'Not provided'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-semibold">Bio</Label>
                  {isEditing ? (
                    <textarea
                      value={editedBio}
                      onChange={(e) => setEditedBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full px-3 py-2 border border-sand-300 rounded-md focus:border-terracotta-500 focus:outline-none text-gray-900 placeholder:text-gray-400 resize-none"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{userData.bio || 'No bio added yet'}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Account Security Card */}
            <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-terracotta-600" />
                Account Security
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-sand-50 rounded-lg border border-sand-300">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Password</p>
                    <p className="text-sm text-gray-600 font-medium">Last changed recently</p>
                  </div>
                  <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 border-sand-300 text-gray-900 hover:bg-sand-100 font-semibold"
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Change
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter your current password and choose a new one
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
                        {/* Current Password */}
                        <div className="space-y-2">
                          <Label htmlFor="current-password">Current Password</Label>
                          <div className="relative">
                            <Input
                              id="current-password"
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Enter current password"
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* New Password */}
                        <div className="space-y-2">
                          <Label htmlFor="new-password">New Password</Label>
                          <div className="relative">
                            <Input
                              id="new-password"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Enter new password (min 6 characters)"
                              required
                              minLength={6}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        {/* Confirm New Password */}
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password">Confirm New Password</Label>
                          <div className="relative">
                            <Input
                              id="confirm-password"
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirm new password"
                              required
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setPasswordDialogOpen(false);
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                            disabled={changingPassword}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={changingPassword}>
                            {changingPassword ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Changing...
                              </>
                            ) : (
                              'Change Password'
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex items-center justify-between p-4 bg-sand-50 rounded-lg border border-sand-300">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600 font-medium">Add extra security to your account</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-sand-300 text-gray-900 hover:bg-sand-100 font-semibold"
                    onClick={() => toast.info('2FA feature coming soon')}
                  >
                    Enable
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-4">
            {/* Become Host Card */}
            {!userData.isHost && (
              <Card className="bg-gradient-to-br from-terracotta-500 to-terracotta-600 text-white p-6 shadow-xl">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">Become a Host</h3>
                <p className="text-white/90 text-sm mb-4 font-medium">
                  Share your desert camp with travelers and start earning
                </p>
                <Button
                  onClick={handleBecomeHost}
                  className="w-full bg-white text-terracotta-600 hover:bg-white/90 font-semibold shadow-lg"
                >
                  Upgrade to Host
                </Button>
              </Card>
            )}

            {/* Host Dashboard Card */}
            {userData.isHost && (
              <Card
                onClick={() => navigate('/host')}
                className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105 group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Host Dashboard</h3>
                <p className="text-gray-700 text-sm font-medium">Manage your camp listings</p>
              </Card>
            )}

            {/* Quick Stats */}
            <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">Total Bookings</span>
                  <span className="text-lg font-bold text-terracotta-600">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">Account Status</span>
                  <span className="text-sm font-semibold text-green-600">Active</span>
                </div>
                {userData.isHost && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">Listings</span>
                    <span className="text-lg font-bold text-terracotta-600">0</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Sign Out Card */}
            <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6 shadow-xl">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full h-12 border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 font-semibold"
              >
                <LogOut className="w-5 h-5 mr-2" />
                Sign Out
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}