// Punto de entrada
document.addEventListener("DOMContentLoaded", () => {
  configurarSelectorEstado();
});
// Mostrar/ocultar calles
document.getElementById("toggle-calles").addEventListener("change", (e) => {
  const visibility = e.target.checked ? "visible" : "none";
  if (map.getLayer("calles-layer")) {
    map.setLayoutProperty("calles-layer", "visibility", visibility);
  }
});

// Mostrar/ocultar parques
document.getElementById("toggle-parques").addEventListener("change", (e) => {
  const visibility = e.target.checked ? "visible" : "none";
  if (map.getLayer("parques-layer")) {
    map.setLayoutProperty("parques-layer", "visibility", visibility);
  }
});

// Mostrar/ocultar homicidios
document.getElementById("toggle-homicidios").addEventListener("change", (e) => {
  const visibility = e.target.checked ? "visible" : "none";
  if (map.getLayer("homicidios-layer")) {
    map.setLayoutProperty("homicidios-layer", "visibility", visibility);
  }
});

// Mostrar/ocultar escuelas
document.getElementById("toggle-escuelas").addEventListener("change", (e) => {
  const visibility = e.target.checked ? "visible" : "none";
  if (map.getLayer("escuelas-layer")) {
    map.setLayoutProperty("escuelas-layer", "visibility", visibility);
  }
});