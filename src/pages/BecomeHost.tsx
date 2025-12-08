import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  CreditCard, 
  CheckCircle, 
  Loader2, 
  ArrowLeft,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  createHostApplication,
  getHostApplicationByUserId,
  updatePhoneVerification
} from '@/lib/hostApplication';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, FirebaseError } from 'firebase/auth';

export default function BecomeHost() {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [phoneNumber, setPhoneNumber] = useState('');
  const [cprNumber, setCprNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'form' | 'verify' | 'success'>('form');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

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

    // Check if user already has an application
    if (user) {
      checkExistingApplication();
    }

    return () => {
      // Cleanup reCAPTCHA on unmount
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = '';
      }
    };
  }, [user, userData, authLoading, navigate, t]);

  const checkExistingApplication = async () => {
    if (!user) return;

    try {
      const existingApp = await getHostApplicationByUserId(user.uid);
      
      if (existingApp) {
        if (existingApp.status === 'pending') {
          toast.info(t('messages.applicationPending') || 'Your application is pending review');
          setStep('success');
          setApplicationId(existingApp.id);
        } else if (existingApp.status === 'approved') {
          navigate('/host');
        } else if (existingApp.status === 'rejected') {
          toast.error(
            t('messages.applicationRejected') || 
            `Your application was rejected. Reason: ${existingApp.rejectionReason || 'Not specified'}`
          );
        }
      }
    } catch (error) {
      console.error('Error checking existing application:', error);
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

  const setupRecaptcha = () => {
    try {
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (!recaptchaContainer) {
        throw new Error('reCAPTCHA container not found');
      }

      // Clear any existing reCAPTCHA
      recaptchaContainer.innerHTML = '';

      // Create new RecaptchaVerifier
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('✅ reCAPTCHA verified');
        },
        'expired-callback': () => {
          console.warn('⚠️ reCAPTCHA expired');
          toast.error('Verification expired. Please try again.');
        }
      });

      return verifier;
    } catch (error) {
      console.error('Error setting up reCAPTCHA:', error);
      throw error;
    }
  };

  const handleSendOTP = async () => {
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

    setSendingOTP(true);

    try {
      console.log('📱 Setting up phone verification...');
      
      // Format phone number for Firebase (add +973 country code)
      const formattedPhone = `+973${phoneNumber}`;
      console.log('📞 Formatted phone:', formattedPhone);

      // Setup reCAPTCHA
      const appVerifier = setupRecaptcha();
      console.log('✅ reCAPTCHA setup complete');

      // Send OTP
      console.log('📤 Sending OTP...');
      const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      console.log('✅ OTP sent successfully');

      setConfirmationResult(result);
      setOtpSent(true);
      toast.success(t('messages.otpSent') || 'OTP sent to your phone');
    } catch (error) {
      console.error('❌ Error sending OTP:', error);
      
      // Clear reCAPTCHA on error
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = '';
      }

      // Handle specific Firebase errors
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format.';
      } else if (firebaseError.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (firebaseError.code === 'auth/captcha-check-failed') {
        errorMessage = 'Verification failed. Please refresh the page and try again.';
      } else if (firebaseError.code === 'auth/operation-not-allowed') {
        errorMessage = 'Phone authentication is not enabled. Please contact support.';
      } else if (firebaseError.message) {
        errorMessage = firebaseError.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error(t('messages.invalidOtp') || 'Please enter a valid 6-digit code');
      return;
    }

    if (!confirmationResult) {
      toast.error('Please request OTP first');
      return;
    }

    setVerifying(true);

    try {
      console.log('🔐 Verifying OTP...');
      await confirmationResult.confirm(otpCode);
      console.log('✅ Phone number verified successfully');

      toast.success(t('messages.phoneVerified') || 'Phone number verified successfully');
      
      // Mark as verified and proceed to submission
      setStep('verify');
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      
      let errorMessage = 'Invalid verification code';
      
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (firebaseError.code === 'auth/code-expired') {
        errorMessage = 'Verification code expired. Please request a new one.';
      } else if (firebaseError.message) {
        errorMessage = firebaseError.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setVerifying(false);
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

    if (step !== 'verify') {
      toast.error(t('messages.verifyPhone') || 'Please verify your phone number first');
      return;
    }

    setSubmitting(true);

    try {
      const appId = await createHostApplication(
        user.uid,
        user.email || '',
        userData.displayName || user.email || 'User',
        `+973${phoneNumber}`,
        cprNumber
      );

      // Mark phone as verified in the application
      await updatePhoneVerification(appId, true);

      setApplicationId(appId);
      setStep('success');
      toast.success(
        t('messages.applicationSubmitted') || 
        'Application submitted successfully! We will review it shortly.'
      );
    } catch (error) {
      console.error('Error submitting application:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit application';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-terracotta-600 animate-spin" />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4">
        <div className="max-w-2xl mx-auto pt-8 pb-20">
          <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-8 shadow-xl text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {t('becomeHost.successTitle') || 'Application Submitted!'}
            </h1>
            
            <p className="text-gray-700 mb-6">
              {t('becomeHost.successMessage') || 
                'Thank you for applying to become a host. We will review your application and get back to you within 24-48 hours.'}
            </p>

            {applicationId && (
              <div className="bg-sand-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-gray-600 mb-1">
                  {t('becomeHost.applicationId') || 'Application ID'}
                </p>
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {applicationId}
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50"
              >
                {t('becomeHost.backHome') || 'Back to Home'}
              </Button>
              <Button
                onClick={() => navigate('/profile')}
                className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white"
              >
                {t('becomeHost.viewProfile') || 'View Profile'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sand-50 via-sand-100 to-sand-200 p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-20">
        <Button
          onClick={() => navigate('/profile')}
          variant="ghost"
          className="mb-6 text-gray-900 hover:text-gray-950 hover:bg-sand-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('becomeHost.back') || 'Back'}
        </Button>

        <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-8 shadow-xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('becomeHost.title') || 'Become a Host'}
            </h1>
            <p className="text-gray-700">
              {t('becomeHost.subtitle') || 
                'Complete the verification process to start hosting on our platform'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-terracotta-600" />
                {t('becomeHost.phoneNumber') || 'Phone Number'}
                <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex items-center bg-sand-50 border border-sand-300 rounded-lg px-3">
                  <span className="text-gray-700 font-medium">+973</span>
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="3XXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  maxLength={8}
                  required
                  disabled={otpSent}
                  className="flex-1 border-sand-300 focus:border-terracotta-500"
                />
                <Button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={sendingOTP || otpSent || !phoneNumber}
                  className="bg-terracotta-600 hover:bg-terracotta-700 text-white"
                >
                  {sendingOTP ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('becomeHost.sending') || 'Sending...'}
                    </>
                  ) : otpSent ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('becomeHost.sent') || 'Sent'}
                    </>
                  ) : (
                    t('becomeHost.sendOtp') || 'Send OTP'
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                {t('becomeHost.phoneHint') || 'Enter your Bahrain mobile number (8 digits)'}
              </p>
            </div>

            {/* OTP Verification */}
            {otpSent && (
              <div className="space-y-2">
                <Label htmlFor="otp" className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-terracotta-600" />
                  {t('becomeHost.verificationCode') || 'Verification Code'}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="otp"
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                    className="flex-1 border-sand-300 focus:border-terracotta-500 text-center text-2xl tracking-widest font-mono"
                  />
                  <Button
                    type="button"
                    onClick={handleVerifyOTP}
                    disabled={verifying || otpCode.length !== 6 || step === 'verify'}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('becomeHost.verifying') || 'Verifying...'}
                      </>
                    ) : step === 'verify' ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Verified
                      </>
                    ) : (
                      t('becomeHost.verify') || 'Verify'
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-600">
                  {t('becomeHost.otpHint') || 'Enter the 6-digit code sent to your phone'}
                </p>
              </div>
            )}

            {/* CPR Number */}
            <div className="space-y-2">
              <Label htmlFor="cpr" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-terracotta-600" />
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
                className="border-sand-300 focus:border-terracotta-500"
              />
              <p className="text-xs text-gray-600">
                {t('becomeHost.cprHint') || 'Enter your 9-digit Bahrain CPR number'}
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {t('becomeHost.infoTitle') || 'Why do we need this information?'}
                  </p>
                  <p className="text-sm text-blue-800">
                    {t('becomeHost.infoMessage') || 
                      'We verify all hosts to ensure the safety and security of our community. Your information is kept confidential and used only for verification purposes.'}
                  </p>
                </div>
              </div>
            </div>

            {/* reCAPTCHA container */}
            <div id="recaptcha-container"></div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting || step !== 'verify' || !phoneNumber || !cprNumber}
              className="w-full h-12 bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold text-lg shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('becomeHost.submitting') || 'Submitting...'}
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