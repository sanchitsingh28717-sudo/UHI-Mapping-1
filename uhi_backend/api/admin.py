from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Role, UserProfile, UploadedDataset, AnalysisLog, SecurityLog, AquiferPlan

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'SANKALP Profile & Role'

class UserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]

# Re-register User model to include inline profiles
admin.site.unregister(User)
admin.site.register(User, UserAdmin)

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'code')
    search_fields = ('name', 'code')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'role', 'created_at')
    list_filter = ('role',)
    search_fields = ('user__username', 'user__email')

admin.site.register(UploadedDataset)
admin.site.register(AnalysisLog)
admin.site.register(SecurityLog)
admin.site.register(AquiferPlan)
