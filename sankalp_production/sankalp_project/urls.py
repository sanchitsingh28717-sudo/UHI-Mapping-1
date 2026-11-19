from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # Routes all API traffic to your geo_analytics app
    path('', include('geo_analytics.urls')), 
]
