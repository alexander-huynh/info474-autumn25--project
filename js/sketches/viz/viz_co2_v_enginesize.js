// viz_scatter.js
// Simple debug view: just report whether data loaded and show first row.
(function () {
    window.VizScatter = {
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
                p.text('No data loaded for scatterplot.', left + w / 2, top + h / 2);
                return;
            }

            // If we have data, draw a simple scatter: power (x) vs co2 (y)

            // Get min/max for scaling
            var minPower = Infinity, maxPower = -Infinity;
            var minCo2 = Infinity, maxCo2 = -Infinity;
            for (var i = 0; i < data.length; i++) {
                var d = data[i];
                if (d.power < minPower) minPower = d.power;
                if (d.power > maxPower) maxPower = d.power;
                if (d.co2 < minCo2) minCo2 = d.co2;
                if (d.co2 > maxCo2) maxCo2 = d.co2;
            }

            // Simple margins inside the canvas
            var innerLeft = left + 60;          // a bit more room for y label
            var innerRight = left + w - 20;
            var innerTop = top + 30;
            var innerBottom = top + h - 50;

            // --- 1. Draw axes ------------------------------------------------
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

            var xticks = 5;  // number of tick steps on x
            for (var xi = 0; xi <= xticks; xi++) {
                var t = xi / xticks;
                var val = p.lerp(minPower, maxPower, t);
                var xPos = p.map(val, minPower, maxPower, innerLeft, innerRight);

                // tick line
                p.stroke(0);
                p.line(xPos, innerBottom, xPos, innerBottom + 4);

                // label
                p.noStroke();
                p.textAlign(p.CENTER, p.TOP);
                p.text(Math.round(val), xPos, innerBottom + 6);
            }

            var yticks = 5;
            for (var yi = 0; yi <= yticks; yi++) {
                var ty = yi / yticks;
                var v = p.lerp(minCo2, maxCo2, ty);
                var yPos = p.map(v, minCo2, maxCo2, innerBottom, innerTop);

                // tick line
                p.stroke(0);
                p.line(innerLeft - 4, yPos, innerLeft, yPos);

                // label
                p.noStroke();
                p.textAlign(p.RIGHT, p.CENTER);
                p.text(Math.round(v), innerLeft - 6, yPos);
            }

            // --- 3. Axis labels ----------------------------------------------

            // x-axis label
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(12);
            p.text('Engine Size (cc)', (innerLeft + innerRight) / 2, innerBottom + 24);

            // y-axis label (rotated)
            p.push();
            p.translate(left + 20, (innerTop + innerBottom) / 2);
            p.rotate(-Math.PI / 2);
            p.textAlign(p.CENTER, p.TOP);
            p.text('CO₂ NEDC (g/km)', 0, 0);
            p.pop();

            // --- 4. Title ----------------------------------------------------
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(14);
            p.text('CO₂ Emissions vs Engine Size', left + w / 2, innerTop - 8);

            // --- 5. Draw points ---------------------------------------------
            p.noStroke();
            p.fill(50, 120, 220, 150);

            for (var j = 0; j < data.length; j++) {
                var dpt = data[j];
                var x = p.map(dpt.power, minPower, maxPower, innerLeft, innerRight);
                var y = p.map(dpt.co2,  minCo2,  maxCo2,  innerBottom, innerTop);
                p.circle(x, y, 3);
            }


        }
    };
})();
