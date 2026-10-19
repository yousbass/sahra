import { CampfireLoader } from '@/components/CampfireLoader';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Phone,
  Store,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  createSellerApplication,
  getSellerApplicationByUserId,
  SellerApplication,
} from '@/lib/sellerApplication';
import {
  initializeRecaptcha,
  sendOTP,
  verifyOTP,
  cleanupRecaptcha,
} from '@/lib/phoneVerification';
import type { MarketCategory } from '@/lib/marketplace';

const CATEGORY_OPTIONS: { key: MarketCategory; tKey: string; fallback: string }[] = [
  { key: 'food', tKey: 'home.serviceCampFood', fallback: 'Camp Food' },
  { key: 'firewood', tKey: 'home.serviceFirewood', fallback: 'Firewood' },
  { key: 'gear', tKey: 'home.serviceGear', fallback: 'Camping Gear' },
];

export default function BecomeSeller() {
  const navigate = useNavigate();
  const { user, userData, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [businessNameEn, setBusinessNameEn] = useState('');
  const [businessNameAr, setBusinessNameAr] = useState('');
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [crNumber, setCrNumber] = useState('');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const [existingApp, setExistingApp] = useState<SellerApplication | null>(null);
  const [checkingApp, setCheckingApp] = useState(true);
  const [reapplying, setReapplying] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    return () => cleanupRecaptcha();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error(t('messages.signInRequired') || 'Please sign in to continue');
      navigate('/signin');
      return;
    }

    if (!authLoading && userData?.isSeller) {
      toast.info(t('messages.alreadySeller') || 'You are already a seller');
      navigate('/my-shop');
      return;
    }

    if (user) {
      checkExistingApplication();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData, authLoading]);

  const checkExistingApplication = async () => {
    if (!user) return;
    try {
      const app = await getSellerApplicationByUserId(user.uid);
      if (app && app.status === 'approved') {
        navigate('/my-shop');
        return;
      }
      setExistingApp(app);
    } catch (error) {
      console.error('Error checking existing seller application:', error);
    } finally {
      setCheckingApp(false);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => /^[367]\d{7}$/.test(phone);
  const validateCR = (cr: string): boolean => /^\d{3,12}(-\d{1,4})?$/.test(cr);

  const toggleCategory = (key: MarketCategory) => {
    setCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
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
    if (!businessNameEn.trim() || !businessNameAr.trim()) {
      toast.error(
        t('becomeSeller.businessNameRequired') ||
          'Please enter your business name in English and Arabic'
      );
      return;
    }
    if (categories.length === 0) {
      toast.error(
        t('becomeSeller.categoriesRequired') || 'Choose at least one category'
      );
      return;
    }
    if (!validateCR(crNumber.trim())) {
      toast.error(
        t('becomeSeller.invalidCr') ||
          'Invalid CR number. Enter your commercial registration number (digits only)'
      );
      return;
    }
    if (!description.trim()) {
      toast.error(
        t('becomeSeller.descriptionRequired') ||
          'Tell us briefly what you plan to sell'
      );
      return;
    }
    if (!validatePhoneNumber(phoneNumber)) {
      toast.error(t('messages.invalidPhone') || 'Invalid Bahrain phone number');
      return;
    }
    if (!phoneVerified) {
      toast.error(t('messages.verifyPhone') || 'Please confirm your phone number first');
      return;
    }

    setSubmitting(true);
    try {
      await createSellerApplication({
        userId: user.uid,
        userEmail: user.email || '',
        userName: userData.displayName || user.email || 'User',
        phoneNumber: `+973${phoneNumber}`,
        businessNameEn: businessNameEn.trim(),
        businessNameAr: businessNameAr.trim(),
        categories,
        crNumber: crNumber.trim(),
        description: description.trim(),
      });

      setStep('success');
      toast.success(
        t('messages.applicationSubmitted') ||
          'Application submitted! We will review it and notify you once approved.'
      );
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Error submitting seller application:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to submit application';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || checkingApp) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4 flex items-center justify-center">
        <CampfireLoader size="md" className="mx-auto my-4" />
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
        <div className="max-w-2xl mx-auto pt-8 pb-20">
          <Card className="modern-card p-8 shadow-xl text-center">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-4">
              {t('becomeSeller.pendingTitle') || 'Application Submitted!'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {t('becomeSeller.pendingMessage') ||
                'Thanks! Your seller application is under review. We will notify you once it has been approved.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => navigate('/')}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t('becomeSeller.backHome') || 'Back to Home'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Existing pending application — show status instead of the form
  if (existingApp?.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
        <div className="max-w-2xl mx-auto pt-8 pb-20">
          <Card className="modern-card p-8 shadow-xl text-center">
            <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Clock className="w-10 h-10 text-yellow-400" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-4">
              {t('becomeSeller.underReviewTitle') || 'Application Under Review'}
            </h1>
            <p className="text-muted-foreground mb-2">
              {t('becomeSeller.underReviewMessage') ||
                'Your seller application has been received and is being reviewed.'}
            </p>
            <p className="text-sm text-muted-foreground/70 mb-6">{existingApp.businessNameEn}</p>
            <Button
              onClick={() => navigate('/')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t('becomeSeller.backHome') || 'Back to Home'}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Rejected application — show the reason with the option to re-apply
  if (existingApp?.status === 'rejected' && !reapplying) {
    return (
      <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
        <div className="max-w-2xl mx-auto pt-8 pb-20">
          <Card className="modern-card p-8 shadow-xl text-center">
            <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full mx-auto mb-6 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-4">
              {t('becomeSeller.rejectedTitle') || 'Application Not Approved'}
            </h1>
            <p className="text-muted-foreground mb-4">
              {t('becomeSeller.rejectedMessage') ||
                'Unfortunately your previous seller application was not approved.'}
            </p>
            {existingApp.rejectionReason && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-300 mb-6 text-left rtl:text-right">
                {existingApp.rejectionReason}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate('/')}>
                {t('becomeSeller.backHome') || 'Back to Home'}
              </Button>
              <Button
                onClick={() => setReapplying(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t('becomeSeller.applyAgain') || 'Apply again'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b desert-gradient p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-20">
        <Button
          onClick={() => navigate('/partner')}
          variant="ghost"
          className="mb-6 text-foreground hover:text-primary hover:bg-secondary"
        >
          <ArrowLeft className="w-4 h-4 mr-2 rtl:rotate-180" />
          {t('becomeSeller.back') || 'Back'}
        </Button>

        <Card className="modern-card p-8 shadow-xl">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {t('becomeSeller.title') || 'Become a Seller'}
            </h1>
            <p className="text-muted-foreground">
              {t('becomeSeller.subtitle') ||
                'Tell us about your business to start selling on the MUKHYMAT marketplace'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Business names */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessEn" className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  {t('becomeSeller.businessNameEn') || 'Business Name (English)'}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="businessEn"
                  value={businessNameEn}
                  onChange={(e) => setBusinessNameEn(e.target.value)}
                  maxLength={60}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAr" className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  {t('becomeSeller.businessNameAr') || 'Business Name (Arabic)'}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="businessAr"
                  dir="rtl"
                  value={businessNameAr}
                  onChange={(e) => setBusinessNameAr(e.target.value)}
                  maxLength={60}
                  required
                />
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {t('becomeSeller.categories') || 'What will you sell?'}
                <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((option) => {
                  const selected = categories.includes(option.key);
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleCategory(option.key)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-card text-muted-foreground border-border/50 hover:border-primary/50'
                      }`}
                    >
                      {t(option.tKey) || option.fallback}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('becomeSeller.categoriesHint') || 'Choose one or more categories'}
              </p>
            </div>

            {/* CR number */}
            <div className="space-y-2">
              <Label htmlFor="cr" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {t('becomeSeller.crNumber') || 'CR Number'}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cr"
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value.replace(/[^\d-]/g, '').slice(0, 15))}
                placeholder="XXXXX-X"
                required
              />
              <p className="text-xs text-muted-foreground">
                {t('becomeSeller.crHint') ||
                  'Your Bahrain commercial registration (CR) number'}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {t('becomeSeller.description') || 'What do you sell?'}
                <span className="text-red-500"> *</span>
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder={
                  t('becomeSeller.descriptionPlaceholder') ||
                  'Briefly describe your products, e.g. fresh camp meals, premium firewood bundles...'
                }
                required
              />
            </div>

            {/* Phone Number + OTP */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                {t('becomeSeller.phoneNumber') || 'Phone Number'}
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
                  className={
                    phoneVerified
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }
                >
                  {phoneVerified ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {t('becomeSeller.verified') || 'Verified'}
                    </>
                  ) : sendingOtp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t('becomeSeller.sendCode') || 'Send code'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('becomeSeller.phoneHint') || 'Enter your Bahrain mobile number (8 digits)'}
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
                      t('becomeSeller.verifyCode') || 'Verify code'
                    )}
                  </Button>
                </div>
              )}
              <div id="recaptcha-container" />
            </div>

            {/* Info Box */}
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-sky-300 mb-1">
                    {t('becomeSeller.infoTitle') || 'Why do we need this information?'}
                  </p>
                  <p className="text-sm text-sky-200/80">
                    {t('becomeSeller.infoMessage') ||
                      'We verify all sellers to keep the marketplace trustworthy. Your information is kept confidential and used only for verification purposes.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting || !phoneVerified}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-lg shadow-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {t('becomeSeller.submitting') || 'Processing...'}
                </>
              ) : (
                t('becomeSeller.submit') || 'Submit Application'
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
