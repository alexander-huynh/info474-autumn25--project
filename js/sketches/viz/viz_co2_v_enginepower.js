// viz_scatter2.js
// CO₂ NEDC (g/km) vs Engine Power (kW) with interactive high-power threshold
(function () {

  // persistent state across frames
  var powerThreshold = null; // in kW

  window.VizScatter2 = {
    draw: function (p, manager, ai, progress) {
      var data = manager.data || [];
      var left = manager.offsetX || 0;
      var top = manager.offsetY || 0;
      var w = manager.width || 600;
      var h = manager.height || 520;

      p.background(255);
      p.fill(0);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(16);

      if (!data.length) {
        p.text('No data loaded for scatterplot 2.', left + w / 2, top + h / 2);
        return;
      }

      // Build clean numeric list: co2_nedc_gpkm vs engine_power_kw
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

      // --- 0. Min/max for scaling ----------------------------------------
      var minPower = Infinity, maxPower = -Infinity;
      var minCo2 = Infinity, maxCo2 = -Infinity;
      for (var j = 0; j < pts.length; j++) {
        var d = pts[j];
        if (d.powerKw < minPower) minPower = d.powerKw;
        if (d.powerKw > maxPower) maxPower = d.powerKw;
        if (d.co2 < minCo2) minCo2 = d.co2;
        if (d.co2 > maxCo2) maxCo2 = d.co2;
      }

      // Inner plot area (extra top room for title + subtitle + legend)
      var innerLeft   = left + 60;       // extra room for y labels
      var innerRight  = left + w - 20;
      var innerTop    = top + 60;        // was top + 30
      var innerBottom = top + h - 50;

      // --- 1. User interaction: set / move threshold ---------------------
      // initialize threshold around “high power” if not set or out of range
      if (
        powerThreshold === null ||
        powerThreshold < minPower ||
        powerThreshold > maxPower
      ) {
        // default around upper tail (~70% of range)
        powerThreshold = p.lerp(minPower, maxPower, 0.7);
      }

      // click/drag horizontally inside plot to move threshold
      if (
        p.mouseIsPressed &&
        p.mouseX >= innerLeft && p.mouseX <= innerRight &&
        p.mouseY >= innerTop && p.mouseY <= innerBottom
      ) {
        powerThreshold = p.map(
          p.mouseX,
          innerLeft,
          innerRight,
          minPower,
          maxPower
        );
      }

      // --- 2. Axes --------------------------------------------------------
      p.stroke(0);
      p.strokeWeight(1);
      // y-axis
      p.line(innerLeft, innerTop, innerLeft, innerBottom);
      // x-axis
      p.line(innerLeft, innerBottom, innerRight, innerBottom);

      // --- 3. Tick marks & numeric labels --------------------------------
      p.textSize(10);
      p.fill(0);
      p.noStroke();

      var xticks = 5;
      for (var xi = 0; xi <= xticks; xi++) {
        var t = xi / xticks;

        // rounded ticks: nearest 10 kW
        var rawX = p.lerp(minPower, maxPower, t);
        var xv   = Math.round(rawX / 10) * 10;
        var xPos = p.map(xv, minPower, maxPower, innerLeft, innerRight);

        p.stroke(0);
        p.line(xPos, innerBottom, xPos, innerBottom + 4);

        p.noStroke();
        p.textAlign(p.CENTER, p.TOP);
        p.text(xv, xPos, innerBottom + 6);
      }

      var yticks = 5;
      for (var yi = 0; yi <= yticks; yi++) {
        var ty = yi / yticks;

        // rounded ticks: nearest 20 g/km
        var rawY = p.lerp(minCo2, maxCo2, ty);
        var yv   = Math.round(rawY / 20) * 20;
        var yPos = p.map(yv, minCo2, maxCo2, innerBottom, innerTop);

        p.stroke(0);
        p.line(innerLeft - 4, yPos, innerLeft, yPos);

        p.noStroke();
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(yv, innerLeft - 6, yPos);
      }

      // --- 4. Axis labels -------------------------------------------------
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(12);
      p.text(
        'Engine Power (kW)',
        (innerLeft + innerRight) / 2,
        innerBottom + 24
      );

      p.push();
      p.translate(left + 20, (innerTop + innerBottom) / 2);
      p.rotate(-Math.PI / 2);
      p.textAlign(p.CENTER, p.TOP);
      p.text('CO₂ NEDC (g/km)', 0, 0);
      p.pop();

      // --- 5. Title + subtitle -------------------------------------------
      p.textAlign(p.CENTER, p.BOTTOM);
      p.textSize(14);
      p.text(
        'CO₂ Emissions vs Engine Power (kW)',
        left + w / 2,
        innerTop - 24
      );

      p.textSize(11);
      p.textAlign(p.CENTER, p.TOP);
      p.text(
        'Drag the vertical line to change what counts as “high power”.',
        left + w / 2,
        innerTop - 10
      );

      // Mini legend (gray vs blue)
      p.noStroke();
      p.textAlign(p.LEFT, p.CENTER);
      p.textSize(11);

      // lower-power (gray)
      p.fill(120, 120, 120, 120);
      p.circle(innerLeft + 10, innerTop + 8, 5);
      p.fill(0);
      p.text('Lower-power cars', innerLeft + 20, innerTop + 8);

      // "high power" (blue)
      p.fill(50, 120, 220, 180);
      p.circle(innerLeft + 10, innerTop + 24, 5);
      p.fill(0);
      p.text('“High power” (≥ threshold)', innerLeft + 20, innerTop + 24);

      // --- 6. Draw points with threshold highlighting ---------------------
      var countAbove = 0;
      var totalCo2   = 0;
      var co2Above   = 0;

      // pass 1: dim points below threshold, accumulate stats
      p.noStroke();
      for (var a = 0; a < pts.length; a++) {
        var p1 = pts[a];
        var x1 = p.map(p1.powerKw, minPower, maxPower, innerLeft, innerRight);
        var y1 = p.map(p1.co2,      minCo2,   maxCo2,   innerBottom, innerTop);

        totalCo2 += p1.co2;

        if (p1.powerKw < powerThreshold) {
          p.fill(120, 120, 120, 40); // faded
          p.circle(x1, y1, 3);
        } else {
          countAbove++;
          co2Above += p1.co2;
          // bright pass later
        }
      }

      // pass 2: bright points above threshold
      p.noStroke();
      p.fill(50, 120, 220, 180);
      for (var b = 0; b < pts.length; b++) {
        var p2 = pts[b];
        if (p2.powerKw < powerThreshold) continue;

        var x2 = p.map(p2.powerKw, minPower, maxPower, innerLeft, innerRight);
        var y2 = p.map(p2.co2,      minCo2,   maxCo2,   innerBottom, innerTop);
        p.circle(x2, y2, 3);
      }

      // --- 7. Threshold line + label --------------------------------------
      var thrX = p.map(powerThreshold, minPower, maxPower, innerLeft, innerRight);

      p.stroke(0, 0, 0, 160);
      p.strokeWeight(2);
      p.line(thrX, innerTop, thrX, innerBottom);

      var pctCars = Math.round((countAbove / pts.length) * 100);
      var pctCo2  = totalCo2 > 0 ? Math.round((co2Above / totalCo2) * 100) : 0;

      var labelText =
        'High power ≥ ' + Math.round(powerThreshold) + ' kW\n' +
        pctCars + '% of cars, ~' + pctCo2 + '% of CO₂';

      p.noStroke();
      p.fill(255);
      p.rectMode(p.CENTER);

      // dynamic width for two-line label
      p.textSize(11);
      var tw = p.textWidth('High power ≥ ' + Math.round(powerThreshold) + ' kW') + 24;
      var rectW = Math.max(230, tw);
      var rectH = 36;

      p.rect(thrX, innerBottom + 40, rectW, rectH, 6);

      p.fill(0);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(labelText, thrX, innerBottom + 40);

      // reset rect mode for any other sketches
      p.rectMode(p.CORNER);
    }
  };
})();
