// viz_scatter2.js
// CO₂ NEDC (g/km) vs Engine Power (kW)
// Static scatterplot with trimmed axis ranges, density fading,
// lighter gridlines, and improved spacing.

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
        p.text('No data loaded for scatterplot 2.', left + w / 2, top + h / 2);
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
        p.text('No valid numeric data for scatterplot 2.', left + w / 2, top + h / 2);
        return;
      }

      // --- Compute raw ranges -------------------------------------------
      var minPower = Infinity, maxPower = -Infinity;
      var minCo2   = Infinity, maxCo2   = -Infinity;

      for (var j = 0; j < pts.length; j++) {
        var d = pts[j];
        if (d.powerKw < minPower) minPower = d.powerKw;
        if (d.powerKw > maxPower) maxPower = d.powerKw;
        if (d.co2     < minCo2)   minCo2   = d.co2;
        if (d.co2     > maxCo2)   maxCo2   = d.co2;
      }

      // --- Trim ranges to remove misleading outliers ---------------------
      minPower = Math.max(minPower, 0);
      maxPower = Math.min(maxPower, 400);

      minCo2   = Math.max(minCo2, 80);
      maxCo2   = Math.min(maxCo2, 400);

      // --- Inner plot area -----------------------------------------------
      var innerLeft   = left + 60;
      var innerRight  = left + w - 40;
      var innerTop    = top + 60;
      var innerBottom = top + h - 50;

      // --- Gridlines (soft / transparent) --------------------------------
      var xticks = 4;
      var yticks = 4;

      p.stroke(200, 200, 200, 120);  // light transparent gray
      p.strokeWeight(1);

      // Vertical gridlines
      for (var g = 0; g <= xticks; g++) {
        var t  = g / xticks;
        var xv = Math.round(p.lerp(minPower, maxPower, t) / 10) * 10;
        var gx = p.map(xv, minPower, maxPower, innerLeft, innerRight);
        p.line(gx, innerTop, gx, innerBottom);
      }

      // Horizontal gridlines
      for (var hline = 0; hline <= yticks; hline++) {
        var ty = hline / yticks;
        var yv = Math.round(p.lerp(minCo2, maxCo2, ty) / 20) * 20;
        var gy = p.map(yv, minCo2, maxCo2, innerBottom, innerTop);
        p.line(innerLeft, gy, innerRight, gy);
      }

      // --- Axes ----------------------------------------------------------
      p.stroke(0);
      p.strokeWeight(1);
      p.line(innerLeft, innerTop, innerLeft, innerBottom);
      p.line(innerLeft, innerBottom, innerRight, innerBottom);

      // --- Tick marks & labels ------------------------------------------
      p.textSize(10);
      p.fill(0);

      // x ticks
      for (var xi = 0; xi <= xticks; xi++) {
        var tx = xi / xticks;
        var xt = Math.round(p.lerp(minPower, maxPower, tx) / 10) * 10;
        var xPos = p.map(xt, minPower, maxPower, innerLeft, innerRight);

        p.stroke(0);
        p.line(xPos, innerBottom, xPos, innerBottom + 4);

        p.noStroke();
        p.textAlign(p.CENTER, p.TOP);
        p.text(xt, xPos, innerBottom + 6);
      }

      // y ticks
      for (var yi = 0; yi <= yticks; yi++) {
        var ty2 = yi / yticks;
        var yt = Math.round(p.lerp(minCo2, maxCo2, ty2) / 20) * 20;
        var yPos = p.map(yt, minCo2, maxCo2, innerBottom, innerTop);

        p.stroke(0);
        p.line(innerLeft - 4, yPos, innerLeft, yPos);

        p.noStroke();
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(yt, innerLeft - 6, yPos);
      }

      // --- Axis labels ---------------------------------------------------
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(12);
      p.text('Engine Power (kW)', (innerLeft + innerRight) / 2, innerBottom + 24);

      p.push();
      p.translate(left + 20, (innerTop + innerBottom) / 2);
      p.rotate(-Math.PI / 2);
      p.textAlign(p.CENTER, p.TOP);
      p.text('CO₂ NEDC (g/km)', 0, 0);
      p.pop();

      // --- Title + subtitle ----------------------------------------------
      p.textAlign(p.CENTER, p.BOTTOM);
      p.textSize(14);
      p.text('CO₂ Emissions vs Engine Power (kW)', left + w / 2, innerTop - 26);

      p.textSize(11);
      p.textAlign(p.CENTER, p.TOP);
      p.text(
        'Higher power generally means higher CO₂ — but the pattern is much noisier than engine size.',
        left + w / 2,
        innerTop - 14   // moved higher
      );

      // --- Draw scatter with density-fading ------------------------------
      p.noStroke();
      for (var k = 0; k < pts.length; k++) {
        var d2 = pts[k];
        var x = p.map(d2.powerKw, minPower, maxPower, innerLeft, innerRight);
        var y = p.map(d2.co2,     minCo2,   maxCo2,   innerBottom, innerTop);

        var fade = p.map(d2.powerKw, minPower, maxPower, 30, 110);
        p.fill(100, 100, 100, fade);
        p.circle(x, y, 3.5);
      }


    }
  };

})();
