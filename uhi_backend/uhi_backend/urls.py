from django.contrib import admin
from django.urls import path, re_path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from api.views import (
    sankalp_map_view, sankalp_inference_view, sankalp_mission_view,
    matrix_api, DownloadDossierView
)

urlpatterns = [
    # SANKALP Production UI / UX Routes (as in sankalp_production)
    re_path(r'^$', sankalp_map_view, name='sankalp-root-map-default'),
    re_path(r'^map/?$', sankalp_map_view, name='sankalp-root-map'),
    re_path(r'^inference/?$', sankalp_inference_view, name='sankalp-root-inference'),
    re_path(r'^api/matrix/?$', matrix_api, name='sankalp-root-matrix-api'),
    re_path(r'^vault/download/(?P<filename>[^/]+)/?$', DownloadDossierView.as_view(), name='sankalp-root-vault-download'),

    path('admin/', admin.site.urls),
    # JWT authentication endpoints
    re_path(r'^api/auth/login/?$', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    re_path(r'^api/auth/token/refresh/?$', TokenRefreshView.as_view(), name='token_refresh'),
    # API endpoints from local app
    path('api/', include('api.urls')),
]
