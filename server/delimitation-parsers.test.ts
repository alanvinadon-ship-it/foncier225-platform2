import { describe, it, expect, beforeAll } from "vitest";
import { JSDOM } from "jsdom";

// Provide DOMParser in Node environment
let DOMParserImpl: typeof DOMParser;
beforeAll(() => {
  const { window } = new JSDOM("");
  DOMParserImpl = window.DOMParser as any;
});

// We extract the parsing logic into testable pure functions
// These mirror the parseGPX and parseCSV logic in DelimitationVillageoise.tsx

interface BoundaryPoint {
  number: number;
  lat: number;
  lng: number;
  landmark: string;
}

function parseGPX(content: string): BoundaryPoint[] {
  const parser = new DOMParserImpl();
  const doc = parser.parseFromString(content, "application/xml");
  const points: BoundaryPoint[] = [];

  const waypoints = doc.querySelectorAll("wpt");
  waypoints.forEach((wpt) => {
    const lat = parseFloat(wpt.getAttribute("lat") || "");
    const lng = parseFloat(wpt.getAttribute("lon") || "");
    const name = wpt.querySelector("name")?.textContent || "";
    const desc = wpt.querySelector("desc")?.textContent || "";
    if (!isNaN(lat) && !isNaN(lng)) {
      points.push({ number: 0, lat, lng, landmark: name || desc || "Waypoint" });
    }
  });

  if (points.length === 0) {
    const trkpts = doc.querySelectorAll("trkpt");
    trkpts.forEach((trkpt) => {
      const lat = parseFloat(trkpt.getAttribute("lat") || "");
      const lng = parseFloat(trkpt.getAttribute("lon") || "");
      const name = trkpt.querySelector("name")?.textContent || "";
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({ number: 0, lat, lng, landmark: name || "Track point" });
      }
    });
  }

  if (points.length === 0) {
    const rtepts = doc.querySelectorAll("rtept");
    rtepts.forEach((rtept) => {
      const lat = parseFloat(rtept.getAttribute("lat") || "");
      const lng = parseFloat(rtept.getAttribute("lon") || "");
      const name = rtept.querySelector("name")?.textContent || "";
      if (!isNaN(lat) && !isNaN(lng)) {
        points.push({ number: 0, lat, lng, landmark: name || "Route point" });
      }
    });
  }

  return points;
}

function parseCSV(content: string): BoundaryPoint[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error("Le fichier CSV doit contenir au moins un en-tête et une ligne de données.");

  const header = lines[0].toLowerCase().split(/[,;\t]/).map((h) => h.trim());
  const latIdx = header.findIndex((h) => ["lat", "latitude", "y"].includes(h));
  const lngIdx = header.findIndex((h) => ["lng", "lon", "longitude", "long", "x"].includes(h));
  const descIdx = header.findIndex((h) => ["description", "desc", "name", "nom", "landmark", "repere", "repère"].includes(h));

  if (latIdx === -1 || lngIdx === -1) {
    throw new Error("Colonnes 'lat' et 'lng' (ou 'latitude'/'longitude') requises dans l'en-tête.");
  }

  const points: BoundaryPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;\t]/).map((c) => c.trim());
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    const desc = descIdx !== -1 ? cols[descIdx] || `Point ${i}` : `Point ${i}`;

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      points.push({ number: 0, lat, lng, landmark: desc });
    }
  }

  return points;
}

describe("parseGPX", () => {
  it("should parse waypoints from a valid GPX file", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="5.3600" lon="-4.0083">
    <name>Borne A</name>
    <desc>Arbre baobab</desc>
  </wpt>
  <wpt lat="5.3610" lon="-4.0073">
    <name>Borne B</name>
  </wpt>
  <wpt lat="5.3620" lon="-4.0063">
    <desc>Rivière</desc>
  </wpt>
  <wpt lat="5.3630" lon="-4.0053">
  </wpt>
</gpx>`;

    const points = parseGPX(gpx);
    expect(points).toHaveLength(4);
    expect(points[0].lat).toBe(5.36);
    expect(points[0].lng).toBe(-4.0083);
    expect(points[0].landmark).toBe("Borne A");
    expect(points[2].landmark).toBe("Rivière");
    expect(points[3].landmark).toBe("Waypoint");
  });

  it("should parse track points when no waypoints exist", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk>
    <trkseg>
      <trkpt lat="5.3600" lon="-4.0083"><name>T1</name></trkpt>
      <trkpt lat="5.3610" lon="-4.0073"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

    const points = parseGPX(gpx);
    expect(points).toHaveLength(2);
    expect(points[0].landmark).toBe("T1");
    expect(points[1].landmark).toBe("Track point");
  });

  it("should parse route points when no waypoints or trackpoints exist", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <rte>
    <rtept lat="5.3600" lon="-4.0083"><name>R1</name></rtept>
    <rtept lat="5.3610" lon="-4.0073"></rtept>
  </rte>
</gpx>`;

    const points = parseGPX(gpx);
    expect(points).toHaveLength(2);
    expect(points[0].landmark).toBe("R1");
    expect(points[1].landmark).toBe("Route point");
  });

  it("should return empty array for invalid GPX", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?><gpx></gpx>`;
    const points = parseGPX(gpx);
    expect(points).toHaveLength(0);
  });

  it("should skip points with invalid coordinates", () => {
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <wpt lat="abc" lon="-4.0083"><name>Bad</name></wpt>
  <wpt lat="5.36" lon="-4.0083"><name>Good</name></wpt>
</gpx>`;

    const points = parseGPX(gpx);
    expect(points).toHaveLength(1);
    expect(points[0].landmark).toBe("Good");
  });
});

describe("parseCSV", () => {
  it("should parse a valid CSV with lat,lng,description columns", () => {
    const csv = `lat,lng,description
5.3600,-4.0083,Borne A
5.3610,-4.0073,Borne B
5.3620,-4.0063,Rivière
5.3630,-4.0053,Maison du chef`;

    const points = parseCSV(csv);
    expect(points).toHaveLength(4);
    expect(points[0].lat).toBe(5.36);
    expect(points[0].lng).toBe(-4.0083);
    expect(points[0].landmark).toBe("Borne A");
    expect(points[3].landmark).toBe("Maison du chef");
  });

  it("should handle alternative column names (latitude, longitude, name)", () => {
    const csv = `latitude;longitude;name
5.3600;-4.0083;Point Alpha
5.3610;-4.0073;Point Beta`;

    const points = parseCSV(csv);
    expect(points).toHaveLength(2);
    expect(points[0].landmark).toBe("Point Alpha");
  });

  it("should handle CSV without description column", () => {
    const csv = `lat,lng
5.3600,-4.0083
5.3610,-4.0073`;

    const points = parseCSV(csv);
    expect(points).toHaveLength(2);
    expect(points[0].landmark).toBe("Point 1");
    expect(points[1].landmark).toBe("Point 2");
  });

  it("should throw error for missing lat/lng columns", () => {
    const csv = `x_coord,y_coord,name
5.3600,-4.0083,Test`;

    // x and y are valid column names for lat/lng
    // But "x_coord" and "y_coord" are not
    expect(() => parseCSV(csv)).toThrow("Colonnes 'lat' et 'lng'");
  });

  it("should throw error for empty CSV (header only)", () => {
    const csv = `lat,lng`;
    expect(() => parseCSV(csv)).toThrow("au moins un en-tête et une ligne");
  });

  it("should skip rows with invalid coordinates", () => {
    const csv = `lat,lng,description
5.3600,-4.0083,Valid
abc,def,Invalid
999,-999,Out of range
5.3610,-4.0073,Also valid`;

    const points = parseCSV(csv);
    expect(points).toHaveLength(2);
    expect(points[0].landmark).toBe("Valid");
    expect(points[1].landmark).toBe("Also valid");
  });

  it("should handle Windows line endings (CRLF)", () => {
    const csv = "lat,lng,description\r\n5.3600,-4.0083,Borne A\r\n5.3610,-4.0073,Borne B";
    const points = parseCSV(csv);
    expect(points).toHaveLength(2);
  });

  it("should handle tab-separated values", () => {
    const csv = "lat\tlng\tdescription\n5.3600\t-4.0083\tBorne A\n5.3610\t-4.0073\tBorne B";
    const points = parseCSV(csv);
    expect(points).toHaveLength(2);
    expect(points[0].landmark).toBe("Borne A");
  });
});
