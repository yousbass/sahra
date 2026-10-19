import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Phone, 
  CreditCard, 
  CheckCircle, 
  Loader2, 
  ArrowLeft,
  AlertCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  createHostApplication,
  getHostApplicationByUserId,
  type HostApplication
} from '@/lib/hostApplication';
import {
  initializeRecaptcha,
  sendOTP,
  verifyOTP,
  cleanupRecaptcha
} from '@/lib/phoneVerification';

export default function BecomeHost() {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [cprNumber, setCprNumber] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Existing application state
  const [existingApp, setExistingApp] = useState<HostApplication | null>(null);
  const [checkingApp, setCheckingApp] = useState(true);
  const [checkError, setCheckError] = useState(false);
  // When rejected, user can choose to re-apply
  const [reApplying, setReApplying] = useState(false);

  useEffect(() => {
    return () => cleanupRecaptcha();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error(t('messages.signInRequired') || 'Please sign in to continue');
      navigate('/signin');
      return;
    }

    if (!authLoading && userData?.isHost) {
      toast.info(t('messages.alreadyHost') || 'You are already a host');
      navigate('/host');
      return;
    }

    if (!authLoading && user) {
      checkExistingApplication();
    }
  }, [user, userData, authLoading, navigate, t]);

  const checkExistingApplication = async () => {
    if (!user) return;
    setCheckingApp(true);
    setCheckError(false);
    try {
      const app = await getHostApplicationByUserId(user.uid);
      if (app?.status === 'approved') {
        navigate('/host');
        return;
      }
      setExistingApp(app);
    } catch (error) {
      console.error('Error checking existing application:', error);
      setCheckError(true);
    } finally {
      setCheckingApp(false);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Bahrain phone number validation (8 digits, starting with 3, 6, or 7)
    const bahrainPhoneRegex = /^[367]\d{7}$/;
    return bahrainPhoneRegex.test(phone);
  };

  const validateCPR = (cpr: string): boolean => {
    // Bahrain CPR validation (9 digits)
    const cprRegex = /^\d{9}$/;
    return cprRegex.test(cpr);
  };

  const handleVerifyPhone = async () => {
    if (!phoneNumber) {
      toast.error(t('messages.phoneRequired') || 'Phone number is required');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error(
        t('messages.invalidPhone') || 
        'Invalid Bahrain phone number. Must be 8 digits starting with 3, 6, or 7'
      );
      return;
    }

    setSendingOtp(true);
    try {
      initializeRecaptcha('recaptcha-container');
      await sendOTP(phoneNumber);
      setOtpSent(true);
      toast.success(t('messages.otpSent') || 'Verification code sent by SMS');
    } catch (error: any) {
      if (error?.code === 'auth/provider-already-linked') {
        // Only accept if the linked phone matches the number entered now
        if (user?.phoneNumber === `+973${phoneNumber}`) {
          setPhoneVerified(true);
          toast.success(t('messages.phoneVerified') || 'Phone number verified');
        } else {
          toast.error(
            t('messages.phoneMismatch') ||
              'A different phone number is already linked to your account. Enter that number.'
          );
        }
      } else if (error?.code === 'auth/credential-already-in-use') {
        toast.error(
          t('messages.phoneInUse') ||
            'This phone number is already used by another account'
        );
      } else {
        console.error('Error sending verification code:', error?.code || error);
        toast.error(
          t('messages.otpSendFailed') ||
            'Could not send verification code. Please try again.'
        );
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error(t('messages.invalidOtp') || 'Enter the 6-digit code');
      return;
    }
    setVerifyingOtp(true);
    try {
      const ok = await verifyOTP(otpCode);
      if (ok) {
        setPhoneVerified(true);
        setOtpSent(false);
        toast.success(t('messages.phoneVerified') || 'Phone number verified');
      } else {
        toast.error(t('messages.invalidOtp') || 'Invalid code. Please try again.');
      }
    } catch (error: any) {
      if (error?.code === 'auth/credential-already-in-use') {
        toast.error(
          t('messages.phoneInUse') ||
            'This phone number is already used by another account'
        );
      } else {
        toast.error(t('messages.invalidOtp') || 'Invalid code. Please try again.');
      }
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !userData) {
      toast.error(t('messages.signInRequired') || 'Please sign in to continue');
      return;
    }

    if (!phoneNumber || !cprNumber) {
      toast.error(t('messages.fillAllFields') || 'Please fill in all fields');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      toast.error(
        t('messages.invalidPhone') || 
        'Invalid Bahrain phone number'
      );
      return;
    }

    if (!validateCPR(cprNumber)) {
      toast.error(
        t('messages.invalidCpr') || 
        'Invalid CPR number. Must be 9 digits'
      );
      return;
    }

    if (!phoneVerified) {
      toast.error(t('messages.verifyPhone') || 'Please confirm your phone number first');
      return;
    }

    setSubmitting(true);

    try {
      await createHostApplication(
        user.uid,
        user.email || '',
        userData.displayName || user.email || 'User',
        `+973${phoneNumber}`,
        cprNumber
      );

      setStep('success');
      setExistingApp(null);
      setReApplying(false);
      toast.success(
        t('messages.applicationSubmitted') || 
        'Application submitted! We will review it and notify you once approved.'
      );
      
      // Redirect home after a few seconds — host access is granted after
      // an admin approves the application
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Error submitting application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading states ────────────────────────────────────────────────────────

  if (authLoading || checkingApp) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4 flex items-center justify-center">
        <CampfireLoader size="md" className="mx-auto my-4" />
      </div>
    );
  }

  // ── Error state (application lookup failed) ───────────────────────────────

  if (checkError) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
        <div className="max-w-2xl mx-auto pt-8 pb-20">
          <Card className="modern-card p-8 shadow-xl text-center">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-4">
              {t('messages.errorOccurred') || 'Something went wrong'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t('messages.tryAgain') || "We couldn't load your application status. Please try again."}
            </p>
            <Button
              onClick={checkExistingApplication}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('messages.retry') || 'Try Again'}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // ── Success screen (just submitted) ──────────────────────────────────────

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
        <div className="max-w-2xl mx-auto pt-8 pb-20">
          <Card className="modern-card p-8 shadow-xl text-center">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            
            <h1 className="text-3xl font-display font-bold text-foreground mb-4">
              {t('becomeHost.pendingTitle') || 'Application Under Review'}
            </h1>
            
            <p className="text-muted-foreground mb-6">
              {t('becomeHost.pendingMessage') || 
                'Your host application has been received and is currently being reviewed. We will notify you once a decision has been made.'}
            </p>

            <Button
              onClick={() => navigate('/')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('becomeHost.backHome') || 'Back to Home'}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // ── Pending state (existing application under review) ────────────────────

  if (existingApp?.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
        <div className="max-w-2xl mx-auto pt-8 pb-20">
          <Button
            onClick={() => navigate('/profile')}
            variant="ghost"
            className="mb-6 text-foreground hover:text-primary hover:bg-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('becomeHost.back') || 'Back'}
          </Button>

          <Card className="modern-card p-8 shadow-xl text-center">
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Clock className="w-10 h-10 text-amber-400" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-4">
              {t('becomeHost.pendingTitle') || 'Application Under Review'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t('becomeHost.pendingMessage') || 
                'Your host application has been received and is currently being reviewed. We will notify you once a decision has been made.'}
            </p>
            <Button
              onClick={() => navigate('/')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('becomeHost.backHome') || 'Back to Home'}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // ── Rejected state ────────────────────────────────────────────────────────

  if (existingApp?.status === 'rejected' && !reApplying) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
        <div className="max-w-2xl mx-auto pt-8 pb-20">
          <Button
            onClick={() => navigate('/profile')}
            variant="ghost"
            className="mb-6 text-foreground hover:text-primary hover:bg-secondary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('becomeHost.back') || 'Back'}
          </Button>

          <Card className="modern-card p-8 shadow-xl text-center">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-4">
              {t('becomeHost.rejectedTitle') || 'Application Not Approved'}
            </h1>
            <p className="text-muted-foreground mb-4">
              {t('becomeHost.rejectedMessage') || 
                'Unfortunately your host application was not approved this time. You can review the reason below and submit a new application.'}
            </p>

            {existingApp.rejectionReason && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-semibold text-red-400 mb-1">
                  {t('becomeHost.rejectionReason') || 'Reason:'}
                </p>
                <p className="text-sm text-red-300">{existingApp.rejectionReason}</p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="border-border"
              >
                {t('becomeHost.backHome') || 'Back to Home'}
              </Button>
              <Button
                onClick={() => {
                  if (existingApp.phoneNumber) {
                    setPhoneNumber(existingApp.phoneNumber.replace(/^\+973/, ''));
                  }
                  if (existingApp.cprNumber) {
                    setCprNumber(existingApp.cprNumber);
                  }
                  setReApplying(true);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t('becomeHost.applyAgain') || 'Apply Again'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ── Application form (new or re-apply after rejection) ───────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-20">
        <Button
          onClick={() => {
            if (reApplying) {
              setReApplying(false);
            } else {
              navigate('/profile');
            }
          }}
          variant="ghost"
          className="mb-6 text-foreground hover:text-primary hover:bg-secondary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('becomeHost.back') || 'Back'}
        </Button>

        <Card className="modern-card p-8 shadow-xl">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {t('becomeHost.title') || 'Become a Host'}
            </h1>
            <p className="text-muted-foreground">
              {t('becomeHost.subtitle') || 
                'Complete the verification process to start hosting on our platform'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                {t('becomeHost.phoneNumber') || 'Phone Number'}
                <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex items-center bg-secondary border border-border rounded-lg px-3">
                  <span className="text-muted-foreground font-medium">+973</span>
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="3XXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 8));
                    setPhoneVerified(false);
                  }}
                  maxLength={8}
                  required
                  disabled={phoneVerified}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={handleVerifyPhone}
                  disabled={phoneVerified || sendingOtp || !phoneNumber || phoneNumber.length !== 8}
                  className={phoneVerified 
                    ? "bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }
                >
                  {phoneVerified ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('becomeHost.verified') || 'Verified'}
                    </>
                  ) : sendingOtp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('becomeHost.sendCode') || 'Send code'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('becomeHost.phoneHint') || 'Enter your Bahrain mobile number (8 digits)'}
              </p>
              {otpSent && !phoneVerified && (
                <div className="flex gap-2 pt-2">
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleConfirmOtp}
                    disabled={verifyingOtp || otpCode.length !== 6}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {verifyingOtp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      t('becomeHost.verifyCode') || 'Verify code'
                    )}
                  </Button>
                </div>
              )}
              <div id="recaptcha-container" />
            </div>

            {/* CPR Number */}
            <div className="space-y-2">
              <Label htmlFor="cpr" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                {t('becomeHost.cprNumber') || 'CPR Number'}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cpr"
                type="text"
                placeholder="XXXXXXXXX"
                value={cprNumber}
                onChange={(e) => setCprNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                maxLength={9}
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('becomeHost.cprHint') || 'Enter your 9-digit Bahrain CPR number'}
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-sky-300 mb-1">
                    {t('becomeHost.infoTitle') || 'Why do we need this information?'}
                  </p>
                  <p className="text-sm text-sky-200/80">
                    {t('becomeHost.infoMessage') || 
                      'We verify all hosts to ensure the safety and security of our community. Your information is kept confidential and used only for verification purposes.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting || !phoneVerified || !phoneNumber || !cprNumber}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('becomeHost.submitting') || 'Processing...'}
                </>
              ) : (
                t('becomeHost.submit') || 'Submit Application'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
