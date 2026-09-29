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
  // die staan. De koppen draaien door, standaard elke 2,4 seconden een stap.
  // Met data-wissel-interval, in milliseconden, krijgt een blok een eigen
  // tempo. Beweging die langer duurt dan vijf seconden moet volgens WCAG 2.2.2
  // te stoppen zijn, daarom staat onder elke kop een pauzeknop (.wissel-pauze).
  var INTERVAL = 2400;

  // Met "beweging beperken" aan loopt elk blok één keer rond en blijft het
  // weer op de eerste variant staan, zonder vervaging (zie de CSS). Op Home
  // duurt dat 6 seconden, dus ook dan is er een pauzeknop.
  var minderBeweging = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function knopBij(wissel) {
    // De knop staat in hetzelfde blok als de kop, eventueel na een subregel.
    var kop = wissel.closest("h1, h2");
    return kop ? kop.parentElement.querySelector(":scope > .wissel-pauze") : null;
  }

  // Een kop kan meer dan één wisselblok hebben, zoals de kernboodschap op
  // Home: een blok met "van" en een blok met "naar". Die delen één pauzeknop
  // en vormen samen een groep. Met data-wissel-vertraging, in milliseconden,
  // begint een blok later. Op Home stappen beide blokken samen elke 3000 ms,
  // zonder vertraging, zodat een van-deel en zijn naar-deel altijd samen in
  // beeld staan.
  function draaiGroep(wissels, knop) {
    var blokken = [];
    wissels.forEach(function (wissel) {
      var items = wissel.querySelectorAll(".wissel-item");
      if (items.length > 1) {
        blokken.push({
          items: items,
          interval: parseInt(wissel.getAttribute("data-wissel-interval"), 10) || INTERVAL,
          vertraging: parseInt(wissel.getAttribute("data-wissel-vertraging"), 10) || 0,
          i: 0,
          wachter: null,
          timer: null,
          klaar: false
        });
      }
    });
    if (!blokken.length) {
      return;
    }
    var loopt = false;

    function stopBlok(blok) {
      window.clearTimeout(blok.wachter);
      window.clearInterval(blok.timer);
      blok.wachter = null;
      blok.timer = null;
    }

    function volgende(blok) {
      blok.items[blok.i].classList.remove("is-actief");
      blok.i = (blok.i + 1) % blok.items.length;
      blok.items[blok.i].classList.add("is-actief");
      if (minderBeweging && blok.i === 0) {
        stopBlok(blok);
        blok.klaar = true;
        // De knop verdwijnt pas als alle blokken in de kop klaar zijn.
        var allesKlaar = blokken.every(function (b) { return b.klaar; });
        if (allesKlaar && knop) {
          knop.hidden = true;
        }
      }
    }

    // Na starten of hervatten wacht elk blok zijn vertraging af en stapt het
    // daarna elk interval. Zo blijft de verschuiving ook na een pauze.
    function startBlok(blok) {
      if (blok.klaar || blok.wachter || blok.timer) {
        return;
      }
      blok.wachter = window.setTimeout(function () {
        blok.wachter = null;
        blok.timer = window.setInterval(function () {
          volgende(blok);
        }, blok.interval);
      }, blok.vertraging);
    }

    function start() {
      blokken.forEach(startBlok);
      loopt = true;
    }

    function stop() {
      blokken.forEach(stopBlok);
      loopt = false;
    }

    if (knop) {
      knop.hidden = false;
      knop.addEventListener("click", function () {
        if (loopt) {
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

  // Blokken met dezelfde pauzeknop horen bij één groep.
  var groepen = [];
  document.querySelectorAll("[data-wissel]").forEach(function (wissel) {
    var knop = knopBij(wissel);
    var groep = null;
    for (var g = 0; g < groepen.length; g++) {
      if (knop && groepen[g].knop === knop) {
        groep = groepen[g];
      }
    }
    if (!groep) {
      groep = { knop: knop, wissels: [] };
      groepen.push(groep);
    }
    groep.wissels.push(wissel);
  });

  groepen.forEach(function (groep) {
    // Een kop onderaan de pagina begint pas als hij in beeld komt.
    var inBeeld = groep.wissels.filter(function (wissel) {
      return wissel.hasAttribute("data-wissel-in-beeld");
    })[0];
    if (inBeeld && "IntersectionObserver" in window) {
      var kijker = new IntersectionObserver(function (items) {
        if (items[0].isIntersecting) {
          kijker.disconnect();
          draaiGroep(groep.wissels, groep.knop);
        }
      }, { threshold: 0.6 });
      kijker.observe(inBeeld);
    } else {
      draaiGroep(groep.wissels, groep.knop);
    }
  });
})();
