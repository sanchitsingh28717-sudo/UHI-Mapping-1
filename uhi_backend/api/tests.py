from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from .models import Role, UserProfile, AnalysisLog, SecurityLog

class ClimateIntelligenceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create database roles
        self.admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': 'Administrator'})
        self.planner_role, _ = Role.objects.get_or_create(code='PLANNER', defaults={'name': 'Planner'})
        self.guest_role, _ = Role.objects.get_or_create(code='GUEST', defaults={'name': 'Guest Viewer'})

        # Create users
        self.admin_user = User.objects.create_user(username='admin_test', email='admin@test.com', password='password123')
        self.admin_user.profile.role = self.admin_role
        self.admin_user.profile.save()
        
        self.planner_user = User.objects.create_user(username='planner_test', email='planner@test.com', password='password123')
        self.planner_user.profile.role = self.planner_role
        self.planner_user.profile.save()
        
        self.guest_user = User.objects.create_user(username='guest_test', email='guest@test.com', password='password123')
        self.guest_user.profile.role = self.guest_role
        self.guest_user.profile.save()

    def get_jwt_token(self, username, password):
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {'username': username, 'password': password})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data['access']

    def test_user_authentication_jwt(self):
        # Test login
        token = self.get_jwt_token('guest_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Test profile fetch
        response = self.client.get(reverse('profile'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'guest_test')
        self.assertEqual(response.data['profile']['role'], Role.GUEST_VIEWER)

    def test_coordinate_analysis_out_of_bounds(self):
        # Authenticate guest
        token = self.get_jwt_token('guest_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Out of bounds coordinates (Bangalore)
        url = reverse('analyze')
        response = self.client.post(url, {'latitude': 12.9716, 'longitude': 77.5946}, format='json')
        
        # Rejects with "Analysis unavailable due to missing validated datasets."
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Analysis unavailable due to missing validated datasets.", response.data['error'])

    def test_coordinate_analysis_in_bounds(self):
        # Authenticate guest
        token = self.get_jwt_token('guest_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Central Ahmedabad coordinates
        url = reverse('analyze')
        response = self.client.post(url, {'latitude': 23.0225, 'longitude': 72.5714}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('prediction', response.data)
        self.assertIn('environmental_indicators', response.data)
        self.assertIn('explainability', response.data)
        self.assertIn('risk_index', response.data)
        
        # Check values
        self.assertGreater(response.data['environmental_indicators']['lst'], 0)
        self.assertIn(response.data['prediction']['heat_zone'], ["Low Heat Zone", "Medium Heat Zone", "High Heat Zone"])
        self.assertIn('NDVI', response.data['explainability']['shap_summary'])

    def test_role_based_permissions(self):
        # Guest user attempts to post recommendations
        token_guest = self.get_jwt_token('guest_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_guest}')
        
        url_rec = reverse('recommend')
        response_guest = self.client.post(url_rec, {'latitude': 23.0225, 'longitude': 72.5714}, format='json')
        self.assertEqual(response_guest.status_code, status.HTTP_403_FORBIDDEN)
        
        # Planner user attempts to post recommendations
        token_planner = self.get_jwt_token('planner_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_planner}')
        
        response_planner = self.client.post(url_rec, {'latitude': 23.0225, 'longitude': 72.5714}, format='json')
        self.assertEqual(response_planner.status_code, status.HTTP_200_OK)
        self.assertIn('recommendations', response_planner.data)

    def test_report_generation(self):
        # Authenticate planner
        token = self.get_jwt_token('planner_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url_pdf = reverse('export-pdf')
        response = self.client.post(url_pdf, {'latitude': 23.0225, 'longitude': 72.5714}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers['content-type'], 'application/pdf')
        self.assertGreater(len(response.getvalue()), 0)

    def test_report_generation_with_custom_flags(self):
        # Authenticate planner
        token = self.get_jwt_token('planner_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url_pdf = reverse('export-pdf')
        response = self.client.post(url_pdf, {
            'latitude': 23.0225,
            'longitude': 72.5714,
            'include_wind': True,
            'include_groundwater': True,
            'include_aquifer': True,
            'include_socio_thermal': True
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers['content-type'], 'application/pdf')
        self.assertGreater(len(response.getvalue()), 0)

    def test_aquifer_simulation(self):
        token = self.get_jwt_token('guest_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url_sim = reverse('aquifer-simulate')
        response = self.client.post(url_sim, {
            'district_name': 'Ahmedabad',
            'latitude': 23.0225,
            'longitude': 72.5714,
            'grace_anomaly': -22.5,
            'ndvi': 0.15,
            'ndwi': 0.08,
            'dem': 55.0
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('reconstructed_layers', response.data)
        self.assertIn('suitability_metrics', response.data)
        self.assertIn('optimal_recharge_sites', response.data)
        self.assertEqual(len(response.data['optimal_recharge_sites']), 5)

    def test_aquifer_plans_permissions(self):
        # Guest cannot create plan
        token_guest = self.get_jwt_token('guest_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_guest}')
        
        url_plans = reverse('aquifer-plans')
        plan_data = {
            'name': 'Guest Test Plan',
            'district_name': 'Ahmedabad',
            'grace_anomaly': -22.5,
            'avg_ndvi': 0.15,
            'avg_ndwi': 0.08,
            'target_recharge_vol': 50000.0,
            'optimal_coordinates': []
        }
        response_guest = self.client.post(url_plans, plan_data, format='json')
        self.assertEqual(response_guest.status_code, status.HTTP_403_FORBIDDEN)

        # Planner can create plan
        token_planner = self.get_jwt_token('planner_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_planner}')
        
        response_planner = self.client.post(url_plans, plan_data, format='json')
        self.assertEqual(response_planner.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response_planner.data['name'], 'Guest Test Plan')

        # Guest can read plans
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token_guest}')
        response_read = self.client.get(url_plans)
        self.assertEqual(response_read.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response_read.data), 1)

    def test_aquifer_hotspots(self):
        token = self.get_jwt_token('guest_test', 'password123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url_hotspots = reverse('aquifer-hotspots')
        response = self.client.get(url_hotspots)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
        self.assertEqual(response.data[0]['name'], 'Ahmedabad')

