// Configura el mapa base y carga Entidades.geojson

const map = new maplibregl.Map({
  container: "map",
  style: "https://www.datosgeoespaciales.atdt.gob.mx/api/style_white.json",
  center: [-99.1332, 19.4326],
  zoom: 5
});

let estadosGeoJson = null;
let bboxNacional = null;

map.on("load", () => {

  // Cargar Entidades.geojson
  fetch("https://incandescent-biscochitos-5bb3b9.netlify.app/entidades.geojson")
    .then(r => r.json())
    .then(data => {
      estadosGeoJson = data;
      bboxNacional = turf.bbox(estadosGeoJson);
    })
    .catch(err => console.error("Error al cargar Entidades.geojson:", err));

  // Cargar parques 
  map.addSource("parques", {
    type: "geojson",
    data: "https://incandescent-biscochitos-5bb3b9.netlify.app/parques.geojson"
  });


  // Añadir capa de parques (invisible al inicio)
  map.addLayer({
    id: "parques-layer",
    type: "circle",
    source: "parques",
    paint: {
      "circle-radius": 3,
      "circle-color": "black",
      "circle-opacity": 0.8,
      "circle-stroke-color": "black",
      "circle-stroke-width": 1
    },
    filter: ["==", "CVE_ENT", ""]
  });

  map.addSource("homicidios", {
    type: "geojson",
    data: "data/homicidios.geojson"
  });


  // Añadir capa de homicidios
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


// Añadir capa de escuelas
  map.addSource("escuelas", {
    type: "geojson",
    data: "https://incandescent-biscochitos-5bb3b9.netlify.app/escuelas.geojson"
  });
  map.addLayer({
    id: "escuelas-layer",
    type: "circle",
    source: "escuelas",
    paint: {
      "circle-radius": 3,
      "circle-color": "red",
      "circle-opacity": 0.8,
      "circle-stroke-color": "black",
      "circle-stroke-width": 1
    },
    filter: ["==", "CVE_ENT", ""]
  });

  //Poner el geocoder
  const geocoder = new MaplibreGeocoder({
  maplibregl: maplibregl,
  placeholder: "Buscar lugar o dirección...",
  // Usamos Nominatim como geocodificador
  forwardGeocode: async (config) => {
    const request = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(config.query)}&format=geojson&limit=5`;
    const response = await fetch(request);
    const geojson = await response.json();
    return {
      features: geojson.features.map((feature) => {
        return {
          type: "Feature",
          geometry: feature.geometry,
          properties: feature.properties,
          place_name: feature.properties.display_name,
          center: feature.geometry.type === "Point" ? feature.geometry.coordinates : undefined
        };
      })
    };
  }
});

// Agregamos el control al mapa (posición: top-left)
map.addControl(geocoder, "top-right");

geocoder.on("result", (e) => {
  const lngLat = e.result.center; // [lon, lat]

  // Crear punto GeoJSON
  const point = turf.point(lngLat);

  // Buscar en qué estado cayó el punto
  const feature = estadosGeoJson.features.find(f =>
    turf.booleanPointInPolygon(point, f)
  );

  if (!feature) {
    console.log("El punto seleccionado NO cayó en ningún estado");

    // Limpiar capas si no está en un estado
    removerCapaCalles();
    removerCapaEstado();
    map.setFilter("parques-layer", ["==", "CVE_ENT", ""]);
    map.setFilter("homicidios-layer", ["==", "CVE_ENT", ""]);
    map.setFilter("escuelas-layer", ["==", "CVE_ENT", ""]);
    return;
  }

  // Si sí cayó en un estado
  const codigoEntidad = feature.properties.CVE_ENT;
  console.log("El punto cayó en el estado:", codigoEntidad);

  // 1️Activar calles
  removerCapaCalles();
  const rutaCalles = `https://incandescent-biscochitos-5bb3b9.netlify.app/calles${codigoEntidad}.geojson`;
  map.addSource("calles", { type: "geojson", data: rutaCalles });
  map.addLayer({
    id: "calles-layer",
    type: "line",
    source: "calles",
    paint: {
      "line-color": ["get", "colores"],
      "line-width": 1
    },
    minzoom: 9 
  });

  // 2️Activar parques
  map.setFilter("parques-layer", ["==", "CVE_ENT", codigoEntidad]);
  map.setFilter("homicidios-layer", ["==", "CVE_ENT", codigoEntidad]);
  map.setFilter("escuelas-layer", ["==", "CVE_ENT", codigoEntidad]);

  // (opcional) activar polígono del estado
  removerCapaEstado();
  map.addSource("estado-source", { type: "geojson", data: feature });
  map.addLayer({
    id: "estado-fill",
    type: "fill",
    source: "estado-source",
    paint: { "fill-color": "#088", "fill-opacity": 0.2 }
  });
  map.addLayer({
    id: "estado-outline",
    type: "line",
    source: "estado-source",
    paint: { "line-color": "#005", "line-width": 2 }
  });

  // (opcional) puedes hacer fitBounds al estado completo:
  map.flyTo({
  center: lngLat,
  zoom: 13, // o 16 → ajusta según qué tan cerca quieras
  speed: 1.5,
  curve: 1
});

});

geocoder.on("clear", () => {
  console.log("Búsqueda borrada → regresando a vista nacional");

  removerCapaCalles();
  removerCapaEstado();
  map.setFilter("parques-layer", ["==", "CVE_ENT", ""]);
  map.setFilter("homicidios-layer", ["==", "CVE_ENT", ""]);
  map.setFilter("escuelas-layer", ["==", "CVE_ENT", ""]);

  if (bboxNacional) {
    map.fitBounds(bboxNacional, { padding: 20, duration: 1000 });
  }
});

map.setLayoutProperty("parques-layer", "visibility", "none");
map.setLayoutProperty("homicidios-layer", "visibility", "none");
map.setLayoutProperty("escuelas-layer", "visibility", "none");

document.getElementById("toggle-parques").checked = false;
document.getElementById("toggle-homicidios").checked = false;
document.getElementById("toggle-escuelas").checked = false;

});