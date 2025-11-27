import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/mockData';
import { Users, Building2, HardHat, DollarSign, Activity, ArrowUpRight } from 'lucide-react';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const { vendors, sites, employees } = useStore();
  const [pendingPOCount, setPendingPOCount] = useState(0);

  useEffect(() => {
    const fetchPendingPOs = async () => {
      try {
        const response = await fetch('/api/purchase-orders');
        const data = await response.json();
        const purchaseOrders = data.data || [];
        const pending = purchaseOrders.filter((po: any) => po.status === 'Pending').length;
        setPendingPOCount(pending);
      } catch (error) {
        console.error('Failed to fetch pending POs:', error);
        setPendingPOCount(0);
      }
    };
    fetchPendingPOs();
  }, []);

  const stats = [
    {
      title: 'Total Vendors',
      value: vendors.length,
      description: '+2 from last month',
      icon: Users,
      color: 'text-blue-500',
      href: '/vendor/list',
    },
    {
      title: 'Active Sites',
      value: sites.filter(s => s.status === 'Active').length,
      description: '98% operational',
      icon: Building2,
      color: 'text-emerald-500',
      href: '/vendor/sites',
    },
    {
      title: 'Total Employees',
      value: employees.length,
      description: 'Field & Office Staff',
      icon: HardHat,
      color: 'text-orange-500',
      href: '/employee/list',
    },
    {
      title: 'Pending POs',
      value: pendingPOCount,
      description: 'Requires approval',
      icon: DollarSign,
      color: 'text-purple-500',
      href: '/vendor/po',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your enterprise operations.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/vendor/register" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90">
            Add Vendor
          </Link>
          <Link href="/employee/register" className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary/80">
            Add Employee
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <a key={stat.title} href={stat.href} className="no-underline">
            <Card className="hover:shadow-lg hover:border-primary cursor-pointer transition-all duration-200 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold hover:text-primary transition-colors">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Site Activity</CardTitle>
            <CardDescription>Latest updates from field sites.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sites.slice(0, 5).map((site) => (
                <div key={site.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ${site.status === 'Active' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      <Activity className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Site {site.siteId} updated</p>
                      <p className="text-xs text-muted-foreground">{site.region} • {site.state}</p>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${site.status === 'Active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {site.status}
                  </div>
                </div>
              ))}
              {sites.length === 0 && (
                 <div className="text-center py-4 text-muted-foreground text-sm">No sites registered yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Vendors waiting for verification.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
              {vendors.filter(v => v.status === 'Pending').slice(0, 5).map((vendor) => (
                <div key={vendor.id} className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                        {vendor.name.substring(0,2).toUpperCase()}
                     </div>
                     <div>
                        <p className="text-sm font-medium">{vendor.name}</p>
                        <p className="text-xs text-muted-foreground">{vendor.category}</p>
                     </div>
                   </div>
                   <Link href="/vendor/list" className="text-xs text-primary hover:underline flex items-center gap-1">
                      Review <ArrowUpRight className="h-3 w-3" />
                   </Link>
                </div>
              ))}
               {vendors.filter(v => v.status === 'Pending').length === 0 && (
                 <div className="text-center py-4 text-muted-foreground text-sm">No pending approvals.</div>
              )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
