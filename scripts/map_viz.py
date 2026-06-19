"""
Species distribution map visualization.
Generates a publication-quality static PNG (Cartopy + matplotlib) and an interactive HTML (folium).

Usage:
  python scripts/map_viz.py --csv data.csv --species "Panthera tigris" --output-dir public/maps
  python scripts/map_viz.py --csv data.csv --species-column scientificName --output-dir public/maps
"""

import argparse, sys, os, json, warnings
warnings.filterwarnings("ignore")

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd


# Distinct, colorblind-friendly palette for multi-species maps
_SPECIES_COLORS = [
    "#2d6a4f",  # forest green
    "#1d3557",  # navy
    "#e63946",  # red
    "#f4a261",  # orange
    "#2a9d8f",  # teal
    "#9b2226",  # dark red
    "#606c38",  # olive
    "#8338ec",  # purple
]


def _find_coordinate_columns(df):
    lat_col = next((c for c in df.columns if c.lower() in ("decimallatitude", "lat", "latitude")), None)
    lng_col = next((c for c in df.columns if c.lower() in ("decimallongitude", "lng", "long", "longitude")), None)
    return lat_col, lng_col


def generate_maps(csv_path: str, species_names: list[str], species_column: str | None, output_dir: str) -> dict:
    """Generate both static PNG (Cartopy) and interactive HTML (folium)."""
    df = pd.read_csv(csv_path)

    lat_col, lng_col = _find_coordinate_columns(df)
    if not lat_col or not lng_col:
        return {"error": f"No coordinate columns found. Available: {list(df.columns)}"}

    # Determine species grouping column
    if species_column and species_column in df.columns:
        group_col = species_column
    elif "scientificName" in df.columns:
        group_col = "scientificName"
    else:
        group_col = None

    # Filter to requested species names when provided
    if species_names:
        if group_col:
            df = df[df[group_col].isin(species_names)]
        # If no group column, we cannot filter; fall through

    valid = df[[lat_col, lng_col]].dropna()
    if len(valid) == 0:
        return {"error": "No valid coordinates"}

    lats = valid[lat_col].values
    lngs = valid[lng_col].values
    center_lat, center_lng = float(lats.mean()), float(lngs.mean())

    # Determine species groups for coloring
    if group_col and group_col in df.columns:
        species_groups = sorted(df[group_col].dropna().unique().tolist())
    else:
        species_groups = species_names[:1] if species_names else ["Unknown"]

    base = os.path.splitext(os.path.basename(csv_path))[0]
    png_path = os.path.join(output_dir, f"{base}.png")
    html_path = os.path.join(output_dir, f"{base}.html")

    title = _build_title(species_names, species_groups, len(valid))

    # Static PNG with Cartopy (publication-quality)
    _generate_static_png(df, lats, lngs, lat_col, lng_col, species_groups, group_col, title, png_path)

    # Interactive HTML with folium
    _generate_folium_html(df, lats, lngs, lat_col, lng_col, species_groups, group_col, title, html_path, center_lat, center_lng)

    return {"png": png_path, "html": html_path, "count": len(valid), "center": [center_lat, center_lng]}


def _build_title(requested_names, groups, count):
    if requested_names and len(requested_names) == 1 and not groups:
        return f"{requested_names[0]}\n{count:,} occurrence records"
    if len(groups) == 1:
        return f"{groups[0]}\n{count:,} occurrence records"
    names_str = ", ".join(groups[:5])
    if len(groups) > 5:
        names_str += f" (+{len(groups) - 5} more)"
    return f"{names_str}\n{count:,} occurrence records"


def _color_for_index(i):
    return _SPECIES_COLORS[i % len(_SPECIES_COLORS)]


def _generate_static_png(df, lats, lngs, lat_col, lng_col, species_groups, group_col, title, path):
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
        ax.add_feature(cfeature.LAND, facecolor="#f5f0e8", edgecolor="none", zorder=1)
        ax.add_feature(cfeature.OCEAN, facecolor="#d4e6f1", edgecolor="none", zorder=0)
        ax.add_feature(cfeature.COASTLINE, edgecolor="#8b8b8b", linewidth=0.4, zorder=2)
        gl = ax.gridlines(draw_labels=True, linewidth=0.2, color="#999999", alpha=0.5, linestyle="--")
        gl.top_labels = False; gl.right_labels = False
        gl.xlabel_style = {"size": 7, "color": "#666666"}
        gl.ylabel_style = {"size": 7, "color": "#666666"}

        if group_col and len(species_groups) > 1:
            for i, species in enumerate(species_groups):
                color = _color_for_index(i)
                sub = df[df[group_col] == species]
                sub_lats = sub[lat_col].dropna().values
                sub_lngs = sub[lng_col].dropna().values
                ax.scatter(sub_lngs, sub_lats, c=color, s=6, alpha=0.6, edgecolors="none", linewidth=0,
                           transform=ccrs.PlateCarree(), zorder=3, label=species)
                ax.scatter(sub_lngs, sub_lats, c=color, s=2, alpha=0.9, edgecolors="none", linewidth=0,
                           transform=ccrs.PlateCarree(), zorder=4)
            ax.legend(loc="lower left", fontsize=8, framealpha=0.9, title="Species")
        else:
            ax.scatter(lngs, lats, c="#2d6a4f", s=6, alpha=0.6, edgecolors="none", linewidth=0,
                       transform=ccrs.PlateCarree(), zorder=3)
            ax.scatter(lngs, lats, c="#40916c", s=2, alpha=0.9, edgecolors="none", linewidth=0,
                       transform=ccrs.PlateCarree(), zorder=4)

        ax.set_global()
    else:
        ax = fig.add_subplot(111)
        try:
            import geopandas as gpd
            world = gpd.read_dataset("naturalearth.land", scale="50m")
            world.plot(ax=ax, color="#f5f0e8", edgecolor="#c0b9a8", linewidth=0.3)
        except Exception:
            pass

        if group_col and len(species_groups) > 1:
            for i, species in enumerate(species_groups):
                color = _color_for_index(i)
                sub = df[df[group_col] == species]
                sub_lats = sub[lat_col].dropna().values
                sub_lngs = sub[lng_col].dropna().values
                ax.scatter(sub_lngs, sub_lats, c=color, s=6, alpha=0.5, edgecolors="none", linewidth=0, label=species)
            ax.legend(loc="lower left", fontsize=8)
        else:
            ax.scatter(lngs, lats, c="#2d6a4f", s=6, alpha=0.5, edgecolors="none", linewidth=0)
            ax.scatter(lngs, lats, c="#40916c", s=2, alpha=0.8, edgecolors="none", linewidth=0)

        ax.set_xlim(lngs.min() - 5, lngs.max() + 5)
        ax.set_ylim(lats.min() - 5, lats.max() + 5)
        ax.set_aspect("auto")
        ax.grid(True, alpha=0.2, linestyle="--", linewidth=0.5)
        ax.set_xlabel("Longitude", fontsize=9, color="#6b7280")
        ax.set_ylabel("Latitude", fontsize=9, color="#6b7280")

    ax.set_title(title, fontsize=13, fontweight="bold", color="#1b4332", pad=10)
    plt.tight_layout()
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor="white", edgecolor="none")
    plt.close(fig)


def _generate_folium_html(df, lats, lngs, lat_col, lng_col, species_groups, group_col, title, path, center_lat, center_lng):
    """Interactive map with marker clusters and per-species layers."""
    import folium
    from folium.plugins import Fullscreen, MarkerCluster

    m = folium.Map(location=[center_lat, center_lng], zoom_start=4, tiles="CartoDB positron", control_scale=True)
    Fullscreen().add_to(m)

    if group_col and len(species_groups) > 1:
        for i, species in enumerate(species_groups):
            color = _color_for_index(i)
            sub = df[df[group_col] == species]
            sub_lats = sub[lat_col].dropna().values
            sub_lngs = sub[lng_col].dropna().values
            cluster = MarkerCluster(name=f"{species} ({len(sub_lats)} records)")
            for lat, lng in zip(sub_lats, sub_lngs):
                folium.CircleMarker(
                    location=[lat, lng], radius=3, color=color,
                    fill=True, fillColor=color, fillOpacity=0.7, weight=0.5,
                ).add_to(cluster)
            cluster.add_to(m)
    else:
        cluster = MarkerCluster(name=f"{species_groups[0] if species_groups else 'Species'} ({len(lats)} records)")
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
    parser.add_argument("--species", action="append", default=[], help="Species name (can be repeated)")
    parser.add_argument("--species-column", default=None, help="Column to group/color multiple species")
    parser.add_argument("--output-dir", default="public/maps")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)
    result = generate_maps(args.csv, args.species, args.species_column, args.output_dir)

    if "error" in result:
        print(json.dumps(result))
        sys.exit(1)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
