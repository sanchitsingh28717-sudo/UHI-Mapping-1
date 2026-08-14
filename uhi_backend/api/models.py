from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=20, unique=True)

    # Class constants for backward compatibility in backend references
    ADMINISTRATOR = 'ADMIN'
    RESEARCH_ANALYST = 'ANALYST'
    PLANNER = 'PLANNER'
    GUEST_VIEWER = 'GUEST'

    def __str__(self):
        return self.name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, related_name='profiles')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.role.name if self.role else 'No Role'}"

# Signal to auto-create user profile when User is created
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        # Default user roles
        role_code = 'GUEST'
        if instance.is_superuser:
            role_code = 'ADMIN'
        elif instance.username.startswith('analyst'):
            role_code = 'ANALYST'
        elif instance.username.startswith('planner'):
            role_code = 'PLANNER'
            
        role_obj, _ = Role.objects.get_or_create(
            code=role_code,
            defaults={'name': role_code.capitalize()}
        )
        UserProfile.objects.create(user=instance, role=role_obj)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

class UploadedDataset(models.Model):
    FILE_TYPES = [
        ('TIFF', 'GeoTIFF Raster'),
        ('CSV', 'CSV Dataset'),
        ('GEOJSON', 'GeoJSON Vector'),
        ('SHAPEFILE', 'Shapefile Archive'),
    ]
    
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10, choices=FILE_TYPES)
    file_path = models.FileField(upload_to='datasets/')
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='uploaded_datasets')
    status = models.CharField(
        max_length=20,
        choices=[('PENDING', 'Pending'), ('VALIDATED', 'Validated'), ('FAILED', 'Failed')],
        default='PENDING'
    )
    crs = models.CharField(max_length=50, blank=True, null=True)
    geometry_type = models.CharField(max_length=50, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file_name} ({self.get_file_type_display()}) - {self.status}"

class AnalysisLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='analyses')
    latitude = models.FloatField()
    longitude = models.FloatField()
    
    # Raster values sampled
    temperature = models.FloatField(null=True, blank=True)
    ndvi = models.FloatField(null=True, blank=True)
    ndbi = models.FloatField(null=True, blank=True)
    ndwi = models.FloatField(null=True, blank=True)
    dem = models.FloatField(null=True, blank=True)
    lulc = models.IntegerField(null=True, blank=True)
    
    # Predictions
    heat_zone = models.CharField(max_length=20, blank=True) # Low, Medium, High
    prediction_confidence = models.FloatField(null=True, blank=True)
    risk_score = models.FloatField(null=True, blank=True) # Calculated Heat Risk Index
    risk_category = models.CharField(max_length=20, blank=True) # Low, Medium, High, Very High
    
    # SHAP explanations stored as JSON
    shap_contributions = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Analysis at ({self.latitude}, {self.longitude}) - {self.heat_zone} Heat"

class SecurityLog(models.Model):
    EVENT_TYPES = [
        ('LOGIN_SUCCESS', 'Successful Login'),
        ('LOGIN_FAILED', 'Failed Login Attempt'),
        ('UNAUTHORIZED_ACCESS', 'Unauthorized Access Blocked'),
        ('DATA_UPLOAD', 'Dataset Uploaded'),
        ('DATA_VALIDATION_FAILED', 'Dataset Validation Failed'),
        ('MALICIOUS_INPUT', 'Malicious Input Detected'),
    ]
    
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='security_logs')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    path = models.CharField(max_length=255, blank=True, null=True)
    status_code = models.IntegerField(null=True, blank=True)
    details = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} - {self.timestamp}"

class AquiferPlan(models.Model):
    name = models.CharField(max_length=255)
    district_name = models.CharField(max_length=255)
    grace_anomaly = models.FloatField()
    avg_ndvi = models.FloatField()
    avg_ndwi = models.FloatField()
    target_recharge_vol = models.FloatField()
    optimal_coordinates = models.JSONField(default=list, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='aquifer_plans')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.district_name})"

