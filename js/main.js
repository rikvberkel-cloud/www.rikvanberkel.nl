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
  // die staan. De koppen draaien door, elke 2,4 seconden een stap. Beweging
  // die langer duurt dan vijf seconden moet volgens WCAG 2.2.2 te stoppen
  // zijn, daarom staat onder elke kop een pauzeknop (.wissel-pauze).
  var INTERVAL = 2400;

  // Met "beweging beperken" aan loopt de kop één keer rond en blijft hij weer
  // op de eerste staan, zonder vervaging (zie de CSS). Dat duurt 7,2 seconden
  // bij drie varianten, dus ook dan is er een pauzeknop.
  var minderBeweging = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function knopBij(wissel) {
    // De knop staat in hetzelfde blok als de kop, eventueel na een subregel.
    var kop = wissel.closest("h1, h2");
    return kop ? kop.parentElement.querySelector(":scope > .wissel-pauze") : null;
  }

  function draai(wissel) {
    var items = wissel.querySelectorAll(".wissel-item");
    if (items.length < 2) {
      return;
    }
    var knop = knopBij(wissel);
    var i = 0;
    var timer = null;

    function stop() {
      window.clearInterval(timer);
      timer = null;
    }

    function volgende() {
      items[i].classList.remove("is-actief");
      i = (i + 1) % items.length;
      items[i].classList.add("is-actief");
      if (minderBeweging && i === 0) {
        stop();
        if (knop) {
          knop.hidden = true;
        }
      }
    }

    function start() {
      if (!timer) {
        timer = window.setInterval(volgende, INTERVAL);
      }
    }

    if (knop) {
      knop.hidden = false;
      knop.addEventListener("click", function () {
        if (timer) {
          stop();
          knop.textContent = "Afspelen";
        } else {
          start();
          knop.textContent = "Pauzeer";
        }
      });
    }
    start();
  }

  document.querySelectorAll("[data-wissel]").forEach(function (wissel) {
    // Een kop onderaan de pagina begint pas als hij in beeld komt.
    if (wissel.hasAttribute("data-wissel-in-beeld") && "IntersectionObserver" in window) {
      var kijker = new IntersectionObserver(function (items) {
        if (items[0].isIntersecting) {
          kijker.disconnect();
          draai(wissel);
        }
      }, { threshold: 0.6 });
      kijker.observe(wissel);
    } else {
      draai(wissel);
    }
  });
})();
