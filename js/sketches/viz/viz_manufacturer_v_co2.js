// viz_bar.js
// Average CO₂ emissions by manufacturer (horizontal bar chart)
(function () {
    window.VizBar2 = {
        draw: function (p, manager, ai, progress) {

            var data = manager.data || [];
            var left = manager.offsetX || 20;
            var top = manager.offsetY || 0;
            var availW = (manager.width || 600) - 40;
            var availH = (manager.height || 520) - 60;

            // --- 1. Aggregate by manufacturer (cached) -----------------------
            if (!manager._manufacturerBars) {

                var agg = {}; // { name: { sum: X, count: Y } }

                for (var i = 0; i < data.length; i++) {
                    var row = data[i];
                    var manu = row.manufacturer_name_eu;
                    var co2 = parseFloat(row.co2_nedc_gpkm);

                    if (!manu || manu.trim() === "") continue;
                    if (isNaN(co2)) continue;

                    if (!agg[manu]) agg[manu] = { sum: 0, count: 0 };
                    agg[manu].sum += co2;
                    agg[manu].count += 1;
                }

                // Convert to array and apply filters
                var arr = [];
                for (var k in agg) {
                    if (agg[k].count >= 5) {
                        arr.push({
                            name: k,
                            avg: agg[k].sum / agg[k].count,
                            count: agg[k].count
                        });
                    }
                }

                // Sort by count (top 10 manufacturers)
                arr.sort(function (a, b) { return b.count - a.count; });
                arr = arr.slice(0, 10);

                // Sort final list by highest avg CO2 first
                arr.sort(function (a, b) { return b.avg - a.avg; });

                manager._manufacturerBars = arr;
            }

            var bars = manager._manufacturerBars || [];
            if (bars.length === 0) {
                p.textAlign(p.CENTER, p.CENTER);
                p.fill(0);
                p.text("No manufacturer CO₂ data available.", left + availW/2, top + availH/2);
                return;
            }

            // --- 2. Scaling --------------------------------------------------
            var maxAvg = 0;
            for (var i = 0; i < bars.length; i++) {
                if (bars[i].avg > maxAvg) maxAvg = bars[i].avg;
            }

            var rowH = availH / bars.length;
            var barMaxW = availW - 150;

            p.push();
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(12);

            // --- Title + subtitle -------------------------------------------
            p.fill(0);
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(14);
            p.text("Average CO₂ Emissions by Manufacturer (NEDC)", left + availW / 2, top - 4);

            p.textSize(11);
            p.textAlign(p.CENTER, p.TOP);
            p.text("Petrol & diesel cars only (this dataset)", left + availW / 2, top + 4);

            // shift plot down after title/subtitle
            var plotTop = top + 30;

            // --- 3. Draw bars ------------------------------------------------
            for (var i = 0; i < bars.length; i++) {
                var m = bars[i];
                var y = plotTop + i * rowH + rowH / 2;

                // manufacturer label
                p.fill(30);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(m.name, left, y);

                // bar
                var bw = (m.avg / maxAvg) * barMaxW;
                var bx = left + 120;
                var by = y - (rowH * 0.35);
                var bh = rowH * 0.7;

                p.fill(80, 150, 200, 220);
                p.noStroke();
                p.rect(bx, by, bw, bh, 3);

                // value label
                p.fill(0);
                p.textAlign(p.LEFT, p.CENTER);
                var label = Math.round(m.avg) + " g/km";
                p.text(label, bx + bw + 6, y);
            }

            p.pop();
        }
    };
})();
