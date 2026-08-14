import json
from django.utils.deprecation import MiddlewareMixin
from .models import SecurityLog

class AuditLoggingMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        # We only log API endpoints to avoid clogging database with static/admin panel files
        if request.path.startswith('/api/'):
            user = request.user if request.user.is_authenticated else None
            ip = self.get_client_ip(request)
            
            # Identify security concerns (e.g. 401 unauthorized, 403 forbidden)
            event_type = 'UNAUTHORIZED_ACCESS' if response.status_code in [401, 403] else None
            
            # Log auth endpoints specifically
            if '/api/auth/login/' in request.path:
                if response.status_code == 200:
                    event_type = 'LOGIN_SUCCESS'
                elif response.status_code == 401:
                    event_type = 'LOGIN_FAILED'
            
            # Write to SecurityLog if there is an event of interest or unauthorized request
            if event_type:
                details = f"Method: {request.method} | Status: {response.status_code}"
                SecurityLog.objects.create(
                    event_type=event_type,
                    user=user,
                    ip_address=ip,
                    path=request.path,
                    status_code=response.status_code,
                    details=details
                )
        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
