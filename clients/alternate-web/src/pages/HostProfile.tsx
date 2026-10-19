/**
 * Host Profile Page
 * Shows a host's active listings and basic identity so guests can decide
 * whether to book. Reachable via /host/:hostId from CampDetails.
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Tent, Waves, Star, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CampfireLoader } from '@/components/CampfireLoader';

interface HostCamp {
  id: string;
  title: string;
  location: string;
  price: number;
  photo?: string;
  images?: string[];
  averageRating?: number;
  reviewCount?: number;
  listingType?: string;
  hostName?: string;
}

export default function HostProfile() {
  const { hostId } = useParams<{ hostId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [camps, setCamps] = useState<HostCamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [hostName, setHostName] = useState('');

  useEffect(() => {
    if (!hostId || !db) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        // Public host profiles may only show ACTIVE listings — rules now
        // reject camp queries that aren't provably scoped to active status
        // (drafts/pending listings are owner/admin-only).
        const q = query(
          collection(db, 'camps'),
          where('hostId', '==', hostId),
          where('status', '==', 'active'),
        );
        const snap = await getDocs(q);
        const results: HostCamp[] = [];
        let name = '';
        snap.forEach((doc) => {
          const d = doc.data() as HostCamp;
          if (!d.title) return;
          results.push({ id: doc.id, ...d });
          if (!name && d.hostName) name = d.hostName;
        });
        setHostName(name);
        setCamps(results);
      } catch (err) {
        console.error('[HostProfile] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [hostId]);

  const displayName = hostName || t('campDetails.hostMemberSince', 'Host');
  const activeCamps = camps.filter((c: any) => !c.status || c.status === 'active');

  return (
    <div className="min-h-screen desert-gradient pb-24">
      {/* Header */}
      <div className="border-b border-border/60 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('campDetails.back', 'Back')}
          </Button>
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 text-primary/60" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-sans text-foreground">{displayName}</h1>
              <p className="text-muted-foreground mt-1">
                {loading ? '—' : `${activeCamps.length} listing${activeCamps.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <CampfireLoader size="lg" />
          </div>
        ) : activeCamps.length === 0 ? (
          <Card className="modern-card p-10 text-center">
            <Tent className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">{t('home.noCampsTitle', 'No active listings')}</p>
          </Card>
        ) : (
          <>
            <h2 className="text-xl font-bold font-sans text-foreground mb-5">
              {t('campDetails.hostListings', `Listings by ${displayName}`)}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeCamps.map((camp) => {
                const photo = camp.images?.[0] || camp.photo;
                const isKashta = camp.listingType === 'kashta';
                return (
                  <Card
                    key={camp.id}
                    className="modern-card overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                    onClick={() => navigate(`/camp/${camp.id}`)}
                  >
                    <div className="h-44 relative overflow-hidden">
                      {photo ? (
                        <img src={photo} alt={camp.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          {isKashta ? <Waves className="w-10 h-10 text-accent" /> : <Tent className="w-10 h-10 text-primary" />}
                        </div>
                      )}
                      <Badge className={`absolute top-3 left-3 ${isKashta ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'} font-semibold`}>
                        {isKashta ? t('listingType.kashta.badge', 'Kashta') : t('listingType.camp.badge', 'Camp')}
                      </Badge>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-foreground truncate">{camp.title}</h3>
                      {camp.location && (
                        <div className="flex items-center gap-1 mt-1 text-muted-foreground text-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate">{camp.location}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        {camp.averageRating && camp.averageRating > 0 ? (
                          <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
                            <Star className="w-4 h-4 text-primary fill-primary" />
                            {camp.averageRating.toFixed(1)}
                            {camp.reviewCount ? <span className="text-muted-foreground font-normal">({camp.reviewCount})</span> : null}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t('campDetails.noReviews', 'New')}</span>
                        )}
                        <span className="font-bold text-primary">
                          {Number(camp.price).toFixed(3)} BD
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
