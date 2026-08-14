from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, UploadedDataset, AnalysisLog, SecurityLog, Role, AquiferPlan

class UserProfileSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='role.code', read_only=True)
    role_display = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = UserProfile
        fields = ['role', 'role_display', 'created_at']

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'profile']

    def create(self, validated_data):
        password = validated_data.pop('password')
        role_code = self.context.get('role', 'GUEST')
        role_obj, _ = Role.objects.get_or_create(
            code=role_code,
            defaults={'name': role_code.capitalize()}
        )
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Profile is created via signals; update role if specified
        if hasattr(user, 'profile') and role_obj:
            user.profile.role = role_obj
            user.profile.save()
            
        return user

class UploadedDatasetSerializer(serializers.ModelSerializer):
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)

    class Meta:
        model = UploadedDataset
        fields = [
            'id', 'file_name', 'file_type', 'file_type_display', 'file_path', 
            'uploaded_by_username', 'status', 'crs', 'geometry_type', 
            'error_message', 'metadata', 'created_at'
        ]
        read_only_fields = ['uploaded_by', 'status', 'crs', 'geometry_type', 'error_message', 'metadata']

class AnalysisLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True, default='Anonymous')

    class Meta:
        model = AnalysisLog
        fields = '__all__'

class SecurityLogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True, default='Anonymous')
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = SecurityLog
        fields = '__all__'

class AquiferPlanSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, default='System')
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, default='')

    class Meta:
        model = AquiferPlan
        fields = [
            'id', 'name', 'district_name', 'grace_anomaly', 'avg_ndvi', 
            'avg_ndwi', 'target_recharge_vol', 'optimal_coordinates', 
            'created_by_username', 'created_by_email', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']

