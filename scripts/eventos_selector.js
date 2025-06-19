// --- eventos_selector.js ---
// Función para manejar el cambio de estado y recargar solo datos de "calles"
function configurarSelectorEstado() {
  const selector = document.getElementById("estado");
  selector.addEventListener("change", () => {
    const seleccion = selector.value;

    // 0) Limpieza si no hay selección
    if (!seleccion) {
      removerCapaEstado();
      ["homicidios-layer","parques-layer","escuelas-layer"].forEach(id => {
        map.setFilter(id, ["==", "CVE_ENT", ""]);
        map.setLayoutProperty(id, "visibility", "none");
      });
      map.getSource("calles").setData({ type: "FeatureCollection", features: [] });
      map.setLayoutProperty("calles-layer", "visibility", "none");
      if (bboxNacional) map.fitBounds(bboxNacional, { padding: 20, duration: 1000 });
      return;
    }

    // 1) Localizar la geometría del estado
    const codigoEntidad = seleccion.replace("calles", "");
    const feature = estadosGeoJson.features.find(
      f => f.properties.CVE_ENT == codigoEntidad
    );
    if (!feature) return console.error("Estado no encontrado:", codigoEntidad);

    // 2) Dibujar polígono del estado
    removerCapaEstado();
    map.addSource("estado-source", { type: "geojson", data: feature });
    map.addLayer({ id: "estado-fill", type: "fill", source: "estado-source", paint: { "fill-color": "#088", "fill-opacity": 0.2 } });
    map.addLayer({ id: "estado-outline", type: "line", source: "estado-source", paint: { "line-color": "#005", "line-width": 2 } });

    // 3) Ajustar vista al estado completo
    const bboxEstado = turf.bbox(feature);
    map.fitBounds(bboxEstado, { padding: 20, duration: 1000 });

    // 4) Filtros y visibilidad de capas de datos según checkbox
    const layerToggleMapping = {
      "homicidios-layer": "toggle-homicidios",
      "parques-layer": "toggle-parques",
      "escuelas-layer": "toggle-escuelas"
    };
    Object.entries(layerToggleMapping).forEach(([layerId, toggleId]) => {
      // Aplica filtro para el estado
      map.setFilter(layerId, ["==", "CVE_ENT", codigoEntidad]);
      // Controla visibilidad según el checkbox
      const isChecked = document.getElementById(toggleId).checked;
      map.setLayoutProperty(layerId, "visibility", isChecked ? "visible" : "none");
    });

    // 5) Recargar datos de calles con muestreo de color #CDCDCD
    const ruta = `https://fabulous-dodol-d03b96.netlify.app/${seleccion}.geojson`;
    fetch(ruta)
      .then(response => response.json())
      .then(data => {
        // separar features según color
        const others = data.features.filter(f => f.properties.colores !== '#CDCDCD');
        const cdcdFeatures = data.features.filter(f => f.properties.colores === '#CDCDCD');
        // muestrear el 50% de características CDCDCD
        const sampled = cdcdFeatures.filter(() => Math.random() < 0.4);
        const finalFeatures = others.concat(sampled);
        // actualizar la fuente con el subconjunto de features
        map.getSource("calles").setData({ type: "FeatureCollection", features: finalFeatures });
        // aplicar visibilidad según checkbox
        const vis = document.getElementById("toggle-calles").checked ? "visible" : "none";
        map.setLayoutProperty("calles-layer", "visibility", vis);
      })
      .catch(err => console.error('Error cargando calles:', err));

    // 6) Asegurar orden de capas: llevar "calles-layer" debajo de datos de capas: llevar "calles-layer" debajo de datos
    const reference = ["homicidios-layer","parques-layer","escuelas-layer"]
      .find(id => map.getLayer(id));
    if (reference) map.moveLayer("calles-layer", reference);
  });
}
