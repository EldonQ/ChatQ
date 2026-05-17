"""
Species distribution map visualization.
Generates a publication-quality static PNG (Cartopy + matplotlib) and an interactive HTML (folium).

Usage: python scripts/map_viz.py --csv data.csv --species "Panthera tigris" --output-dir public/maps
"""

import argparse, sys, os, json, warnings
warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd


def generate_maps(csv_path: str, species_name: str, output_dir: str) -> dict:
    """Generate both static PNG (Cartopy) and interactive HTML (folium)."""
    df = pd.read_csv(csv_path)

    lat_col = next((c for c in df.columns if c.lower() in ("decimallatitude", "lat", "latitude")), None)
    lng_col = next((c for c in df.columns if c.lower() in ("decimallongitude", "lng", "long", "longitude")), None)

    if not lat_col or not lng_col:
        return {"error": f"No coordinate columns found. Available: {list(df.columns)}"}

    valid = df[[lat_col, lng_col]].dropna()
    if len(valid) == 0:
        return {"error": "No valid coordinates"}

    lats = valid[lat_col].values
    lngs = valid[lng_col].values
    center_lat, center_lng = float(lats.mean()), float(lngs.mean())

    base = os.path.splitext(os.path.basename(csv_path))[0]
    png_path = os.path.join(output_dir, f"{base}.png")
    html_path = os.path.join(output_dir, f"{base}.html")

    # Static PNG with Cartopy (publication-quality)
    _generate_static_png(lats, lngs, species_name, png_path)

    # Interactive HTML with folium
    _generate_folium_html(lats, lngs, species_name, html_path, center_lat, center_lng)

    return {"png": png_path, "html": html_path, "count": len(valid), "center": [center_lat, center_lng]}


def _generate_static_png(lats, lngs, species, path):
    """Publication-quality static map using Cartopy with Robinson projection."""
    try:
        import cartopy.crs as ccrs
        import cartopy.feature as cfeature
        HAS_CARTOPY = True
    except ImportError:
        HAS_CARTOPY = False

    fig = plt.figure(figsize=(14, 8), dpi=150)

    if HAS_CARTOPY:
        ax = fig.add_subplot(111, projection=ccrs.Robinson(central_longitude=0))
        # Land and ocean
        ax.add_feature(cfeature.LAND, facecolor="#f5f0e8", edgecolor="none", zorder=1)
        ax.add_feature(cfeature.OCEAN, facecolor="#d4e6f1", edgecolor="none", zorder=0)
        ax.add_feature(cfeature.COASTLINE, edgecolor="#8b8b8b", linewidth=0.4, zorder=2)
        # Gridlines
        gl = ax.gridlines(draw_labels=True, linewidth=0.2, color="#999999", alpha=0.5, linestyle="--")
        gl.top_labels = False; gl.right_labels = False
        gl.xlabel_style = {"size": 7, "color": "#666666"}
        gl.ylabel_style = {"size": 7, "color": "#666666"}
        # Scatter
        ax.scatter(lngs, lats, c="#2d6a4f", s=6, alpha=0.6, edgecolors="none", linewidth=0, transform=ccrs.PlateCarree(), zorder=3)
        ax.scatter(lngs, lats, c="#40916c", s=2, alpha=0.9, edgecolors="none", linewidth=0, transform=ccrs.PlateCarree(), zorder=4)
        ax.set_global()
    else:
        ax = fig.add_subplot(111)
        try:
            import geopandas as gpd
            world = gpd.read_dataset("naturalearth.land", scale="50m")
            world.plot(ax=ax, color="#f5f0e8", edgecolor="#c0b9a8", linewidth=0.3)
        except Exception:
            pass
        ax.scatter(lngs, lats, c="#2d6a4f", s=6, alpha=0.5, edgecolors="none", linewidth=0)
        ax.scatter(lngs, lats, c="#40916c", s=2, alpha=0.8, edgecolors="none", linewidth=0)
        ax.set_xlim(lngs.min() - 5, lngs.max() + 5)
        ax.set_ylim(lats.min() - 5, lats.max() + 5)
        ax.set_aspect("auto")
        ax.grid(True, alpha=0.2, linestyle="--", linewidth=0.5)
        ax.set_xlabel("Longitude", fontsize=9, color="#6b7280")
        ax.set_ylabel("Latitude", fontsize=9, color="#6b7280")

    ax.set_title(f"{species}\n{len(lats):,} occurrence records",
                 fontsize=13, fontweight="bold", color="#1b4332", pad=10)
    plt.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white", edgecolor="none")
    plt.close(fig)


def _generate_folium_html(lats, lngs, species, path, center_lat, center_lng):
    """Interactive map with marker clusters."""
    import folium
    from folium.plugins import Fullscreen, MarkerCluster

    m = folium.Map(location=[center_lat, center_lng], zoom_start=4, tiles="CartoDB positron", control_scale=True)
    Fullscreen().add_to(m)

    cluster = MarkerCluster(name=f"{species} ({len(lats)} records)")
    for lat, lng in zip(lats, lngs):
        folium.CircleMarker(
            location=[lat, lng], radius=3, color="#2d6a4f",
            fill=True, fillColor="#40916c", fillOpacity=0.7, weight=0.5,
        ).add_to(cluster)
    cluster.add_to(m)
    folium.LayerControl().add_to(m)
    m.save(path)


def main():
    parser = argparse.ArgumentParser(description="Generate species distribution map")
    parser.add_argument("--csv", required=True)
    parser.add_argument("--species", required=True)
    parser.add_argument("--output-dir", default="public/maps")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    result = generate_maps(args.csv, args.species, args.output_dir)

    if "error" in result:
        print(json.dumps(result))
        sys.exit(1)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
