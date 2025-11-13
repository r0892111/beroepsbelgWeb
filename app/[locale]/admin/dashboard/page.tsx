'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/contexts/admin-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { ExternalLink, Users, ShoppingCart, Calendar, LogOut, Link as LinkIcon } from 'lucide-react';

export default function AdminDashboardPage({ params }: { params: { locale: string } }) {
  const t = useTranslations('admin');
  const { isAuthenticated, logout } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(`/${params.locale}/admin/login`);
    }
  }, [isAuthenticated, router, params.locale]);

  const handleLogout = () => {
    logout();
    router.push(`/${params.locale}/admin/login`);
  };

  const handleTeamleaderConnect = () => {
    window.open('https://marketplace.teamleader.eu/', '_blank');
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-sand">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-serif font-bold text-navy">{t('dashboard')}</h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            {t('logout')}
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalBookings')}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">{t('comingSoon')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalCustomers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">{t('comingSoon')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalOrders')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">{t('comingSoon')}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                {t('integrations')}
              </CardTitle>
              <CardDescription>{t('integrationsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold text-navy">Teamleader CRM</h3>
                  <p className="text-sm text-muted-foreground">{t('teamleaderDescription')}</p>
                </div>
                <Button onClick={handleTeamleaderConnect} className="btn-primary">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t('connect')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('quickActions')}</CardTitle>
              <CardDescription>{t('quickActionsDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" disabled>
                <Calendar className="h-4 w-4 mr-2" />
                {t('manageBookings')}
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <Users className="h-4 w-4 mr-2" />
                {t('viewCustomers')}
              </Button>
              <Button variant="outline" className="w-full justify-start" disabled>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {t('viewOrders')}
              </Button>
              <p className="text-xs text-muted-foreground pt-2">{t('comingSoon')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
