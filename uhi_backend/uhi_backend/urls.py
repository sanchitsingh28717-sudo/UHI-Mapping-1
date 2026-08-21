from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from api.views import (
    sankalp_map_view, sankalp_inference_view, sankalp_mission_view,
    matrix_api, DownloadDossierView
)

urlpatterns = [
    # SANKALP Original UI / UX Routes
    path('', sankalp_mission_view, name='sankalp-root-mission'),
    path('inference/', sankalp_inference_view, name='sankalp-root-inference'),
    path('map/', sankalp_map_view, name='sankalp-root-map'),
    path('api/matrix/', matrix_api, name='sankalp-root-matrix-api'),
    path('vault/download/<str:filename>/', DownloadDossierView.as_view(), name='sankalp-root-vault-download'),

    path('admin/', admin.site.urls),
    # JWT authentication endpoints
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # API endpoints from local app
    path('api/', include('api.urls')),
]
