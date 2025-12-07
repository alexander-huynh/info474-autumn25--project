// viz_scatter2.js
// CO₂ NEDC (g/km) vs Engine Power (kW)
// Static scatterplot with trimmed axis ranges, density fading,
// lighter gridlines, improved spacing
// + (PROMPT 1) fuel-type extraction added here
// + (PROMPT 1) on-screen point storage
// + (PROMPT 2) hover detection + highlight
// + (PROMPT 3) fuel FILTER LOGIC (All / Petrol / Diesel)
// + (PROMPT 4) clickable filter buttons (All / Petrol / Diesel)

(function () {

  var screenPts = [];   // for hover + tooltip
  var hoverIndex = -1;

  // Button hitboxes (assigned coords during draw)
  var btns = [
    { label: "All",    mode: "All",    x: 0, y: 0, w: 60, h: 24 },
    { label: "Petrol", mode: "Petrol", x: 0, y: 0, w: 70, h: 24 },
    { label: "Diesel", mode: "Diesel", x: 0, y: 0, w: 70, h: 24 }
  ];

  window.VizScatter2 = {

    //----------------------------------------------------------------------
    //  Drawing function
    //----------------------------------------------------------------------
    draw: function (p, manager, ai, progress) {
      var data = manager.data || [];
      var left = manager.offsetX || 0;
      var top  = manager.offsetY || 0;
      var w    = manager.width  || 600;
      var h    = manager.height || 520;

      screenPts = [];
      hoverIndex = -1;

      p.background(255);
      p.fill(0);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(16);

      if (!data.length) {
        p.text('No data loaded for scatterplot 2.', left + w / 2, top + h / 2);
        return;
      }

      //------------------------------------------------------------------
      //  PROMPT 1 — Extract numeric values AND fuel type
      //------------------------------------------------------------------
      var pts = [];
      for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var co2 = parseFloat(row.co2_nedc_gpkm);
        var powerKw = parseFloat(row.engine_power_kw);
        if (isNaN(co2) || isNaN(powerKw)) continue;

        var rawFuel = (
          row.fuel_type ||
          row.fuel ||
          row.fueltype ||
          row.fuelType ||
          ""
        ).toString().toLowerCase();

        var fuel = "Diesel";
        if (rawFuel.includes("petrol") || rawFuel.includes("gasoline")) fuel = "Petrol";
        if (rawFuel.includes("diesel")) fuel = "Diesel";

        pts.push({ co2: co2, powerKw: powerKw, fuel: fuel });
      }
      //------------------------------------------------------------------

      //------------------------------------------------------------------
      //  PROMPT 3 — FILTER LOGIC
      //------------------------------------------------------------------
      var mode = (manager.fuelFilter || "All");

      if (mode === "Petrol")   pts = pts.filter(d => d.fuel === "Petrol");
      if (mode === "Diesel")   pts = pts.filter(d => d.fuel === "Diesel");
      // mode === "All" → do nothing
      //------------------------------------------------------------------

      // If nothing survives the filter
      if (!pts.length) {
        p.text("No data for selected fuel type.", left + w / 2, top + h / 2);
        return;
      }

      //------------------------------------------------------------------
      // Compute ranges
      //------------------------------------------------------------------
      var minPower = Infinity, maxPower = -Infinity;
      var minCo2   = Infinity, maxCo2   = -Infinity;

      for (var j = 0; j < pts.length; j++) {
        var d = pts[j];
        if (d.powerKw < minPower) minPower = d.powerKw;
        if (d.powerKw > maxPower) maxPower = d.powerKw;
        if (d.co2     < minCo2)   minCo2   = d.co2;
        if (d.co2     > maxCo2)   maxCo2   = d.co2;
      }

      minPower = Math.max(minPower, 0);
      maxPower = Math.min(maxPower, 400);
      minCo2   = Math.max(minCo2, 80);
      maxCo2   = Math.min(maxCo2, 400);

      //------------------------------------------------------------------
      // Layout region
      //------------------------------------------------------------------
      var innerLeft   = left + 60;
      var innerRight  = left + w - 40;
      var innerTop    = top + 60;
      var innerBottom = top + h - 50;

      //------------------------------------------------------------------
      // Gridlines
      //------------------------------------------------------------------
      p.stroke(200, 200, 200, 120);
      p.strokeWeight(1);

      var xticks = 4;
      var yticks = 4;

      for (var gx = 0; gx <= xticks; gx++) {
        var t = gx / xticks;
        var xv = Math.round(p.lerp(minPower, maxPower, t) / 10) * 10;
        var xPos = p.map(xv, minPower, maxPower, innerLeft, innerRight);
        p.line(xPos, innerTop, xPos, innerBottom);
      }

      for (var gy = 0; gy <= yticks; gy++) {
        var t2 = gy / yticks;
        var yv = Math.round(p.lerp(minCo2, maxCo2, t2) / 20) * 20;
        var yPos = p.map(yv, minCo2, maxCo2, innerBottom, innerTop);
        p.line(innerLeft, yPos, innerRight, yPos);
      }

      //------------------------------------------------------------------
      // Axes
      //------------------------------------------------------------------
      p.stroke(0);
      p.line(innerLeft, innerTop, innerLeft, innerBottom);
      p.line(innerLeft, innerBottom, innerRight, innerBottom);

      //------------------------------------------------------------------
      // Tick labels
      //------------------------------------------------------------------
      p.textSize(13);
      p.fill(0);
      p.noStroke();

      for (var xi = 0; xi <= xticks; xi++) {
        var t3 = xi / xticks;
        var xv2 = Math.round(p.lerp(minPower, maxPower, t3) / 10) * 10;
        var xPos2 = p.map(xv2, minPower, maxPower, innerLeft, innerRight);
        p.textAlign(p.CENTER, p.TOP);
        p.text(xv2, xPos2, innerBottom + 6);
      }

      for (var yi = 0; yi <= yticks; yi++) {
        var t4 = yi / yticks;
        var yv2 = Math.round(p.lerp(minCo2, maxCo2, t4) / 20) * 20;
        var yPos2 = p.map(yv2, minCo2, maxCo2, innerBottom, innerTop);
        p.textAlign(p.RIGHT, p.CENTER);
        p.text(yv2, innerLeft - 6, yPos2);
      }

      //------------------------------------------------------------------
      // Axis labels
      //------------------------------------------------------------------
      p.textAlign(p.CENTER, p.TOP);
      p.textSize(20);
      p.text('Engine Power (kW)', (innerLeft + innerRight) / 2, innerBottom + 24);

      p.push();
      p.translate(left + 20, (innerTop + innerBottom) / 2);
      p.rotate(-Math.PI / 2);
      p.text('CO₂ NEDC (g/km)', 0, 0);
      p.pop();

      //------------------------------------------------------------------
      // Title
      //------------------------------------------------------------------
      p.textAlign(p.CENTER, p.BOTTOM);
      p.textSize(28);
      p.text('CO₂ Emissions vs Engine Power (kW)', left + w / 2, innerTop - 26);

      p.textSize(14);
      p.textAlign(p.CENTER, p.TOP);
      p.text(
        'Higher power generally means higher CO₂ — but the pattern is much noisier than engine size.',
        left + w / 2,
        innerTop - 14
      );

      //------------------------------------------------------------------
      // PROMPT 4 — BUTTON DRAWING
      //------------------------------------------------------------------
      var btnY = innerTop + 10;
      var activeMode = manager.fuelFilter || "All";

      var totalW = btns[0].w + btns[1].w + btns[2].w + 20 + 20;
      var startX = left + (w - totalW) / 2;

      for (var bi = 0; bi < btns.length; bi++) {
        var b = btns[bi];
        var bx = startX + bi * (b.w + 20);
        var by = btnY;

        b.x = bx;
        b.y = by;

        if (activeMode === b.mode) {
          p.fill(40, 110, 220);
        } else {
          p.fill(230);
        }

        p.stroke(0, 60);
        p.rect(bx, by, b.w, b.h, 4);

        p.fill(activeMode === b.mode ? 255 : 0);
        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(18);
        p.text(b.label, bx + b.w / 2, by + b.h / 2);
      }

      //------------------------------------------------------------------
      // Scatter points (colored by fuel type)
      //------------------------------------------------------------------
      var dotColors = {
        Petrol: p.color(255, 140, 0, 160),  // orange
        Diesel: p.color(34, 139, 34, 160)   // green
      };

      p.noStroke();

      for (var k = 0; k < pts.length; k++) {
        var d2 = pts[k];
        var x = p.map(d2.powerKw, minPower, maxPower, innerLeft, innerRight);
        var y = p.map(d2.co2, minCo2, maxCo2, innerBottom, innerTop);

        screenPts.push({
          x: x,
          y: y,
          powerKw: d2.powerKw,
          co2: d2.co2,
          fuel: d2.fuel
        });

        // choose color based on fuel type
        var col = dotColors[d2.fuel] || p.color(120, 120, 120, 140);

        p.fill(col);
        p.circle(x, y, 3.5);
      }


      //------------------------------------------------------------------
      // Hover detection
      //------------------------------------------------------------------
      var mx = p.mouseX;
      var my = p.mouseY;
      var bestDist = 99999;

      for (var i2 = 0; i2 < screenPts.length; i2++) {
        var pt = screenPts[i2];
        var dx = mx - pt.x;
        var dy = my - pt.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8 && dist < bestDist) {
          bestDist = dist;
          hoverIndex = i2;
        }
      }

      //------------------------------------------------------------------
      // Tooltip (fuel added next prompt)
      //------------------------------------------------------------------
      if (hoverIndex !== -1) {
        var hpt = screenPts[hoverIndex];

        // highlight
        p.fill(30, 120, 240, 200);
        p.circle(hpt.x, hpt.y, 7.5);

        var text1 = "Power: " + hpt.powerKw.toFixed(0) + " kW";
        var text2 = "CO₂: "   + hpt.co2.toFixed(0)      + " g/km";

        p.textSize(11);
        p.textAlign(p.LEFT, p.TOP);

        var padding = 6;
        var boxW = Math.max(p.textWidth(text1), p.textWidth(text2)) + padding * 2;
        var boxH = 30;

        var bx = hpt.x + 14;
        var by = hpt.y - boxH - 10;

        if (bx + boxW > left + w - 10)  bx = hpt.x - boxW - 14;
        if (by < top + 10)              by = hpt.y + 14;

        p.fill(255, 255, 255, 240);
        p.stroke(0, 80);
        p.rect(bx, by, boxW, boxH, 4);

        p.fill(0);
        p.noStroke();
        p.text(text1, bx + padding, by + 4);
        p.text(text2, bx + padding, by + 16);
      }
    },

    //----------------------------------------------------------------------
    // CLICK HANDLER FOR PROMPT 4 BUTTONS
    //----------------------------------------------------------------------
    mousePressed: function (p, manager) {
      var mx = p.mouseX;
      var my = p.mouseY;

      for (var bi = 0; bi < btns.length; bi++) {
        var b = btns[bi];
        if (
          mx >= b.x && mx <= b.x + b.w &&
          my >= b.y && my <= b.y + b.h
        ) {
          manager.fuelFilter = b.mode;
          return true;
        }
      }
      return false;
    }

  };

})();
