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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  createHostApplication,
  getHostApplicationByUserId
} from '@/lib/hostApplication';

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
  }, [user, userData, authLoading, navigate, t]);

  const checkExistingApplication = async () => {
    if (!user) return;

    try {
      const existingApp = await getHostApplicationByUserId(user.uid);
      
      if (existingApp && existingApp.status === 'approved') {
        navigate('/host');
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

  const handleVerifyPhone = () => {
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

    // Mark phone as verified
    setPhoneVerified(true);
    toast.success(t('messages.phoneVerified') || 'Phone number confirmed');
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
      toast.success(
        t('messages.hostActivated') || 
        'Congratulations! You are now a host and can start listing your properties.'
      );
      
      // Redirect to host dashboard after 2 seconds
      setTimeout(() => {
        navigate('/host');
      }, 2000);
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
              {t('becomeHost.successTitle') || 'Welcome, Host!'}
            </h1>
            
            <p className="text-gray-700 mb-6">
              {t('becomeHost.successMessage') || 
                'Congratulations! You are now a verified host. You can start creating your camp listings right away.'}
            </p>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="border-2 border-sand-300 text-gray-900 hover:bg-sand-50"
              >
                {t('becomeHost.backHome') || 'Back to Home'}
              </Button>
              <Button
                onClick={() => navigate('/host')}
                className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white"
              >
                {t('becomeHost.createListing') || 'Create Your First Listing'}
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
                  onChange={(e) => {
                    setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 8));
                    setPhoneVerified(false);
                  }}
                  maxLength={8}
                  required
                  disabled={phoneVerified}
                  className="flex-1 border-sand-300 focus:border-terracotta-500"
                />
                <Button
                  type="button"
                  onClick={handleVerifyPhone}
                  disabled={phoneVerified || !phoneNumber || phoneNumber.length !== 8}
                  className={phoneVerified 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-terracotta-600 hover:bg-terracotta-700 text-white"
                  }
                >
                  {phoneVerified ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('becomeHost.confirmed') || 'Confirmed'}
                    </>
                  ) : (
                    t('becomeHost.confirm') || 'Confirm'
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-600">
                {t('becomeHost.phoneHint') || 'Enter your Bahrain mobile number (8 digits)'}
              </p>
            </div>

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

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting || !phoneVerified || !phoneNumber || !cprNumber}
              className="w-full h-12 bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold text-lg shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('becomeHost.submitting') || 'Processing...'}
                </>
              ) : (
                t('becomeHost.becomeHost') || 'Become a Host'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}