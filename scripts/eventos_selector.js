import { estadosGeoJson, municipiosGeoJson } from './mapa_config.js';
import { aplicarFiltros } from './capas.js'; 
import { activarVistaLocal } from './mapa_config.js';
import { moverMapaAEstado, moverMapaAMunicipio } from './filtro.js';
import { cargarCallesPorEstado } from './mapa_config.js';

// =========================
// Funciones Auxiliares
// =========================

// Limpieza de capas y vista al estado nacional
function limpiarEstado() {
  removerCapaEstado();
  ["homicidios-layer", "parques-layer", "escuelas-layer"].forEach(id => {
    map.setFilter(id, ["==", "CVE_ENT", ""]);
    map.setLayoutProperty(id, "visibility", "none");
  });
  map.getSource("calles").setData({ type: "FeatureCollection", features: [] });
  map.setLayoutProperty("calles-layer", "visibility", "none");
  if (bboxNacional) map.fitBounds(bboxNacional, { padding: 20, duration: 1000 });
}

// Dibujar el polígono del estado
function dibujarEstado(feature) {
  removerCapaEstado();
  map.addSource("estado-source", { type: "geojson", data: feature });
  map.addLayer({
    id: "estado-fill",
    type: "fill",
    source: "estado-source",
    paint: { "fill-color": "#8ca9cf", "fill-opacity": 0.2 }
  });
  map.addLayer({
    id: "estado-outline",
    type: "line",
    source: "estado-source",
    paint: { "line-color": "#FFFFFF", "line-width": 2 }
  });
}

// Limpieza de capas y vista al estado nacional
function limpiarMunicipio() {
  removerCapaMunicipio();
  ["homicidios-layer", "parques-layer", "escuelas-layer"].forEach(id => {
    map.setFilter(id, ["==", "CVE_ENT", ""]);
    map.setLayoutProperty(id, "visibility", "none");
  });
  map.getSource("calles").setData({ type: "FeatureCollection", features: [] });
  map.setLayoutProperty("calles-layer", "visibility", "none");
  if (bboxNacional) map.fitBounds(bboxNacional, { padding: 20, duration: 1000 });
}

// Dibujar el polígono 
function dibujarMunicipio(feature) {
  removerCapaMunicipio(); // Remover capas existentes

  // Agregar nueva fuente y capas para el municipio
  map.addSource("municipio-source", { type: "geojson", data: feature });
  map.addLayer({
    id: "municipio-fill",
    type: "fill",
    source: "municipio-source",
    paint: { "fill-color": "#FA0", "fill-opacity": 0.2 }
  });
  map.addLayer({
    id: "municipio-outline",
    type: "line",
    source: "municipio-source",
    paint: { "line-color": "#FFFFFF", "line-width": 2 }
  });
}

// Recargar datos de calles
function recargarCalles(seleccion) {
  const ruta = `https://fabulous-dodol-d03b96.netlify.app/${seleccion}.geojson`;
  fetch(ruta)
    .then(response => response.json())
    .then(data => {
      const others = data.features.filter(f => f.properties.colores !== '#CDCDCD');
      const cdcdFeatures = data.features.filter(f => f.properties.colores === '#CDCDCD');
      const sampled = cdcdFeatures.filter(() => Math.random() < 0.4);
      const finalFeatures = others.concat(sampled);

      const source = map.getSource("calles");
      if (!source) {
        console.error('La fuente "calles" no está disponible.');
        return;
      }

      source.setData({ type: "FeatureCollection", features: finalFeatures });
      const vis = document.getElementById("toggle-calles").checked ? "visible" : "none";
      map.setLayoutProperty("calles-layer", "visibility", vis);
    })
    .catch(err => console.error('Error cargando calles:', err));
}

// Remover capas del estado
function removerCapaEstado() {
  if (map.getLayer("estado-fill")) map.removeLayer("estado-fill");
  if (map.getLayer("estado-outline")) map.removeLayer("estado-outline");
  if (map.getSource("estado-source")) map.removeSource("estado-source");
}


document.addEventListener('estado-change', (e) => {
  const codigoEntidad = e.detail.value;

  if (!codigoEntidad) {
    console.warn(`No se encontró el estado con código: ${codigoEntidad}`);
    return;
  }

  // Mover el mapa al estado seleccionado
  moverMapaAEstado(codigoEntidad);

  // Activar la vista local para el estado
  activarVistaLocal(codigoEntidad, 'estado');

  // Cargar calles dinámicamente según el estado seleccionado
  cargarCallesPorEstado(codigoEntidad);

  // Validar que los datos de estados estén disponibles
  if (!estadosGeoJson || !estadosGeoJson.features) {
    console.error("Los datos de estados aún no están disponibles.");
    return;
  }

  // Buscar el estado en los datos GeoJSON
  const feature = estadosGeoJson.features.find(f => f.properties.CVE_ENT === codigoEntidad);

  if (feature) {
    // Dibujar el estado en el mapa
    dibujarEstado(feature);

    // Ajustar la vista del mapa al estado
    const bounds = turf.bbox(feature);
    map.fitBounds(bounds, { padding: 20, duration: 1000 });

    // Activar las capas asociadas al estado
    const capas = ["homicidios-layer", "parques-layer", "escuelas-layer", "calles-layer"];
    capas.forEach(id => {
      if (map.getLayer(id)) {
        map.setFilter(id, ["==", "CVE_ENT", codigoEntidad]);
        map.setLayoutProperty(id, "visibility", "visible");
      }
    });

    // Sincronizar los checkboxes con las capas activas
    const cardCapas = document.querySelector('card-capas');
    if (cardCapas) {
      cardCapas.toggleLayerControls(true); // Habilitar controles
      cardCapas.sincronizarCheckboxes(); // Sincronizar checkboxes
    };
  } else {
    console.warn(`No se encontró el estado con código: ${codigoEntidad}`);
  }
});

// Remover capas 
function removerCapaMunicipio() {
  if (map.getLayer("municipio-outline")) map.removeLayer("municipio-outline");
  if (map.getLayer("municipio-fill")) map.removeLayer("municipio-fill");
  if (map.getSource("municipio-source")) map.removeSource("municipio-source");
}

document.addEventListener("municipio-change", (e) => {
  const cvegeo = e.detail.value;

  /* Busca el polígono del municipio */
  const feature = municipiosGeoJson.features
                   .find(f => f.properties.CVEGEO === cvegeo);
  if (!feature) { console.warn("Municipio no encontrado"); return; }

  dibujarMunicipio(feature);
  map.fitBounds(turf.bbox(feature), { padding:20, duration:1000 });

  /* Filtra cada capa con ["within", …] */
  const capas = ["homicidios-layer", "parques-layer",
                 "escuelas-layer", "calles-layer"];

  capas.forEach(id => {
    if (!map.getLayer(id)) return;
    map.setFilter(id, ["within", feature.geometry]);    
    map.setLayoutProperty(id, "visibility", "visible");
  });

  /* Actualiza checkboxes */
  const cardCapas = document.querySelector("card-capas");
  cardCapas?.toggleLayerControls(true);
  cardCapas?.sincronizarCheckboxes();
});
