// viz_scatter2.js
// Scatter: CO2 NEDC (g/km) vs Engine Power (kW)
(function () {
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

            // Build a clean list of numeric points from co2_nedc_gpkm + engine_power_kw
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

            // Get min/max for scaling
            var minPower = Infinity, maxPower = -Infinity;
            var minCo2 = Infinity, maxCo2 = -Infinity;
            for (var j = 0; j < pts.length; j++) {
                var d = pts[j];
                if (d.powerKw < minPower) minPower = d.powerKw;
                if (d.powerKw > maxPower) maxPower = d.powerKw;
                if (d.co2 < minCo2) minCo2 = d.co2;
                if (d.co2 > maxCo2) maxCo2 = d.co2;
            }

            // Inner plot area
            var innerLeft = left + 60;          // extra room for y labels
            var innerRight = left + w - 20;
            var innerTop = top + 30;
            var innerBottom = top + h - 50;

            // --- 1. Axes -----------------------------------------------------
            p.stroke(0);
            p.strokeWeight(1);
            // y-axis
            p.line(innerLeft, innerTop, innerLeft, innerBottom);
            // x-axis
            p.line(innerLeft, innerBottom, innerRight, innerBottom);

            // --- 2. Tick marks & numeric labels ------------------------------
            p.textSize(10);
            p.fill(0);
            p.noStroke();

            var xticks = 5;
            for (var xi = 0; xi <= xticks; xi++) {
                var t = xi / xticks;
                var val = p.lerp(minPower, maxPower, t);
                var xPos = p.map(val, minPower, maxPower, innerLeft, innerRight);

                p.stroke(0);
                p.line(xPos, innerBottom, xPos, innerBottom + 4);

                p.noStroke();
                p.textAlign(p.CENTER, p.TOP);
                p.text(Math.round(val), xPos, innerBottom + 6);
            }

            var yticks = 5;
            for (var yi = 0; yi <= yticks; yi++) {
                var ty = yi / yticks;
                var v = p.lerp(minCo2, maxCo2, ty);
                var yPos = p.map(v, minCo2, maxCo2, innerBottom, innerTop);

                p.stroke(0);
                p.line(innerLeft - 4, yPos, innerLeft, yPos);

                p.noStroke();
                p.textAlign(p.RIGHT, p.CENTER);
                p.text(Math.round(v), innerLeft - 6, yPos);
            }

            // --- 3. Axis labels ----------------------------------------------
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(12);
            p.text('Engine Power (kW)', (innerLeft + innerRight) / 2, innerBottom + 24);

            p.push();
            p.translate(left + 20, (innerTop + innerBottom) / 2);
            p.rotate(-Math.PI / 2);
            p.textAlign(p.CENTER, p.TOP);
            p.text('CO₂ NEDC (g/km)', 0, 0);
            p.pop();

            // --- 4. Title ----------------------------------------------------
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(14);
            p.text('CO₂ Emissions vs Engine Power (kW)', left + w / 2, innerTop - 8);

            // --- 5. Draw points ---------------------------------------------
            p.noStroke();
            p.fill(50, 120, 220, 150);

            for (var k = 0; k < pts.length; k++) {
                var pt = pts[k];
                var x = p.map(pt.powerKw, minPower, maxPower, innerLeft, innerRight);
                var y = p.map(pt.co2,     minCo2,   maxCo2,   innerBottom, innerTop);
                p.circle(x, y, 3);
            }
        }
    };
})();
