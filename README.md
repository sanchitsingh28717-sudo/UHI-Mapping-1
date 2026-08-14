# SANKALP: Spatial Analytics and Neural Knowledge Platform for Adaptive Land-use Planning (Smart Cities Mission & BISAG-N)

An enterprise-scale, production-grade **Spatial Analytics and Neural Knowledge Platform for Adaptive Land-use Planning (SANKALP)** designed for government agencies, urban planning authorities, environmental departments, and disaster management organizations. The system specializes in mapping, predicting, and mitigating **Urban Heat Island (UHI)** hotspots in Ahmedabad using validated real-world datasets, machine learning classifiers, Explainable AI (SHAP), and Generative AI micro-climate recommendation engines.

---

## 🏗️ System Architecture

The platform operates as a scientific decision-support system, separating high-performance spatial querying from client-side visual overlays:

```
                  +-----------------------------------+
                  |           Web Client              |
                  |  (Next.js 14, Tailwind, Leaflet)   |
                  +-----------------+-----------------+
                                    |
                                    | HTTPS / JWT
                                    v
                  +-----------------+-----------------+
                  |          Reverse Proxy            |
                  |             (Nginx)               |
                  +-----------------+-----------------+
                                    |
                                    | Proxied Requests
                                    v
                  +-----------------+-----------------+
                  |          REST Backend             |
                  |  (Django 5, DRF, GeoDjango/GIS)   |
                  +-------+-------------------+-------+
                          |                   |
        ML & SHAP pipeline|                   | Celery Broker
                          v                   v
            +-------------+-------------+   +-+-----------------+
            | XGBoost & SHAP Explainer  |   |  Celery Worker    |
            |   (random_forest.pkl)     |   |  & Redis Queue    |
            +-------------+-------------+   +-------------------+
                          |
                          v
            +-------------+-------------+
            |  Ahmedabad Spatial Layers  |
            | (LST, NDVI, NDBI, DEM...) |
            +---------------------------+
```

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, Leaflet, Recharts, Framer Motion.
- **Backend**: Django 5, Django REST Framework, SimpleJWT, Celery, ReportLab (PDF compiler), rasterio (GeoTIFF querying), geopandas (Shapefiles validation).
- **AI/ML**: XGBoost Classifier (`random_forest.pkl`), SHAP explainer (local tree contributions), Google Gemini API (planning recommendation engine).
- **Orchestration**: Docker Compose, Nginx (reverse proxy), Redis (Celery broker), PostgreSQL/PostGIS (Production-ready).

---

## 🔒 Security & RBAC (Role-Based Access Control)

The platform enforces JWT access controls mapping to specific roles:

1. **Administrator (`admin`)**: Full system access, audit security log reviews.
2. **Research Analyst (`analyst`)**: Dataset ingestion, spatial validation reviews.
3. **Urban Planner (`planner`)**: View analyses, execute Gemini-powered recommendations, export PDFs.
4. **Guest Viewer (`guest`)**: Read-only access to maps and analytics dashboards.

### Default Demo Credentials:
| Username | Password | Role | Access Level |
| :--- | :--- | :--- | :--- |
| `admin` | `admin12345` | System Administrator | Full access + Security Logs |
| `analyst` | `analyst12345` | Research Analyst | Dataset Upload + Validate |
| `planner` | `planner12345` | Urban Planner | Mitigation Recommendations |
| `guest` | `guest12345` | Guest Viewer | Read-only Maps |

---

## 🚀 Installation & Local Development

### Prerequisites:
- Python 3.12+
- Node.js 20+ & npm 10+

### Step 1: Run the Backend locally
1. Navigate to the backend directory:
   ```bash
   cd uhi_backend
   ```
2. Configure environment variables in `.env`:
   ```ini
   SECRET_KEY=your-custom-django-secret-key
   DEBUG=True
   DB_ENGINE=django.db.backends.sqlite3
   GEMINI_API_KEY=your-google-gemini-api-key
   ```
3. Run migrations and load demo users:
   ```bash
   python manage.py makemigrations api
   python manage.py migrate
   python -m pip install -r ../requirements.txt
   # Run the custom script to generate admin and staff demo credentials
   python -c "import sys; sys.path.append('.'); import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'uhi_backend.settings'); django.setup(); from api.models import UserProfile, Role; from django.contrib.auth.models import User; [User.objects.create_user(username=u, email=e, password=p) for u,e,p in [('admin','admin@test.com','admin12345'),('analyst','analyst@test.com','analyst12345'),('planner','planner@test.com','planner12345'),('guest','guest@test.com','guest12345')]]"
   ```
4. Start the backend server:
   ```bash
   python manage.py runserver
   ```

### Step 2: Run the Frontend locally
1. Navigate to the frontend directory:
   ```bash
   cd ../uhi_frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the web portal at `http://localhost:3000`.

---

## 🐳 Docker Production Deployment

To launch the complete enterprise cluster (Nginx, Next.js, Django, Celery, Redis, PostgreSQL/PostGIS):
1. In the root workspace directory, run:
   ```bash
   docker-compose up --build -d
   ```
2. The reverse proxy will serve the client portal on port `80` (HTTP) at `http://localhost`.

---

## 📈 Scientific Data Integrity & Rasters

All queries made on the platform index real GeoTIFF rasters for Ahmedabad (`Ahmedabad_LST.tif`, `Ahmedabad_NDVI.tif`, etc.). 
If a coordinate query is executed outside study bounds, the API throws:
`{"error": "Analysis unavailable due to missing validated datasets."}`
No dummy or synthetic datasets are used.
