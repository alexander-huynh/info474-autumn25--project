// viz_scatter.js
// CO₂ vs Engine Size with interactive "big engine" threshold line
(function () {

    // persistent state across frames
    var engineThreshold = null;   // in same units as d.power (cc)
    
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

            // give more room at the top for title + subtitle + legend
            var innerLeft   = left + 60;
            var innerRight  = left + w - 20;
            var innerTop    = top + 60;   // was top + 30
            var innerBottom = top + h - 50;

            // --- 1. User interaction: set / move threshold -----------------
            // initialize threshold around "larger engines" if not set
            if (engineThreshold === null ||
                engineThreshold < minPower ||
                engineThreshold > maxPower) {
                engineThreshold = p.lerp(minPower, maxPower, 0.7);
            }

            // drag horizontally inside the plot area to move the line
            if (p.mouseIsPressed &&
                p.mouseX >= innerLeft && p.mouseX <= innerRight &&
                p.mouseY >= innerTop && p.mouseY <= innerBottom) {

                engineThreshold = p.map(p.mouseX, innerLeft, innerRight,
                                        minPower, maxPower);
            }

            // --- 2. Axes ----------------------------------------------------
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

                // rounded, more readable tick labels
                var rawX = p.lerp(minPower, maxPower, t);
                var xv   = Math.round(rawX / 100) * 100; // snap to nearest 100 cc
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

                // rounded, more readable CO₂ ticks
                var rawY = p.lerp(minCo2, maxCo2, ty);
                var yv   = Math.round(rawY / 20) * 20; // snap to nearest 20 g/km
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

            // Title (above plot area)
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(14);
            p.text('CO₂ Emissions vs Engine Size', left + w / 2, innerTop - 24);

            // Instruction subtitle under title
            p.textSize(11);
            p.textAlign(p.CENTER, p.TOP);
            p.text(
                'Drag the vertical line to change what counts as a “big engine”.',
                left + w / 2,
                innerTop - 10
            );

            // Mini legend, now a bit lower inside the plot
            p.noStroke();
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(11);

            // smaller engines (gray)
            p.fill(120, 120, 120, 120);
            p.circle(innerLeft + 10, innerTop + 8, 5);
            p.fill(0);
            p.text('Smaller engines', innerLeft + 20, innerTop + 8);

            // "big engines" (blue)
            p.fill(50, 120, 220, 180);
            p.circle(innerLeft + 10, innerTop + 24, 5);
            p.fill(0);
            p.text('“Big engines” (≥ threshold)', innerLeft + 20, innerTop + 24);

            // --- 3. Draw points with threshold highlighting ----------------
            var countAbove = 0;
            var totalCo2   = 0;
            var co2Above   = 0;

            // First pass: dim points below threshold, count stats
            p.noStroke();
            for (var j = 0; j < data.length; j++) {
                var dpt = data[j];
                var x = p.map(dpt.power, minPower, maxPower, innerLeft, innerRight);
                var y = p.map(dpt.co2,   minCo2,   maxCo2,   innerBottom, innerTop);

                totalCo2 += dpt.co2;

                if (dpt.power < engineThreshold) {
                    // below threshold → gray + faint
                    p.fill(120, 120, 120, 40);
                    p.circle(x, y, 3);
                } else {
                    // above threshold → count and sum, will draw bright later
                    countAbove++;
                    co2Above += dpt.co2;
                }
            }

            // Second pass: bright points at/above threshold
            p.noStroke();
            p.fill(50, 120, 220, 180);
            for (var k = 0; k < data.length; k++) {
                var dp2 = data[k];
                if (dp2.power < engineThreshold) continue;

                var x2 = p.map(dp2.power, minPower, maxPower, innerLeft, innerRight);
                var y2 = p.map(dp2.co2,   minCo2,   maxCo2,   innerBottom, innerTop);
                p.circle(x2, y2, 3);
            }

            // --- 4. Draw the threshold line + label ------------------------
            var thrX = p.map(engineThreshold, minPower, maxPower,
                             innerLeft, innerRight);

            p.stroke(0, 0, 0, 160);
            p.strokeWeight(2);
            p.line(thrX, innerTop, thrX, innerBottom);

            var pctAboveCars = Math.round((countAbove / data.length) * 100);
            var pctCo2Share  = totalCo2 > 0
                ? Math.round((co2Above / totalCo2) * 100)
                : 0;

            var labelText =
                'Big engines ≥ ' + Math.round(engineThreshold) + ' cc\n' +
                pctAboveCars + '% of cars, ~' + pctCo2Share + '% of CO₂';

            p.noStroke();
            p.fill(255);
            p.rectMode(p.CENTER);

            // make the bubble wide enough for the two-line label
            p.textSize(11);
            var tw = p.textWidth('Big engines ≥ ' + Math.round(engineThreshold) + ' cc') + 24;
            var rectW = Math.max(220, tw);
            var rectH = 36;

            p.rect(thrX, innerBottom + 40, rectW, rectH, 6);

            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(labelText, thrX, innerBottom + 40);

            // reset rect mode for other sketches
            p.rectMode(p.CORNER);
        }
    };
})();
