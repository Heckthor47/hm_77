function configurarSelectorEstado() {
  const selector = document.getElementById("estado");

  selector.addEventListener("change", () => {
    const seleccion = selector.value;

    if (!seleccion) {
      removerCapaCalles();
      removerCapaEstado();

      //LIMPIAR FILTROS DE CAPAS
      map.setFilter("parques-layer", ["==", "CVE_ENT", ""]);

      map.setFilter("homicidios-layer", ["==", "CVE_ENT", ""]);

      map.setFilter("escuelas-layer", ["==", "CVE_ENT", ""]);

      if (bboxNacional) {
        map.fitBounds(bboxNacional, { padding: 20, duration: 1000 });
      }
      return;
    }

    const codigoEntidad = seleccion.replace("calles", "");

    if (!estadosGeoJson) {
      console.warn("GeoJSON aún no cargado");
      return;
    }

    const feature = estadosGeoJson.features.find(f => f.properties.CVE_ENT == codigoEntidad);
    if (!feature) {
      console.error("Entidad no encontrada:", codigoEntidad);
      return;
    }

    removerCapaCalles();
    removerCapaEstado();

    map.addSource("estado-source", { type: "geojson", data: feature });
    map.addLayer({
      id: "estado-fill",
      type: "fill",
      source: "estado-source",
      layout: {
        visibility: document.getElementById("toggle-calles").checked ? "visible" : "none"
      },
      paint: { "fill-color": "#088", "fill-opacity": 0.2 }
    });
    map.addLayer({
      id: "estado-outline",
      type: "line",
      source: "estado-source",
      layout: {
        visibility: document.getElementById("toggle-calles").checked ? "visible" : "none"
      },
      paint: { "line-color": "#005", "line-width": 2 }
    });

    const bboxEstado = turf.bbox(feature);
    map.fitBounds(bboxEstado, { padding: 20, duration: 1000 });
    
    map.setFilter("parques-layer", ["==", "CVE_ENT", codigoEntidad]);
    map.setFilter("homicidios-layer", ["==", "CVE_ENT", codigoEntidad]);
    map.setFilter("escuelas-layer", ["==", "CVE_ENT", codigoEntidad]);


    const ruta = `https://incandescent-biscochitos-5bb3b9.netlify.app/${seleccion}.geojson`;
    map.addSource("calles", { type: "geojson", data: ruta });
    map.addLayer({
      id: "calles-layer",
      type: "line",
      source: "calles",
      layout: {
        visibility: document.getElementById("toggle-calles").checked ? "visible" : "none"
      },
      paint: {
        "line-color": ["get", "colores"],
        "line-width": 1
      }
    });
  });
}
