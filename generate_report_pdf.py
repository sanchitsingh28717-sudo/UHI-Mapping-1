"""
BTech Project Report PDF Generator
Uses ReportLab (already installed) to produce a properly formatted PDF
from the project content.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether, Preformatted
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "BTech_Project_Report_SANKALP.pdf")

# ─────────────────────────────────────────────
# PAGE SETUP WITH HEADER / FOOTER
# ─────────────────────────────────────────────
PAGE_W, PAGE_H = A4
MARGIN = 2.5 * cm

def make_header_footer(canvas, doc):
    canvas.saveState()
    # Header bar
    canvas.setFillColor(colors.HexColor("#1a3a5c"))
    canvas.rect(MARGIN, PAGE_H - 1.8*cm, PAGE_W - 2*MARGIN, 0.6*cm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(MARGIN + 4, PAGE_H - 1.4*cm, "SANKALP: UHI Mapping & Mitigation System")
    canvas.drawRightString(PAGE_W - MARGIN - 4, PAGE_H - 1.4*cm, "B.Tech Project Report — Semester VII")
    # Footer line
    canvas.setStrokeColor(colors.HexColor("#1a3a5c"))
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, 1.5*cm, PAGE_W - MARGIN, 1.5*cm)
    canvas.setFillColor(colors.HexColor("#1a3a5c"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(MARGIN, 1.1*cm, "Sanchit Singh | Roll No. 2026G296")
    canvas.drawRightString(PAGE_W - MARGIN, 1.1*cm, f"Page {doc.page}")
    canvas.restoreState()

def make_cover_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor("#1a3a5c"))
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(PAGE_W / 2, 1.1*cm, "Academic Year 2025–26")
    canvas.restoreState()

# ─────────────────────────────────────────────
# STYLES
# ─────────────────────────────────────────────
base_styles = getSampleStyleSheet()

def build_styles():
    s = {}

    s["cover_title"] = ParagraphStyle(
        "cover_title", fontSize=22, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#1a3a5c"), alignment=TA_CENTER,
        spaceAfter=10, leading=28
    )
    s["cover_sub"] = ParagraphStyle(
        "cover_sub", fontSize=13, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#2e6da4"), alignment=TA_CENTER,
        spaceAfter=6, leading=18
    )
    s["cover_body"] = ParagraphStyle(
        "cover_body", fontSize=11, fontName="Helvetica",
        textColor=colors.HexColor("#333333"), alignment=TA_CENTER,
        spaceAfter=4, leading=16
    )
    s["h1"] = ParagraphStyle(
        "h1", fontSize=16, fontName="Helvetica-Bold",
        textColor=colors.white, alignment=TA_LEFT,
        spaceBefore=14, spaceAfter=10, leading=22,
        backColor=colors.HexColor("#1a3a5c"),
        leftIndent=-6, rightIndent=-6,
        borderPad=6
    )
    s["h2"] = ParagraphStyle(
        "h2", fontSize=13, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#1a3a5c"), alignment=TA_LEFT,
        spaceBefore=12, spaceAfter=6, leading=18,
        borderPad=0,
        leftIndent=0
    )
    s["h3"] = ParagraphStyle(
        "h3", fontSize=11, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#2e6da4"), alignment=TA_LEFT,
        spaceBefore=8, spaceAfter=4, leading=15
    )
    s["body"] = ParagraphStyle(
        "body", fontSize=10, fontName="Helvetica",
        textColor=colors.HexColor("#222222"), alignment=TA_JUSTIFY,
        spaceAfter=5, leading=15
    )
    s["bullet"] = ParagraphStyle(
        "bullet", fontSize=10, fontName="Helvetica",
        textColor=colors.HexColor("#222222"), alignment=TA_LEFT,
        spaceAfter=3, leading=14, leftIndent=18, bulletIndent=6
    )
    s["code"] = ParagraphStyle(
        "code", fontSize=7.5, fontName="Courier",
        textColor=colors.HexColor("#1a1a1a"),
        backColor=colors.HexColor("#f4f4f4"),
        alignment=TA_LEFT, spaceAfter=4, leading=11,
        leftIndent=8, rightIndent=8, borderPad=6
    )
    s["caption"] = ParagraphStyle(
        "caption", fontSize=9, fontName="Helvetica-Oblique",
        textColor=colors.HexColor("#555555"), alignment=TA_CENTER,
        spaceAfter=8, leading=12
    )
    s["toc_h"] = ParagraphStyle(
        "toc_h", fontSize=11, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#1a3a5c"), alignment=TA_LEFT,
        spaceAfter=4, leading=15
    )
    s["toc_item"] = ParagraphStyle(
        "toc_item", fontSize=10, fontName="Helvetica",
        textColor=colors.HexColor("#333333"), alignment=TA_LEFT,
        spaceAfter=2, leading=14, leftIndent=16
    )
    return s

ST = build_styles()

# ─────────────────────────────────────────────
# TABLE HELPER
# ─────────────────────────────────────────────
HEADER_BG   = colors.HexColor("#1a3a5c")
ALT_ROW_BG  = colors.HexColor("#eaf1f8")
BORDER_CLR  = colors.HexColor("#b0c4d8")

def make_table(header_row, data_rows, col_widths=None):
    all_rows = [header_row] + data_rows
    tbl = Table(all_rows, colWidths=col_widths, repeatRows=1)
    row_count = len(all_rows)
    style_cmds = [
        ("BACKGROUND",  (0, 0), (-1, 0),  HEADER_BG),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0),  9),
        ("ALIGN",       (0, 0), (-1, 0),  "CENTER"),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",    (0, 1), (-1, -1), 8.5),
        ("ALIGN",       (0, 1), (-1, -1), "LEFT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ALT_ROW_BG]),
        ("GRID",        (0, 0), (-1, -1), 0.4, BORDER_CLR),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0,0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",(0, 0), (-1, -1), 6),
    ]
    tbl.setStyle(TableStyle(style_cmds))
    return tbl

def code_block(text):
    lines = text.strip().split("\n")
    paras = []
    for line in lines:
        safe = line.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
        paras.append(Paragraph(safe, ST["code"]))
    return paras

def H1(text):
    return Paragraph(f"&nbsp;{text}", ST["h1"])

def H2(text):
    items = [
        HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#1a3a5c"), spaceAfter=2, spaceBefore=10),
        Paragraph(text, ST["h2"]),
    ]
    return items

def H3(text):
    return Paragraph(text, ST["h3"])

def P(text):
    return Paragraph(text, ST["body"])

def B(items):
    return [Paragraph(f"• {i}", ST["bullet"]) for i in items]

def SP(n=6):
    return Spacer(1, n)

def PB():
    return PageBreak()

# ─────────────────────────────────────────────
# COVER PAGE
# ─────────────────────────────────────────────
def build_cover():
    story = []
    story.append(SP(60))
    story.append(Paragraph("PROJECT REPORT", ST["cover_title"]))
    story.append(Paragraph("B.Tech (Computer Engineering / Information Technology)", ST["cover_sub"]))
    story.append(Paragraph("Semester VII", ST["cover_body"]))
    story.append(SP(20))
    # Blue divider
    story.append(HRFlowable(width="80%", thickness=2, color=colors.HexColor("#1a3a5c"),
                             spaceAfter=20, spaceBefore=10, hAlign="CENTER"))
    story.append(Paragraph("SANKALP", ST["cover_title"]))
    story.append(Paragraph(
        "Spatial Analytics and Neural Knowledge Platform<br/>for Adaptive Land-use Planning",
        ST["cover_sub"]
    ))
    story.append(SP(6))
    story.append(Paragraph(
        "Urban Heat Island (UHI) Mapping &amp; Mitigation System",
        ST["cover_body"]
    ))
    story.append(HRFlowable(width="80%", thickness=2, color=colors.HexColor("#1a3a5c"),
                             spaceAfter=30, spaceBefore=20, hAlign="CENTER"))
    story.append(SP(20))
    story.append(Paragraph("<i>Submitted in partial fulfillment of the requirements of B.Tech (CE/IT) Semester VII</i>", ST["cover_body"]))
    story.append(SP(30))

    # Info table
    info_data = [
        ["Submitted by",   "Sanchit Singh"],
        ["Roll No.",        "2026G296"],
        ["Academic Year",  "2025–26"],
        ["Project Coordinator", "____________________"],
        ["Head of the School",  "____________________"],
    ]
    tbl = Table(info_data, colWidths=[7*cm, 9*cm])
    tbl.setStyle(TableStyle([
        ("FONTNAME",  (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",  (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE",  (0, 0), (-1, -1), 11),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#1a3a5c")),
        ("ALIGN",     (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",    (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",(0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, -1), (-1, -1), 0, colors.white),
    ]))
    story.append(tbl)
    story.append(PB())
    return story

# ─────────────────────────────────────────────
# ACKNOWLEDGMENT
# ─────────────────────────────────────────────
def build_acknowledgment():
    story = []
    story.append(H1("ACKNOWLEDGMENT"))
    story.append(SP(10))
    story.append(P(
        "I would like to express my sincere gratitude to the faculty members and project coordinators "
        "of the School of Engineering who guided me throughout the development of this project."
    ))
    story.append(P(
        "I am especially thankful to the team at <b>BISAG-N (Bhaskaracharya National Institute for Space "
        "Applications and Geo-informatics)</b>, Gandhinagar, whose research support and spatial datasets "
        "made this work possible."
    ))
    story.append(P(
        "I extend my appreciation to <b>Google</b> for providing access to the Gemini generative AI API, "
        "and to the open-source communities behind Django, Next.js, XGBoost, SHAP, rasterio, and LangGraph, "
        "whose tools form the technical backbone of this system."
    ))
    story.append(P(
        "Finally, I thank my family and friends for their constant encouragement and support "
        "throughout this journey."
    ))
    story.append(PB())
    return story

# ─────────────────────────────────────────────
# ABSTRACT
# ─────────────────────────────────────────────
def build_abstract():
    story = []
    story.append(H1("ABSTRACT"))
    story.append(SP(10))
    story.append(P(
        "Urban Heat Islands (UHIs) are a critical environmental challenge in rapidly urbanizing Indian cities, "
        "where dense built-up surfaces, reduced vegetation, and impervious land cover cause localized surface "
        "temperatures to rise several degrees above surrounding rural areas. This elevated thermal stress "
        "directly increases energy consumption, degrades air quality, and harms human health, particularly "
        "for vulnerable populations."
    ))
    story.append(P(
        "This project presents <b>SANKALP</b> — <i>Spatial Analytics and Neural Knowledge Platform for "
        "Adaptive Land-use Planning</i> — an enterprise-scale, production-grade geospatial decision-support "
        "system designed to map, predict, explain, and mitigate UHI hotspots. The platform integrates "
        "validated satellite-derived raster datasets (Landsat 8 Land Surface Temperature, NDVI, NDBI, NDWI, "
        "DEM, LULC) for multiple Indian cities including Ahmedabad, Gandhinagar, Delhi, and Mumbai."
    ))
    story.append(P(
        "The core analytical engine combines an <b>XGBoost classifier</b> with <b>SHAP (SHapley Additive "
        "exPlanations)</b> for transparent, explainable hotspot prediction. An autonomous <b>7-node LangGraph "
        "Omni-Sentinel Agent</b> performs multi-physics microclimate optimization using four ONNX inference "
        "models (UHI classifier, wind speed predictor, albedo-LST estimator, HVAC savings estimator) to "
        "generate actionable intervention mandates. Generative AI recommendations powered by the "
        "<b>Google Gemini API</b> provide urban planners with detailed, location-specific mitigation strategies."
    ))
    story.append(P(
        "The full-stack system is built on a <b>Django 5 / Django REST Framework</b> backend and a "
        "<b>Next.js 14</b> frontend, secured with <b>JWT Role-Based Access Control (RBAC)</b> across four roles: "
        "Administrator, Research Analyst, Urban Planner, and Guest Viewer. The platform is containerized with "
        "<b>Docker Compose</b> and proxied through <b>Nginx</b> for production deployment."
    ))
    story.append(PB())
    return story

# ─────────────────────────────────────────────
# INDEX
# ─────────────────────────────────────────────
def build_index():
    story = []
    story.append(H1("INDEX OF THE PROJECT REPORT"))
    story.append(SP(10))

    entries = [
        ("*",   "Acknowledgment",                                                  "I"),
        ("*",   "Abstract",                                                        "II"),
        ("*",   "Index of the Project Report",                                     "III"),
        ("*",   "List of Figures",                                                 "IV"),
        ("*",   "List of Tables",                                                  "V"),
        ("1",   "ABOUT THE SYSTEM",                                                "1"),
        ("1.1", "Problem Definition (Identification of Needs)",                    "1"),
        ("1.2", "Requirement Specifications (Product/System Tasks)",               "3"),
        ("1.3", "Tools and Technology Used",                                       "5"),
        ("2",   "SYSTEM DESIGN USING UML",                                        "7"),
        ("2.1", "Data Flow Diagrams (Level 0, Level 1, Level 2)",                 "7"),
        ("2.2", "Use Case Diagram",                                                "11"),
        ("2.3", "Class Diagram",                                                   "13"),
        ("2.4", "Sequence Diagrams",                                               "15"),
        ("3",   "DATA DICTIONARY",                                                 "17"),
        ("3.1", "Database Tables (SQL / NoSQL)",                                   "17"),
        ("4",   "IMPLEMENTATION",                                                  "22"),
        ("4.1", "Screen Layouts with Validations",                                 "22"),
        ("4.2", "Sample Coding (with Security Tasks)",                             "27"),
        ("4.3", "Steps of Execution and Navigation",                               "35"),
        ("5",   "CONCLUSION",                                                      "38"),
        ("5.1", "Importance of the Worked-Out Tasks",                              "38"),
        ("5.2", "Further Enhancement in Future",                                   "39"),
        ("6",   "REFERENCES",                                                      "40"),
        ("6.1", "Books, Research Papers, Experts, Technology, Webs",              "40"),
    ]

    tbl_data = [["Sr. No.", "Contents", "Page No."]]
    for sr, content, pg in entries:
        is_chapter = len(sr) == 1 and sr.isdigit()
        is_star    = sr == "*"
        fn = "Helvetica-Bold" if (is_chapter or is_star) else "Helvetica"
        tbl_data.append([
            Paragraph(f"<b>{sr}</b>" if (is_chapter or is_star) else sr, ParagraphStyle("t", fontSize=9, fontName=fn, leading=13)),
            Paragraph(f"<b>{content}</b>" if is_chapter else content, ParagraphStyle("t", fontSize=9, fontName=fn, leading=13)),
            Paragraph(pg, ParagraphStyle("t", fontSize=9, fontName="Helvetica", alignment=TA_CENTER, leading=13)),
        ])

    tbl = Table(tbl_data, colWidths=[2.5*cm, 12*cm, 2*cm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0),  HEADER_BG),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, 0),  9),
        ("ALIGN",       (0, 0), (-1, 0),  "CENTER"),
        ("VALIGN",      (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, ALT_ROW_BG]),
        ("GRID",        (0, 0), (-1, -1), 0.4, BORDER_CLR),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING",(0,0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)
    story.append(PB())
    return story

# ─────────────────────────────────────────────
# LIST OF FIGURES
# ─────────────────────────────────────────────
def build_list_of_figures():
    story = []
    story.append(H1("LIST OF FIGURES"))
    story.append(SP(8))
    figs = [
        ("Fig 1.1",  "System Architecture Overview"),
        ("Fig 2.1",  "Level 0 DFD – Context Diagram"),
        ("Fig 2.2",  "Level 1 DFD – Main Processes"),
        ("Fig 2.3",  "Level 2 DFD – UHI Analysis Sub-process"),
        ("Fig 2.4",  "Use Case Diagram"),
        ("Fig 2.5",  "Class Diagram"),
        ("Fig 2.6",  "Sequence Diagram – Coordinate Analysis Flow"),
        ("Fig 2.7",  "Sequence Diagram – LangGraph Agent Execution"),
        ("Fig 4.1",  "Login Screen"),
        ("Fig 4.2",  "Interactive Heatmap Dashboard"),
        ("Fig 4.3",  "UHI Analysis Panel"),
        ("Fig 4.4",  "SHAP Explainability Chart"),
        ("Fig 4.5",  "Mitigation Recommendations Screen"),
        ("Fig 4.6",  "Aquifer Recharge Oracle Module"),
        ("Fig 4.7",  "PDF Report Export Screen"),
        ("Fig 4.8",  "Admin Security Logs Panel"),
        ("Fig 4.9",  "Dataset Upload and Validation Screen"),
    ]
    tbl_data = [["Figure No.", "Description"]]
    for fn, desc in figs:
        tbl_data.append([fn, desc])
    story.append(make_table(tbl_data[0], tbl_data[1:], col_widths=[3.5*cm, 13*cm]))
    story.append(PB())
    return story

# ─────────────────────────────────────────────
# LIST OF TABLES
# ─────────────────────────────────────────────
def build_list_of_tables():
    story = []
    story.append(H1("LIST OF TABLES"))
    story.append(SP(8))
    tables = [
        ("Table 1.1",  "Functional Requirements"),
        ("Table 1.2",  "Non-Functional Requirements"),
        ("Table 1.3",  "Technology Stack"),
        ("Table 1.4",  "RBAC User Roles and Permissions"),
        ("Table 3.1",  "Role Table"),
        ("Table 3.2",  "UserProfile Table"),
        ("Table 3.3",  "UploadedDataset Table"),
        ("Table 3.4",  "AnalysisLog Table"),
        ("Table 3.5",  "SecurityLog Table"),
        ("Table 3.6",  "AquiferPlan Table"),
        ("Table 4.1",  "GeoTIFF Raster Datasets Used"),
        ("Table 4.2",  "API Endpoints Summary"),
    ]
    tbl_data = [["Table No.", "Description"]]
    for tn, desc in tables:
        tbl_data.append([tn, desc])
    story.append(make_table(tbl_data[0], tbl_data[1:], col_widths=[3.5*cm, 13*cm]))
    story.append(PB())
    return story

# ─────────────────────────────────────────────
# CHAPTER 1
# ─────────────────────────────────────────────
def build_chapter1():
    story = []
    story.append(H1("CHAPTER 1: ABOUT THE SYSTEM"))
    story.append(SP(6))

    # 1.1
    for item in H2("1.1  Problem Definition (Identification of Needs)"):
        story.append(item)
    story.append(H3("Background"))
    story.append(P(
        "India is one of the fastest urbanizing nations in the world. By 2036 it is projected that over "
        "600 million people — nearly 40% of the population — will reside in urban areas. This rapid "
        "urbanization has a direct and measurable environmental cost: the formation of <b>Urban Heat "
        "Islands (UHIs)</b>."
    ))
    story.append(P(
        "A UHI is a metropolitan area significantly warmer than its surrounding rural area due to human "
        "activities and land cover change. Primary causes include:"
    ))
    story += B([
        "Replacement of natural vegetation with concrete, asphalt, and metal surfaces that absorb and re-radiate solar radiation as heat.",
        "Heat generated by human activities: vehicular traffic, air conditioning units, industrial processes, and building systems.",
        "Reduced evapotranspiration due to loss of trees, plants, and water bodies.",
        "Urban canyon geometry: tall buildings trap shortwave radiation and reduce sky-view factors, limiting heat escape.",
    ])
    story.append(P(
        "In cities like Ahmedabad, Delhi, and Mumbai, UHI-driven Land Surface Temperatures (LST) regularly "
        "exceed 48–52°C in summer months, creating cascading consequences:"
    ))
    story += B([
        "<b>Public health crisis:</b> Heat stress, heat stroke, and respiratory illness disproportionately affect the elderly, children, and outdoor workers.",
        "<b>Energy demand spiral:</b> Rising temperatures increase air conditioning loads, putting immense pressure on urban power grids.",
        "<b>Environmental degradation:</b> Higher temperatures accelerate ground-level ozone formation, worsen air quality, and accelerate evaporation of surface water bodies.",
        "<b>Infrastructure stress:</b> Road surfaces soften, utility cables overheat, and water distribution systems degrade faster under persistent extreme heat.",
    ])
    story.append(H3("The Identified Need"))
    story.append(P(
        "Despite the severity of the problem, Indian municipal authorities and urban planners lack accessible, "
        "science-based, real-time tools to:"
    ))
    story += B([
        "Identify and rank UHI hotspots within a city with high spatial precision.",
        "Understand which specific factors (built-up density, vegetation loss, surface reflectivity) are driving heat in a given locality.",
        "Receive AI-driven, site-specific intervention plans that are actionable — not just generic policy statements.",
        "Monitor and track the impact of mitigation measures over time.",
        "Export scientifically credible reports that can be submitted to government bodies.",
    ])
    story.append(P(
        "Existing remote sensing tools (Google Earth Engine, QGIS) require expert knowledge, are not real-time, "
        "and produce no actionable recommendations. No integrated, web-accessible platform exists that combines "
        "satellite data, machine learning prediction, explainable AI, generative AI recommendations, and autonomous "
        "optimization into a single decision-support interface for urban planners. <b>SANKALP is designed to fill this gap.</b>"
    ))

    # 1.2
    for item in H2("1.2  Requirement Specifications"):
        story.append(item)
    story.append(H3("Table 1.1 – Functional Requirements"))
    fr_data = [
        ["FR No.", "Requirement", "Description"],
        ["FR-01", "Geospatial UHI Analysis",       "Accept lat/lon, sample GeoTIFF rasters, return LST/NDVI/NDBI/NDWI/DEM/LULC."],
        ["FR-02", "ML Hotspot Classification",      "Classify coordinate as Low/Medium/High heat zone via trained XGBoost."],
        ["FR-03", "SHAP Explainability",             "Generate per-feature SHAP contribution values explaining the prediction."],
        ["FR-04", "Heat Risk Index",                 "Compute composite Heat Risk Score (0–100) combining LST, NDBI, NDVI, population density."],
        ["FR-05", "Generative AI Mitigation",        "Location-specific UHI mitigation via Google Gemini API."],
        ["FR-06", "Autonomous Agent Optimization",   "7-node LangGraph Omni-Sentinel Agent for multi-physics microclimate optimization."],
        ["FR-07", "Interactive Heatmap",             "Render 35×35 ML-classified heat zone grid over city on Leaflet map."],
        ["FR-08", "Ward Boundary Overlay",           "Administrative ward boundaries as GeoJSON overlays."],
        ["FR-09", "Aquifer Recharge Oracle",         "Groundwater layer reconstruction and optimal recharge site generation from GRACE data."],
        ["FR-10", "PDF Report Export",               "Compile and download detailed scientific PDF for any analyzed coordinate."],
        ["FR-11", "Dataset Upload & Validation",     "Upload GeoTIFF/CSV/GeoJSON/Shapefile with automated CRS and geometry validation."],
        ["FR-12", "Dashboard Analytics",             "Aggregate stats: total queries, avg LST, heat zone distribution, risk distribution."],
        ["FR-13", "User Authentication",             "JWT-based login/logout with role-based access control."],
        ["FR-14", "Security Audit Logs",             "Record login events, unauthorized access, data operations for Administrators."],
        ["FR-15", "Dossier Download",                "Download cryptographically signed PDF dossiers from evidence vault."],
    ]
    story.append(make_table(fr_data[0], fr_data[1:], col_widths=[1.6*cm, 4.2*cm, 10.7*cm]))
    story.append(SP(8))

    story.append(H3("Table 1.2 – Non-Functional Requirements"))
    nfr_data = [
        ["NFR No.", "Category",        "Requirement"],
        ["NFR-01",  "Performance",      "Raster sampling + ML prediction within 3 seconds per query."],
        ["NFR-02",  "Scalability",      "35×35 heat zone grid cached and served in under 5 seconds."],
        ["NFR-03",  "Security",         "All endpoints require JWT tokens. Inputs validated against city boundary polygons."],
        ["NFR-04",  "Data Integrity",   "No synthetic data; all predictions use validated GeoTIFF rasters from Landsat 8."],
        ["NFR-05",  "Portability",      "Entire system runs as Docker Compose cluster on any Linux/macOS server."],
        ["NFR-06",  "Maintainability",  "MVC separation: Django views/models/serializers, Next.js components/hooks."],
        ["NFR-07",  "Availability",     "Nginx reverse proxy with Celery/Redis for background task queuing."],
        ["NFR-08",  "Accessibility",    "Usable on Chrome, Firefox, Edge; desktop and tablet."],
    ]
    story.append(make_table(nfr_data[0], nfr_data[1:], col_widths=[1.8*cm, 3.5*cm, 11.2*cm]))
    story.append(SP(8))

    story.append(H3("Table 1.4 – RBAC User Roles"))
    rbac_data = [
        ["Role",              "Code",     "Permissions"],
        ["Administrator",     "ADMIN",    "Full system access, security audit logs, manage all users."],
        ["Research Analyst",  "ANALYST",  "Dataset upload, validation, all analysis features."],
        ["Urban Planner",     "PLANNER",  "View analyses, Gemini recommendations, export PDFs, aquifer planning."],
        ["Guest Viewer",      "GUEST",    "Read-only access to maps and heat zone grid."],
    ]
    story.append(make_table(rbac_data[0], rbac_data[1:], col_widths=[4*cm, 2.5*cm, 10*cm]))

    # 1.3
    for item in H2("1.3  Tools and Technology Used"):
        story.append(item)
    story.append(H3("Table 1.3 – Complete Technology Stack"))
    tech_data = [
        ["Layer",        "Technology",          "Version",   "Purpose"],
        ["Frontend",     "Next.js",             "14",        "React SSR web framework"],
        ["",             "TypeScript",          "5.x",       "Type-safe frontend development"],
        ["",             "Tailwind CSS",        "3.x",       "Utility-first styling"],
        ["",             "Leaflet.js",          "1.9.x",     "Interactive geospatial maps"],
        ["",             "Recharts",            "2.x",       "Analytics charts"],
        ["",             "Zustand",             "4.x",       "Global state management"],
        ["Backend",      "Django",              "5.x",       "Python web framework"],
        ["",             "Django REST Framework","3.x",      "REST API construction"],
        ["",             "SimpleJWT",           "5.x",       "JWT authentication"],
        ["",             "Celery",              "5.x",       "Async task queuing"],
        ["",             "rasterio",            "1.3.x",     "GeoTIFF raster I/O"],
        ["",             "geopandas",           "0.14.x",    "Shapefile/GeoJSON handling"],
        ["",             "ReportLab",           "4.x",       "PDF report generation"],
        ["AI / ML",      "XGBoost",             "1.7.x",     "UHI hotspot classification"],
        ["",             "SHAP",                "0.42.x",    "Explainable AI (feature contributions)"],
        ["",             "ONNX Runtime",        "1.16.x",    "4-model inference suite"],
        ["",             "LangGraph",           "0.1.x",     "7-node autonomous agent graph"],
        ["",             "Google Gemini API",   "1.5 Flash", "Generative AI mitigation recommendations"],
        ["Database",     "SQLite",              "3.x",       "Local development database"],
        ["",             "PostgreSQL/PostGIS",  "15 / 3.x",  "Production spatial database"],
        ["",             "Redis",               "7.x",       "Celery broker"],
        ["DevOps",       "Docker Compose",      "2.x",       "Multi-container orchestration"],
        ["",             "Nginx",               "1.25.x",    "Reverse proxy"],
        ["",             "GitHub Actions",      "—",         "CI/CD pipeline"],
        ["Data Sources", "Landsat 8 (USGS/GEE)","—",        "LST, NDVI, NDBI, NDWI, LULC rasters"],
        ["",             "SRTM DEM (NASA)",     "—",         "Digital Elevation Model"],
        ["",             "GRACE / CSR RL06",    "—",         "Terrestrial Water Storage Anomalies"],
        ["",             "Open-Meteo API",      "—",         "Live ambient temperature and wind"],
    ]
    story.append(make_table(tech_data[0], tech_data[1:], col_widths=[2.5*cm, 4.5*cm, 2.5*cm, 7*cm]))
    story.append(SP(8))

    story.append(H3("Fig 1.1 – System Architecture"))
    arch = (
        "┌──────────────────────────────────────────────┐\n"
        "│         Web Client (Browser)                  │\n"
        "│  Next.js 14 + Tailwind + Leaflet + Zustand    │\n"
        "└────────────────────┬─────────────────────────┘\n"
        "                     │  HTTPS / JWT\n"
        "                     ▼\n"
        "┌────────────────────────────────────────────────┐\n"
        "│          Nginx Reverse Proxy (:80)              │\n"
        "└────────────────────┬───────────────────────────┘\n"
        "                     │\n"
        "                     ▼\n"
        "┌────────────────────────────────────────────────┐\n"
        "│     Django REST Framework Backend (:8000)       │\n"
        "│  Views → Serializers → Models → DB             │\n"
        "└──────┬─────────────────────────┬───────────────┘\n"
        "       │ ML/SHAP Pipeline        │ Celery Tasks\n"
        "       ▼                         ▼\n"
        "┌─────────────┐         ┌───────────────────┐\n"
        "│  XGBoost +  │         │  Celery Worker    │\n"
        "│  SHAP +     │         │  + Redis Queue    │\n"
        "│  ONNX Quad  │         └───────────────────┘\n"
        "└─────────────┘\n"
        "       │\n"
        "       ▼\n"
        "┌─────────────────────────────┐\n"
        "│  GeoTIFF Spatial Rasters    │\n"
        "│  (LST, NDVI, NDBI, NDWI,   │\n"
        "│   DEM, LULC — per city)    │\n"
        "└─────────────────────────────┘"
    )
    story += code_block(arch)
    story.append(PB())
    return story

# ─────────────────────────────────────────────
# CHAPTER 2
# ─────────────────────────────────────────────
def build_chapter2():
    story = []
    story.append(H1("CHAPTER 2: SYSTEM DESIGN USING UML"))
    story.append(SP(6))

    for item in H2("2.1  Data Flow Diagrams"):
        story.append(item)

    story.append(H3("Fig 2.1 – Level 0 DFD (Context Diagram)"))
    story += code_block(
        "                    ┌─────────────────────────────────┐\n"
        "                    │                                 │\n"
        "  Urban Planner ───►│                                 │──► UHI Hotspot Map\n"
        "                    │                                 │\n"
        "  Research Analyst─►│    SANKALP UHI DECISION         │──► Mitigation Report\n"
        "                    │    SUPPORT SYSTEM               │\n"
        "  Administrator  ──►│                                 │──► Security Audit Log\n"
        "                    │                                 │\n"
        "  Satellite Data ──►│                                 │──► PDF Dossier\n"
        "  (Raster Files)   │                                 │\n"
        "                    └─────────────────────────────────┘"
    )
    story.append(P("<b>External Entities:</b>"))
    story += B([
        "<b>Urban Planner:</b> Submits coordinates for analysis, receives predictions and recommendations.",
        "<b>Research Analyst:</b> Uploads and validates spatial datasets.",
        "<b>Administrator:</b> Views security logs, manages users.",
        "<b>Satellite Data Sources:</b> Landsat 8 rasters (LST, NDVI, NDBI, NDWI, DEM, LULC), GRACE anomalies.",
    ])
    story.append(SP(10))

    story.append(H3("Fig 2.2 – Level 1 DFD (Main Processes)"))
    story += code_block(
        "                      ┌──────────────┐\n"
        "  User Input          │  P1          │      Validated\n"
        "  (lat, lon) ────────►│  Authenticate│──────► Credentials\n"
        "                      │  & Authorize │              │\n"
        "                      └──────────────┘              ▼\n"
        "                                           ┌───────────────┐\n"
        "  Raster Files ──────────────────────────► │  P2           │\n"
        "                                           │  Sample GIS   │──► env_data\n"
        "                      ┌──────────────┐     │  Rasters      │\n"
        "  env_data ──────────►│  P3          │     └───────────────┘\n"
        "                      │  ML Predict  │\n"
        "                      │  + SHAP      │──────► prediction, risk_score\n"
        "                      └──────────────┘\n"
        "                             │\n"
        "                             ▼\n"
        "                      ┌──────────────┐\n"
        "                      │  P4          │\n"
        "                      │  LangGraph   │──────► optimization, actuation, dossier\n"
        "                      │  Agent       │\n"
        "                      └──────────────┘\n"
        "                             │\n"
        "                             ▼\n"
        "                      ┌──────────────┐\n"
        "                      │  P5          │\n"
        "                      │  Gemini AI   │──────► Mitigation Text\n"
        "                      └──────────────┘\n"
        "                             │\n"
        "                             ▼\n"
        "                      ┌──────────────┐\n"
        "                      │  P6          │\n"
        "                      │  Log & Store │──────► AnalysisLog DB, SecurityLog DB\n"
        "                      └──────────────┘"
    )
    story.append(SP(10))

    story.append(H3("Fig 2.3 – Level 2 DFD (UHI Analysis Sub-process)"))
    story += code_block(
        "  lat, lon\n"
        "     │\n"
        "     ▼\n"
        "┌────────────────┐\n"
        "│ Validate       │   City boundary\n"
        "│ Coordinates    │◄── GeoJSON (Shapely)\n"
        "│ Against City   │──► ValueError if outside bounds\n"
        "└────────┬───────┘\n"
        "         │ valid\n"
        "         ▼\n"
        "┌────────────────┐\n"
        "│ Determine City │──► Ahmedabad / Delhi / Mumbai_City etc.\n"
        "└────────┬───────┘\n"
        "         │\n"
        "         ▼\n"
        "┌────────────────┐\n"
        "│ Load GeoTIFF   │   Memory cache\n"
        "│ Rasters with   │◄── {dem, lst, lulc, ndbi, ndvi, ndwi}.tif\n"
        "│ Caching        │\n"
        "└────────┬───────┘\n"
        "         │ env_data dict\n"
        "         ▼\n"
        "┌────────────────┐\n"
        "│ XGBoost        │──► heat_zone (Low/Medium/High)\n"
        "│ Classifier     │──► confidence\n"
        "└────────┬───────┘\n"
        "         ▼\n"
        "┌────────────────┐\n"
        "│ SHAP Tree      │──► per-feature contributions\n"
        "│ Explainer      │\n"
        "└────────┬───────┘\n"
        "         ▼\n"
        "┌────────────────┐\n"
        "│ Heat Risk Index│──► risk_score (0–100), risk_category\n"
        "└────────────────┘"
    )
    story.append(SP(10))

    for item in H2("2.2  Use Case Diagram"):
        story.append(item)
    story.append(H3("Fig 2.4 – Use Case Diagram"))
    story += code_block(
        "                         SANKALP SYSTEM\n"
        "  ┌──────────────────────────────────────────────────────────────────────┐\n"
        "  │  (Register/Login)           (View Heat Zone Map)                     │\n"
        "  │  (Analyze Coordinates)      (Download PDF Report)                   │\n"
        "  │  (Get AI Recommendations)   (Export Dossier PDF)                    │\n"
        "  │  (Upload Dataset)           (Validate Dataset)                      │\n"
        "  │  (Run Aquifer Simulation)   (Create Aquifer Plan)                   │\n"
        "  │  (View Dashboard Stats)     (View Security Logs)                    │\n"
        "  └──────────────────────────────────────────────────────────────────────┘\n"
        "         ▲                ▲               ▲               ▲\n"
        "         │                │               │               │\n"
        "    Guest Viewer    Urban Planner  Research Analyst   Administrator\n"
        "    - View Map       - All Guest    - All Planner      - All Analyst\n"
        "    - Register       - Analyze      - Upload Dataset   - Security Logs\n"
        "                     - Recommend.   - Validate         - User Management\n"
        "                     - Export PDF   - Aquifer Plan"
    )
    story.append(SP(6))
    uc_data = [
        ["Use Case",                  "Actor(s)",          "Description"],
        ["Register / Login",          "All",               "Create account or authenticate with JWT"],
        ["View Heat Zone Map",         "All (incl. Guest)", "35×35 UHI hotspot grid on Leaflet map"],
        ["Analyze Coordinates",        "Planner, Analyst",  "Submit lat/lon; receive env data + ML prediction"],
        ["Get AI Recommendations",     "Planner, Analyst",  "Trigger Gemini + LangGraph agent for mitigation"],
        ["Export PDF Report",          "Planner, Analyst",  "Download comprehensive scientific PDF report"],
        ["Upload Dataset",             "Analyst",           "Upload GeoTIFF/CSV/GeoJSON/Shapefile for validation"],
        ["Run Aquifer Simulation",     "Planner, Analyst",  "Simulate groundwater layers and recharge sites"],
        ["View Dashboard Stats",       "Authenticated",     "View aggregate analytics"],
        ["View Security Logs",         "Admin",             "Access full security audit trail"],
    ]
    story.append(make_table(uc_data[0], uc_data[1:], col_widths=[4.5*cm, 4*cm, 8*cm]))
    story.append(SP(10))

    for item in H2("2.3  Class Diagram"):
        story.append(item)
    story.append(H3("Fig 2.5 – Class Diagram"))
    story += code_block(
        "┌─────────────────────┐       ┌──────────────────────────┐\n"
        "│ User (Django Auth)  │       │ Role                     │\n"
        "├─────────────────────┤       ├──────────────────────────┤\n"
        "│ id: int             │       │ id: int                  │\n"
        "│ username: str       │       │ name: str                │\n"
        "│ email: str          │       │ code: str                │\n"
        "│ password: str (hash)│       │ ADMIN / ANALYST /        │\n"
        "└──────────┬──────────┘       │ PLANNER / GUEST          │\n"
        "           │ 1                └──────────────┬───────────┘\n"
        "           │                                 │ 1\n"
        "           ▼                                 │\n"
        "┌──────────────────────┐◄────────────────────┘\n"
        "│ UserProfile          │  FK role\n"
        "├──────────────────────┤\n"
        "│ user: FK(User)       │\n"
        "│ role: FK(Role)       │\n"
        "│ created_at: datetime │\n"
        "└──────────────────────┘\n"
        "\n"
        "┌──────────────────────────┐  ┌──────────────────────────┐\n"
        "│ AnalysisLog              │  │ UploadedDataset          │\n"
        "├──────────────────────────┤  ├──────────────────────────┤\n"
        "│ user: FK(User) nullable  │  │ file_name: str           │\n"
        "│ latitude, longitude:float│  │ file_type: str           │\n"
        "│ temperature: float       │  │ status: PENDING/VALID/FAIL│\n"
        "│ ndvi, ndbi, ndwi: float  │  │ crs, geometry_type: str  │\n"
        "│ dem: float, lulc: int    │  │ metadata: JSONField      │\n"
        "│ heat_zone: str           │  └──────────────────────────┘\n"
        "│ risk_score: float        │\n"
        "│ shap_contributions: JSON │  ┌──────────────────────────┐\n"
        "└──────────────────────────┘  │ SecurityLog              │\n"
        "                              ├──────────────────────────┤\n"
        "┌──────────────────────────┐  │ event_type: str          │\n"
        "│ AquiferPlan              │  │ ip_address: str          │\n"
        "├──────────────────────────┤  │ path, status_code        │\n"
        "│ name, district_name: str │  │ details: text            │\n"
        "│ grace_anomaly: float     │  │ timestamp: datetime      │\n"
        "│ target_recharge_vol:float│  └──────────────────────────┘\n"
        "│ optimal_coordinates: JSON│\n"
        "└──────────────────────────┘"
    )
    story.append(SP(10))

    for item in H2("2.4  Sequence Diagrams"):
        story.append(item)
    story.append(H3("Fig 2.6 – Sequence Diagram: UHI Coordinate Analysis"))
    story += code_block(
        " User/Planner   Frontend    Backend API   GIS Utils   ML Service    DB\n"
        "     │              │            │             │           │          │\n"
        "     │─Submit──────►│            │             │           │          │\n"
        "     │  (lat,lon)   │──POST─────►│             │           │          │\n"
        "     │              │  /analyze  │             │           │          │\n"
        "     │              │            │─sample_env──►│           │          │\n"
        "     │              │            │             │──read rasters        │\n"
        "     │              │            │◄──env_data──│           │          │\n"
        "     │              │            │─predict()───────────────►│          │\n"
        "     │              │            │             │     XGBoost+SHAP     │\n"
        "     │              │            │◄──prediction────────────│          │\n"
        "     │              │            │──AnalysisLog.create()────────────►│\n"
        "     │              │◄──JSON─────│             │           │          │\n"
        "     │◄──Display────│            │             │           │          │"
    )
    story.append(SP(10))
    story.append(H3("Fig 2.7 – Sequence Diagram: LangGraph Omni-Sentinel Agent"))
    story += code_block(
        " View     Agent      N1:Audit   N3:Vision  N4:Planner  N6:Policy\n"
        "  │         │            │          │           │            │\n"
        "  │─execute►│            │          │           │            │\n"
        "  │         │─invoke()──►│          │           │            │\n"
        "  │         │            │─SHA256   │           │            │\n"
        "  │         │            │─cleared──►           │            │\n"
        "  │         │────────────────────────►          │            │\n"
        "  │         │            │          │─rasters   │            │\n"
        "  │         │            │          │─OSM API   │            │\n"
        "  │         │            │          │─OpenMeteo │            │\n"
        "  │         │─────────────────────────────────►│            │\n"
        "  │         │            │          │     ONNX Wind/UHI/Alb  │\n"
        "  │         │            │          │     HVAC (5 cycles)    │\n"
        "  │         │────────────────────────────────────────────────►│\n"
        "  │         │            │          │           │      generate PDF\n"
        "  │◄─result─│            │          │           │            │"
    )
    story.append(PB())
    return story

# ─────────────────────────────────────────────
# CHAPTER 3
# ─────────────────────────────────────────────
def build_chapter3():
    story = []
    story.append(H1("CHAPTER 3: DATA DICTIONARY"))
    story.append(SP(6))
    for item in H2("3.1  Database Tables"):
        story.append(item)
    story.append(P(
        "The system uses a relational SQL database (SQLite for development, PostgreSQL/PostGIS for production). "
        "All tables are defined as Django ORM models."
    ))

    def db_table(title, headers, rows):
        items = [H3(title)]
        items.append(make_table(headers, rows))
        items.append(SP(8))
        return items

    story += db_table("Table 3.1 – Role",
        ["Column", "Data Type", "Constraints", "Description"],
        [
            ["id",   "INTEGER",     "PK, Auto-increment", "Unique role identifier"],
            ["name", "VARCHAR(50)", "NOT NULL, UNIQUE",   "Human-readable role name (e.g., Administrator)"],
            ["code", "VARCHAR(20)", "NOT NULL, UNIQUE",   "Machine-readable code: ADMIN, ANALYST, PLANNER, GUEST"],
        ])

    story += db_table("Table 3.2 – UserProfile",
        ["Column", "Data Type", "Constraints", "Description"],
        [
            ["id",         "INTEGER",  "PK, Auto-increment",   "Unique profile ID"],
            ["user_id",    "INTEGER",  "FK → auth_user, CASCADE","Reference to Django auth user"],
            ["role_id",    "INTEGER",  "FK → Role, SET NULL",  "Assigned role"],
            ["created_at", "DATETIME", "Auto-set on create",   "Record creation timestamp"],
            ["updated_at", "DATETIME", "Auto-updated",         "Last modification timestamp"],
        ])

    story += db_table("Table 3.3 – UploadedDataset",
        ["Column", "Data Type", "Constraints", "Description"],
        [
            ["id",           "INTEGER",      "PK, Auto-increment", "Unique dataset ID"],
            ["file_name",    "VARCHAR(255)",  "NOT NULL",           "Original uploaded filename"],
            ["file_type",    "VARCHAR(10)",   "NOT NULL",           "TIFF / CSV / GEOJSON / SHAPEFILE"],
            ["file_path",    "VARCHAR(255)",  "NOT NULL",           "Server file path (upload_to='datasets/')"],
            ["uploaded_by_id","INTEGER",      "FK → auth_user",     "Uploader reference"],
            ["status",       "VARCHAR(20)",   "Default='PENDING'",  "PENDING / VALIDATED / FAILED"],
            ["crs",          "VARCHAR(50)",   "Nullable",           "Coordinate Reference System (e.g., EPSG:4326)"],
            ["geometry_type","VARCHAR(50)",   "Nullable",           "e.g., Point, Polygon, MultiPolygon"],
            ["error_message","TEXT",          "Nullable",           "Validation failure reason"],
            ["metadata",     "JSON",          "Default={}",         "Width/height/bounds, features count, rows/cols"],
            ["created_at",   "DATETIME",      "Auto-set",           "Upload timestamp"],
        ])

    story += db_table("Table 3.4 – AnalysisLog",
        ["Column", "Data Type", "Constraints", "Description"],
        [
            ["id",                    "INTEGER", "PK",         "Unique analysis record ID"],
            ["user_id",               "INTEGER", "FK, nullable","User who triggered analysis"],
            ["latitude",              "FLOAT",   "NOT NULL",    "Target query latitude"],
            ["longitude",             "FLOAT",   "NOT NULL",    "Target query longitude"],
            ["temperature",           "FLOAT",   "Nullable",    "Sampled LST in °C"],
            ["ndvi",                  "FLOAT",   "Nullable",    "Normalized Difference Vegetation Index"],
            ["ndbi",                  "FLOAT",   "Nullable",    "Normalized Difference Built-up Index"],
            ["ndwi",                  "FLOAT",   "Nullable",    "Normalized Difference Water Index"],
            ["dem",                   "FLOAT",   "Nullable",    "Digital Elevation (meters)"],
            ["lulc",                  "INTEGER", "Nullable",    "Land Use Land Cover class code"],
            ["heat_zone",             "VARCHAR(20)", "—",       "Low / Medium / High"],
            ["prediction_confidence", "FLOAT",   "Nullable",    "XGBoost confidence (0–1)"],
            ["risk_score",            "FLOAT",   "Nullable",    "Heat Risk Index (0–100)"],
            ["risk_category",         "VARCHAR(20)","—",        "Low / Medium / High / Very High"],
            ["shap_contributions",    "JSON",    "Default={}",  "SHAP feature contributions"],
            ["created_at",            "DATETIME","Auto-set",    "Analysis timestamp"],
        ])

    story += db_table("Table 3.5 – SecurityLog",
        ["Column", "Data Type", "Constraints", "Description"],
        [
            ["id",          "INTEGER",    "PK",          "Unique log entry ID"],
            ["event_type",  "VARCHAR(30)","NOT NULL",     "LOGIN_SUCCESS / LOGIN_FAILED / UNAUTHORIZED_ACCESS / DATA_UPLOAD / DATA_VALIDATION_FAILED / MALICIOUS_INPUT"],
            ["user_id",     "INTEGER",    "FK, nullable", "Associated user"],
            ["ip_address",  "INET",       "Nullable",     "Client IP address"],
            ["path",        "VARCHAR(255)","Nullable",    "Request URL path"],
            ["status_code", "INTEGER",    "Nullable",     "HTTP response status code"],
            ["details",     "TEXT",       "Nullable",     "Additional context"],
            ["timestamp",   "DATETIME",   "Auto-set",     "Event timestamp"],
        ])

    story += db_table("Table 3.6 – AquiferPlan",
        ["Column", "Data Type", "Constraints", "Description"],
        [
            ["id",                  "INTEGER",    "PK",         "Unique plan ID"],
            ["name",                "VARCHAR(255)","NOT NULL",  "Plan title"],
            ["district_name",       "VARCHAR(255)","NOT NULL",  "Target district or zone"],
            ["grace_anomaly",       "FLOAT",      "NOT NULL",   "GRACE water anomaly (mGal)"],
            ["avg_ndvi",            "FLOAT",      "NOT NULL",   "Average NDVI for the region"],
            ["avg_ndwi",            "FLOAT",      "NOT NULL",   "Average NDWI for the region"],
            ["target_recharge_vol", "FLOAT",      "NOT NULL",   "Target groundwater recharge (MCM)"],
            ["optimal_coordinates", "JSON",       "Default=[]", "List of [lat, lon] recharge site points"],
            ["created_by_id",       "INTEGER",    "FK, SET NULL","Planner who created the plan"],
            ["created_at",          "DATETIME",   "Auto-set",   "Plan creation timestamp"],
        ])

    story.append(PB())
    return story

# ─────────────────────────────────────────────
# CHAPTER 4
# ─────────────────────────────────────────────
def build_chapter4():
    story = []
    story.append(H1("CHAPTER 4: IMPLEMENTATION"))
    story.append(SP(6))

    for item in H2("4.1  Screen Layouts with Validations"):
        story.append(item)

    screens = [
        ("Screen 1 – Login / Registration", [
            "The authentication screen allows users to log in with username/password or register a new account. JWT tokens are issued on successful login and stored in Zustand state.",
            "<b>Fields:</b> Username (text), Password (masked), Role selector (for registration).",
            "<b>Validation:</b> Username: required, min 3 chars, alphanumeric. Password: required, min 8 chars.",
            "<b>Error state:</b> HTTP 401 → red error banner: 'No active account found...'",
            "<b>Success:</b> JWT access token stored in Zustand; user redirected to dashboard.",
        ]),
        ("Screen 2 – Interactive Heatmap Dashboard", [
            "Full-screen Leaflet map centered on selected city. A 35×35 grid of colored circles represents ML-classified heat zones (green = Low, orange = Medium, red = High).",
            "<b>City selector:</b> Constrained to Ahmedabad, Gandhinagar, Delhi, Mumbai City, Mumbai Suburban, Mumbai Metro, Thane.",
            "<b>Boundary validation:</b> Click outside city → toast: 'Analysis unavailable due to missing validated datasets.'",
            "<b>Coordinate picker:</b> Click on map or enter lat/lon in text fields; validated as numeric values.",
            "<b>UI elements:</b> Leaflet map, OpenStreetMap tiles, risk-scaled circles, ward boundary GeoJSON overlay, 'Analyze this point' button.",
        ]),
        ("Screen 3 – UHI Analysis Panel", [
            "Right-slide panel after clicking a coordinate. Shows: Environmental Indicators (LST, NDVI, NDBI, NDWI, DEM, LULC), ML Prediction (heat zone badge, confidence %, risk score, risk category), SHAP bar chart (per-feature contributions).",
            "<b>Validation:</b> Coordinates required, numeric, within [-90,90] and [-180,180].",
            "<b>Error card:</b> If env data unavailable → 'Analysis unavailable due to missing validated datasets.'",
        ]),
        ("Screen 4 – Mitigation Recommendations", [
            "Invokes Gemini API and LangGraph Omni-Sentinel Agent. Displays: (1) SANKALP Autonomous Mandate — initial vs optimized LST, albedo target, HVAC savings in MWh, IoT swarm actuation commands (misting pulse, louver angle, smart glass opacity). (2) Gemini AI Recommendations — markdown-rendered urban planning strategies. (3) Download Dossier PDF button.",
            "<b>Validation:</b> Button disabled until analysis is complete. Network timeout for Gemini: 30s → fallback to locally computed recommendations.",
        ]),
        ("Screen 5 – Aquifer Recharge Oracle", [
            "Map showing groundwater hotspots for all supported cities with severity color-coding. Input sliders for GRACE anomaly (−50 to +50 mGal), NDVI, NDWI, DEM.",
            "<b>Validation:</b> GRACE Anomaly: range −50.0 to +50.0 mGal (server-side, HTTP 400 if violated). Lat/Lon: required, numeric. District name: required, non-empty.",
        ]),
        ("Screen 6 – Dataset Upload and Validation", [
            "Analyst-only. Drag-and-drop file upload for GeoTIFF, CSV, GeoJSON, Shapefile. Validates CRS, geometry type, coordinate columns.",
            "<b>Validation:</b> File type dropdown required. Max file size 100 MB. Non-analyst roles → HTTP 403.",
            "<b>Result:</b> VALIDATED (green card) or FAILED (red card) with error detail.",
        ]),
        ("Screen 7 – Admin Security Logs Panel", [
            "Admin-only. Paginated table: event type badge, username, IP address, request path, HTTP status code, timestamp, details text.",
            "<b>Access control:</b> Non-admin roles receive HTTP 403.",
        ]),
    ]

    for screen_title, points in screens:
        story.append(H3(f"Fig {screen_title.split(' ')[1]} – {' '.join(screen_title.split(' ')[2:])}"))
        story.append(P(f"<b>{screen_title}</b>"))
        for pt in points:
            story.append(Paragraph(f"• {pt}", ST["bullet"]))
        story.append(SP(8))

    for item in H2("4.2  Sample Coding (with Security Tasks)"):
        story.append(item)

    story.append(H3("Code Sample 1 – Coordinate Validation & Raster Sampling (gis_utils.py)"))
    story.append(P(
        "This is the core data integrity gate. It enforces that only coordinates within validated city "
        "boundaries can trigger an analysis, preventing arbitrary queries on areas without validated datasets."
    ))
    story += code_block(
        "def sample_environmental_data(lon, lat):\n"
        '    """\n'
        "    Samples environmental indicators dynamically from the correct\n"
        "    city GeoTIFFs with in-memory caching. Raises ValueError if\n"
        "    coordinates are outside all supported city boundaries.\n"
        '    """\n'
        "    # Zero Trust spatial gating\n"
        "    city_prefix = get_containing_city(lon, lat)\n"
        "    if not city_prefix:\n"
        '        raise ValueError("Analysis unavailable due to missing validated datasets.")\n'
        "\n"
        "    results = {}\n"
        "    for key, filename_suffix in TIFF_FILES.items():\n"
        "        suffix_part = filename_suffix.split('_', 1)[1]\n"
        "        filename = f\"{city_prefix}_{suffix_part}\"\n"
        "        filepath = MAPS_DIR / filename\n"
        "        if not filepath.exists():\n"
        '            raise ValueError("Analysis unavailable due to missing validated datasets.")\n'
        "        val = sample_raster_point(filepath, lon, lat, default=None)\n"
        "        if val is None:\n"
        '            raise ValueError("Analysis unavailable due to missing validated datasets.")\n'
        "        results[key] = val\n"
        "    return results"
    )
    story.append(SP(8))

    story.append(H3("Code Sample 2 – JWT Role-Based Access Control (permissions.py)"))
    story.append(P(
        "SANKALP implements fine-grained RBAC using custom DRF permission classes. "
        "Each endpoint declares exactly which role(s) are permitted."
    ))
    story += code_block(
        "from rest_framework.permissions import BasePermission\n"
        "from .models import Role\n"
        "\n"
        "class IsAdministrator(BasePermission):\n"
        "    def has_permission(self, request, view):\n"
        "        if not request.user or not request.user.is_authenticated:\n"
        "            return False\n"
        "        try:\n"
        "            return request.user.profile.role.code == Role.ADMINISTRATOR\n"
        "        except Exception:\n"
        "            return False\n"
        "\n"
        "class IsResearchAnalyst(BasePermission):\n"
        "    def has_permission(self, request, view):\n"
        "        if not request.user or not request.user.is_authenticated:\n"
        "            return False\n"
        "        try:\n"
        "            return request.user.profile.role.code in [\n"
        "                Role.ADMINISTRATOR, Role.RESEARCH_ANALYST\n"
        "            ]\n"
        "        except Exception:\n"
        "            return False\n"
        "\n"
        "class IsPlanner(BasePermission):\n"
        "    def has_permission(self, request, view):\n"
        "        if not request.user or not request.user.is_authenticated:\n"
        "            return False\n"
        "        try:\n"
        "            return request.user.profile.role.code in [\n"
        "                Role.ADMINISTRATOR, Role.RESEARCH_ANALYST, Role.PLANNER\n"
        "            ]\n"
        "        except Exception:\n"
        "            return False"
    )
    story.append(SP(8))

    story.append(H3("Code Sample 3 – LangGraph 7-Node Agent Graph (agent.py)"))
    story.append(P(
        "The Omni-Sentinel Agent is the autonomous optimization engine of SANKALP, "
        "built as a LangGraph state machine with 7 sequential nodes."
    ))
    story += code_block(
        "def _build_graph(self):\n"
        "    workflow = StateGraph(SentinelState)\n"
        "\n"
        "    # Register all 7 nodes\n"
        "    workflow.add_node('cyber_security_audit',  self.node_cyber_audit)\n"
        "    workflow.add_node('quarantine_watchdog',   self.node_quarantine_watchdog)\n"
        "    workflow.add_node('vision_pipeline_intake',self.node_vision_intake)\n"
        "    workflow.add_node('generative_planner',    self.node_generative_planner)\n"
        "    workflow.add_node('swarm_actuation_hub',   self.node_swarm_actuation_hub)\n"
        "    workflow.add_node('policy_drafter',        self.node_policy_drafter)\n"
        "    workflow.add_node('telemetry_logger',      self.node_telemetry_logger)\n"
        "\n"
        "    # Define execution graph\n"
        "    workflow.add_edge(START, 'cyber_security_audit')\n"
        "    workflow.add_conditional_edges(\n"
        "        'cyber_security_audit',\n"
        "        lambda state: 'quarantine_watchdog' if state['security_clearance'] else END\n"
        "    )\n"
        "    workflow.add_edge('quarantine_watchdog',    'vision_pipeline_intake')\n"
        "    workflow.add_edge('vision_pipeline_intake', 'generative_planner')\n"
        "    workflow.add_edge('generative_planner',     'swarm_actuation_hub')\n"
        "    workflow.add_edge('swarm_actuation_hub',    'policy_drafter')\n"
        "    workflow.add_edge('policy_drafter',         'telemetry_logger')\n"
        "    workflow.add_edge('telemetry_logger', END)\n"
        "    return workflow.compile()"
    )
    story.append(SP(6))
    node_data = [
        ["Node", "Name",                   "Function"],
        ["1",  "cyber_security_audit",     "SHA-256 payload hashing, buffer overflow detection, zero-trust clearance"],
        ["2",  "quarantine_watchdog",      "Memory anomaly detection, MLOps feed isolation"],
        ["3",  "vision_pipeline_intake",   "GeoTIFF raster sampling, OSM building morphology, live weather from Open-Meteo"],
        ["4",  "generative_planner",       "Iterative 5-cycle ONNX quad-model co-optimization (wind, UHI, albedo, HVAC)"],
        ["5",  "swarm_actuation_hub",      "Translates optimization results to IoT actuator commands (MQTT)"],
        ["6",  "policy_drafter",           "Synthesizes intervention mandate + generates ReportLab PDF dossier"],
        ["7",  "telemetry_logger",         "Logs ground truth data to MLOps retraining CSV queue"],
    ]
    story.append(make_table(node_data[0], node_data[1:], col_widths=[1.2*cm, 5*cm, 10.3*cm]))
    story.append(SP(8))

    story.append(H3("Code Sample 4 – Audit Logging Middleware (middleware.py)"))
    story.append(P("Every HTTP response is automatically logged to the SecurityLog table for audit traceability."))
    story += code_block(
        "class AuditLoggingMiddleware:\n"
        "    def process_response(self, request, response):\n"
        "        try:\n"
        "            user = request.user if hasattr(request, 'user') else None\n"
        "            auth_user = user if (user and user.is_authenticated) else None\n"
        "\n"
        "            if response.status_code == 401:\n"
        "                event = 'LOGIN_FAILED'\n"
        "            elif response.status_code == 403:\n"
        "                event = 'UNAUTHORIZED_ACCESS'\n"
        "            else:\n"
        "                return response\n"
        "\n"
        "            SecurityLog.objects.create(\n"
        "                event_type=event,\n"
        "                user=auth_user,\n"
        "                ip_address=self.get_client_ip(request),\n"
        "                path=request.path,\n"
        "                status_code=response.status_code,\n"
        "                details=f'Method: {request.method}'\n"
        "            )\n"
        "        except Exception:\n"
        "            pass\n"
        "        return response\n"
        "\n"
        "    def get_client_ip(self, request):\n"
        "        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')\n"
        "        if x_forwarded:\n"
        "            return x_forwarded.split(',')[0].strip()\n"
        "        return request.META.get('REMOTE_ADDR')"
    )

    for item in H2("4.3  Steps of Execution and Navigation"):
        story.append(item)
    story.append(H3("Step 1 – Installation and Setup"))
    story += code_block(
        "# Backend\n"
        "cd uhi_backend\n"
        "# Configure .env: SECRET_KEY, DEBUG=True, GEMINI_API_KEY\n"
        "pip install -r ../requirements.txt\n"
        "python manage.py makemigrations api\n"
        "python manage.py migrate\n"
        "python manage.py runserver\n"
        "\n"
        "# Frontend\n"
        "cd ../uhi_frontend\n"
        "npm install\n"
        "npm run dev\n"
        "# Access at: http://localhost:3000\n"
        "\n"
        "# Docker Production (full cluster)\n"
        "docker-compose up --build -d\n"
        "# Access at: http://localhost (Nginx on port 80)"
    )
    story.append(SP(8))

    story.append(H3("Step 2 – Application Navigation Flow"))
    nav = [
        ("1", "Open browser → http://localhost:3000"),
        ("2", "Login Screen → Enter credentials (e.g., planner / planner12345)"),
        ("3", "Main Dashboard → Interactive Leaflet heatmap loads. Select city, observe heat zone grid."),
        ("4", "Click on map point or enter coordinates manually."),
        ("5", "Analysis Panel opens: environmental data, ML prediction, SHAP chart."),
        ("6", "Click 'Get AI Recommendations' → LangGraph agent executes + Gemini returns text. Download Dossier PDF appears."),
        ("7", "(Optional) Export PDF Report with toggles for Wind / Groundwater / Aquifer / Socio-Thermal modules."),
        ("8", "(Analyst only) Dataset Upload → select file type → drag & drop → see VALIDATED / FAILED result."),
        ("9", "(Admin only) Security Logs → paginated event table."),
    ]
    for step, desc in nav:
        story.append(Paragraph(f"<b>Step {step}:</b> {desc}", ST["bullet"]))
    story.append(SP(10))

    story.append(H3("Table 4.2 – Key API Endpoints"))
    ep_data = [
        ["Method", "Endpoint",                   "Auth", "Role",        "Description"],
        ["POST",   "/api/register/",             "No",   "—",           "User registration"],
        ["POST",   "/api/token/",                "No",   "—",           "JWT login"],
        ["POST",   "/api/token/refresh/",        "No",   "—",           "Refresh JWT token"],
        ["GET",    "/api/user/profile/",         "Yes",  "Any",         "Get current user profile"],
        ["POST",   "/api/analyze/",              "No",   "—",           "UHI coordinate analysis"],
        ["GET",    "/api/heat-zones/",           "No",   "—",           "Cached heat zone grid"],
        ["GET",    "/api/wards-boundary/",       "No",   "—",           "Ward boundary GeoJSON"],
        ["GET",    "/api/boundary/",             "No",   "—",           "City boundary GeoJSON"],
        ["POST",   "/api/recommendations/",      "No",   "—",           "Gemini + Agent recommendations"],
        ["GET",    "/api/dossier/<filename>/",   "No",   "—",           "Download PDF dossier"],
        ["POST",   "/api/export-report/",        "Yes",  "Planner+",    "Export PDF report"],
        ["POST",   "/api/datasets/",             "Yes",  "Analyst+",    "Upload & validate dataset"],
        ["GET",    "/api/dashboard/",            "Yes",  "Any auth",    "Dashboard statistics"],
        ["GET",    "/api/security-logs/",        "Yes",  "Admin",       "Security audit logs"],
        ["POST",   "/api/aquifer/simulate/",     "Yes",  "Any auth",    "Aquifer recharge simulation"],
        ["GET/POST","/api/aquifer/plans/",       "Yes",  "Planner+",    "Manage aquifer plans"],
        ["GET",    "/api/aquifer/hotspots/",     "Yes",  "Any auth",    "Groundwater hotspot cities"],
    ]
    story.append(make_table(ep_data[0], ep_data[1:], col_widths=[1.5*cm, 5.2*cm, 1.3*cm, 2.5*cm, 6*cm]))
    story.append(PB())
    return story

# ─────────────────────────────────────────────
# CHAPTER 5
# ─────────────────────────────────────────────
def build_chapter5():
    story = []
    story.append(H1("CHAPTER 5: CONCLUSION"))
    story.append(SP(6))

    for item in H2("5.1  Importance of the Worked-Out Tasks"):
        story.append(item)
    story.append(P(
        "<b>SANKALP</b> represents a significant step forward in making satellite-derived environmental "
        "intelligence accessible to urban planning authorities in India. The platform demonstrates that it "
        "is feasible — and highly practical — to combine remote sensing, machine learning, explainable AI, "
        "and generative AI into a single, role-aware, production-deployable web system. Key achievements:"
    ))
    achievements = [
        "<b>Scientific Data Integrity:</b> Every prediction is grounded in real, validated GeoTIFF rasters from Landsat 8. No synthetic or dummy data is used at any point, guaranteeing output usable in real planning decisions.",
        "<b>Explainable AI (XAI):</b> SHAP explanations mean city planners with no ML background can understand why a location is a heat island — critical for public trust and policy acceptance.",
        "<b>Autonomous Optimization:</b> The 7-node LangGraph Omni-Sentinel Agent performs iterative multi-physics simulation across wind, albedo, LST, and energy dimensions to converge on an optimal intervention mandate, quantifying energy savings in MWh.",
        "<b>RBAC Security:</b> JWT-based role system with audit logging ensures sensitive operations are protected by design. The audit middleware provides a tamper-evident trail of all system events.",
        "<b>Practical Deployability:</b> Docker Compose containerization means the full platform can be deployed on any server in a single command, viable for municipal IT departments with limited DevOps capacity.",
        "<b>Multi-city Scalability:</b> The dynamic city prefix architecture scales to any Indian city for which validated raster data exists, without code changes.",
    ]
    story += B(achievements)

    for item in H2("5.2  Further Enhancement in Future"):
        story.append(item)
    enhancements = [
        "<b>Real-time Satellite Integration:</b> Replace static GeoTIFFs with a live Google Earth Engine streaming pipeline for near-real-time LST updates (every 16-day Landsat overpass cycle).",
        "<b>Time-Series Analysis:</b> Temporal analysis to show year-over-year UHI intensity changes (2015–2025), enabling trend forecasting.",
        "<b>Mobile Application:</b> React Native mobile app for field use by urban inspectors, allowing GPS-triggered UHI analysis from a handheld device.",
        "<b>Physical IoT Integration:</b> Connect ESP32 swarm actuation commands to actual deployed sensor networks in smart city pilot zones (e.g., GIFT City, Ahmedabad).",
        "<b>PostGIS Spatial Queries:</b> Migrate boundary containment logic from Shapely in-memory to PostGIS ST_Contains queries for better performance at scale.",
        "<b>Federated Learning for MLOps:</b> Federated learning pipeline so multiple city deployments can collectively improve the XGBoost model without sharing raw location data.",
        "<b>LSTM Time-series Forecasting:</b> LSTM model to predict LST and NDVI for the next 30/60/90 days based on historical trends and weather forecast data.",
        "<b>National City Expansion:</b> Extend validated raster coverage to all 50 Indian cities with populations above 1 million.",
        "<b>Regulatory Report Templates:</b> MOEF and Smart Cities Mission compliant PDF templates for direct submission to government portals.",
    ]
    story += B(enhancements)
    story.append(PB())
    return story

# ─────────────────────────────────────────────
# CHAPTER 6
# ─────────────────────────────────────────────
def build_chapter6():
    story = []
    story.append(H1("CHAPTER 6: REFERENCES"))
    story.append(SP(6))
    for item in H2("6.1  Books, Research Papers, Experts, Technology, Webs"):
        story.append(item)

    story.append(H3("Research Papers"))
    refs = [
        "Voogt, J.A., & Oke, T.R. (2003). Thermal remote sensing of urban climates. <i>Remote Sensing of Environment</i>, 86(3), 370–384.",
        "Weng, Q. (2009). Thermal infrared remote sensing for urban climate and environmental studies. <i>ISPRS Journal of Photogrammetry and Remote Sensing</i>, 64(4), 335–344.",
        "Arnfield, A.J. (2003). Two decades of urban climate research: A review of turbulence, exchanges of energy and water, and the urban heat island. <i>International Journal of Climatology</i>, 23(1), 1–26.",
        "Mohajerani, A., et al. (2017). The urban heat island effect, its causes, and mitigation. <i>Journal of Environmental Management</i>, 197, 522–538.",
        "Chen, T., & Guestrin, C. (2016). XGBoost: A Scalable Tree Boosting System. <i>Proceedings of ACM SIGKDD</i>, 785–794.",
        "Lundberg, S.M., & Lee, S.I. (2017). A unified approach to interpreting model predictions (SHAP). <i>Advances in Neural Information Processing Systems</i>, 30.",
        "Rodell, M., et al. (2018). Emerging Trends in Global Freshwater Availability (GRACE). <i>Nature</i>, 557(7707), 651–659.",
    ]
    for i, ref in enumerate(refs, 1):
        story.append(Paragraph(f"[{i}]  {ref}", ST["bullet"]))

    story.append(SP(8))
    story.append(H3("Technology Documentation"))
    tech_refs = [
        "[8]  Django Software Foundation. (2024). <i>Django 5.0 Documentation.</i> https://docs.djangoproject.com/",
        "[9]  Vercel Inc. (2024). <i>Next.js 14 Documentation.</i> https://nextjs.org/docs/",
        "[10] LangChain Inc. (2024). <i>LangGraph Documentation.</i> https://langchain-ai.github.io/langgraph/",
        "[11] Microsoft. (2024). <i>ONNX Runtime Documentation.</i> https://onnxruntime.ai/docs/",
        "[12] Google. (2024). <i>Gemini API Documentation.</i> https://ai.google.dev/docs/",
        "[13] Leaflet Contributors. (2024). <i>Leaflet.js 1.9 Documentation.</i> https://leafletjs.com/",
        "[14] Gillies, S. (2024). <i>Rasterio Documentation.</i> https://rasterio.readthedocs.io/",
        "[15] SHAP Contributors. (2024). <i>SHAP Library Documentation.</i> https://shap.readthedocs.io/",
    ]
    for ref in tech_refs:
        story.append(Paragraph(ref, ST["bullet"]))

    story.append(SP(8))
    story.append(H3("Data Sources"))
    data_refs = [
        "[16] USGS / NASA. <i>Landsat 8 OLI/TIRS Collection 2 — LST Product.</i> https://earthexplorer.usgs.gov/",
        "[17] NASA JPL. <i>SRTM Digital Elevation Model — 30m Resolution.</i> https://www2.jpl.nasa.gov/srtm/",
        "[18] CSR, University of Texas. <i>GRACE RL06 Terrestrial Water Storage Anomaly.</i> http://www2.csr.utexas.edu/grace/",
        "[19] OpenStreetMap Contributors. (2024). <i>OpenStreetMap Data.</i> https://www.openstreetmap.org/",
        "[20] Open-Meteo. (2024). <i>Free Weather Forecast API.</i> https://open-meteo.com/",
    ]
    for ref in data_refs:
        story.append(Paragraph(ref, ST["bullet"]))

    story.append(SP(8))
    story.append(H3("Institutional References"))
    inst_refs = [
        "[21] BISAG-N. <i>Urban Heat Island Research Programme.</i> https://bisag-n.gov.in/",
        "[22] Smart Cities Mission, MoHUA, Govt. of India. <i>Smart Cities Mission Guidelines.</i> https://smartcities.gov.in/",
        "[23] ISRO / National Remote Sensing Centre. <i>Urban Climate Change Datasets.</i> https://nrsc.gov.in/",
    ]
    for ref in inst_refs:
        story.append(Paragraph(ref, ST["bullet"]))

    return story

# ─────────────────────────────────────────────
# ASSEMBLE AND BUILD
# ─────────────────────────────────────────────
def build_pdf():
    doc = BaseDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=2.2*cm,
        bottomMargin=2.0*cm,
    )

    # Cover page frame (no header/footer)
    cover_frame = Frame(MARGIN, 2.0*cm, PAGE_W - 2*MARGIN, PAGE_H - 4.2*cm, id="cover")
    # Normal page frame
    body_frame  = Frame(MARGIN, 2.0*cm, PAGE_W - 2*MARGIN, PAGE_H - 4.5*cm, id="body")

    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[cover_frame], onPage=make_cover_footer),
        PageTemplate(id="Normal", frames=[body_frame],  onPage=make_header_footer),
    ])

    story = []
    story += build_cover()
    # Switch to Normal template for all subsequent pages
    from reportlab.platypus import NextPageTemplate
    story.append(NextPageTemplate("Normal"))

    story += build_acknowledgment()
    story += build_abstract()
    story += build_index()
    story += build_list_of_figures()
    story += build_list_of_tables()
    story += build_chapter1()
    story += build_chapter2()
    story += build_chapter3()
    story += build_chapter4()
    story += build_chapter5()
    story += build_chapter6()

    doc.build(story)
    print(f"PDF generated successfully: {OUTPUT_PATH}")

if __name__ == "__main__":
    build_pdf()
