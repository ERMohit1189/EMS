using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace VendorRegistrationBackend.Services;

/// <summary>
/// Custom authorization handler for case-insensitive role comparison.
/// Allows both [Authorize(Roles = "admin")] and [Authorize(Roles = "Admin")] to work.
/// </summary>
public class CaseInsensitiveRoleHandler : AuthorizationHandler<CaseInsensitiveRoleRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        CaseInsensitiveRoleRequirement requirement)
    {
        // Get the user's roles from claims
        var userRoles = context.User.FindAll(ClaimTypes.Role)
            .Select(c => c.Value.ToLower()) // Convert to lowercase
            .ToList();

        Serilog.Log.Debug("[Auth] User roles: {Roles}", string.Join(",", userRoles));

        // Check if user has any of the required roles (case-insensitive)
        var requiredRoles = requirement.RequiredRoles
            .Select(r => r.ToLower()) // Convert to lowercase
            .ToList();

        if (userRoles.Any(role => requiredRoles.Contains(role)))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

/// <summary>
/// Requirement for case-insensitive role authorization.
/// </summary>
public class CaseInsensitiveRoleRequirement : IAuthorizationRequirement
{
    public IReadOnlyList<string> RequiredRoles { get; }

    public CaseInsensitiveRoleRequirement(params string[] roles)
    {
        RequiredRoles = roles.AsReadOnly();
    }
}
