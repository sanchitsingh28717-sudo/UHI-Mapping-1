# SANKALP Project Structure

This document describes the organization of the SANKALP (Spatial Analytics and Neural Knowledge Platform for Adaptive Land-use Planning) project.

```
SANKALP/
│
├── .github/                      # GitHub Actions CI/CD workflows
│   └── workflows/
│       └── ci-cd.yml
│
├── docs/                         # Documentation files
│   ├── BTech_Project_Report.md
│   ├── BTech_Project_Report_SANKALP.pdf
│   ├── AGENTS.md
│   └── CLAUDE.md
│
├── scripts/                      # Utility and automation scripts
│   ├── generate_report_pdf.py      # PDF report generation
│   ├── generate_gmc_wards.py       # Ward boundary generation
│   ├── sync_wards_real_data.py     # Data synchronization
│   └── mlops_retrain.py            # ML model retraining
│
├── AI_UH_Python/                # Python ML/AI components
│   ├── data/                    # Raw training datasets
│   ├── gee/                     # Google Earth Engine scripts
│   ├── maps/                    # GeoTIFF raster files (LST, NDVI, NDBI, DEM)
│   ├── models/                  # Trained ML models (.pkl files)
│   └── notebooks/               # Jupyter notebooks for analysis
│
├── uhi_backend/                 # Django REST API Backend
│   ├── api/                     # Main API application
│   │   ├── models.py            # Database models
│   │   ├── views.py             # API endpoints
│   │   ├── urls.py              # URL routing
│   │   ├── agent.py             # AI agent logic
│   │   ├── gemini_service.py    # Google Gemini integration
│   │   ├── gis_utils.py         # Geospatial utilities
│   │   ├── ml_service.py        # ML inference service
│   │   ├── sankalp_utils.py     # Core utilities
│   │   └── scientific_modules.py # Scientific computations
│   │
│   ├── cache/                   # Runtime cache files (gitignored)
│   ├── datasets/                # Ward boundaries (GeoJSON)
│   ├── evidence_vault/          # Generated PDF reports (gitignored)
│   ├── models/                  # ML model binaries
│   ├── templates/               # HTML templates
│   ├── training_data/           # Training datasets
│   ├── uhi_backend/             # Django settings and configuration
│   │   ├── settings.py
│   │   └── urls.py
│   │
│   ├── .env                     # Environment variables (gitignored)
│   ├── Dockerfile               # Backend container definition
│   ├── manage.py                # Django management script
│   └── db.sqlite3               # SQLite database (dev)
│
├── uhi_frontend/                # Next.js 14 Frontend
│   ├── public/                  # Static assets
│   ├── src/                     # Source code
│   │   ├── app/                 # Next.js App Router pages
│   │   ├── components/          # React components
│   │   ├── lib/                 # Utilities and helpers
│   │   └── store/               # Zustand state management
│   │
│   ├── Dockerfile               # Frontend container definition
│   ├── next.config.ts           # Next.js configuration
│   ├── package.json             # npm dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   └── tailwind.config.ts       # Tailwind CSS configuration
│
├── .gitignore                   # Git ignore rules
├── docker-compose.yml           # Multi-container orchestration
├── nginx.conf                   # Reverse proxy configuration
├── requirements.txt             # Python dependencies
└── README.md                    # Project documentation

```

## Key Directories

### `/docs` - Documentation
All project documentation, reports, and development notes.

### `/scripts` - Utility Scripts
Standalone Python scripts for data processing, report generation, and system maintenance.

### `/AI_UH_Python` - ML/AI Assets
Machine learning models, training data, geospatial rasters (GeoTIFF), and analytical notebooks.

### `/uhi_backend` - Backend API
Django REST Framework backend with GeoDjango/GIS support, ML inference, and Google Gemini integration.

### `/uhi_frontend` - Frontend Application
Next.js 14 TypeScript application with Leaflet maps, Zustand state management, and Tailwind CSS.

## Ignored Files (Not in Git)

- `uhi_backend/cache/` - Runtime cache JSON files
- `uhi_backend/evidence_vault/*.pdf` - Generated PDF reports
- `uhi_backend/training_data/SANKALP_v4_*.csv` - Large training datasets (>100MB)
- `.venv/`, `node_modules/` - Virtual environments and dependencies
- `.env` - Environment variables and secrets
- Database files (db.sqlite3)

## Development Workflow

1. **Backend**: `cd uhi_backend && python manage.py runserver`
2. **Frontend**: `cd uhi_frontend && npm run dev`
3. **Production**: `docker-compose up --build`

---

**Last Updated**: September 2026
