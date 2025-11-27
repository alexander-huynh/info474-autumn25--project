// viz_scatter2.js
// CO₂ NEDC (g/km) vs Engine Power (kW) — simple static scatterplot
(function () {

  window.VizScatter2 = {
    draw: function (p, manager, ai, progress) {
      var data = manager.data || [];
      var left = manager.offsetX || 0;
      var top  = manager.offsetY || 0;
      var w    = manager.width  || 600;
      var h    = manager.height || 520;

      p.background(255);
      p.fill(0);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(16);

      if (!data.length) {
        p.text('No data loaded for scatterplot 2.',
               left + w / 2, top + h / 2);
        return;
      }

      // --- Extract numeric points ---------------------------------------
      var pts = [];
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var co2 = parseFloat(row.co2_nedc_gpkm);
        var powerKw = parseFloat(row.engine_power_kw);
        if (!isNaN(co2) && !isNaN(powerKw)) {
          pts.push({ co2: co2, powerKw: powerKw });
        }
      }

      if (!pts.length) {
        p.text('No valid numeric data for scatterplot 2.',
               left + w / 2, top + h / 2);
        return;
      }

      // --- Compute ranges ------------------------------------------------
      var minPower = Infinity, maxPower = -Infinity;
      var minCo2   = Infinity, maxCo2   = -Infinity;

      for (var j = 0; j < pts.length; j++) {
        var d = pts[j];
        if (d.powerKw < minPower) minPower = d.powerKw;
        if (d.powerKw > maxPower) maxPower = d.powerKw;
        if (d.co2     < minCo2)   minCo2   = d.co2;
        if (d.co2     > maxCo2)   maxCo2   = d.co2;
      }

      // Inner plot area
      var innerLeft   = left + 60;
      var innerRight  = left + w - 20;
      var innerTop    = top + 60;
      var innerBottom = top + h - 50;

      // --- Axes ----------------------------------------------------------
      p.stroke(0);
      p.strokeWeight(1);
      p.line(innerLeft, innerTop,    innerLeft, innerBottom);  // y-axis
      p.line(innerLeft, innerBottom, innerRight, innerBottom); // x-axis

      // --- Tick marks & labels ------------------------------------------
      p.textSize(10);
      p.fill(0);
      p.noStroke();

      var xticks = 5;
      for (var xi = 0; xi <= xticks; xi++) {
        var t  = xi / xticks;
        var raw = p.lerp(minPower, maxPower, t);
        var xv  = Math.round(raw / 10) * 10;
        var xPos = p.map(xv, minPower, maxPower, innerLeft, innerRight);

        p.stroke(0);
        p.line(xPos, innerBottom, xPos, innerBottom + 4);

        p.noStroke();
        p.textAlign(p.CENTER, p.TOP);
        p.text(xv, xPos, innerBottom + 6);
      }

      var yticks = 5;
      for (var yi = 0; yi <= yticks; yi++) {
        var ty  = yi / yticks;
        var raw = p.lerp(minCo2, maxCo2, ty);
        var yv  = Math.round(raw / 20) * 20;
        var yPos = p.map(yv, minCo2, maxCo2, innerBottom, innerTop);

        p.stroke(0);
        p.line(innerLeft - 4, yPos, innerLeft, yPos);

        p.noStroke();
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(yv, innerLeft - 6, yPos);
      }

      // --- Axis labels ---------------------------------------------------
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(12);
      p.text('Engine Power (kW)',
             (innerLeft + innerRight) / 2,
             innerBottom + 24);

      p.push();
      p.translate(left + 20, (innerTop + innerBottom) / 2);
      p.rotate(-Math.PI / 2);
      p.textAlign(p.CENTER, p.TOP);
      p.text('CO₂ NEDC (g/km)', 0, 0);
      p.pop();

      // --- Title ---------------------------------------------------------
      p.textAlign(p.CENTER, p.BOTTOM);
      p.textSize(14);
      p.text('CO₂ Emissions vs Engine Power (kW)',
             left + w / 2,
             innerTop - 24);

      // --- Draw simple scatter (ALL POINTS SAME) -------------------------
      p.noStroke();
      p.fill(120, 120, 120, 70);  // uniform soft gray

      for (var k = 0; k < pts.length; k++) {
        var d2 = pts[k];
        var x = p.map(d2.powerKw, minPower, maxPower, innerLeft, innerRight);
        var y = p.map(d2.co2,     minCo2,   maxCo2,   innerBottom, innerTop);
        p.circle(x, y, 3);
      }

    }
  };

})();
