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

            // If we have data, show how many rows and the first row's values
            var first = data[0] || {};
            var line1 = 'Rows loaded: ' + data.length;
            var line2 = 'First row → co2: ' + first.co2 + ', power: ' + first.power;

            p.text(line1, left + w / 2, top + h / 2 - 12);
            p.text(line2, left + w / 2, top + h / 2 + 12);
        }
    };
})();
