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

            // click handler (only attach once)
            if (!window._vizbar2_clickBound) {
                window._vizbar2_clickBound = true;

                p.canvas.addEventListener("mousedown", function (evt) {
                    var rect = p.canvas.getBoundingClientRect();
                    var mx = evt.clientX - rect.left;
                    var my = evt.clientY - rect.top;

                    if (manager.state.activeIndex !== 4) return;

                    var b = window._vizbar2_btn;
                    if (b && mx >= b.x1 && mx <= b.x2 && my >= b.y1 && my <= b.y2) {
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
                    var manu = row.make;
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

            // ================================================================
            // ✓✓ NEW SORT BUTTON (REAL BUTTON)
            // ================================================================
            var sortLabel = "Sort: " + window.VizBar2.sortMode;
            p.textSize(12);
            var tw = p.textWidth(sortLabel);

            var bw = tw + 20;      // button width
            var bh = 24;           // button height
            var bx = left + availW - bw; // right-align
            var by = top + 2;

            // Hover detection
            var mx = p.mouseX;
            var my = p.mouseY;
            var isHover = (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh);

            // Button background
            if (isHover) p.fill(235);
            else p.fill(245);

            p.stroke(0, 50);
            p.rect(bx, by, bw, bh, 6);

            // Button label
            p.noStroke();
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(sortLabel, bx + bw / 2, by + bh / 2);

            // Expose click-hitbox for event listener
            window._vizbar2_btn = { x1: bx, y1: by, x2: bx + bw, y2: by + bh };

            // ================================================================
            // Title + subtitle
            // ================================================================
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

                var bw2 = (m.avg / maxAvg) * barMaxW;
                var bx2 = left + 120;
                var by2 = y - (rowH * 0.35);
                var bh2 = rowH * 0.7;

                // bar
                p.fill(80, 150, 200, 220);
                p.noStroke();
                p.rect(bx2, by2, bw2, bh2, 3);

                // numeric label
                p.fill(0);
                p.textAlign(p.LEFT, p.CENTER);
                var label = Math.round(m.avg) + " g/km";
                p.text(label, bx2 + bw2 + 6, y);
            }

            p.pop();
        }
    };

})();
