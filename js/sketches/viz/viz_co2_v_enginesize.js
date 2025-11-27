// viz_scatter.js
// CO₂ vs Engine Size (cropped domain + better ticks + CAR TYPE ICONS)
(function () {

    window.VizScatter = {
        draw: function (p, manager, ai, progress) {
            var data = manager.data || [];
            var left = manager.offsetX || 0;
            var top = manager.offsetY || 0;
            var w = manager.width || 600;
            var h = manager.height || 520;

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
            var minCo2 = Infinity,  maxCo2 = -Infinity;

            for (var i = 0; i < data.length; i++) {
                var d = data[i];
                if (d.power < rawMin) rawMin = d.power;
                if (d.power > rawMax) rawMax = d.power;
                if (d.co2   < minCo2) minCo2 = d.co2;
                if (d.co2   > maxCo2) maxCo2 = d.co2;
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
                var rawY = p.lerp(minCo2, maxCo2, t);
                var yv   = Math.round(rawY / 20) * 20;
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

            var xtickLiters = [1.0, 2.0, 3.0, 4.0, 5.0];
            for (var xi = 0; xi < xtickLiters.length; xi++) {
                var liters = xtickLiters[xi];
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
                var ty = yi / yticks;
                var rawY = p.lerp(minCo2, maxCo2, ty);
                var yv   = Math.round(rawY / 20) * 20;
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

            // --- 6. Draw points --------------------------------------------
            p.noStroke();
            p.fill(100, 100, 100, 120);

            var pointSize = 4;
            for (var j = 0; j < data.length; j++) {
                var dpt = data[j];
                var eng = clamp(dpt.power, minPower, maxPower);

                var x = p.map(eng, minPower, maxPower, innerLeft, innerRight);
                var y = p.map(dpt.co2, minCo2, maxCo2, innerBottom, innerTop);

                p.circle(x, y, pointSize);
            }

            // --- 7. CAR TYPE ICONS (emoji, improved) --------------------------------

            // icon baseline (thin line behind emojis)
            p.stroke(180);
            p.strokeWeight(1);
            var iconBaselineY = innerBottom + 22;
            p.line(innerLeft, iconBaselineY, innerRight, iconBaselineY);

            // emoji settings
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

            // --- 8. CAPTION (NEW, minimal, outside graph) ---------------------
            p.textSize(11);
            p.fill(120);
            p.textAlign(p.CENTER, p.TOP);
            p.text(
                "Data source: European Vehicle CO₂ Dataset (NEDC)",
                left + w / 2,
                top + h - 5   // placed below the entire plot area
            );

        }
    };
})();
