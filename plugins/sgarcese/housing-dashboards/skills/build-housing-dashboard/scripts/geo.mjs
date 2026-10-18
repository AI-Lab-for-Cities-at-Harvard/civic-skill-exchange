// Project county outlines (us-atlas, Census cartographic boundaries) and property points for the dashboard map.
// Usage: node geo.mjs <geo_in.json> <geo_out.json> <node_modules dir>
import fs from 'fs';
import path from 'path';
import {pathToFileURL} from 'url';
const [inp, outp, mods] = process.argv.slice(2);
const imp = async (p) => import(pathToFileURL(path.join(mods, p)).href);
const {feature, mesh, neighbors} = await imp('topojson-client/src/index.js');
const {geoConicConformal, geoPath} = await imp('d3-geo/src/index.js');
const topo = JSON.parse(fs.readFileSync(path.join(mods, 'us-atlas/counties-10m.json')));
const cin = JSON.parse(fs.readFileSync(inp));
const geoms = topo.objects.counties.geometries;
const all = feature(topo, topo.objects.counties).features;
const ring = new Set(cin.ring);
const nb = neighbors(geoms);
const ctx = new Set();
geoms.forEach((g, i) => { if (ring.has(g.id)) nb[i].forEach(j => ctx.add(geoms[j].id)); });
const feats = all.filter(f => ring.has(f.id) || ctx.has(f.id));
const ringFC = {type: 'FeatureCollection', features: all.filter(f => ring.has(f.id))};
const W = 640;
const b = geoPath().bounds(ringFC); const midLat = (b[0][1] + b[1][1]) / 2, midLon = (b[0][0] + b[1][0]) / 2;
const proj0 = geoConicConformal().parallels([midLat - 1, midLat + 1]).rotate([-midLon, 0]);
const pb = geoPath(proj0.fitWidth(W - 20, ringFC)).bounds(ringFC);
const H = Math.max(300, Math.min(560, Math.round((pb[1][1] - pb[0][1]) + 20)));
const proj = geoConicConformal().parallels([midLat - 1, midLat + 1]).rotate([-midLon, 0]).fitExtent([[10, 10], [W - 10, H - 10]], ringFC);
const gp = geoPath(proj).digits(1);
const st = new Set(feats.map(f => f.id.slice(0, 2)));
const states = mesh(topo, topo.objects.states, (a, b) => a !== b && st.has(a.id) && st.has(b.id));
const out = {W, H, stateLine: gp(states), counties: feats.map(f => ({id: f.id, name: f.properties.name, ring: ring.has(f.id), focus: f.id === cin.focus, d: gp(f), c: geoPath(proj).centroid(f).map(v => +v.toFixed(1))})),
  points: cin.points.map(p => { const xy = proj([p.lon, p.lat]); return xy ? {...p, x: +xy[0].toFixed(1), y: +xy[1].toFixed(1)} : null; }).filter(Boolean)};
fs.writeFileSync(outp, JSON.stringify(out));
