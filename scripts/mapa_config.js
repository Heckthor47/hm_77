// --- map_config.js ---
// Configuración inicial del mapa y creación de la fuente/capa de calles única
const map = new maplibregl.Map({
  container: "map",
  style: "https://www.datosgeoespaciales.atdt.gob.mx/api/style_white.json",
  center: [-99.1332, 19.4326],
  zoom: 5
});

let estadosGeoJson = null;
let bboxNacional = null;
let geocoder = null;

map.on("load", () => {
  // 1) Carga de entidades GeoJSON
  fetch("https://fabulous-dodol-d03b96.netlify.app/entidades.geojson")
    .then(r => r.json())
    .then(data => {
      estadosGeoJson = data;
      bboxNacional = turf.bbox(estadosGeoJson);
    })
    .catch(err => console.error("Error al cargar entidades:", err));

  // 2) Capas de homicidios
  map.addSource("homicidios", {
    type: "geojson",
    data: "https://fabulous-dodol-d03b96.netlify.app/homicidios.geojson"
  });
  map.addLayer({
    id: "homicidios-layer",
    type: "circle",
    source: "homicidios",
    paint: {
      "circle-radius": 3,
      "circle-color": "#F9EFA5",
      "circle-opacity": 0.8,
      "circle-stroke-color": "black",
      "circle-stroke-width": 1
    },
    filter: ["==", "CVE_ENT", ""]
  });
  map.setLayoutProperty("homicidios-layer", "visibility", "none");
  document.getElementById("toggle-homicidios").checked = false;

  // 3) Capas de parques
  map.addSource("parques", {
    type: "geojson",
    data: "https://fabulous-dodol-d03b96.netlify.app/parques.geojson"
  });
  map.loadImage('imagenes/tree-fill.png', (error, image) => {
    if (error) return console.error("Error al cargar imagen de parques", error);
    if (!map.hasImage('icono-parque')) map.addImage('icono-parque', image);
    map.addLayer({
      id: 'parques-layer',
      type: 'symbol',
      source: 'parques',
      layout: { 'icon-image': 'icono-parque', 'icon-size': 0.1 },
      filter: ['==', 'CVE_ENT', '']
    });
    map.setLayoutProperty('parques-layer', 'visibility', 'none');
    document.getElementById('toggle-parques').checked = false;
  });

  // 4) Capas de escuelas
  map.addSource("escuelas", {
    type: "geojson",
    data: "https://fabulous-dodol-d03b96.netlify.app/escuelas.geojson"
  });
  map.loadImage('imagenes/school1.png', (error, image) => {
    if (error) return console.error("Error al cargar imagen de escuelas", error);
    if (!map.hasImage('icono-escuela')) map.addImage('icono-escuela', image);
    map.addLayer({
      id: 'escuelas-layer',
      type: 'symbol',
      source: 'escuelas',
      layout: {
        'icon-image': 'icono-escuela',
        'icon-size': 0.1,
        'icon-allow-overlap': true
      },
      filter: ['==', 'CVE_ENT', '']
    });
    map.setLayoutProperty('escuelas-layer', 'visibility', 'none');
    document.getElementById('toggle-escuelas').checked = false;
  });

  // 5) Fuente y capa "calles" creadas una sola vez
  map.addSource("calles", {
    type: "geojson",
    data: null,
    maxzoom: 22,
    buffer: 512,
    tolerance: 0.1
  });
  map.addLayer({
    id: "calles-layer",
    type: "line",
    source: "calles",
    layout: { visibility: "none" },
    paint: {
      "line-color": ["get", "colores"],
      "line-width": [
        "interpolate", ["linear"], ["zoom"],
        1,  0.2,
        7,  0.4,
        15, 1
      ]
    }
  });

  // 6) Inicia la función del selector de estados
  configurarSelectorEstado();
});

