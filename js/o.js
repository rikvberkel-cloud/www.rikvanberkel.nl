// Doorstuurpagina /o/#<pad>: opent een note in de Obsidian-app.
// Het pad staat achter de #, zodat het niet naar de server gaat. Het pad
// wordt eerst gedecodeerd en daarna opnieuw gecodeerd, zodat een & of # in
// de notenaam nooit een tweede parameter maakt.
(function () {
  "use strict";

  var bericht = document.getElementById("o-bericht");
  var knop = document.getElementById("o-knop");
  var ruw = window.location.hash.slice(1);
  var pad = "";

  if (ruw) {
    try {
      pad = decodeURIComponent(ruw);
    } catch (e) {
      pad = "";
    }
  }

  if (!pad) {
    bericht.textContent = "Geen note opgegeven.";
    knop.hidden = true;
    return;
  }

  var link = "obsidian://open?vault=Obsidian&file=" + encodeURIComponent(pad);
  bericht.textContent = "De note opent in Obsidian. Gebeurt er niets, tik dan op de knop.";
  knop.href = link;
  knop.hidden = false;
  window.location.replace(link);
})();
