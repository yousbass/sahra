import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Save,
  Settings as SettingsIcon,
  DollarSign,
  Mail,
  Globe,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { getSiteSettings, updateSiteSettings } from '@/lib/firestore';
import { useAuth } from '@/hooks/useAuth';

export default function AdminSettings() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Platform Settings
  const [platformName, setPlatformName] = useState('Sahra - Desert Camping Platform');
  const [contactEmail, setContactEmail] = useState('support@sahra.com');
  const [supportPhone, setSupportPhone] = useState('+973 XXXX XXXX');
  const [platformDescription, setPlatformDescription] = useState('Your premier desert camping experience in Bahrain');

  // Financial Settings
  const [serviceFeePercentage, setServiceFeePercentage] = useState('10');
  const [hostCommissionRate, setHostCommissionRate] = useState('85');
  const [taxRate, setTaxRate] = useState('5');
  const [minBookingAmount, setMinBookingAmount] = useState('50');

  // Refund Policy Settings
  const [defaultRefundPolicy, setDefaultRefundPolicy] = useState('refundable');
  const [refundDeadlineHours, setRefundDeadlineHours] = useState('48');
  const [cancellationFeePercentage, setCancellationFeePercentage] = useState('10');

  // General Settings
  const [maxGuestsPerCamp, setMaxGuestsPerCamp] = useState('50');
  const [minBookingDuration, setMinBookingDuration] = useState('1');
  const [maxBookingDuration, setMaxBookingDuration] = useState('30');
  const [reviewDeadlineDays, setReviewDeadlineDays] = useState('14');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await getSiteSettings();
      
      if (settings) {
        setPlatformName(settings.siteName);
        setContactEmail(settings.supportEmail);
        setSupportPhone(settings.supportPhone);
        console.log('✅ Settings loaded from Firestore');
      } else {
        console.log('ℹ️ No settings found, using defaults');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) {
      toast.error('You must be logged in to save settings');
      return;
    }

    try {
      setSaving(true);
      
      const settings = {
        siteName: platformName,
        supportEmail: contactEmail,
        supportPhone: supportPhone,
        currency: 'BHD',
        language: 'en',
        timezone: 'Asia/Bahrain'
      };
      
      await updateSiteSettings(settings, user.uid);
      
      toast.success('Settings saved successfully');
      console.log('✅ Settings saved to Firestore');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-terracotta-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Platform Settings</h2>
        <p className="text-gray-600 mt-1">Configure your platform settings and policies</p>
      </div>

      {/* Platform Settings */}
      <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-terracotta-500 to-terracotta-600 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Platform Settings</h3>
        </div>

        <div className="grid gap-6">
          <div className="space-y-2">
            <Label htmlFor="platformName">Platform Name</Label>
            <Input
              id="platformName"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="border-sand-300 focus:border-terracotta-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supportPhone">Support Phone</Label>
              <Input
                id="supportPhone"
                type="tel"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="border-sand-300 focus:border-terracotta-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="platformDescription">Platform Description</Label>
            <Textarea
              id="platformDescription"
              value={platformDescription}
              onChange={(e) => setPlatformDescription(e.target.value)}
              rows={3}
              className="border-sand-300 focus:border-terracotta-500 resize-none"
            />
          </div>
        </div>
      </Card>

      {/* Financial Settings */}
      <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Financial Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="serviceFee">Service Fee Percentage (%)</Label>
            <Input
              id="serviceFee"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={serviceFeePercentage}
              onChange={(e) => setServiceFeePercentage(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
            <p className="text-xs text-gray-600">Fee charged to guests on each booking</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hostCommission">Host Commission Rate (%)</Label>
            <Input
              id="hostCommission"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={hostCommissionRate}
              onChange={(e) => setHostCommissionRate(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
            <p className="text-xs text-gray-600">Percentage hosts receive from bookings</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxRate">Tax Rate (%)</Label>
            <Input
              id="taxRate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
            <p className="text-xs text-gray-600">VAT or sales tax percentage</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minBooking">Minimum Booking Amount (BD)</Label>
            <Input
              id="minBooking"
              type="number"
              min="0"
              step="0.1"
              value={minBookingAmount}
              onChange={(e) => setMinBookingAmount(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
            <p className="text-xs text-gray-600">Minimum total booking value</p>
          </div>
        </div>
      </Card>

      {/* Refund Policy Settings */}
      <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Refund Policy Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="defaultPolicy">Default Refund Policy</Label>
            <select
              id="defaultPolicy"
              value={defaultRefundPolicy}
              onChange={(e) => setDefaultRefundPolicy(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-sand-300 focus:border-terracotta-500 focus:outline-none"
            >
              <option value="refundable">Refundable</option>
              <option value="non-refundable">Non-Refundable</option>
            </select>
            <p className="text-xs text-gray-600">Default policy for new camps</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refundDeadline">Refund Deadline (Hours)</Label>
            <Input
              id="refundDeadline"
              type="number"
              min="0"
              value={refundDeadlineHours}
              onChange={(e) => setRefundDeadlineHours(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
            <p className="text-xs text-gray-600">Hours before check-in for full refund</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellationFee">Cancellation Fee (%)</Label>
            <Input
              id="cancellationFee"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={cancellationFeePercentage}
              onChange={(e) => setCancellationFeePercentage(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
            <p className="text-xs text-gray-600">Fee for late cancellations</p>
          </div>
        </div>
      </Card>

      {/* General Settings */}
      <Card className="bg-white/95 backdrop-blur-sm border-sand-300 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">General Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="maxGuests">Max Guests Per Camp</Label>
            <Input
              id="maxGuests"
              type="number"
              min="1"
              value={maxGuestsPerCamp}
              onChange={(e) => setMaxGuestsPerCamp(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
            <p className="text-xs text-gray-600">Maximum capacity limit</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reviewDeadline">Review Deadline (Days)</Label>
            <Input
              id="reviewDeadline"
              type="number"
              min="1"
              value={reviewDeadlineDays}
              onChange={(e) => setReviewDeadlineDays(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
            <p className="text-xs text-gray-600">Days after checkout to leave review</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minDuration">Min Booking Duration (Nights)</Label>
            <Input
              id="minDuration"
              type="number"
              min="1"
              value={minBookingDuration}
              onChange={(e) => setMinBookingDuration(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
            <p className="text-xs text-gray-600">Minimum stay requirement</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxDuration">Max Booking Duration (Nights)</Label>
            <Input
              id="maxDuration"
              type="number"
              min="1"
              value={maxBookingDuration}
              onChange={(e) => setMaxBookingDuration(e.target.value)}
              className="border-sand-300 focus:border-terracotta-500"
            />
            <p className="text-xs text-gray-600">Maximum stay limit</p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveSettings}
          disabled={saving}
          className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white font-semibold px-8"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save All Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}