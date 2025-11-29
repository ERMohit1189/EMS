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
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [memberToAssign, setMemberToAssign] = useState<TeamMember | null>(null);

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

  const handleMemberClick = (member: TeamMember) => {
    setMemberToAssign(member);
    setIsAssignmentModalOpen(true);
  };

  const assignReportingPerson = async (level: 1 | 2 | 3) => {
    if (!memberToAssign || !selectedTeamId) return;

    try {
      console.log('[Teams] Assigning reporting person:', memberToAssign.name, 'Level:', level);
      
      for (const otherMember of teamMembers) {
        const updates: any = {};
        const fieldName = `reportingPerson${level}`;
        updates[fieldName] = memberToAssign.id;
        
        console.log('[Teams] Updating member:', otherMember.id, 'with:', updates);
        const response = await fetch(`${getApiBaseUrl()}/api/teams/members/${otherMember.id}/reporting`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[Teams] API Error:', errorData);
          throw new Error(errorData.error || 'Failed to update');
        }
        
        const result = await response.json();
        console.log('[Teams] Update result:', result);
      }

      console.log('[Teams] All updates completed, fetching team members');
      toast({ title: 'Success', description: `${memberToAssign.name} assigned as Reporting Person ${level} for all team members` });
      setIsAssignmentModalOpen(false);
      setMemberToAssign(null);
      await fetchTeamMembers(selectedTeamId);
    } catch (error: any) {
      console.error('[Teams] Error assigning reporting person:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isLevelTaken = (level: 1 | 2 | 3): boolean => {
    const levelKey = `reportingPerson${level}`;
    return teamMembers.some((m) => {
      const value = m[levelKey as keyof TeamMember];
      return value !== null && value !== undefined;
    });
  };

  const getReportingPersonName = (personId: string | undefined): string | null => {
    if (!personId) return null;
    const person = teamMembers.find((m) => m.id === personId);
    return person ? person.name : null;
  };

  const getReportingBadgeColor = (index: number): string => {
    const colors = [
      'bg-blue-100 text-blue-700 border-blue-300',
      'bg-green-100 text-green-700 border-green-300',
      'bg-amber-100 text-amber-700 border-amber-300',
    ];
    return colors[index] || colors[0];
  };

  const deleteReportingPersonAssignment = async (level: 1 | 2 | 3) => {
    if (!selectedTeamId) return;

    try {
      console.log('[Teams] Deleting RP', level, 'assignment');
      
      for (const member of teamMembers) {
        const updates: any = {};
        const fieldName = `reportingPerson${level}`;
        updates[fieldName] = null;
        
        const response = await fetch(`${getApiBaseUrl()}/api/teams/members/${member.id}/reporting`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('[Teams] API Error:', errorData);
          throw new Error(errorData.error || 'Failed to delete');
        }
      }

      toast({ title: 'Success', description: `Reporting Person ${level} assignment removed` });
      await fetchTeamMembers(selectedTeamId);
    } catch (error: any) {
      console.error('[Teams] Error deleting RP assignment:', error);
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
                    className="p-2 border rounded bg-slate-50 text-xs hover:bg-slate-100 transition-colors"
                    data-testid={`member-item-${member.id}`}
                  >
                    <div className="flex justify-between items-start gap-1 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.designation}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="h-5 px-2 py-0 text-xs flex-shrink-0 ml-1"
                        data-testid={`button-remove-member-${member.id}`}
                      >
                        ✕
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {member.reportingPerson1 === member.id ? (
                        <div
                          className={`px-2 py-0.5 rounded text-xs border flex items-center gap-1 ${getReportingBadgeColor(0)} cursor-pointer hover:opacity-80 transition-opacity`}
                          data-testid={`badge-reporting-person-1-${member.id}`}
                          onClick={() => deleteReportingPersonAssignment(1)}
                          title="Click to remove RP1 assignment"
                        >
                          RP1
                          <span className="text-xs font-bold ml-0.5">✕</span>
                        </div>
                      ) : member.reportingPerson1 ? (
                        <div
                          className={`px-2 py-0.5 rounded text-xs border ${getReportingBadgeColor(0)}`}
                          data-testid={`badge-reporting-person-1-${member.id}`}
                        >
                          RP1: {getReportingPersonName(member.reportingPerson1)}
                        </div>
                      ) : null}
                      
                      {member.reportingPerson2 === member.id ? (
                        <div
                          className={`px-2 py-0.5 rounded text-xs border flex items-center gap-1 ${getReportingBadgeColor(1)} cursor-pointer hover:opacity-80 transition-opacity`}
                          data-testid={`badge-reporting-person-2-${member.id}`}
                          onClick={() => deleteReportingPersonAssignment(2)}
                          title="Click to remove RP2 assignment"
                        >
                          RP2
                          <span className="text-xs font-bold ml-0.5">✕</span>
                        </div>
                      ) : member.reportingPerson2 ? (
                        <div
                          className={`px-2 py-0.5 rounded text-xs border ${getReportingBadgeColor(1)}`}
                          data-testid={`badge-reporting-person-2-${member.id}`}
                        >
                          RP2: {getReportingPersonName(member.reportingPerson2)}
                        </div>
                      ) : null}
                      
                      {member.reportingPerson3 === member.id ? (
                        <div
                          className={`px-2 py-0.5 rounded text-xs border flex items-center gap-1 ${getReportingBadgeColor(2)} cursor-pointer hover:opacity-80 transition-opacity`}
                          data-testid={`badge-reporting-person-3-${member.id}`}
                          onClick={() => deleteReportingPersonAssignment(3)}
                          title="Click to remove RP3 assignment"
                        >
                          RP3
                          <span className="text-xs font-bold ml-0.5">✕</span>
                        </div>
                      ) : member.reportingPerson3 ? (
                        <div
                          className={`px-2 py-0.5 rounded text-xs border ${getReportingBadgeColor(2)}`}
                          data-testid={`badge-reporting-person-3-${member.id}`}
                        >
                          RP3: {getReportingPersonName(member.reportingPerson3)}
                        </div>
                      ) : null}

                      {!member.reportingPerson1 && !member.reportingPerson2 && !member.reportingPerson3 && (
                        <button
                          onClick={() => handleMemberClick(member)}
                          className="px-2 py-0.5 rounded text-xs border border-dashed border-gray-400 text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors"
                          data-testid={`button-assign-reporting-${member.id}`}
                        >
                          Make RP
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assignment Modal */}
      {isAssignmentModalOpen && memberToAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Assign {memberToAssign.name}</CardTitle>
              <p className="text-xs text-muted-foreground">Select reporting level for all team members</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => assignReportingPerson(1)}
                disabled={isLevelTaken(1)}
                className={`w-full h-8 text-xs justify-start ${isLevelTaken(1) ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                data-testid="button-assign-rp1"
              >
                <span className="inline-block w-2 h-2 bg-blue-700 rounded-full mr-2"></span>
                Reporting Person 1 {isLevelTaken(1) ? '(Taken)' : ''}
              </Button>
              <Button
                onClick={() => assignReportingPerson(2)}
                disabled={isLevelTaken(2)}
                className={`w-full h-8 text-xs justify-start ${isLevelTaken(2) ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                data-testid="button-assign-rp2"
              >
                <span className="inline-block w-2 h-2 bg-green-700 rounded-full mr-2"></span>
                Reporting Person 2 {isLevelTaken(2) ? '(Taken)' : ''}
              </Button>
              <Button
                onClick={() => assignReportingPerson(3)}
                disabled={isLevelTaken(3)}
                className={`w-full h-8 text-xs justify-start ${isLevelTaken(3) ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-amber-600 hover:bg-amber-700'}`}
                data-testid="button-assign-rp3"
              >
                <span className="inline-block w-2 h-2 bg-amber-700 rounded-full mr-2"></span>
                Reporting Person 3 {isLevelTaken(3) ? '(Taken)' : ''}
              </Button>
              <Button
                onClick={() => setIsAssignmentModalOpen(false)}
                variant="outline"
                className="w-full h-8 text-xs"
                data-testid="button-cancel-assignment"
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
