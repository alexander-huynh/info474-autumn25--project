// viz_bar.js
// Average CO₂ emissions by manufacturer (horizontal bar chart)
(function () {

    window.VizBar2 = {

        // sorting mode: "co2" | "count" | "alpha"
        sortMode: "co2",

        cycleSort: function () {
            if (this.sortMode === "co2") this.sortMode = "count";
            else if (this.sortMode === "count") this.sortMode = "alpha";
            else this.sortMode = "co2";

            window._vizbar2_needsRecalc = true;
        },

        draw: function (p, manager, ai, progress) {

            var data = manager.data || [];
            var left = manager.offsetX || 20;
            var top = manager.offsetY || 0;
            var availW = (manager.width || 600) - 40;
            var availH = (manager.height || 520) - 60;

            // clickable sort indicator bounds
            var sortX1 = left + availW - 120;
            var sortX2 = left + availW;
            var sortY1 = top;
            var sortY2 = top + 20;

            // handle click
            if (!window._vizbar2_clickBound) {
                window._vizbar2_clickBound = true;
                p.canvas.addEventListener("mousedown", function (evt) {
                    var rect = p.canvas.getBoundingClientRect();
                    var mx = evt.clientX - rect.left;
                    var my = evt.clientY - rect.top;

                    // only active on this slide
                    if (manager.state.activeIndex !== 4) return;

                    if (mx >= sortX1 && mx <= sortX2 && my >= sortY1 && my <= sortY2) {
                        window.VizBar2.cycleSort();
                    }
                });
            }

            // --- 1. Aggregate by manufacturer (cached unless sorting changed) -----------------------
            if (!manager._manufacturerBars || window._vizbar2_needsRecalc) {

                window._vizbar2_needsRecalc = false;

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

                // Limit to top 10 by count before sorting
                arr.sort((a, b) => b.count - a.count);
                arr = arr.slice(0, 10);

                // Sorting modes
                if (window.VizBar2.sortMode === "co2") {
                    arr.sort((a, b) => b.avg - a.avg);
                }
                else if (window.VizBar2.sortMode === "count") {
                    arr.sort((a, b) => b.count - a.count);
                }
                else if (window.VizBar2.sortMode === "alpha") {
                    arr.sort((a, b) => a.name.localeCompare(b.name));
                }

                manager._manufacturerBars = arr;
            }

            var bars = manager._manufacturerBars || [];
            if (bars.length === 0) {
                p.textAlign(p.CENTER, p.CENTER);
                p.fill(0);
                p.text("No manufacturer CO₂ data available.", left + availW / 2, top + availH / 2);
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

            // --- Sort Indicator -----------------------------------------------
            p.fill(0);
            p.textAlign(p.RIGHT, p.TOP);
            p.textSize(12);
            p.text("Sort: " + window.VizBar2.sortMode, left + availW, top);

            // --- Title + subtitle -------------------------------------------
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(14);
            p.text("Average CO₂ Emissions by Manufacturer (NEDC)", left + availW / 2, top - 4);

            p.textSize(11);
            p.textAlign(p.CENTER, p.TOP);
            p.text("Petrol & diesel cars only (this dataset)", left + availW / 2, top + 4);

            var plotTop = top + 30;

            // --- 3. Draw bars ------------------------------------------------
            p.textSize(12);
            for (var i = 0; i < bars.length; i++) {
                var m = bars[i];
                var y = plotTop + i * rowH + rowH / 2;

                // manufacturer name
                p.fill(30);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(m.name, left, y);

                var bw = (m.avg / maxAvg) * barMaxW;
                var bx = left + 120;
                var by = y - (rowH * 0.35);
                var bh = rowH * 0.7;

                // bar
                p.fill(80, 150, 200, 220);
                p.noStroke();
                p.rect(bx, by, bw, bh, 3);

                // numeric label
                p.fill(0);
                p.textAlign(p.LEFT, p.CENTER);
                var label = Math.round(m.avg) + " g/km";
                p.text(label, bx + bw + 6, y);
            }

            p.pop();
        }
    };

})();
