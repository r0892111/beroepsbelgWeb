'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Home, LogOut, RefreshCw, Trash2, Mail, X, Search, CheckCircle2, Calendar, Download } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { NewsletterSubscription } from '@/lib/data/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function AdminNewsletterPage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  const [subscriptions, setSubscriptions] = useState<NewsletterSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] = useState<NewsletterSubscription | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user || (!profile?.isAdmin && !profile?.is_admin)) {
      router.push(`/${locale}`);
    }
  }, [user, profile, router, locale]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('newsletter_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Failed to fetch subscriptions:', fetchError);
        setError('Failed to load newsletter subscriptions');
        return;
      }

      const items: NewsletterSubscription[] = (data || []).map((row: any) => ({
        id: row.id,
        email: row.email || '',
        first_name: row.first_name || undefined,
        last_name: row.last_name || undefined,
        consent_given: row.consent_given || false,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      setSubscriptions(items);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setError('Failed to load newsletter subscriptions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (profile?.isAdmin || profile?.is_admin)) {
      void fetchSubscriptions();
    }
  }, [user, profile]);

  const handleLogout = () => {
    signOut();
    router.push(`/${locale}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subscription?')) return;

    try {
      const { error } = await supabase
        .from('newsletter_subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Subscription deleted successfully');
      void fetchSubscriptions();
      if (selectedSubscription?.id === id) {
        setDetailOpen(false);
        setSelectedSubscription(null);
      }
    } catch (err) {
      console.error('Failed to delete subscription:', err);
      toast.error('Failed to delete subscription');
    }
  };

  const openDetailDialog = (subscription: NewsletterSubscription) => {
    setSelectedSubscription(subscription);
    setDetailOpen(true);
  };

  const filteredSubscriptions = useMemo(() => {
    if (!searchQuery) return subscriptions;
    const searchLower = searchQuery.toLowerCase();
    return subscriptions.filter((sub) =>
      sub.email.toLowerCase().includes(searchLower) ||
      (sub.first_name && sub.first_name.toLowerCase().includes(searchLower)) ||
      (sub.last_name && sub.last_name.toLowerCase().includes(searchLower))
    );
  }, [subscriptions, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = subscriptions.length;
    const thisMonth = subscriptions.filter((sub) => {
      if (!sub.created_at) return false;
      const subDate = new Date(sub.created_at);
      const now = new Date();
      return subDate.getMonth() === now.getMonth() && subDate.getFullYear() === now.getFullYear();
    }).length;
    const recent = subscriptions.slice(0, 5).length;

    return { total, thisMonth, recent };
  }, [subscriptions]);

  // CSV Export function
  const exportToCSV = () => {
    const headers = ['Email', 'First Name', 'Last Name', 'Consent Given', 'Subscribed On'];
    const rows = filteredSubscriptions.map((sub) => [
      sub.email,
      sub.first_name || '',
      sub.last_name || '',
      sub.consent_given ? 'Yes' : 'No',
      sub.created_at ? format(new Date(sub.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `newsletter-subscriptions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-sand flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading newsletter subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">Newsletter Subscriptions</h1>
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/admin/dashboard`}>
              <Button variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy">{stats.thisMonth}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Recent (Last 5)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-navy">{stats.recent}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Controls */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by email, first name, or last name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={filteredSubscriptions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <p className="text-red-800">{error}</p>
            </CardContent>
          </Card>
        )}

        {filteredSubscriptions.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">
                {searchQuery ? 'No subscriptions found matching your search.' : 'No newsletter subscriptions yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>
                Table view - Click on a row to view full details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700 border-r">Email</TableHead>
                      <TableHead className="font-semibold text-gray-700 border-r">First Name</TableHead>
                      <TableHead className="font-semibold text-gray-700 border-r">Last Name</TableHead>
                      <TableHead className="font-semibold text-gray-700 border-r">Consent</TableHead>
                      <TableHead className="font-semibold text-gray-700 border-r">Subscribed On</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-center w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((subscription) => (
                      <TableRow
                        key={subscription.id}
                        onClick={() => openDetailDialog(subscription)}
                        className="cursor-pointer hover:bg-gray-50"
                      >
                        <TableCell className="font-medium border-r">{subscription.email}</TableCell>
                        <TableCell className="border-r">{subscription.first_name || '-'}</TableCell>
                        <TableCell className="border-r">{subscription.last_name || '-'}</TableCell>
                        <TableCell className="border-r">
                          {subscription.consent_given ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="destructive">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="border-r">
                          {subscription.created_at
                            ? format(new Date(subscription.created_at), 'MMM d, yyyy HH:mm')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(subscription.id);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subscription Details</DialogTitle>
            <DialogDescription>
              Full details of the newsletter subscription
            </DialogDescription>
          </DialogHeader>

          {selectedSubscription && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-gray-900">{selectedSubscription.email}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">First Name</label>
                  <p className="mt-1 text-gray-900">{selectedSubscription.first_name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Name</label>
                  <p className="mt-1 text-gray-900">{selectedSubscription.last_name || 'Not provided'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Consent Status</label>
                <div className="mt-1">
                  {selectedSubscription.consent_given ? (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Consent Given
                    </Badge>
                  ) : (
                    <Badge variant="destructive">No Consent</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Subscribed On</label>
                  <p className="mt-1 text-gray-900">
                    {selectedSubscription.created_at
                      ? format(new Date(selectedSubscription.created_at), 'MMM d, yyyy HH:mm')
                      : 'Unknown'}
                  </p>
                </div>
                {selectedSubscription.updated_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Updated</label>
                    <p className="mt-1 text-gray-900">
                      {format(new Date(selectedSubscription.updated_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setDetailOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(selectedSubscription.id);
                    setDetailOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Subscription
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

