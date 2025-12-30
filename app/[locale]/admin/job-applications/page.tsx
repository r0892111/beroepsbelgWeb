'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Home, LogOut, RefreshCw, Search, X, FileText, Image as ImageIcon, Download, Eye, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Image from 'next/image';

interface JobApplication {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  motivation: string;
  cv_url: string | null;
  photo_url: string | null;
  consent: boolean;
  created_at: string;
  updated_at: string;
}

const STORAGE_BUCKET = 'job-applications';

export default function AdminJobApplicationsPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState<string>('all');
  
  // Viewing states
  const [viewingCv, setViewingCv] = useState<{ url: string; name: string } | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{ url: string; name: string } | null>(null);
  const [viewingMotivation, setViewingMotivation] = useState<{ text: string; name: string } | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [applicationDetailOpen, setApplicationDetailOpen] = useState(false);
  const [loadingSignedUrl, setLoadingSignedUrl] = useState<string | null>(null);
  const [photoThumbnails, setPhotoThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('job_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch applications:', fetchError);
        setError('Failed to load applications');
        return;
      }

      setApplications((data as JobApplication[]) || []);
    } catch (err) {
      console.error('Failed to fetch applications:', err);
      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchApplications();
    }
  }, [user, profile]);

  const extractFilePath = (url: string): string | null => {
    if (!url) return null;
    
    try {
      // Handle different URL formats:
      // 1. Public URL: https://[project].supabase.co/storage/v1/object/public/job-applications/filename.jpg
      // 2. Signed URL: https://[project].supabase.co/storage/v1/object/sign/job-applications/filename.jpg?token=...
      // 3. Direct path: filename.jpg (if stored directly)
      
      // If it's already just a filename/path (no http), return as-is
      if (!url.startsWith('http')) {
        return url;
      }
      
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p); // Remove empty parts
      
      // Find the bucket name in the path
      const bucketIndex = pathParts.findIndex(part => part === STORAGE_BUCKET);
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        // Return everything after the bucket name
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      
      // Fallback: try regex match
      const match = url.match(new RegExp(`${STORAGE_BUCKET}/(.+?)(?:\\?|$)`));
      if (match && match[1]) {
        return match[1];
      }
      
      // Last resort: if URL contains the bucket name, try to extract filename
      if (url.includes(STORAGE_BUCKET)) {
        const parts = url.split(STORAGE_BUCKET + '/');
        if (parts.length > 1) {
          const filePart = parts[1].split('?')[0]; // Remove query params
          if (filePart) {
            return filePart;
          }
        }
      }
      
      console.warn('Could not extract file path from URL:', url);
      return null;
    } catch (err) {
      console.error('Error extracting file path from URL:', url, err);
      return null;
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    if (!filePath) return null;
    
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Failed to create signed URL for:', filePath, error);
        return null;
      }

      return data.signedUrl;
    } catch (err) {
      console.error('Failed to create signed URL for:', filePath, err);
      return null;
    }
  };

  // Generate signed URLs for photo thumbnails
  useEffect(() => {
    const generateThumbnails = async () => {
      if (applications.length === 0) return;
      
      console.log('Generating thumbnails for', applications.length, 'applications');
      const thumbnails: Record<string, string> = {};
      
      for (const app of applications) {
        if (app.photo_url) {
          console.log('Processing photo for', app.name, 'URL:', app.photo_url);
          const filePath = extractFilePath(app.photo_url);
          console.log('Extracted file path:', filePath);
          
          if (filePath) {
            try {
              const signedUrl = await getSignedUrl(filePath);
              if (signedUrl) {
                console.log('Generated signed URL for', app.name);
                thumbnails[app.id] = signedUrl;
              } else {
                console.warn('Failed to generate signed URL for', app.name);
              }
            } catch (err) {
              console.error(`Failed to generate thumbnail for ${app.id}:`, err);
            }
          } else {
            console.warn('Could not extract file path for', app.name, 'from URL:', app.photo_url);
          }
        }
      }
      
      console.log('Generated', Object.keys(thumbnails).length, 'thumbnails');
      setPhotoThumbnails(thumbnails);
    };

    if (applications.length > 0) {
      void generateThumbnails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const handleViewCv = async (cvUrl: string, applicantName: string) => {
    const filePath = extractFilePath(cvUrl);
    if (!filePath) {
      toast.error('Could not extract file path from URL');
      return;
    }

    setLoadingSignedUrl(cvUrl);
    const signedUrl = await getSignedUrl(filePath);
    setLoadingSignedUrl(null);

    if (!signedUrl) {
      toast.error('Failed to generate view URL');
      return;
    }

    setViewingCv({ url: signedUrl, name: `${applicantName}_CV.pdf` });
  };

  const handleDownloadCv = async (cvUrl: string, applicantName: string) => {
    const filePath = extractFilePath(cvUrl);
    if (!filePath) {
      toast.error('Could not extract file path from URL');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(filePath);

      if (error) {
        console.error('Download error:', error);
        toast.error('Failed to download CV');
        return;
      }

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${applicantName}_CV.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('CV downloaded');
    } catch (err) {
      console.error('Failed to download CV:', err);
      toast.error('Failed to download CV');
    }
  };

  const handleViewPhoto = async (photoUrl: string, applicantName: string) => {
    const filePath = extractFilePath(photoUrl);
    if (!filePath) {
      toast.error('Could not extract file path from URL');
      return;
    }

    setLoadingSignedUrl(photoUrl);
    const signedUrl = await getSignedUrl(filePath);
    setLoadingSignedUrl(null);

    if (!signedUrl) {
      toast.error('Failed to generate view URL');
      return;
    }

    setViewingPhoto({ url: signedUrl, name: `${applicantName}_Photo` });
  };

  const handleDownloadPhoto = async (photoUrl: string, applicantName: string) => {
    const filePath = extractFilePath(photoUrl);
    if (!filePath) {
      toast.error('Could not extract file path from URL');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(filePath);

      if (error) {
        console.error('Download error:', error);
        toast.error('Failed to download photo');
        return;
      }

      // Determine file extension
      const ext = filePath.split('.').pop() || 'jpg';
      
      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${applicantName}_Photo.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Photo downloaded');
    } catch (err) {
      console.error('Failed to download photo:', err);
      toast.error('Failed to download photo');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterCity('all');
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        app.name.toLowerCase().includes(searchLower) ||
        app.email.toLowerCase().includes(searchLower) ||
        (app.phone && app.phone.toLowerCase().includes(searchLower)) ||
        app.motivation.toLowerCase().includes(searchLower);

      const matchesCity = filterCity === 'all' || (app.city && app.city.toLowerCase() === filterCity.toLowerCase());

      return matchesSearch && matchesCity;
    });
  }, [applications, searchQuery, filterCity]);

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    applications.forEach((app) => {
      if (app.city) {
        cities.add(app.city);
      }
    });
    return Array.from(cities).sort();
  }, [applications]);

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Job Applications</h1>
            <div className="flex items-center gap-2">
              <Link href={`/${locale}/admin/dashboard`}>
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href={`/${locale}`}>
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  All Job Applications
                </CardTitle>
                <CardDescription>
                  View and manage job applications
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchApplications()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 mb-4">
                {error}
              </div>
            )}

            {/* Search and Filters */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, or motivation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  disabled={!searchQuery && filterCity === 'all'}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>

              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[150px]">
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Filter by city" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      {uniqueCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(searchQuery || filterCity !== 'all') && (
                <div className="text-sm text-muted-foreground">
                  Showing {filteredApplications.length} of {applications.length} applications
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {applications.length === 0 ? 'No applications found' : 'No applications match your filters'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      setSelectedApplication(app);
                      setApplicationDetailOpen(true);
                    }}
                    className="flex items-center justify-between p-4 bg-white border rounded-lg hover:bg-gray-50 hover:border-primary cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="font-medium text-lg truncate">{app.name}</div>
                      <div className="text-sm text-muted-foreground truncate hidden sm:block">{app.email}</div>
                      {app.city && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {app.city}
                        </Badge>
                      )}
                      <div className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                        {format(new Date(app.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {app.cv_url && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                          CV
                        </Badge>
                      )}
                      {app.photo_url && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          Photo
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CV Viewing Dialog */}
      <Dialog open={!!viewingCv} onOpenChange={() => setViewingCv(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingCv?.name}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => viewingCv && window.open(viewingCv.url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[70vh]">
            <iframe
              src={viewingCv?.url}
              className="w-full h-full border rounded"
              title="CV Preview"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Viewing Dialog */}
      <Dialog open={!!viewingPhoto} onOpenChange={() => setViewingPhoto(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingPhoto?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative w-full h-[70vh] flex items-center justify-center">
            {viewingPhoto && (
              <Image
                src={viewingPhoto.url}
                alt={viewingPhoto.name}
                fill
                className="object-contain"
                unoptimized
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Motivation Viewing Dialog */}
      <Dialog open={!!viewingMotivation} onOpenChange={() => setViewingMotivation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Motivation - {viewingMotivation?.name}</DialogTitle>
            <DialogDescription>
              Full motivation text from the applicant
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <div className="rounded-lg border p-4 bg-sand max-h-[60vh] overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {viewingMotivation?.text}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Application Detail Dialog */}
      <Dialog open={applicationDetailOpen} onOpenChange={setApplicationDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Application Details - {selectedApplication?.name}</DialogTitle>
            <DialogDescription>
              Complete application information
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6 mt-4">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Name</label>
                  <p className="text-base font-medium mt-1">{selectedApplication.name}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                  <p className="text-base mt-1">{selectedApplication.email}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Phone</label>
                  <p className="text-base mt-1">{selectedApplication.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">City</label>
                  <p className="text-base mt-1">{selectedApplication.city || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Date Applied</label>
                  <p className="text-base mt-1">
                    {format(new Date(selectedApplication.created_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Consent</label>
                  <p className="text-base mt-1">
                    <Badge variant={selectedApplication.consent ? 'default' : 'outline'}>
                      {selectedApplication.consent ? 'Yes' : 'No'}
                    </Badge>
                  </p>
                </div>
              </div>

              {/* Motivation */}
              <div>
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Motivation</label>
                <div className="mt-2 rounded-lg border p-4 bg-sand max-h-[200px] overflow-y-auto">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedApplication.motivation}
                  </p>
                </div>
              </div>

              {/* CV Section */}
              <div>
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">CV</label>
                {selectedApplication.cv_url ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCv(selectedApplication.cv_url!, selectedApplication.name)}
                      disabled={loadingSignedUrl === selectedApplication.cv_url}
                    >
                      {loadingSignedUrl === selectedApplication.cv_url ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      View CV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadCv(selectedApplication.cv_url!, selectedApplication.name)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download CV
                    </Button>
                  </div>
                ) : (
                  <Badge variant="outline">No CV uploaded</Badge>
                )}
              </div>

              {/* Photo Section */}
              <div>
                <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Photo</label>
                <div className="space-y-3">
                  {selectedApplication.photo_url ? (
                    <>
                      <div className="flex items-start gap-4">
                        {photoThumbnails[selectedApplication.id] ? (
                          <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200 flex-shrink-0">
                            <Image
                              src={photoThumbnails[selectedApplication.id]}
                              alt={`${selectedApplication.name} photo`}
                              fill
                              className="object-cover"
                              unoptimized
                              onError={(e) => {
                                console.error('Failed to load photo for', selectedApplication.name);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 flex-shrink-0">
                            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                          </div>
                        )}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPhoto(selectedApplication.photo_url!, selectedApplication.name)}
                              disabled={loadingSignedUrl === selectedApplication.photo_url}
                            >
                              {loadingSignedUrl === selectedApplication.photo_url ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <ImageIcon className="h-4 w-4 mr-2" />
                              )}
                              View Photo
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadPhoto(selectedApplication.photo_url!, selectedApplication.name)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download Photo
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground break-all">
                            <span className="font-semibold">Photo URL:</span> {selectedApplication.photo_url}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <Badge variant="outline">No photo uploaded</Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

