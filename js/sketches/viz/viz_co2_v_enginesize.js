// viz_scatter.js
// CO₂ vs Engine Size (clean version: no threshold, no dragging)
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

            // --- 0. Min/max for scaling ------------------------------------
            var minPower = Infinity, maxPower = -Infinity;
            var minCo2 = Infinity,   maxCo2 = -Infinity;

            for (var i = 0; i < data.length; i++) {
                var d = data[i];
                if (d.power < minPower) minPower = d.power;
                if (d.power > maxPower) maxPower = d.power;
                if (d.co2   < minCo2)   minCo2   = d.co2;
                if (d.co2   > maxCo2)   maxCo2   = d.co2;
            }

            // give more room at the top for title + legend
            var innerLeft   = left + 60;
            var innerRight  = left + w - 20;
            var innerTop    = top + 60;
            var innerBottom = top + h - 50;

            // --- 1. Axes ----------------------------------------------------
            p.stroke(0);
            p.strokeWeight(1);

            // y-axis
            p.line(innerLeft, innerTop, innerLeft, innerBottom);
            // x-axis
            p.line(innerLeft, innerBottom, innerRight, innerBottom);

            // Ticks & labels
            p.textSize(10);
            p.fill(0);
            p.noStroke();

            var xticks = 5;
            for (var xi = 0; xi <= xticks; xi++) {
                var t  = xi / xticks;

                var rawX = p.lerp(minPower, maxPower, t);
                var xv   = Math.round(rawX / 100) * 100;
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

                var rawY = p.lerp(minCo2, maxCo2, ty);
                var yv   = Math.round(rawY / 20) * 20;
                var yPos = p.map(yv, minCo2, maxCo2, innerBottom, innerTop);

                p.stroke(0);
                p.line(innerLeft - 4, yPos, innerLeft, yPos);

                p.noStroke();
                p.textAlign(p.RIGHT, p.CENTER);
                p.text(yv, innerLeft - 6, yPos);
            }

            // Axis labels
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(12);
            p.text('Size (cc)', (innerLeft + innerRight) / 2, innerBottom + 24);

            p.push();
            p.translate(left + 20, (innerTop + innerBottom) / 2);
            p.rotate(-Math.PI / 2);
            p.textAlign(p.CENTER, p.TOP);
            p.text('CO₂ NEDC (g/km)', 0, 0);
            p.pop();

            // Title
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(14);
            p.text('CO₂ Emissions vs Engine Size', left + w / 2, innerTop - 24);

            // --- 2. Draw points (single-pass, uniform style) ---------------
            p.noStroke();
            p.fill(120, 120, 120, 80);

            for (var j = 0; j < data.length; j++) {
                var dpt = data[j];
                var x = p.map(dpt.power, minPower, maxPower, innerLeft, innerRight);
                var y = p.map(dpt.co2,   minCo2,   maxCo2,   innerBottom, innerTop);
                p.circle(x, y, 3);
            }

        }
    };
})();
