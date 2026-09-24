from django.urls import path, re_path
from .views import (
    RegisterView, UserProfileView, AnalyzeCoordinatesView,
    MitigationRecommendationsView, ExportPDFReportView,
    DatasetUploadView, DashboardStatsView, SecurityLogsView,
    HeatZonesMapView, WardsBoundaryMapView, AhmedabadBoundaryMapView,
    AquiferSimulateView, AquiferPlansView, AquiferHotspotsView,
    DownloadDossierView
)

urlpatterns = [
    re_path(r'^auth/register/?$', RegisterView.as_view(), name='register'),
    re_path(r'^auth/profile/?$', UserProfileView.as_view(), name='profile'),
    re_path(r'^analyze/?$', AnalyzeCoordinatesView.as_view(), name='analyze'),
    re_path(r'^maps/heat-zones/?$', HeatZonesMapView.as_view(), name='heat-zones'),
    re_path(r'^maps/wards/?$', WardsBoundaryMapView.as_view(), name='wards'),
    re_path(r'^maps/boundary/?$', AhmedabadBoundaryMapView.as_view(), name='boundary'),
    re_path(r'^recommend/?$', MitigationRecommendationsView.as_view(), name='recommend'),
    re_path(r'^vault/download/(?P<filename>[^/]+)/?$', DownloadDossierView.as_view(), name='download-dossier'),
    re_path(r'^reports/export/?$', ExportPDFReportView.as_view(), name='export-pdf'),
    re_path(r'^data/upload/?$', DatasetUploadView.as_view(), name='data-upload'),
    re_path(r'^dashboard/stats/?$', DashboardStatsView.as_view(), name='dashboard-stats'),
    re_path(r'^security/logs/?$', SecurityLogsView.as_view(), name='security-logs'),
    re_path(r'^mitigation/aquifer/simulate/?$', AquiferSimulateView.as_view(), name='aquifer-simulate'),
    re_path(r'^mitigation/aquifer/plans/?$', AquiferPlansView.as_view(), name='aquifer-plans'),
    re_path(r'^mitigation/aquifer/districts/hotspots/?$', AquiferHotspotsView.as_view(), name='aquifer-hotspots'),
]
