from rest_framework import permissions
from .models import Role

class IsAdministrator(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role and 
            request.user.profile.role.code == 'ADMIN'
        )

class IsResearchAnalyst(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role and 
            request.user.profile.role.code in ['ADMIN', 'ANALYST']
        )

class IsPlanner(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            hasattr(request.user, 'profile') and 
            request.user.profile.role and 
            request.user.profile.role.code in ['ADMIN', 'ANALYST', 'PLANNER']
        )

class IsGuestViewer(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated
        )
