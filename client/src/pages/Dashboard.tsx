import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/lib/mockData';
import { Users, Building2, HardHat, DollarSign, Activity, ArrowUpRight } from 'lucide-react';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { vendors, sites, employees } = useStore();
  const [pendingPOCount, setPendingPOCount] = useState(0);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/purchase-orders');
        const data = await response.json();
        const pos = data.data || [];
        setPurchaseOrders(pos);
        const pending = pos.filter((po: any) => po.status === 'Pending').length;
        setPendingPOCount(pending);
      } catch (error) {
        console.error('Failed to fetch pending POs:', error);
        setPendingPOCount(0);
        setPurchaseOrders([]);
      }
    };
    fetchData();
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

  // Chart data
  const siteStatusData = [
    { name: 'Active', value: sites.filter(s => s.status === 'Active').length, fill: '#10b981' },
    { name: 'Pending', value: sites.filter(s => s.status === 'Pending').length, fill: '#f59e0b' },
    { name: 'Inactive', value: sites.filter(s => s.status === 'Inactive').length, fill: '#ef4444' },
  ];

  const vendorStatusData = [
    { name: 'Active', value: vendors.filter(v => v.status === 'Active').length, fill: '#3b82f6' },
    { name: 'Pending', value: vendors.filter(v => v.status === 'Pending').length, fill: '#f59e0b' },
    { name: 'Inactive', value: vendors.filter(v => v.status === 'Inactive').length, fill: '#ef4444' },
  ];

  const regionData = sites.reduce((acc: any[], site) => {
    const existing = acc.find(r => r.name === site.region);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: site.region || 'Unknown', count: 1 });
    }
    return acc;
  }, []);

  const poStatusData = [
    { name: 'Draft', value: purchaseOrders.filter(po => po.status === 'Draft').length, fill: '#6366f1' },
    { name: 'Pending', value: purchaseOrders.filter(po => po.status === 'Pending').length, fill: '#f59e0b' },
    { name: 'Approved', value: purchaseOrders.filter(po => po.status === 'Approved').length, fill: '#10b981' },
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Site Status Distribution</CardTitle>
            <CardDescription>Breakdown of all sites by status</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={siteStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {siteStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Status Distribution</CardTitle>
            <CardDescription>Breakdown of all vendors by status</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={vendorStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {vendorStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sites by Region</CardTitle>
            <CardDescription>Distribution of sites across regions</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={regionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Purchase Order Status</CardTitle>
            <CardDescription>PO breakdown by status</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={poStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {poStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
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
