function removerCapaYCapaFuente(nombreCapa, nombreFuente) {
  if (map.getLayer(nombreCapa)) map.removeLayer(nombreCapa);
  if (map.getSource(nombreFuente)) map.removeSource(nombreFuente);
}

// Funciones para remover capas y fuentes del mapa
function removerCapaCalles() {
  removerCapaYCapaFuente("calles-layer", "calles");
}

function removerCapaEstado() {
  removerCapaYCapaFuente("estado-fill", "estado-source");
  removerCapaYCapaFuente("estado-outline", "estado-source");
}
