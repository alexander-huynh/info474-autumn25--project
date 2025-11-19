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
            var innerLeft = left + 40;
            var innerRight = left + w - 20;
            var innerTop = top + 20;
            var innerBottom = top + h - 40;

            // Draw points
            p.noStroke();
            p.fill(50, 120, 220, 150);

            for (var j = 0; j < data.length; j++) {
                var dpt = data[j];
                var x = p.map(dpt.power, minPower, maxPower, innerLeft, innerRight);
                var y = p.map(dpt.co2, minCo2, maxCo2, innerBottom, innerTop);
                p.circle(x, y, 3);
            }

        }
    };
})();
