// viz_scatter.js
// CO₂ vs Engine Size (cropped domain + better ticks + CAR TYPE ICONS)
(function () {

    // ---------------------------------------------------------
    // PROMPT A ADDITIONS — global arrays for hover later
    // ---------------------------------------------------------
    var screenPts   = [];   // stores on-screen positions of each dot
    var hoverIndex  = -1;   // index of hovered point (used in B/C)
    // ---------------------------------------------------------

    window.VizScatter = {
        draw: function (p, manager, ai, progress) {
            var data = manager.data || [];
            var left = manager.offsetX || 0;
            var top = manager.offsetY || 0;
            var w = manager.width || 600;
            var h = manager.height || 520;

            // reset storage each frame
            screenPts  = [];
            hoverIndex = -1;

            p.background(255);

            if (!data.length) {
                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(16);
                p.text('No data loaded for scatterplot.', left + w / 2, top + h / 2);
                return;
            }

            // --- 0. Min/max for scaling ------------------------------------
            var rawMin = Infinity, rawMax = -Infinity;
            var minCo2 = 80;
            var maxCo2 = 380;

            for (var i = 0; i < data.length; i++) {
                var d = data[i];
                if (d.power < rawMin) rawMin = d.power;
                if (d.power > rawMax) rawMax = d.power;
            }

            // --- CROPPED DOMAIN --------------------------------------------
            var minPower = 900;
            var maxPower = 5000;

            function clamp(v, lo, hi) {
                return Math.max(lo, Math.min(hi, v));
            }

            // Padding
            var innerLeft   = left + 60;
            var innerRight  = left + w - 20;
            var innerTop    = top + 60;
            var innerBottom = top + h - 50;

            // --- 1. Background gridlines -----------------------------------
            p.stroke(220);
            p.strokeWeight(1);

            var xLiters = [1.0, 2.0, 3.0, 4.0, 5.0];
            for (var iL = 0; iL < xLiters.length; iL++) {
                var cc = xLiters[iL] * 1000;
                var xPos = p.map(cc, minPower, maxPower, innerLeft, innerRight);
                p.line(xPos, innerTop, xPos, innerBottom);
            }

            var gridYTicks = 5;
            for (var gy = 0; gy <= gridYTicks; gy++) {
                var t = gy / gridYTicks;
                var yv = Math.round(p.lerp(minCo2, maxCo2, t) / 20) * 20;
                var yPos = p.map(yv, minCo2, maxCo2, innerBottom, innerTop);
                p.line(innerLeft, yPos, innerRight, yPos);
            }

            // --- 2. Axes ----------------------------------------------------
            p.stroke(0);
            p.strokeWeight(1);
            p.line(innerLeft, innerTop, innerLeft, innerBottom);
            p.line(innerLeft, innerBottom, innerRight, innerBottom);

            // --- 3. Tick marks + labels ------------------------------------
            p.textSize(10);
            p.fill(0);
            p.noStroke();

            for (var xi = 0; xi < xLiters.length; xi++) {
                var liters = xLiters[xi];
                var cc = liters * 1000;
                var xPos = p.map(cc, minPower, maxPower, innerLeft, innerRight);

                p.stroke(0);
                p.line(xPos, innerBottom, xPos, innerBottom + 4);

                p.noStroke();
                p.textAlign(p.CENTER, p.TOP);
                p.text(liters.toFixed(1) + "L", xPos, innerBottom + 6);
            }

            var yticks = 5;
            for (var yi = 0; yi <= yticks; yi++) {
                var yv = Math.round(p.lerp(minCo2, maxCo2, yi / yticks) / 20) * 20;
                var yPos = p.map(yv, minCo2, maxCo2, innerBottom, innerTop);

                p.stroke(0);
                p.line(innerLeft - 4, yPos, innerLeft, yPos);

                p.noStroke();
                p.textAlign(p.RIGHT, p.CENTER);
                p.text(yv, innerLeft - 6, yPos);
            }

            // --- 4. Axis labels ---------------------------------------------
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(12);
            p.text('Engine Size (L)', (innerLeft + innerRight) / 2, innerBottom + 28);

            p.push();
            p.translate(left + 20, (innerTop + innerBottom) / 2);
            p.rotate(-Math.PI / 2);
            p.textAlign(p.CENTER, p.TOP);
            p.text('CO₂ NEDC (g/km)', 0, 0);
            p.pop();

            // --- 5. Title ----------------------------------------------------
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(14);
            p.text('CO₂ Emissions vs Engine Size', left + w / 2, innerTop - 28);

            // --- 6. Draw points + store screen coords ----------------------
            p.noStroke();
            p.fill(100, 100, 100, 120);

            for (var j = 0; j < data.length; j++) {
                var dpt = data[j];
                var eng = clamp(dpt.power, minPower, maxPower);

                var x = p.map(eng, minPower, maxPower, innerLeft, innerRight);
                var y = p.map(dpt.co2, minCo2, maxCo2, innerBottom, innerTop);

                screenPts.push({
                    x: x,
                    y: y,
                    liters: dpt.power / 1000,
                    co2: dpt.co2
                });

                p.circle(x, y, 4);
            }

            // -------------------------------------------------------------
            // PROMPT B — Hover detection + highlight
            // -------------------------------------------------------------
            var mx = p.mouseX;
            var my = p.mouseY;
            var bestDist = 99999;

            for (var idx = 0; idx < screenPts.length; idx++) {
                var pt = screenPts[idx];
                var dx = mx - pt.x;
                var dy = my - pt.y;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 8 && dist < bestDist) {
                    bestDist = dist;
                    hoverIndex = idx;
                }
            }

            if (hoverIndex !== -1) {
                var hpt = screenPts[hoverIndex];
                p.fill(30, 120, 240, 210);
                p.noStroke();
                p.circle(hpt.x, hpt.y, 8);
            }

            // -------------------------------------------------------------
            // PROMPT C — Tooltip box
            // -------------------------------------------------------------
            if (hoverIndex !== -1) {
                var tt = screenPts[hoverIndex];
                var boxW = 110;
                var boxH = 42;
                var pad = 8;

                var bx = mx + 12;
                var by = my - boxH - 8;

                // Clamp inside canvas
                if (bx + boxW > left + w)  bx = left + w - boxW - 5;
                if (by < top)              by = my + 12;

                // shadow
                p.noStroke();
                p.fill(0, 60);
                p.rect(bx + 2, by + 2, boxW, boxH, 6);

                // tooltip background
                p.fill(250);
                p.rect(bx, by, boxW, boxH, 6);

                // text
                p.fill(0);
                p.textAlign(p.LEFT, p.TOP);
                p.textSize(11);
                p.text("Engine: " + tt.liters.toFixed(1) + "L", bx + pad, by + 6);
                p.text("CO₂: " + tt.co2 + " g/km",      bx + pad, by + 20);
            }

            // --- 7. CAR TYPE ICONS -----------------------------------------
            p.stroke(180);
            p.strokeWeight(1);
            var iconBaselineY = innerBottom + 22;
            p.line(innerLeft, iconBaselineY, innerRight, iconBaselineY);

            var iconY = innerBottom + 18;
            var iconSize = 20;
            p.textSize(iconSize);
            p.textAlign(p.CENTER, p.CENTER);

            function drawEmoji(emoji, x, y) {
                p.noStroke();
                p.fill(255);
                p.circle(x, y, iconSize * 1.4);

                p.fill(0, 30);
                p.text(emoji, x, y + 2);

                p.fill(0);
                p.text(emoji, x, y);
            }

            var xSmall  = p.map(1400, minPower, maxPower, innerLeft, innerRight);
            var xMedium = p.map(2300, minPower, maxPower, innerLeft, innerRight);
            var xLarge  = p.map(3500, minPower, maxPower, innerLeft, innerRight);

            drawEmoji("🚗", xSmall,  iconY);
            drawEmoji("🚙", xMedium, iconY);
            drawEmoji("🚐", xLarge,  iconY);

            // --- 8. LEGEND --------------------------------------------------
            p.textSize(11);
            p.fill(60);
            p.textAlign(p.LEFT, p.TOP);

            var legendX = innerLeft + 6;
            var legendY = innerTop + 4;
            var legendSpacing = 16;

            p.text("🚗 Small cars (1.2–1.6L)", legendX, legendY);
            p.text("🚙 Sedans / crossovers (2.0–2.5L)", legendX, legendY + legendSpacing);
            p.text("🚐 Large SUVs / vans (3.0–4.0L)", legendX, legendY + legendSpacing * 2);

            // --- 9. CAPTION -------------------------------------------------
            p.textSize(11);
            p.fill(120);
            p.textAlign(p.CENTER, p.TOP);
            p.text(
                "Data source: European Vehicle CO₂ Dataset (NEDC)",
                left + w / 2,
                top + h - 5
            );
        }
    };
})();
