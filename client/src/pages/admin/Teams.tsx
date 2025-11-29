import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';

interface Team {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface TeamMember {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  designation: string;
  reportingPerson1?: string;
  reportingPerson2?: string;
  reportingPerson3?: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
}

export default function Teams() {
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingAddMember, setLoadingAddMember] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isReportingModalOpen, setIsReportingModalOpen] = useState(false);
  const [selectedMemberForReporting, setSelectedMemberForReporting] = useState<TeamMember | null>(null);
  const [reportingPersons, setReportingPersons] = useState({ person1: '', person2: '', person3: '' });

  useEffect(() => {
    fetchTeams();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamMembers(selectedTeamId);
    }
  }, [selectedTeamId]);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/teams`);
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/employees?limit=1000`);
      if (response.ok) {
        const data = await response.json();
        console.log('[Teams] Fetched employees:', data.data || []);
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/teams/${teamId}/members`);
      if (response.ok) {
        const data = await response.json();
        console.log('[Teams] Fetched team members:', data);
        setTeamMembers(data);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const handleCreateTeam = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('[Teams] CREATE TEAM button clicked');
    
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Team name is required', variant: 'destructive' });
      return;
    }

    try {
      setLoadingCreate(true);
      console.log('[Teams] Creating team:', formData.name);
      const response = await fetch(`${getApiBaseUrl()}/api/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Team created successfully' });
        setFormData({ name: '', description: '' });
        fetchTeams();
      } else {
        const error = await response.json();
        toast({ title: 'Error', description: error.error || 'Failed to create team', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleAddMember = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('[Teams] ADD MEMBER button clicked');
    
    if (!selectedTeamId || selectedEmployeeIds.length === 0) {
      toast({ title: 'Error', description: 'Please select team and at least one employee', variant: 'destructive' });
      return;
    }

    try {
      setLoadingAddMember(true);
      console.log('[Teams] Adding members to team:', selectedTeamId, selectedEmployeeIds);
      
      // Filter out employees already in this team
      const existingMemberIds = teamMembers.map(m => m.employeeId);
      const newEmployeeIds = selectedEmployeeIds.filter(id => !existingMemberIds.includes(id));
      const duplicateCount = selectedEmployeeIds.length - newEmployeeIds.length;
      
      if (newEmployeeIds.length === 0) {
        toast({ title: 'Error', description: 'All selected employees are already members of this team', variant: 'destructive' });
        setLoadingAddMember(false);
        return;
      }
      
      const promises = newEmployeeIds.map((employeeId) =>
        fetch(`${getApiBaseUrl()}/api/teams/${selectedTeamId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId }),
        })
      );

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.ok).length;
      const failCount = responses.filter(r => !r.ok).length;

      setSelectedEmployeeIds([]);
      fetchTeamMembers(selectedTeamId);
      
      if (successCount > 0) {
        let message = `Added ${successCount} member(s) to team`;
        if (duplicateCount > 0) message += ` (${duplicateCount} already member${duplicateCount > 1 ? 's' : ''})`;
        if (failCount > 0) message += ` (${failCount} failed)`;
        toast({ title: 'Success', description: message });
      } else {
        toast({ title: 'Error', description: 'Failed to add members', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoadingAddMember(false);
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeamId) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/teams/${selectedTeamId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Member removed from team' });
        fetchTeamMembers(selectedTeamId);
      } else {
        toast({ title: 'Error', description: 'Failed to remove member', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openReportingModal = (member: TeamMember) => {
    setSelectedMemberForReporting(member);
    setReportingPersons({
      person1: member.reportingPerson1 || '',
      person2: member.reportingPerson2 || '',
      person3: member.reportingPerson3 || '',
    });
    setIsReportingModalOpen(true);
  };

  const handleSaveReporting = async () => {
    if (!selectedMemberForReporting) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/teams/members/${selectedMemberForReporting.id}/reporting`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportingPerson1: reportingPersons.person1 || undefined,
          reportingPerson2: reportingPersons.person2 || undefined,
          reportingPerson3: reportingPersons.person3 || undefined,
        }),
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Reporting persons saved' });
        setIsReportingModalOpen(false);
        if (selectedTeamId) fetchTeamMembers(selectedTeamId);
      } else {
        toast({ title: 'Error', description: 'Failed to save reporting persons', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to delete this team?')) return;

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: 'Success', description: 'Team deleted successfully' });
        setSelectedTeamId(null);
        fetchTeams();
      } else {
        toast({ title: 'Error', description: 'Failed to delete team', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Create Team */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium">Team Name</label>
              <Input
                placeholder="e.g., Engineering Team"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-8 text-xs"
                data-testid="input-team-name"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Input
                placeholder="Team description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-8 text-xs"
                data-testid="input-team-description"
              />
            </div>
            <Button
              type="button"
              onClick={(e) => handleCreateTeam(e)}
              disabled={loadingCreate}
              className="w-full h-8 text-xs bg-green-600 hover:bg-green-700"
              data-testid="button-create-team"
            >
              {loadingCreate ? 'Creating...' : 'Create Team'}
            </Button>
          </CardContent>
        </Card>

        {/* Add Member */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Team Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium">Select Team</label>
              <select
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full h-8 text-xs px-2 border rounded"
                data-testid="select-team"
              >
                <option value="">Choose a team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-2 block">Select Employees (Multiple)</label>
              <div className="relative">
                <Button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full h-8 text-xs bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 justify-between"
                  data-testid="button-employee-dropdown"
                >
                  <span>{selectedEmployeeIds.length === 0 ? 'Select employees...' : `${selectedEmployeeIds.length} selected`}</span>
                  <span className="text-xs">▼</span>
                </Button>
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded bg-white shadow-lg z-50 max-h-64 overflow-y-auto">
                    {employees.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">No employees available</p>
                    ) : (
                      employees.map((emp) => {
                        const isAlreadyMember = teamMembers.some(m => m.employeeId === emp.id);
                        const isSelected = selectedEmployeeIds.includes(emp.id);
                        return (
                          <div 
                            key={emp.id} 
                            className={`flex items-start gap-2 p-2 border-b border-gray-100 last:border-b-0 ${
                              isAlreadyMember ? 'bg-gray-50 opacity-60' : 'hover:bg-slate-100'
                            }`}
                          >
                            <Checkbox
                              id={`emp-${emp.id}`}
                              checked={isSelected || isAlreadyMember}
                              onCheckedChange={() => !isAlreadyMember && toggleEmployeeSelection(emp.id)}
                              disabled={isAlreadyMember}
                              data-testid={`checkbox-employee-${emp.id}`}
                            />
                            <label
                              htmlFor={`emp-${emp.id}`}
                              className={`text-xs flex-1 ${isAlreadyMember ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              <div className="font-medium text-xs">{emp.name} - {emp.designation}</div>
                              <div className={`text-xs ${isAlreadyMember ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {emp.department} {isAlreadyMember && '(Already member)'}
                              </div>
                            </label>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            <Button
              type="button"
              onClick={(e) => handleAddMember(e)}
              disabled={loadingAddMember || !selectedTeamId || selectedEmployeeIds.length === 0}
              className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700"
              data-testid="button-add-member"
            >
              {loadingAddMember ? `Adding ${selectedEmployeeIds.length}...` : `Add ${selectedEmployeeIds.length} Member(s)`}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Teams List */}
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-sm">Teams ({teams.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {teams.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No teams created yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`p-2 border rounded cursor-pointer text-xs transition-colors ${
                    selectedTeamId === team.id ? 'bg-blue-50 border-blue-400' : 'hover:bg-slate-50'
                  }`}
                  onClick={() => setSelectedTeamId(team.id)}
                  data-testid={`team-card-${team.id}`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate">{team.name}</p>
                      {team.description && <p className="text-xs text-muted-foreground truncate">{team.description}</p>}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTeam(team.id);
                      }}
                      className="h-5 px-2 py-0 text-xs flex-shrink-0 ml-1"
                      data-testid={`button-delete-team-${team.id}`}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      {selectedTeamId && (
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm">Team Members ({teamMembers.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {teamMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No members in this team</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-2 border rounded bg-slate-50 text-xs hover:bg-slate-100 transition-colors cursor-pointer"
                    data-testid={`member-item-${member.id}`}
                    onClick={() => openReportingModal(member)}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.designation}</p>
                        {(member.reportingPerson1 || member.reportingPerson2 || member.reportingPerson3) && (
                          <p className="text-xs text-blue-600 mt-1">
                            RM: {[member.reportingPerson1, member.reportingPerson2, member.reportingPerson3].filter(Boolean).length}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMember(member.id);
                        }}
                        className="h-5 px-2 py-0 text-xs flex-shrink-0 ml-1"
                        data-testid={`button-remove-member-${member.id}`}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reporting Modal */}
      {isReportingModalOpen && selectedMemberForReporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Set Reporting Persons</CardTitle>
              <p className="text-xs text-muted-foreground">{selectedMemberForReporting.name}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">Reporting Person 1</label>
                <select
                  value={reportingPersons.person1}
                  onChange={(e) => setReportingPersons({ ...reportingPersons, person1: e.target.value })}
                  className="w-full h-8 text-xs px-2 border rounded"
                  data-testid="select-reporting-person-1"
                >
                  <option value="">Select...</option>
                  {teamMembers
                    .filter((m) => m.id !== selectedMemberForReporting.id)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.designation})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Reporting Person 2</label>
                <select
                  value={reportingPersons.person2}
                  onChange={(e) => setReportingPersons({ ...reportingPersons, person2: e.target.value })}
                  className="w-full h-8 text-xs px-2 border rounded"
                  data-testid="select-reporting-person-2"
                >
                  <option value="">Select...</option>
                  {teamMembers
                    .filter((m) => m.id !== selectedMemberForReporting.id)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.designation})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Reporting Person 3</label>
                <select
                  value={reportingPersons.person3}
                  onChange={(e) => setReportingPersons({ ...reportingPersons, person3: e.target.value })}
                  className="w-full h-8 text-xs px-2 border rounded"
                  data-testid="select-reporting-person-3"
                >
                  <option value="">Select...</option>
                  {teamMembers
                    .filter((m) => m.id !== selectedMemberForReporting.id)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.designation})
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleSaveReporting}
                  className="flex-1 h-8 text-xs bg-blue-600 hover:bg-blue-700"
                  data-testid="button-save-reporting"
                >
                  Save
                </Button>
                <Button
                  type="button"
                  onClick={() => setIsReportingModalOpen(false)}
                  variant="outline"
                  className="flex-1 h-8 text-xs"
                  data-testid="button-cancel-reporting"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
