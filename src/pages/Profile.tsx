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
import { useTranslation } from 'react-i18next';

export default function Profile() {
  const navigate = useNavigate();
  const { userData, loading, signOut, user } = useAuth();
  const { t } = useTranslation();
  
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

  const handleBecomeHost = () => {
    // Navigate to the new BecomeHost page instead of directly making them a host
    navigate('/become-host');
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
      
      toast.success(t('profile.toasts.updated'));
      setIsEditing(false);
      
      // Reload to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('profile.toasts.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('=== CHANGING PASSWORD ===');
    
    if (!user) {
      toast.error(t('profile.toasts.mustSignIn'));
      return;
    }

    // Validation
    if (!currentPassword) {
      toast.error(t('profile.toasts.enterCurrent'));
      return;
    }

    if (!newPassword) {
      toast.error(t('profile.toasts.enterNew'));
      return;
    }

    if (newPassword.length < 6) {
      toast.error(t('profile.toasts.minLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('profile.toasts.mismatch'));
      return;
    }

    if (currentPassword === newPassword) {
      toast.error(t('profile.toasts.samePassword'));
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
      toast.success(t('profile.toasts.pwdChanged'));
      
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
        toast.error(t('profile.toasts.wrongPassword'));
      } else if (firebaseError.code === 'auth/weak-password') {
        toast.error(t('profile.toasts.weakPassword'));
      } else if (firebaseError.code === 'auth/requires-recent-login') {
        toast.error(t('profile.toasts.recentLogin'));
      } else if (firebaseError.code === 'auth/network-request-failed') {
        toast.error(t('profile.toasts.network'));
      } else {
        toast.error(firebaseError.message || t('profile.toasts.changeFailed'));
      }
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-#6B4423 animate-spin" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-br from-#8B5A3C to-#6B4423 rounded-full mx-auto flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('profile.welcome')}</h2>
            <p className="text-gray-700 font-medium mb-6">{t('profile.signInPrompt')}</p>
            <Button
              onClick={() => navigate('/signin')}
              className="w-full h-12 bg-gradient-to-r from-#8B5A3C to-#6B4423 hover:from-#6B4423 hover:to-#5A3820 text-white font-semibold shadow-lg"
            >
              {t('profile.signIn')}
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
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-orange-100 to-orange-200 p-4">
      <div className="max-w-4xl mx-auto pt-8 pb-20">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('profile.title')}</h1>
          <p className="text-gray-700 font-medium">Manage your account settings and preferences</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Card */}
            <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Personal Information</h2>
                {!isEditing ? (
                  <Button
                    onClick={startEditing}
                    variant="outline"
                    size="sm"
                    className="border-2 border-orange-300 text-gray-900 hover:bg-orange-50 font-semibold"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('profile.editProfile')}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                   <Button
                     onClick={cancelEditing}
                     variant="outline"
                     size="sm"
                     className="border-2 border-orange-300 text-gray-700 hover:bg-orange-50"
                   >
                     <X className="w-4 h-4 mr-1" />
                      {t('profile.cancel')}
                   </Button>
                   <Button
                     onClick={saveProfile}
                     disabled={saving}
                     size="sm"
                     className="bg-gradient-to-r from-#8B5A3C to-#6B4423 hover:from-#6B4423 hover:to-#5A3820 text-white font-semibold"
                   >
                     {saving ? (
                       <>
                         <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          {t('profile.saving', { defaultValue: 'Saving...' })}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-1" />
                          {t('profile.saveChanges')}
                        </>
                      )}
                   </Button>
                 </div>
               )}
              </div>

              {/* Profile Picture */}
              <div className="flex items-center gap-6 mb-6 pb-6 border-b border-orange-300">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-#8B5A3C to-#6B4423 rounded-full flex items-center justify-center shadow-lg">
                    <User className="w-12 h-12 text-white" />
                  </div>
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-orange-300 flex items-center justify-center shadow-lg hover:bg-orange-50 transition-colors">
                      <Camera className="w-4 h-4 text-gray-700" />
                    </button>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{userData.displayName}</h3>
                  <p className="text-sm text-gray-600 font-medium">{t('profile.memberSince', { date: memberSince })}</p>
                  {userData.isHost && (
                    <div className="mt-2 inline-flex items-center gap-1 bg-gradient-to-r from-#8B5A3C to-#6B4423 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      <Crown className="w-3 h-3" />
                      {t('profile.hostActive')}
                    </div>
                  )}
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-#6B4423" />
                    {t('profile.name')}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder={t('profile.name')}
                      className="border-orange-300 focus:border-#8B5A3C text-gray-900"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{userData.displayName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <Mail className="w-4 h-4 text-#6B4423" />
                    {t('auth.email')}
                  </Label>
                  <div className="flex items-center gap-2">
                    <p className="text-gray-800 font-medium">{userData.email}</p>
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                      <Shield className="w-3 h-3" />
                      {t('profile.verified', { defaultValue: 'Verified' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    {t('profile.changeEmail', { defaultValue: 'Contact support to change your email address' })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4 text-#6B4423" />
                    {t('profile.phone')}
                  </Label>
                  {isEditing ? (
                    <Input
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      placeholder="+973 1234 5678"
                      className="border-orange-300 focus:border-#8B5A3C text-gray-900"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{userData.phone || t('profile.notProvided', { defaultValue: 'Not provided' })}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-900 font-semibold">{t('profile.bio')}</Label>
                  {isEditing ? (
                    <textarea
                      value={editedBio}
                      onChange={(e) => setEditedBio(e.target.value)}
                      placeholder={t('profile.bioPlaceholder', { defaultValue: 'Tell us about yourself...' })}
                      rows={3}
                      className="w-full px-3 py-2 border border-orange-300 rounded-md focus:border-#8B5A3C focus:outline-none text-gray-900 placeholder:text-gray-400 resize-none"
                    />
                  ) : (
                    <p className="text-gray-800 font-medium">{userData.bio || t('profile.noBio', { defaultValue: 'No bio added yet' })}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Account Security Card */}
            <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-6 shadow-xl">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-#6B4423" />
                {t('profile.password.title')}
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-300">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t('profile.password.title')}</p>
                    <p className="text-sm text-gray-600 font-medium">{t('profile.password.lastChanged', { defaultValue: 'Last changed recently' })}</p>
                  </div>
                  <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 border-orange-300 text-gray-900 hover:bg-orange-100 font-semibold"
                      >
                        <Key className="mr-2 h-4 w-4" />
                        {t('profile.password.change')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>{t('profile.password.title')}</DialogTitle>
                        <DialogDescription>
                          {t('profile.password.description', { defaultValue: 'Enter your current password and choose a new one' })}
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handlePasswordChange} className="space-y-4 py-4">
                        {/* Current Password */}
                        <div className="space-y-2">
                          <Label htmlFor="current-password">{t('profile.password.current')}</Label>
                          <div className="relative">
                            <Input
                              id="current-password"
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder={t('profile.password.current')}
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
                          <Label htmlFor="new-password">{t('profile.password.new')}</Label>
                          <div className="relative">
                            <Input
                              id="new-password"
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder={t('profile.password.new')}
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
                          <Label htmlFor="confirm-password">{t('profile.password.confirm')}</Label>
                          <div className="relative">
                            <Input
                              id="confirm-password"
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder={t('profile.password.confirm')}
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
                            {t('profile.cancel')}
                          </Button>
                          <Button type="submit" disabled={changingPassword}>
                            {changingPassword ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('profile.password.changing', { defaultValue: 'Changing...' })}
                              </>
                            ) : (
                              t('profile.password.change')
                            )}
                         </Button>
                       </DialogFooter>
                     </form>
                   </DialogContent>
                 </Dialog>
                </div>

                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-300">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600 font-medium">Add extra security to your account</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-2 border-orange-300 text-gray-900 hover:bg-orange-100 font-semibold"
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
              <Card className="bg-gradient-to-br from-#8B5A3C to-#6B4423 text-white p-6 shadow-xl">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">{t('profile.becomeHost')}</h3>
                <p className="text-white/90 text-sm mb-4 font-medium">
                  Share your desert camp with travelers and start earning
                </p>
                <Button
                  onClick={handleBecomeHost}
                  className="w-full bg-white text-#6B4423 hover:bg-white/90 font-semibold shadow-lg"
                >
                  Apply to Become Host
                </Button>
              </Card>
            )}

            {/* Host Dashboard Card */}
            {userData.isHost && (
              <Card
                onClick={() => navigate('/host')}
                className="bg-white/95 backdrop-blur-sm border-orange-300 p-6 cursor-pointer hover:shadow-xl transition-all hover:scale-105 group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-#8B5A3C to-#6B4423 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('host.dashboardTitle', { defaultValue: 'Host Dashboard' })}</h3>
                <p className="text-gray-700 text-sm font-medium">{t('host.manageDesc')}</p>
              </Card>
            )}

            {/* Quick Stats */}
            <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('profile.statsTitle', { defaultValue: 'Account Stats' })}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">{t('profile.totalBookings', { defaultValue: 'Total Bookings' })}</span>
                  <span className="text-lg font-bold text-#6B4423">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 font-medium">{t('profile.accountStatus', { defaultValue: 'Account Status' })}</span>
                  <span className="text-sm font-semibold text-green-600">{t('profile.active', { defaultValue: 'Active' })}</span>
                </div>
                {userData.isHost && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 font-medium">{t('profile.listings', { defaultValue: 'Listings' })}</span>
                    <span className="text-lg font-bold text-#6B4423">0</span>
                  </div>
                )}
              </div>
            </Card>

          {/* Sign Out Card */}
            <Card className="bg-white/95 backdrop-blur-sm border-orange-300 p-6 shadow-xl">
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full h-12 border-2 border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 font-semibold"
              >
                <LogOut className="w-5 h-5 mr-2" />
                {t('profile.signOut')}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}