from django.urls import path
from .views import (
    RegisterView, UserProfileView, AnalyzeCoordinatesView,
    MitigationRecommendationsView, ExportPDFReportView,
    DatasetUploadView, DashboardStatsView, SecurityLogsView,
    HeatZonesMapView, WardsBoundaryMapView, AhmedabadBoundaryMapView,
    AquiferSimulateView, AquiferPlansView, AquiferHotspotsView
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/profile/', UserProfileView.as_view(), name='profile'),
    path('analyze/', AnalyzeCoordinatesView.as_view(), name='analyze'),
    path('maps/heat-zones/', HeatZonesMapView.as_view(), name='heat-zones'),
    path('maps/wards/', WardsBoundaryMapView.as_view(), name='wards'),
    path('maps/boundary/', AhmedabadBoundaryMapView.as_view(), name='boundary'),
    path('recommend/', MitigationRecommendationsView.as_view(), name='recommend'),
    path('reports/export/', ExportPDFReportView.as_view(), name='export-pdf'),
    path('data/upload/', DatasetUploadView.as_view(), name='data-upload'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('security/logs/', SecurityLogsView.as_view(), name='security-logs'),
    path('mitigation/aquifer/simulate/', AquiferSimulateView.as_view(), name='aquifer-simulate'),
    path('mitigation/aquifer/plans/', AquiferPlansView.as_view(), name='aquifer-plans'),
    path('mitigation/aquifer/districts/hotspots/', AquiferHotspotsView.as_view(), name='aquifer-hotspots'),
]

