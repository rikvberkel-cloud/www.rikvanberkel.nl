(function () {
  // Eén plek om de kennismakings-CTA om te zetten naar een planner.
  // Laat leeg zolang contact via mail loopt. Vul je hier een URL in, dan wijzen
  // alle knoppen met data-cta daarheen. De mailto in de HTML blijft werken
  // zonder JavaScript, dus de mailroute valt nooit weg.
  var PLANNER_URL = "";

  if (PLANNER_URL) {
    document.querySelectorAll("a[data-cta]").forEach(function (link) {
      link.href = PLANNER_URL;
    });
  }

  // Wisselende koppen. Elke [data-wissel] bevat twee of meer .wissel-item.
  // De eerste staat in de HTML al op is-actief, dus zonder JavaScript blijft
  // die staan. Het script loopt de varianten één keer langs en blijft op de
  // laatste staan: bij drie varianten duurt dat 2 x 2,4 = 4,8 seconden. Onder
  // de vijf seconden vraagt WCAG 2.2.2 geen pauzeknop. Terug naar de eerste
  // zou een derde stap kosten en boven de vijf seconden uitkomen.
  var INTERVAL = 2400;

  // Met "beweging beperken" aan wisselt de tekst ook, maar springt hij om
  // zonder vervaging (zie de CSS). Omspringende tekst is geen animatie.

  function rondje(wissel) {
    var items = wissel.querySelectorAll(".wissel-item");
    if (items.length < 2) {
      return;
    }
    var i = 0;
    function volgende() {
      items[i].classList.remove("is-actief");
      i = i + 1;
      items[i].classList.add("is-actief");
      if (i < items.length - 1) {
        window.setTimeout(volgende, INTERVAL);
      }
    }
    window.setTimeout(volgende, INTERVAL);
  }

  document.querySelectorAll("[data-wissel]").forEach(function (wissel) {
    // Een kop onderaan de pagina begint pas als hij in beeld komt.
    if (wissel.hasAttribute("data-wissel-in-beeld") && "IntersectionObserver" in window) {
      var kijker = new IntersectionObserver(function (items) {
        if (items[0].isIntersecting) {
          kijker.disconnect();
          rondje(wissel);
        }
      }, { threshold: 0.6 });
      kijker.observe(wissel);
    } else {
      rondje(wissel);
    }
  });
})();
