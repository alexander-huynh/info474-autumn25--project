(function () {
    window.VizBar3 = {
        draw: function (p, manager, ai, progress) {

            // layout
            var data = manager.data || [];
            var left = manager.offsetX || 0;
            var top = manager.offsetY || 0;
            var w = manager.width || 600;
            var h = manager.height || 520;

            // background + default text
            p.background(255);
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(16);

            if (!data.length) {
                p.text('No data loaded for fuel-type plot.', left + w / 2, top + h / 2);
                return;
            }


            var pts = [];

            for (var i = 0; i < data.length; i++) {
                var row = data[i];

                // CO₂ numeric
                var co2 = parseFloat(row.co2_nedc_gpkm);
                if (isNaN(co2)) continue;

                // Fuel type column
                var rawFuel = (
                    row.fuel_type ||
                    row.fuel ||
                    row.fueltype ||
                    row.fuelType ||
                    ""
                ).toString().toLowerCase();

                // Petrol or Diesel
                var fuel = "Diesel";
                if (rawFuel.includes("petrol") || rawFuel.includes("gasoline")) {
                    fuel = "Petrol";
                }
                if (rawFuel.includes("diesel")) {
                    fuel = "Diesel";
                }

                pts.push({ co2: co2, fuel: fuel });
            }

            if (!pts.length) {
                p.text('No valid numeric data for fuel-type plot.', left + w / 2, top + h / 2);
                return;
            }

            // Group values + find min/max
            var groups = { Petrol: [], Diesel: [] };
            var minCo2 = Infinity;
            var maxCo2 = -Infinity;

            for (var j = 0; j < pts.length; j++) {
                var d = pts[j];
                groups[d.fuel].push(d.co2);

                if (d.co2 < minCo2) minCo2 = d.co2;
                if (d.co2 > maxCo2) maxCo2 = d.co2;
            }

            if (!isFinite(minCo2) || !isFinite(maxCo2)) {
                p.text('No valid CO₂ range.', left + w / 2, top + h / 2);
                return;
            }

            var innerLeft = left + 60;  
            var innerRight = left + w - 20;
            var innerTop = top + 40;
            var innerBottom = top + h - 60;

            // Axes
            p.stroke(0);
            p.strokeWeight(1);

            // y-axis
            p.line(innerLeft, innerTop, innerLeft, innerBottom);

            // x-axis
            p.line(innerLeft, innerBottom, innerRight, innerBottom);

            // Y ticks
            p.textSize(10);
            p.fill(0);
            p.noStroke();

            var yticks = 5;
            for (var yi = 0; yi <= yticks; yi++) {
                var t = yi / yticks;
                var val = p.lerp(minCo2, maxCo2, t);
                var yPos = p.map(val, minCo2, maxCo2, innerBottom, innerTop);

                p.stroke(0);
                p.line(innerLeft - 4, yPos, innerLeft, yPos);

                p.noStroke();
                p.textAlign(p.RIGHT, p.CENTER);
                p.text(Math.round(val), innerLeft - 6, yPos);
            }

            var fuels = ["Petrol", "Diesel"];
            var plotWidth = innerRight - innerLeft;
            var step = plotWidth / 2;

            var centers = [
                innerLeft + step * 0.5,
                innerLeft + step * 1.5
            ];

            // X category labels
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(10);
            p.text("Petrol", centers[0], innerBottom + 8);
            p.text("Diesel", centers[1], innerBottom + 8);

            // X-axis label
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(12);
            p.text("Fuel Type", (innerLeft + innerRight) / 2, innerBottom + 26);

            // Y-axis label (rotated)
            p.push();
            p.translate(left + 20, (innerTop + innerBottom) / 2);
            p.rotate(-Math.PI / 2);
            p.textAlign(p.CENTER, p.TOP);
            p.text("CO₂ NEDC (g/km)", 0, 0);
            p.pop();

            // Title
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(14);
            p.text("Petrol vs Diesel: CO₂ NEDC", left + w / 2, innerTop - 10);


            p.noStroke();
            p.fill(50, 120, 220, 150);

            var jitterW = step * 0.4;

            // PETROL POINTS
            var petrolVals = groups.Petrol;
            for (var pi = 0; pi < petrolVals.length; pi++) {
                var valP = petrolVals[pi];

                var yP = p.map(valP, minCo2, maxCo2, innerBottom, innerTop);
                var bucketP = pi % 7;

                var xP = p.map(bucketP, 0, 6,
                    centers[0] - jitterW / 2,
                    centers[0] + jitterW / 2
                );

                p.circle(xP, yP, 4);
            }

            // DIESEL POINTS
            var dieselVals = groups.Diesel;
            for (var di = 0; di < dieselVals.length; di++) {
                var valD = dieselVals[di];

                var yD = p.map(valD, minCo2, maxCo2, innerBottom, innerTop);
                var bucketD = di % 7;

                var xD = p.map(bucketD, 0, 6,
                    centers[1] - jitterW / 2,
                    centers[1] + jitterW / 2
                );

                p.circle(xD, yD, 4);
            }

        }
    };
})();
