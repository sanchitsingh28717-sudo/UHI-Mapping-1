import os
import json
import logging
from django.conf import settings
from django.shortcuts import render
from django.http import JsonResponse, FileResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from .agent import OmniSentinelAgent

logger = logging.getLogger(__name__)
# Initialize the newly expanded Tri-Domain Agent
agent = OmniSentinelAgent()

# 1. Serve the full-screen heatmap
def map_view(request):
    return render(request, 'geo_analytics/map.html')

# 2. Serve the execution terminal
def inference_view(request):
    return render(request, 'geo_analytics/dashboard.html')

# 3. The LangGraph API Bridge
@csrf_exempt
def matrix_api(request):
    if request.method == 'POST':
        try:
            body = json.loads(request.body)
            lat = float(body.get('lat', 23.0225))
            lng = float(body.get('lng', 72.5714))
            
            # Execute the Tri-Domain Architecture LangGraph
            result = agent.execute(0.0, 0.0, lat, lng)
            
            if not result.get("security_clearance"):
                return JsonResponse({"status": "error", "logs": result.get("status_logs")}, status=403)
                
            return JsonResponse({
                "status": "success",
                "logs": result.get("status_logs"),
                "policy_document": result.get("final_policy_draft"),
                "dossier_file": result.get("dossier_path"),
                "data": result.get("optimization_results"),  # Now includes HVAC and Albedo metrics
                "map_coordinates": result.get("map_coordinates"),
                "telemetry": result.get("hardware_telemetry"),
                "live_weather": result.get("live_weather")
            })
        except Exception as e:
            return JsonResponse({"status": "error", "message": str(e)}, status=500)
    return JsonResponse({"status": "error", "message": "POST request required."}, status=400)

# 4. The Secure Forensic Vault Downloader
def download_dossier(request, filename):
    filepath = os.path.join(settings.BASE_DIR, 'evidence_vault', filename)
    if os.path.exists(filepath):
        response = FileResponse(open(filepath, 'rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    raise Http404("Dossier not found in Forensic Vault.")
