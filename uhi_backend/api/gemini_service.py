import google.generativeai as genai
from django.conf import settings

def generate_mitigation_recommendations(lat, lon, env_data, analysis_results):
    """
    Calls Google Gemini API to generate urban design and heat mitigation recommendations
    tailored to the specific environmental data. Falls back to a deterministic, high-quality
    scientific framework if the Gemini API key is missing or calls fail.
    """
    lst = env_data['lst']
    ndvi = env_data['ndvi']
    ndbi = env_data['ndbi']
    ndwi = env_data['ndwi']
    dem = env_data['dem']
    lulc = env_data['lulc']
    
    risk_score = analysis_results['risk_score']
    risk_category = analysis_results['risk_category']
    pop_density = analysis_results['pop_density']
    heat_zone = analysis_results['heat_zone']

    prompt = f"""You are the Climate Intelligence AI Recommendation Engine designed for the Smart Cities Mission and BISAG-N.
    Provide a professional, scientifically rigorous, and actionable climate mitigation plan for the coordinates ({lat}, {lon}) in Ahmedabad.
    
    The local environmental parameters are:
    - Land Surface Temperature (LST): {lst:.2f}°C
    - Normalized Difference Vegetation Index (NDVI): {ndvi:.4f} (Vegetation Density)
    - Normalized Difference Built-Up Index (NDBI): {ndbi:.4f} (Built-up Density)
    - Normalized Difference Water Index (NDWI): {ndwi:.4f} (Water Content)
    - Elevation (DEM): {dem:.1f} meters
    - Land Use Land Cover (LULC): Code {lulc} (ESA WorldCover classification)
    - Calculated Heat Risk Score: {risk_score}/100 ({risk_category})
    - Predicted Heat Zone: {heat_zone}
    - Estimated Population Density: {pop_density} people/km²

    Generate structured recommendations in Markdown. Include:
    1. ### Urban Forest Planning: Targeted interventions for planting and street canopy expansion based on vegetation index ({ndvi:.4f}).
    2. ### Cool Roof Strategies: Suitability and scaling of high-albedo coatings or green roofs based on built-up density ({ndbi:.4f}).
    3. ### Reflective Pavement Recommendations: Upgrades to public roads, parking spaces, and pathways.
    4. ### Water Body Restoration: Protection and expansion of water assets based on water index ({ndwi:.4f}).
    5. ### Green Corridor Recommendations: Wind and cooling corridor paths.
    6. ### Urban Design Improvements: Setbacks, height regulations, and building orientation constraints.
    
    Use a professional, expert-level urban planning and microclimate-engineering tone. Do not use placeholders.
    """

    api_key = getattr(settings, 'GEMINI_API_KEY', None)
    if api_key:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            # Fall back to localized template on API failure
            return get_fallback_recommendations(lst, ndvi, ndbi, ndwi, lulc, risk_category, e)
    else:
        return get_fallback_recommendations(lst, ndvi, ndbi, ndwi, lulc, risk_category, "API key not configured")

def get_fallback_recommendations(lst, ndvi, ndbi, ndwi, lulc, risk_category, reason):
    """
    Returns highly detailed, scientifically consistent mitigation guidelines when the API is unavailable.
    """
    # Tailor based on indicators
    veg_need = "CRITICAL" if ndvi < 0.15 else "HIGH" if ndvi < 0.3 else "MODERATE"
    roof_need = "IMMEDIATE" if ndbi > 0.2 else "RECOMMENDED" if ndbi > 0.0 else "OPTIONAL"
    water_need = "URGENT" if ndwi < -0.1 else "SUPPORTIVE"
    
    return f"""### Technical Mitigation Plan (Local Analytical Engine Fallback)
*Note: Generated using local scientific logic models due to Gemini API offline status ({reason}).*

### Urban Forest Planning ({veg_need} Priority)
- **Species Selection**: Deploy native, drought-resistant canopy trees including *Azadirachta indica* (Neem), *Conocarpus erectus*, and *Millettia pinnata* (Pongamia).
- **Spatial Target**: Since the NDVI is {ndvi:.4f}, we recommend expanding urban tree cover by 15% along local roadways and setbacks. 
- **Technique**: Implement Miyawaki micro-forests in empty public spaces to create high-density urban cooling buffers.

### Cool Roof Strategies ({roof_need} Priority)
- **High-Albedo Coatings**: Apply elastomeric white acrylic coatings (albedo > 0.75, thermal emittance > 0.90) to exposed flat concrete rooftops. This can reduce roof surface temperatures by up to 15°C.
- **Green Roofs**: For structural roofs in built-up areas (NDBI: {ndbi:.4f}), integrate extensive sedum-based green roofs to enhance evapotranspiration.

### Reflective Pavement Recommendations
- **Permeable Interlocking Concrete Pavers (PICP)**: Replace dense asphalt in parking facilities and pedestrian paths with permeable, high-albedo pavers (albedo > 0.40).
- **Micro-surfacing**: Treat local residential roads with reflective light-gray aggregate sealants.

### Water Body Restoration ({water_need} Priority)
- **Wetland Preservation**: Given the local NDWI of {ndwi:.4f}, restoration of adjacent urban lakes and construction of bioswales is vital to replenish surface moisture and promote local evaporative cooling.
- **Runoff Management**: Divert storm water to dedicated retention basins lined with local vegetation.

### Green Corridor Recommendations
- **Linear Buffers**: Design continuous green belts along major transit routes to channel natural air currents.
- **Zoning Protection**: Establish buffer zones around existing river and lake channels to prevent concrete encroachment.

### Urban Design Improvements
- **Ventilation Shafts**: Enforce a minimum 6-meter setback between buildings in high-density areas to maintain wind velocity.
- **Building Height Regulations**: In high-density pockets (LULC Code: {lulc}), limit heights of structures bordering natural wind passages to 15 meters to prevent flow obstruction.
"""
