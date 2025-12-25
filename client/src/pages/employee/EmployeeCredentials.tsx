import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Copy, RotateCcw, Download, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Employee {
  id: string;
  name: string;
  email: string;
  designation: string;
  emp_code?: string;
}

interface EmployeeCredential {
  employeeId: string;
  employeeCode?: string;
  employeeName: string;
  designation: string;
  email: string;
  password: string;
  createdAt: string;
  generated: boolean;
}

export default function EmployeeCredentials() {
  // Role-based access control
  const employeeRole = localStorage.getItem('employeeRole')?.toLowerCase() || '';
  if (employeeRole !== 'admin' && employeeRole !== 'user' && employeeRole !== 'superadmin') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <h2 className="text-xl font-bold mb-2">Not Authorized</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<EmployeeCredential[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [regenerateId, setRegenerateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [useCookies, setUseCookies] = useState(() => {
    return localStorage.getItem('useCredentialsCookies') === 'true';
  });

  // Load employees and credentials on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setTableLoading(true);
        const params = new URLSearchParams();
        params.append('page', String(currentPage));
        params.append('pageSize', String(pageSize));

        const response = await fetch(`${getApiBaseUrl()}/api/employees?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          const empList = data.data || [];
          setEmployees(empList);
          setTotalEmployees(data.totalCount || 0);


        }
      } catch (error) {
        console.error('Failed to fetch employees:', error);
      } finally {
        setLoading(false);
        setTableLoading(false);
      }
    };

    const saved = localStorage.getItem('employeeCredentials');
    if (saved) {
      const allCreds = JSON.parse(saved) as EmployeeCredential[];
      // Deduplicate credentials - keep only the latest for each employeeId
      const uniqueCreds = Array.from(
        new Map(allCreds.map((c: EmployeeCredential) => [c.employeeId, c])).values()
      );
      setCredentials(uniqueCreds);
    }
    
    fetchEmployees();
  }, []);

  // Helper function to set cookie
  const setCookie = (name: string, value: string, days: number = 7) => {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${value};${expires};path=/;SameSite=Strict`;
  };

  // Save credentials to localStorage and optionally to cookies
  const saveCredentials = (creds: EmployeeCredential[]) => {
    // Deduplicate credentials before saving - keep only latest for each employeeId
    const uniqueCreds = Array.from(
      new Map(creds.map((c: EmployeeCredential) => [c.employeeId, c])).values()
    );
    setCredentials(uniqueCreds);
    localStorage.setItem('employeeCredentials', JSON.stringify(uniqueCreds));
    
    if (useCookies) {
      setCookie('employeeCredentials', JSON.stringify(uniqueCreds), 7);
      toast({
        title: 'Saved',
        description: 'Credentials saved to both storage and cookies',
      });
    }
  };

  const clearAllCredentials = () => {
    localStorage.removeItem('employeeCredentials');
    setCredentials([]);
    toast({
      title: 'Cleared',
      description: 'All credentials have been cleared',
    });
  };

  const handleCookieToggle = (checked: boolean) => {
    setUseCookies(checked);
    localStorage.setItem('useCredentialsCookies', String(checked));
    toast({
      title: checked ? 'Cookies Enabled' : 'Cookies Disabled',
      description: checked 
        ? 'Credentials will be saved to cookies' 
        : 'Credentials will only be saved to local storage',
    });
  };

  const generatePassword = (): string => {
    const length = 12;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const generateCredentialsForEmployee = async (employeeId: string) => {
    setGeneratingId(employeeId);
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) {
      setGeneratingId(null);
      return;
    }

    const generatedPassword = generatePassword();
    
    const newCred: EmployeeCredential = {
      employeeId,
      employeeCode: employee.emp_code,
      employeeName: employee.name,
      designation: employee.designation,
      email: employee.email,
      password: generatedPassword,
      createdAt: new Date().toISOString().split('T')[0],
      generated: true,
    };

    // Sync password to database
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees/sync-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password: generatedPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to sync password`);
      }

      const existing = credentials.filter(c => c.employeeId !== employeeId);
      saveCredentials([...existing, newCred]);
      
      toast({
        title: 'Credentials Generated & Synced',
        description: `Credentials created and saved to database for ${employee.name}`,
      });
    } catch (error: any) {
      console.error('Error syncing credentials:', error?.message || error);
      toast({
        title: 'Error',
        description: error?.message || 'Credentials generated locally but failed to sync to database',
        variant: 'destructive',
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const regenerateCredentialsForEmployee = (employeeId: string) => {
    generateCredentialsForEmployee(employeeId);
    setRegenerateId(null);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${field} copied to clipboard`,
    });
  };

  const togglePasswordVisibility = (credId: string) => {
    setVisiblePasswords(prev => {
      const updated = new Set(prev);
      if (updated.has(credId)) {
        updated.delete(credId);
      } else {
        updated.add(credId);
      }
      return updated;
    });
  };

  const downloadCredentialsCSV = () => {
    if (credentials.length === 0) {
      toast({
        title: 'No Data',
        description: 'No credentials to download',
      });
      return;
    }

    const headers = ['Employee Code', 'Employee Name', 'Designation', 'Email/Username', 'Password', 'Created Date'];
    const rows = credentials.map(c => [
      c.employeeCode || 'N/A',
      c.employeeName,
      c.designation,
      c.email,
      c.password,
      c.createdAt,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-credentials-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: 'Downloaded',
      description: 'Credentials exported to CSV',
    });
  };

  const employeesWithoutCreds = employees.filter(e => !credentials.find(c => c.employeeId === e.id));

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Employee Credentials</h2>
        <p className="text-muted-foreground">Generate and manage login credentials for employees.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">In the system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Credentials Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{credentials.length}</div>
            <p className="text-xs text-muted-foreground">Login accounts created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Credentials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.max(0, totalEmployees - credentials.length)}</div>
            <p className="text-xs text-muted-foreground">Awaiting generation</p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Options and Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storage Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <Checkbox 
              id="use-cookies" 
              checked={useCookies}
              onCheckedChange={handleCookieToggle}
              data-testid="checkbox-use-cookies"
            />
            <label htmlFor="use-cookies" className="cursor-pointer flex-1">
              <div className="font-medium text-sm">Store credentials in cookies</div>
              <div className="text-xs text-muted-foreground">Credentials will be automatically saved to browser cookies (7 days expiry)</div>
            </label>
          </div>

          {credentials.length > 0 && (
            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={downloadCredentialsCSV} variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Download CSV
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Credentials */}
      {credentials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Credentials</CardTitle>
            <CardDescription>Active login accounts for employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {credentials.map(cred => (
                <div key={`${cred.employeeId}-cred`} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground font-mono">Code: {cred.employeeCode || 'N/A'}</div>
                      <div className="font-semibold">{cred.employeeName}</div>
                      <div className="text-sm text-muted-foreground">{cred.designation}</div>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      {new Date(cred.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {/* Email - as Username */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Email / Username</label>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded flex-1 truncate">{cred.email}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(cred.email, 'Email')}
                          data-testid={`button-copy-email-${cred.employeeId}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Password</label>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded flex-1 truncate">
                          {visiblePasswords.has(cred.employeeId) ? cred.password : '••••••••••••'}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => togglePasswordVisibility(cred.employeeId)}
                          data-testid={`button-toggle-password-${cred.employeeId}`}
                        >
                          {visiblePasswords.has(cred.employeeId) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Regenerate */}
                    <div className="space-y-1 flex flex-col">
                      <label className="text-xs font-medium text-muted-foreground">&nbsp;</label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRegenerateId(cred.employeeId)}
                        className="gap-2 flex-1"
                        data-testid={`button-regenerate-${cred.employeeId}`}
                        disabled={generatingId === cred.employeeId}
                      >
                        {generatingId === cred.employeeId ? (
                          'Generating...'
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4" /> Regenerate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employees Without Credentials */}
      {employeesWithoutCreds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Credentials</CardTitle>
            <CardDescription>Employees without login credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[48vh] overflow-auto rounded-md border bg-card">
              <div className="sticky top-0 z-20 grid grid-cols-4 gap-0 p-3 font-medium border-b bg-primary text-primary-foreground text-sm">
                <div>Employee Code</div>
                <div>Name</div>
                <div>Designation</div>
                <div className="text-right">Action</div>
              </div>
              {tableLoading ? (
                <div className="p-6">
                  <SkeletonLoader type="table" count={Math.min(pageSize, 6)} />
                </div>
              ) : employeesWithoutCreds.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">No pending credentials on this page.</div>
              ) : (
                employeesWithoutCreds.map(employee => (
                  <div key={employee.id} className="grid grid-cols-4 gap-0 items-center border-b p-3">
                    <div className="text-sm font-mono text-blue-600">{employee.emp_code || 'N/A'}</div>
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-muted-foreground">{employee.designation}</div>
                    <div className="text-right">
                      <Button
                        onClick={() => generateCredentialsForEmployee(employee.id)}
                        size="sm"
                        className="gap-2"
                        data-testid={`button-generate-${employee.id}`}
                        disabled={generatingId === employee.id}
                      >
                        {generatingId === employee.id ? 'Generating...' : 'Generate Credentials'}
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {/* Sticky footer for pagination */}
              {totalEmployees > 0 && (
                <div className="sticky bottom-0 bg-card/90 backdrop-blur border-t p-2 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Showing {totalEmployees === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(totalEmployees, currentPage * pageSize)} of {totalEmployees.toLocaleString()} employees</div>
                  <div className="flex items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>First</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                    <div className="px-2">Page</div>
                    <Input value={String(currentPage)} onChange={(e) => { const v = Number(e.target.value || 1); if (!isNaN(v)) setCurrentPage(Math.min(Math.max(1, v), Math.max(1, Math.ceil(totalEmployees / pageSize)))); }} className="w-16 text-center" onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }} />
                    <div className="px-2">of {Math.max(1, Math.ceil(totalEmployees / pageSize))}</div>
                    <Button type="button" size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(totalEmployees / pageSize)), p + 1))} disabled={currentPage === Math.max(1, Math.ceil(totalEmployees / pageSize))}>Next</Button>
                    <select className="form-select text-sm" value={String(pageSize)} onChange={(e) => { const v = Number(e.target.value || 50); setPageSize(v); setCurrentPage(1); }}>
                      {[10,25,50,100].map(sz => <option key={sz} value={sz}>{sz}</option>) }
                    </select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {employees.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <div className="text-muted-foreground">
              <p className="mb-2">No employees registered yet.</p>
              <p className="text-sm">Register employees first to generate credentials.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={regenerateId !== null} onOpenChange={() => setRegenerateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Credentials?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create new login credentials for this employee. The old credentials will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateId && regenerateCredentialsForEmployee(regenerateId)}
              disabled={generatingId !== null}
            >
              {generatingId === regenerateId ? 'Generating...' : 'Regenerate'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
