from django.urls import path
from . import views

urlpatterns = [
    path('', views.map_view, name='map_view'),  
    path('inference/', views.inference_view, name='inference_view'), 
    path('api/matrix/', views.matrix_api, name='matrix_api'), 
    # New secure download route
    path('vault/download/<str:filename>/', views.download_dossier, name='download_dossier'),
]
