'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Home, LogOut, RefreshCw, Search, Star, BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Image as ImageIcon, Users, ArrowUpDown, ArrowUp, ArrowDown, Table2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, ScatterChart, Scatter, PieChart, Pie, Cell } from 'recharts';

// Configurable thresholds
const WATCHLIST_THRESHOLDS = {
  BELOW_AVERAGE_THRESHOLD: 0.5, // Flag if photos_per_tour is less than 50% of average
  OUTLIER_MULTIPLIER: 2.0, // requests > 2x median
  MIN_CLIENT_INFO_REQUESTS: 3, // Only flag if requested_client_info > 3
};

interface GuideBehaviour {
  id: number;
  name: string | null;
  profile_picture: string | null;
  is_favourite: boolean | null;
  tours_done: number | null;
  photos_taken_frequency: number | null;
  photos_taken_amount: number | null;
  requested_client_info: number | null;
}

type RankingMode = 'engagement' | 'tours' | 'photos_per_tour' | 'requests_per_tour';
type SortField = 'name' | 'tours_done' | 'photos_taken_amount' | 'photos_taken_frequency' | 'requested_client_info' | 'photos_per_tour' | 'requests_per_tour' | 'status';
type SortDirection = 'asc' | 'desc';

type StatusType = 'inactive' | 'new' | 'emerging' | 'consistent' | 'high_performer' | 'needs_attention' | 'content_focused' | 'low_photo_activity' | 'high_client_info_requests';

interface GuideWithMetrics extends GuideBehaviour {
  photos_per_tour: number;
  requests_per_tour: number;
  engagement_score: number;
  status: StatusType[];
}

export default function AdminGuideBehaviourPage() {
  const t = useTranslations('admin.guideBehaviour');
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [guides, setGuides] = useState<GuideBehaviour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavourites, setOnlyFavourites] = useState(false);
  const [rankingMode, setRankingMode] = useState<RankingMode>('engagement');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [activeView, setActiveView] = useState<'table' | 'charts'>('table');

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchGuides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('guides_temp')
        .select('id, name, profile_picture, is_favourite, tours_done, photos_taken_frequency, photos_taken_amount, requested_client_info')
        .order('id', { ascending: true });

      if (fetchError) {
        console.error('Failed to fetch guides:', fetchError);
        setError(t('failedToLoad'));
        return;
      }

      setGuides((data as GuideBehaviour[]) || []);
    } catch (err) {
      console.error('Failed to fetch guides:', err);
      setError(t('failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchGuides();
    }
  }, [user, profile, fetchGuides]);

  // Normalize a value between 0 and 1 using min-max
  const normalize = useCallback((value: number, min: number, max: number): number => {
    if (max === min) return 0.5;
    return (value - min) / (max - min);
  }, []);

  // Calculate derived metrics for all guides
  const guidesWithMetrics = useMemo((): GuideWithMetrics[] => {
    if (guides.length === 0) return [];

    // Calculate base metrics
    const baseMetrics = guides.map(guide => {
      const toursDone = guide.tours_done ?? 0;
      const photosAmount = guide.photos_taken_amount ?? 0;
      const photosFrequency = guide.photos_taken_frequency ?? 0;
      const clientInfoRequests = guide.requested_client_info ?? 0;

      const photosPerTour = toursDone > 0 ? photosAmount / toursDone : 0;
      const requestsPerTour = toursDone > 0 ? clientInfoRequests / toursDone : 0;

      return {
        ...guide,
        tours_done: toursDone,
        photos_taken_amount: photosAmount,
        photos_taken_frequency: photosFrequency,
        requested_client_info: clientInfoRequests,
        photos_per_tour: photosPerTour,
        requests_per_tour: requestsPerTour,
        engagement_score: 0, // Will calculate below
      };
    });

    // Calculate min/max for normalization
    const toursDoneValues = baseMetrics.map(g => g.tours_done);
    const photosPerTourValues = baseMetrics.map(g => g.photos_per_tour);
    const requestsPerTourValues = baseMetrics.map(g => g.requests_per_tour);

    const minTours = Math.min(...toursDoneValues);
    const maxTours = Math.max(...toursDoneValues);
    const minPhotosPerTour = Math.min(...photosPerTourValues);
    const maxPhotosPerTour = Math.max(...photosPerTourValues);
    const minRequestsPerTour = Math.min(...requestsPerTourValues);
    const maxRequestsPerTour = Math.max(...requestsPerTourValues);

    // Calculate engagement scores
    return baseMetrics.map(guide => {
      const toursDone = guide.tours_done ?? 0;
      const requestedClientInfo = guide.requested_client_info ?? 0;
      const photosTakenAmount = guide.photos_taken_amount ?? 0;
      const photosTakenFrequency = guide.photos_taken_frequency ?? 0;

      const normTours = normalize(toursDone, minTours, maxTours);
      const normPhotosPerTour = normalize(guide.photos_per_tour, minPhotosPerTour, maxPhotosPerTour);
      const normRequestsPerTour = normalize(guide.requests_per_tour, minRequestsPerTour, maxRequestsPerTour);

      const engagementScore = 0.45 * normTours + 0.35 * normPhotosPerTour + 0.20 * (1 - normRequestsPerTour);

      // Determine statuses - multi-category assignment
      const statuses: StatusType[] = [];
      
      // Calculate medians for status determination (same as watchlist)
      const sortedRequestsPerTour = [...requestsPerTourValues].sort((a, b) => a - b);
      const medianRequestsPerTour = sortedRequestsPerTour.length > 0
        ? sortedRequestsPerTour[Math.floor(sortedRequestsPerTour.length / 2)]
        : 0;
      
      const sortedPhotosPerTour = [...photosPerTourValues].sort((a, b) => a - b);
      const medianPhotosPerTour = sortedPhotosPerTour.length > 0
        ? sortedPhotosPerTour[Math.floor(sortedPhotosPerTour.length / 2)]
        : 0;

      // Check for high client info requests (matches watchlist)
      const hasHighClientInfoRequests = requestedClientInfo > WATCHLIST_THRESHOLDS.MIN_CLIENT_INFO_REQUESTS &&
                                        requestedClientInfo > medianRequestsPerTour * WATCHLIST_THRESHOLDS.OUTLIER_MULTIPLIER &&
                                        medianRequestsPerTour > 0;

      // Check for low photo activity (matches watchlist)
      const hasLowPhotoActivity = guide.photos_per_tour < 1 ||
                                  (medianPhotosPerTour > 0 &&
                                   guide.photos_per_tour < medianPhotosPerTour * WATCHLIST_THRESHOLDS.BELOW_AVERAGE_THRESHOLD);

      // Mutually exclusive: tour count categories
      if (toursDone === 0) {
        statuses.push('inactive');
      } else if (toursDone <= 2) {
        statuses.push('new');
      } else if (toursDone <= 5) {
        statuses.push('emerging');
      } else {
        statuses.push('consistent');
      }

      // Can coexist: issue flags
      if (hasLowPhotoActivity && hasHighClientInfoRequests) {
        statuses.push('needs_attention');
      } else {
        if (hasLowPhotoActivity) {
          statuses.push('low_photo_activity');
        }
        if (hasHighClientInfoRequests) {
          statuses.push('high_client_info_requests');
        }
      }

      // Can coexist: positive indicators
      if (medianPhotosPerTour > 0 && guide.photos_per_tour >= medianPhotosPerTour) {
        statuses.push('content_focused');
      }

      // High performer: exceptional overall (only if no issues)
      if (!hasLowPhotoActivity && !hasHighClientInfoRequests && toursDone >= 3) {
        const sortedTours = [...toursDoneValues].sort((a, b) => b - a);
        const top50ToursThreshold = sortedTours[Math.floor(sortedTours.length * 0.5)];
        const hasActivity = photosTakenAmount > 0 || photosTakenFrequency > 0;
        if (toursDone >= top50ToursThreshold && 
            guide.requests_per_tour <= medianRequestsPerTour &&
            hasActivity) {
          statuses.push('high_performer');
        }
      }

      return {
        ...guide,
        engagement_score: engagementScore,
        status: statuses,
      };
    });
  }, [guides, normalize]);

  // Calculate KPI totals
  const kpiTotals = useMemo(() => {
    return {
      totalTours: guidesWithMetrics.reduce((sum, g) => sum + (g.tours_done ?? 0), 0),
      totalPhotos: guidesWithMetrics.reduce((sum, g) => sum + (g.photos_taken_amount ?? 0), 0),
      totalPhotoMoments: guidesWithMetrics.reduce((sum, g) => sum + (g.photos_taken_frequency ?? 0), 0),
      totalClientInfoRequests: guidesWithMetrics.reduce((sum, g) => sum + (g.requested_client_info ?? 0), 0),
    };
  }, [guidesWithMetrics]);

  // Get ranked guides for leaderboard
  const rankedGuides = useMemo(() => {
    const sorted = [...guidesWithMetrics].sort((a, b) => {
      switch (rankingMode) {
        case 'engagement':
          return b.engagement_score - a.engagement_score;
        case 'tours':
          return (b.tours_done ?? 0) - (a.tours_done ?? 0);
        case 'photos_per_tour':
          return b.photos_per_tour - a.photos_per_tour;
        case 'requests_per_tour':
          return b.requests_per_tour - a.requests_per_tour;
        default:
          return 0;
      }
    });
    return sorted.slice(0, 8);
  }, [guidesWithMetrics, rankingMode]);

  // Get watchlist flags
  const watchlistFlags = useMemo(() => {
    const flags: Array<{ guide: GuideWithMetrics; reasons: string[] }> = [];

    // Calculate median for outlier detection
    const requestsPerTourValues = guidesWithMetrics.map(g => g.requests_per_tour);
    const sortedRequests = [...requestsPerTourValues].sort((a, b) => a - b);
    const medianRequests = sortedRequests.length > 0 
      ? sortedRequests[Math.floor(sortedRequests.length / 2)]
      : 0;

    // Calculate median photos_per_tour for the group
    const photosPerTourValues = guidesWithMetrics.map(g => g.photos_per_tour);
    const sortedPhotosPerTour = [...photosPerTourValues].sort((a, b) => a - b);
    const medianPhotosPerTour = sortedPhotosPerTour.length > 0
      ? sortedPhotosPerTour[Math.floor(sortedPhotosPerTour.length / 2)]
      : 0;

    guidesWithMetrics.forEach(guide => {
      const reasons: string[] = [];

      // Less than 1 photo per tour
      if (guide.photos_per_tour < 1) {
        reasons.push('lessThanOnePhotoPerTour');
      }
      // Significantly below median photos
      else if (medianPhotosPerTour > 0 &&
               guide.photos_per_tour < medianPhotosPerTour * WATCHLIST_THRESHOLDS.BELOW_AVERAGE_THRESHOLD) {
        reasons.push('lessPhotosThanAverage');
      }

      // Often requests client info
      const requestedClientInfo = guide.requested_client_info ?? 0;
      if (requestedClientInfo > WATCHLIST_THRESHOLDS.MIN_CLIENT_INFO_REQUESTS &&
          requestedClientInfo > medianRequests * WATCHLIST_THRESHOLDS.OUTLIER_MULTIPLIER && 
          medianRequests > 0) {
        reasons.push('oftenRequestsClientInfo');
      }

      if (reasons.length > 0) {
        flags.push({ guide, reasons });
      }
    });

    return flags;
  }, [guidesWithMetrics]);

  // Filter and sort guides for table
  const filteredAndSortedGuides = useMemo(() => {
    let filtered = guidesWithMetrics.filter(guide => {
      const matchesSearch = !searchQuery || 
        guide.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFavourites = !onlyFavourites || guide.is_favourite === true;
      return matchesSearch && matchesFavourites;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'tours_done':
          aValue = a.tours_done ?? 0;
          bValue = b.tours_done ?? 0;
          break;
        case 'photos_taken_amount':
          aValue = a.photos_taken_amount ?? 0;
          bValue = b.photos_taken_amount ?? 0;
          break;
        case 'photos_taken_frequency':
          aValue = a.photos_taken_frequency ?? 0;
          bValue = b.photos_taken_frequency ?? 0;
          break;
        case 'requested_client_info':
          aValue = a.requested_client_info ?? 0;
          bValue = b.requested_client_info ?? 0;
          break;
        case 'photos_per_tour':
          aValue = a.photos_per_tour;
          bValue = b.photos_per_tour;
          break;
        case 'requests_per_tour':
          aValue = a.requests_per_tour;
          bValue = b.requests_per_tour;
          break;
        case 'status':
          // Sort by first status in array, or join all statuses for comparison
          aValue = a.status.length > 0 ? a.status.join(', ') : '';
          bValue = b.status.length > 0 ? b.status.join(', ') : '';
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [guidesWithMetrics, searchQuery, onlyFavourites, sortField, sortDirection]);

  // Get status color for charts (pastel colors, not too bright)
  const getStatusColor = (status: StatusType): string => {
    switch (status) {
      case 'inactive':
        return '#94a3b8'; // slate-400 (soft gray)
      case 'new':
        return '#60a5fa'; // blue-400 (soft blue)
      case 'emerging':
        return '#a78bfa'; // violet-400 (soft purple)
      case 'consistent':
        return '#5eead4'; // teal-300 (soft teal)
      case 'high_performer':
        return '#4ade80'; // green-400 (soft green)
      case 'needs_attention':
        return '#f87171'; // red-400 (soft red)
      case 'content_focused':
        return '#818cf8'; // indigo-400 (soft indigo)
      case 'low_photo_activity':
        return '#fb923c'; // orange-400 (soft orange)
      case 'high_client_info_requests':
        return '#facc15'; // yellow-400 (soft yellow)
      default:
        return '#cbd5e1'; // slate-300
    }
  };

  // Get primary status (first in array)
  const getPrimaryStatus = (statuses: StatusType[]): StatusType => {
    return statuses.length > 0 ? statuses[0] : 'inactive';
  };

  // Get max values for inline bars
  const maxValues = useMemo(() => {
    if (filteredAndSortedGuides.length === 0) {
      return {
        tours_done: 1,
        photos_taken_amount: 1,
        photos_taken_frequency: 1,
        requested_client_info: 1,
        photos_per_tour: 1,
        requests_per_tour: 1,
      };
    }

    return {
      tours_done: Math.max(...filteredAndSortedGuides.map(g => g.tours_done ?? 0), 1),
      photos_taken_amount: Math.max(...filteredAndSortedGuides.map(g => g.photos_taken_amount ?? 0), 1),
      photos_taken_frequency: Math.max(...filteredAndSortedGuides.map(g => g.photos_taken_frequency ?? 0), 1),
      requested_client_info: Math.max(...filteredAndSortedGuides.map(g => g.requested_client_info ?? 0), 1),
      photos_per_tour: Math.max(...filteredAndSortedGuides.map(g => g.photos_per_tour), 1),
      requests_per_tour: Math.max(...filteredAndSortedGuides.map(g => g.requests_per_tour), 1),
    };
  }, [filteredAndSortedGuides]);

  // Chart data preparation
  const toursDoneChartData = useMemo(() => {
    return [...filteredAndSortedGuides]
      .sort((a, b) => (b.tours_done ?? 0) - (a.tours_done ?? 0))
      .slice(0, 20)
      .map(guide => ({
        name: guide.name || 'Unnamed Guide',
        tours: guide.tours_done ?? 0,
        status: getPrimaryStatus(guide.status),
        color: getStatusColor(getPrimaryStatus(guide.status)),
      }));
  }, [filteredAndSortedGuides]);

  const photosPerTourChartData = useMemo(() => {
    return [...filteredAndSortedGuides]
      .sort((a, b) => b.photos_per_tour - a.photos_per_tour)
      .slice(0, 20)
      .map(guide => ({
        name: guide.name || 'Unnamed Guide',
        photosPerTour: guide.photos_per_tour,
        status: getPrimaryStatus(guide.status),
        color: getStatusColor(getPrimaryStatus(guide.status)),
      }));
  }, [filteredAndSortedGuides]);

  const scatterChartData = useMemo(() => {
    return filteredAndSortedGuides.map(guide => ({
      name: guide.name || 'Unnamed Guide',
      tours: guide.tours_done,
      photosPerTour: guide.photos_per_tour,
      clientInfoRequests: guide.requested_client_info,
      status: getPrimaryStatus(guide.status),
      color: getStatusColor(getPrimaryStatus(guide.status)),
    }));
  }, [filteredAndSortedGuides]);

  const statusDistributionData = useMemo(() => {
    const statusCounts: Record<StatusType, number> = {
      inactive: 0,
      new: 0,
      emerging: 0,
      consistent: 0,
      high_performer: 0,
      needs_attention: 0,
      content_focused: 0,
      low_photo_activity: 0,
      high_client_info_requests: 0,
    };

    filteredAndSortedGuides.forEach(guide => {
      const primaryStatus = getPrimaryStatus(guide.status);
      statusCounts[primaryStatus] = (statusCounts[primaryStatus] || 0) + 1;
    });

    return Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status,
        value: count,
        color: getStatusColor(status as StatusType),
        label: t(status as any),
      }));
  }, [filteredAndSortedGuides, t]);

  const statusMetricsData = useMemo(() => {
    const statusGroups: Record<StatusType, { tours: number[]; photosPerTour: number[]; clientInfo: number[] }> = {
      inactive: { tours: [], photosPerTour: [], clientInfo: [] },
      new: { tours: [], photosPerTour: [], clientInfo: [] },
      emerging: { tours: [], photosPerTour: [], clientInfo: [] },
      consistent: { tours: [], photosPerTour: [], clientInfo: [] },
      high_performer: { tours: [], photosPerTour: [], clientInfo: [] },
      needs_attention: { tours: [], photosPerTour: [], clientInfo: [] },
      content_focused: { tours: [], photosPerTour: [], clientInfo: [] },
      low_photo_activity: { tours: [], photosPerTour: [], clientInfo: [] },
      high_client_info_requests: { tours: [], photosPerTour: [], clientInfo: [] },
    };

    filteredAndSortedGuides.forEach(guide => {
      const primaryStatus = getPrimaryStatus(guide.status);
      statusGroups[primaryStatus].tours.push(guide.tours_done ?? 0);
      statusGroups[primaryStatus].photosPerTour.push(guide.photos_per_tour);
      statusGroups[primaryStatus].clientInfo.push(guide.requested_client_info ?? 0);
    });

    return Object.entries(statusGroups)
      .filter(([_, data]) => data.tours.length > 0)
      .map(([status, data]) => ({
        status: t(status as any),
        avgTours: data.tours.reduce((a, b) => a + b, 0) / data.tours.length,
        avgPhotosPerTour: data.photosPerTour.reduce((a, b) => a + b, 0) / data.photosPerTour.length,
        avgClientInfo: data.clientInfo.reduce((a, b) => a + b, 0) / data.clientInfo.length,
        color: getStatusColor(status as StatusType),
      }));
  }, [filteredAndSortedGuides, t]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const scrollToTable = () => {
    const tableElement = document.getElementById('main-table');
    tableElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const getStatusBadge = (status: StatusType) => {
    switch (status) {
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">{t('inactive')}</Badge>;
      case 'new':
        return <Badge className="bg-blue-50 text-blue-700">{t('new')}</Badge>;
      case 'emerging':
        return <Badge className="bg-purple-100 text-purple-800">{t('emerging')}</Badge>;
      case 'consistent':
        return <Badge className="bg-teal-100 text-teal-800">{t('consistent')}</Badge>;
      case 'high_performer':
        return <Badge className="bg-green-100 text-green-800">{t('highPerformer')}</Badge>;
      case 'needs_attention':
        return <Badge className="bg-red-100 text-red-800">{t('needsAttention')}</Badge>;
      case 'content_focused':
        return <Badge className="bg-blue-100 text-blue-800">{t('contentFocused')}</Badge>;
      case 'low_photo_activity':
        return <Badge className="bg-orange-100 text-orange-800">{t('lowPhotoActivity')}</Badge>;
      case 'high_client_info_requests':
        return <Badge className="bg-yellow-100 text-yellow-800">{t('highClientInfoRequests')}</Badge>;
      default:
        return null;
    }
  };

  const InlineBar = ({ value, max, isInteger = false }: { value: number; max: number; isInteger?: boolean }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const displayValue = isInteger ? Math.round(value).toLocaleString() : value.toFixed(1);
    return (
      <div className="relative w-full min-w-[80px] h-6 flex items-center">
        <div className="absolute inset-0 bg-muted/30 rounded" />
        <div 
          className="absolute inset-y-0 left-0 bg-[#1BDD95]/30 rounded transition-all"
          style={{ width: `${percentage}%` }}
        />
        <span className="relative z-10 px-2 text-sm font-medium text-foreground">{displayValue}</span>
      </div>
    );
  };

  if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-navy">{t('title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/${locale}/admin/dashboard`}>
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                {t('dashboard')}
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('logout')}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {t('failedToLoad')}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Zone A: KPI Strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t('totalTours')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{kpiTotals.totalTours.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t('allGuidesDataset')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t('totalPhotos')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{kpiTotals.totalPhotos.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t('allGuidesDataset')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t('totalPhotoMoments')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{kpiTotals.totalPhotoMoments.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t('allGuidesDataset')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>{t('totalClientInfoRequests')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{kpiTotals.totalClientInfoRequests.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">{t('allGuidesDataset')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Zone B: Behaviour Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Behaviour Leaderboard */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('behaviourLeaderboard')}</CardTitle>
                  <CardDescription>{t('topPerformers')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <Button
                      variant={rankingMode === 'engagement' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRankingMode('engagement')}
                    >
                      {t('engagementScore')}
                    </Button>
                    <Button
                      variant={rankingMode === 'tours' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRankingMode('tours')}
                    >
                      {t('mostTours')}
                    </Button>
                    <Button
                      variant={rankingMode === 'photos_per_tour' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRankingMode('photos_per_tour')}
                    >
                      {t('mostPhotosPerTour')}
                    </Button>
                    <Button
                      variant={rankingMode === 'requests_per_tour' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRankingMode('requests_per_tour')}
                    >
                      {t('mostClientInfoRequestsPerTour')}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {rankedGuides.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No guides found</p>
                      </div>
                    ) : (
                      rankedGuides.map((guide, index) => (
                        <div key={guide.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                            {index + 1}
                          </div>
                          {guide.profile_picture ? (
                            <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                              <Image
                                src={guide.profile_picture}
                                alt={guide.name || 'Guide'}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <Users className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{guide.name || 'Unnamed Guide'}</div>
                            <div className="text-xs text-muted-foreground">
                              {guide.tours_done} {t('tours')} • {guide.photos_per_tour.toFixed(1)} {t('photosPerTourShort')}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {rankedGuides.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-4"
                      onClick={scrollToTable}
                    >
                      {t('viewAllGuides')}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Watchlist */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('watchlist')}</CardTitle>
                  <CardDescription>{t('guidesNeedAttention')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {watchlistFlags.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">{t('noGuidesNeedAttention')}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {watchlistFlags.map(({ guide, reasons }) => (
                        <div key={guide.id} className="flex items-center gap-3 p-3 rounded-lg border border-yellow-200 bg-yellow-50">
                          {guide.profile_picture ? (
                            <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                              <Image
                                src={guide.profile_picture}
                                alt={guide.name || 'Guide'}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <Users className="h-4 w-4 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{guide.name || 'Unnamed Guide'}</div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {reasons.map((reason, index) => (
                                <Badge key={index} variant="outline" className="bg-yellow-100 text-yellow-800 text-xs">
                                  {t(reason as any)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Zone C: Main Table and Charts */}
            <Card id="main-table">
              <CardHeader>
                <CardTitle>{t('allGuides')}</CardTitle>
                <CardDescription>{t('completeOverview')}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search and Filters */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="only-favourites"
                        checked={onlyFavourites}
                        onChange={(e) => setOnlyFavourites(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="only-favourites" className="text-sm cursor-pointer">
                        {t('onlyFavourites')}
                      </label>
                    </div>
                  </div>
                </div>

                <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'table' | 'charts')} className="w-full">
                  <TabsList className="mb-6">
                    <TabsTrigger value="table">
                      <Table2 className="h-4 w-4 mr-2" />
                      {t('tableView')}
                    </TabsTrigger>
                    <TabsTrigger value="charts">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      {t('chartsView')}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="table" className="mt-0">
                    {filteredAndSortedGuides.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p className="text-sm">{t('noGuidesFound')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <button
                              onClick={() => handleSort('name')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              {t('guide')}
                              {sortField === 'name' && (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => handleSort('tours_done')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              {t('toursDone')}
                              {sortField === 'tours_done' && (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => handleSort('photos_taken_amount')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              {t('photosTaken')}
                              {sortField === 'photos_taken_amount' && (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => handleSort('photos_taken_frequency')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              {t('photoMoments')}
                              {sortField === 'photos_taken_frequency' && (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => handleSort('requested_client_info')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              {t('clientInfoRequests')}
                              {sortField === 'requested_client_info' && (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => handleSort('photos_per_tour')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              {t('photosPerTour')}
                              {sortField === 'photos_per_tour' && (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              onClick={() => handleSort('status')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              {t('status')}
                              {sortField === 'status' && (
                                sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              )}
                            </button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedGuides.map((guide) => (
                          <TableRow 
                            key={guide.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              // Navigate to guide detail if exists, otherwise could show drawer
                              router.push(`/${locale}/admin/guides`);
                            }}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {guide.profile_picture ? (
                                  <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                    <Image
                                      src={guide.profile_picture}
                                      alt={guide.name || 'Guide'}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <Users className="h-4 w-4 text-gray-500" />
                                  </div>
                                )}
                                <span className="font-medium">{guide.name || 'Unnamed Guide'}</span>
                                {guide.is_favourite && (
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <InlineBar value={guide.tours_done ?? 0} max={maxValues.tours_done} isInteger />
                            </TableCell>
                            <TableCell>
                              <InlineBar value={guide.photos_taken_amount ?? 0} max={maxValues.photos_taken_amount} isInteger />
                            </TableCell>
                            <TableCell>
                              <InlineBar value={guide.photos_taken_frequency ?? 0} max={maxValues.photos_taken_frequency} isInteger />
                            </TableCell>
                            <TableCell>
                              <InlineBar value={guide.requested_client_info ?? 0} max={maxValues.requested_client_info} isInteger />
                            </TableCell>
                            <TableCell>
                              <InlineBar value={guide.photos_per_tour} max={maxValues.photos_per_tour} />
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {guide.status.map((status) => (
                                  <div key={status}>
                                    {getStatusBadge(status)}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                  </TabsContent>

                  <TabsContent value="charts" className="mt-0">
                    {filteredAndSortedGuides.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p className="text-sm">{t('noGuidesFound')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Tours Done Bar Chart */}
                        <Card>
                          <CardHeader>
                            <CardTitle>{t('charts.toursDone')}</CardTitle>
                            <CardDescription>{t('charts.toursDoneDesc')}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ChartContainer
                              config={{
                                tours: {
                                  label: t('toursDone'),
                                  color: '#1BDD95',
                                },
                              }}
                              className="h-[400px]"
                            >
                              <BarChart data={toursDoneChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  width={120}
                                  tick={{ fontSize: 12 }}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="tours" fill="#1BDD95" radius={[0, 4, 4, 0]}>
                                  {toursDoneChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ChartContainer>
                          </CardContent>
                        </Card>

                        {/* Photos per Tour Bar Chart */}
                        <Card>
                          <CardHeader>
                            <CardTitle>{t('charts.photosPerTour')}</CardTitle>
                            <CardDescription>{t('charts.photosPerTourDesc')}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ChartContainer
                              config={{
                                photosPerTour: {
                                  label: t('photosPerTour'),
                                  color: '#1BDD95',
                                },
                              }}
                              className="h-[400px]"
                            >
                              <BarChart data={photosPerTourChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis 
                                  dataKey="name" 
                                  type="category" 
                                  width={120}
                                  tick={{ fontSize: 12 }}
                                />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="photosPerTour" fill="#1BDD95" radius={[0, 4, 4, 0]}>
                                  {photosPerTourChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ChartContainer>
                          </CardContent>
                        </Card>

                        {/* Tours vs Photos Scatter Plot */}
                        <Card>
                          <CardHeader>
                            <CardTitle>{t('charts.toursVsPhotos')}</CardTitle>
                            <CardDescription>{t('charts.toursVsPhotosDesc')}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ChartContainer
                              config={{
                                tours: {
                                  label: t('toursDone'),
                                  color: '#1BDD95',
                                },
                                photosPerTour: {
                                  label: t('photosPerTour'),
                                  color: '#3b82f6',
                                },
                              }}
                              className="h-[400px]"
                            >
                              <ScatterChart data={scatterChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  type="number" 
                                  dataKey="tours" 
                                  name={t('toursDone')}
                                  label={{ value: t('toursDone'), position: 'insideBottom', offset: -5 }}
                                />
                                <YAxis 
                                  type="number" 
                                  dataKey="photosPerTour" 
                                  name={t('photosPerTour')}
                                  label={{ value: t('photosPerTour'), angle: -90, position: 'insideLeft' }}
                                />
                                <ChartTooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload;
                                      return (
                                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                                          <div className="grid gap-2">
                                            <div className="flex flex-col">
                                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                                {data.name}
                                              </span>
                                              <span className="font-bold text-muted-foreground">
                                                {t('toursDone')}: {data.tours}
                                              </span>
                                              <span className="font-bold text-muted-foreground">
                                                {t('photosPerTour')}: {data.photosPerTour.toFixed(1)}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Scatter 
                                  dataKey="photosPerTour" 
                                  fill="#1BDD95"
                                  shape={(props: any) => {
                                    const { cx, cy, payload } = props;
                                    return (
                                      <circle
                                        cx={cx}
                                        cy={cy}
                                        r={6}
                                        fill={payload.color || '#1BDD95'}
                                        stroke="#fff"
                                        strokeWidth={1}
                                      />
                                    );
                                  }}
                                />
                              </ScatterChart>
                            </ChartContainer>
                          </CardContent>
                        </Card>

                        {/* Status Distribution Pie Chart */}
                        <Card>
                          <CardHeader>
                            <CardTitle>{t('charts.statusDistribution')}</CardTitle>
                            <CardDescription>{t('charts.statusDistributionDesc')}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ChartContainer
                              config={statusDistributionData.reduce((acc, item) => {
                                acc[item.name] = {
                                  label: item.label,
                                  color: item.color,
                                };
                                return acc;
                              }, {} as Record<string, { label: string; color: string }>)}
                              className="h-[400px]"
                            >
                              <PieChart>
                                <Pie
                                  data={statusDistributionData}
                                  dataKey="value"
                                  nameKey="label"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={100}
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                  {statusDistributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                              </PieChart>
                            </ChartContainer>
                          </CardContent>
                        </Card>

                        {/* Key Metrics by Status */}
                        <Card className="lg:col-span-2">
                          <CardHeader>
                            <CardTitle>{t('charts.keyMetricsByStatus')}</CardTitle>
                            <CardDescription>{t('charts.keyMetricsByStatusDesc')}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ChartContainer
                              config={{
                                avgTours: {
                                  label: t('charts.avgTours'),
                                  color: '#1BDD95',
                                },
                                avgPhotosPerTour: {
                                  label: t('charts.avgPhotosPerTour'),
                                  color: '#3b82f6',
                                },
                                avgClientInfo: {
                                  label: t('charts.avgClientInfo'),
                                  color: '#f59e0b',
                                },
                              }}
                              className="h-[400px]"
                            >
                              <BarChart data={statusMetricsData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                  dataKey="status" 
                                  tick={{ fontSize: 12 }}
                                  angle={-45}
                                  textAnchor="end"
                                  height={100}
                                />
                                <YAxis />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend />
                                <Bar dataKey="avgTours" fill="#1BDD95" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="avgPhotosPerTour" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="avgClientInfo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ChartContainer>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Category Overview */}
            <Card>
              <CardHeader>
                <CardTitle>{t('categoryOverview.title')}</CardTitle>
                <CardDescription>{t('categoryOverview.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Tour Count Categories */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3">{t('categoryOverview.tourCountCategories')}</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Badge className="bg-gray-100 text-gray-800">{t('inactive')}</Badge>
                        <p className="text-sm text-muted-foreground flex-1">{t('categoryOverview.inactiveDesc')}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="bg-blue-50 text-blue-700">{t('new')}</Badge>
                        <p className="text-sm text-muted-foreground flex-1">{t('categoryOverview.newDesc')}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="bg-purple-100 text-purple-800">{t('emerging')}</Badge>
                        <p className="text-sm text-muted-foreground flex-1">{t('categoryOverview.emergingDesc')}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="bg-teal-100 text-teal-800">{t('consistent')}</Badge>
                        <p className="text-sm text-muted-foreground flex-1">{t('categoryOverview.consistentDesc')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Issue Flags */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3">{t('categoryOverview.issueFlags')}</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Badge className="bg-orange-100 text-orange-800">{t('lowPhotoActivity')}</Badge>
                        <p className="text-sm text-muted-foreground flex-1">{t('categoryOverview.lowPhotoActivityDesc')}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="bg-yellow-100 text-yellow-800">{t('highClientInfoRequests')}</Badge>
                        <p className="text-sm text-muted-foreground flex-1">{t('categoryOverview.highClientInfoRequestsDesc')}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="bg-red-100 text-red-800">{t('needsAttention')}</Badge>
                        <p className="text-sm text-muted-foreground flex-1">{t('categoryOverview.needsAttentionDesc')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Positive Indicators */}
                  <div>
                    <h4 className="font-semibold text-sm mb-3">{t('categoryOverview.positiveIndicators')}</h4>
                    <div className="space-y-2">
                      <div className="flex items-start gap-3">
                        <Badge className="bg-blue-100 text-blue-800">{t('contentFocused')}</Badge>
                        <p className="text-sm text-muted-foreground flex-1">{t('categoryOverview.contentFocusedDesc')}</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Badge className="bg-green-100 text-green-800">{t('highPerformer')}</Badge>
                        <p className="text-sm text-muted-foreground flex-1">{t('categoryOverview.highPerformerDesc')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

