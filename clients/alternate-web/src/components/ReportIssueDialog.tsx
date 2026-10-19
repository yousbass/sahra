import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImagePlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { auth } from '@/lib/firebase';
import { uploadImage, validateImageFile } from '@/lib/imageUpload';

const MAX_DESCRIPTION = 1000;

const ISSUE_TYPES = [
  'not_as_described',
  'missing_amenity',
  'safety_concern',
  'other',
] as const;
type IssueType = (typeof ISSUE_TYPES)[number];

function getApiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  const useExternal =
    configured &&
    (configured.includes('localhost') ||
      configured.includes('127.0.0.1') ||
      import.meta.env.VITE_API_URL_FORCE === 'true');
  return useExternal ? configured : '';
}

interface ReportIssueDialogProps {
  bookingId: string;
  campTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportIssueDialog({ bookingId, campTitle, open, onOpenChange }: ReportIssueDialogProps) {
  const { t } = useTranslation();
  const [issueType, setIssueType] = useState<IssueType>('not_as_described');
  const [description, setDescription] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setIssueType('not_as_described');
    setDescription('');
    setPhotoFile(null);
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handlePickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.valid) {
      toast.error(check.error || t('reportIssue.photoInvalid', 'Please choose a valid image (max 10MB)'));
      return;
    }
    setPhotoFile(file);
  };

  const handleSubmit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      toast.error(t('reportIssue.descriptionRequired', 'Please describe the issue'));
      return;
    }
    const user = auth?.currentUser;
    if (!user) {
      toast.error(t('reportIssue.signInRequired', 'Please sign in to report an issue'));
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        try {
          photoUrl = await uploadImage(photoFile, user.uid);
        } catch {
          toast.error(t('reportIssue.photoUploadFailed', 'Photo upload failed — submitting the report without it'));
        }
      }

      const idToken = await user.getIdToken();
      const res = await fetch(`${getApiBase()}/api/sahra/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          bookingId,
          type: issueType,
          description: trimmed.slice(0, MAX_DESCRIPTION),
          ...(photoUrl ? { photoUrl } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409 || data?.error === 'already_reported') {
        toast.info(t('reportIssue.alreadyReported', "You've already submitted a report for this booking. Our team will be in touch."));
        reset();
        onOpenChange(false);
        return;
      }
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      toast.success(t('reportIssue.submitted', "Your report was submitted. Our team will review it and get back to you."));
      reset();
      onOpenChange(false);
    } catch (err) {
      console.error('Report issue failed:', err);
      toast.error(t('reportIssue.submitFailed', 'Could not submit the report. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('reportIssue.title', 'Report an Issue')}</DialogTitle>
          <DialogDescription>
            {campTitle
              ? t('reportIssue.subtitleWithCamp', 'Tell us what went wrong with your stay at {{camp}}.', { camp: campTitle })
              : t('reportIssue.subtitle', 'Tell us what went wrong with your stay.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div>
            <Label className="mb-2 block font-semibold">{t('reportIssue.typeLabel', 'What kind of issue?')}</Label>
            <RadioGroup value={issueType} onValueChange={(v) => setIssueType(v as IssueType)} className="gap-2">
              {ISSUE_TYPES.map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${issueType === type ? 'border-primary bg-secondary/50' : 'border-border hover:bg-secondary/30'}`}
                >
                  <RadioGroupItem value={type} id={`issue-${type}`} />
                  <span className="text-sm font-medium">{t(`reportIssue.types.${type}`)}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="issue-description" className="mb-2 block font-semibold">
              {t('reportIssue.descriptionLabel', 'Describe the issue')}
            </Label>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              placeholder={t('reportIssue.descriptionPlaceholder', 'What happened? The more detail, the faster we can help.')}
              rows={5}
              maxLength={MAX_DESCRIPTION}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground mt-1 text-end">
              {description.length}/{MAX_DESCRIPTION}
            </p>
          </div>

          <div>
            <Label className="mb-2 block font-semibold">{t('reportIssue.photoLabel', 'Photo (optional)')}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickPhoto}
            />
            {photoFile ? (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <img
                  src={URL.createObjectURL(photoFile)}
                  alt=""
                  className="w-14 h-14 rounded-md object-cover"
                />
                <span className="flex-1 text-sm truncate">{photoFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPhotoFile(null)}
                  disabled={submitting}
                  aria-label={t('reportIssue.removePhoto', 'Remove photo')}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting}
              >
                <ImagePlus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                {t('reportIssue.addPhoto', 'Add a photo')}
              </Button>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              {t('reportIssue.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              onClick={handleSubmit}
              disabled={submitting || !description.trim()}
            >
              {submitting ? t('reportIssue.submitting', 'Submitting…') : t('reportIssue.submit', 'Submit Report')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
