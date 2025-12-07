// viz_emission_standards.js
// Average CO₂ emissions by country (horizontal bar chart)
(function () {

    window.VizCountry = {

        COUNTRY_NAMES: {
            AT: "Austria", BE: "Belgium", BG: "Bulgaria", CY: "Cyprus", CZ: "Czechia",
            DE: "Germany", DK: "Denmark", EE: "Estonia", EL: "Greece", ES: "Spain",
            FI: "Finland", FR: "France", HR: "Croatia", HU: "Hungary", IE: "Ireland",
            IT: "Italy", LT: "Lithuania", LU: "Luxembourg", LV: "Latvia", MT: "Malta",
            NL: "Netherlands", PL: "Poland", PT: "Portugal", RO: "Romania", SE: "Sweden",
            SI: "Slovenia", SK: "Slovakia"
        },


        sortMode: "co2",   // co2 | alpha

        cycleSort: function () {
            if (this.sortMode === "co2") this.sortMode = "alpha";
            else this.sortMode = "co2";

            window._vizcountry_needsRecalc = true;
        },

        draw: function (p, manager, ai, progress) {

            var left   = manager.offsetX || 20;
            var top    = manager.offsetY || 0;
            var availW = (manager.width  || 600) - 40;
            var availH = (manager.height || 520) - 60;

            // click area setup
            var btn = window._vizcountry_btn;

            if (!window._vizcountry_clickBound) {
                window._vizcountry_clickBound = true;

                p.canvas.addEventListener("mousedown", function(evt) {
                    var rect = p.canvas.getBoundingClientRect();
                    var mx = evt.clientX - rect.left;
                    var my = evt.clientY - rect.top;

                    if (manager.state.activeIndex !== manager.countrySlideIndex) return;

                    if (btn && mx>=btn.x1 && mx<=btn.x2 && my>=btn.y1 && my<=btn.y2) {
                        window.VizCountry.cycleSort();
                    }
                });
            }

            // --------------------------------------------------------
            // BUILD + SORT DATASET FROM REAL member_state VALUES
            // --------------------------------------------------------
            if (!manager._countryBars || window._vizcountry_needsRecalc) {
                window._vizcountry_needsRecalc = false;

                // whitelist of valid country codes in your dataset
                const VALID_MS = new Set([
                    "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
                    "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
                    "NL", "PL", "PT", "RO", "SE", "SI", "SK"
                ]);



                let agg = {};

                for (let i = 0; i < manager.data.length; i++) {
                    let row = manager.data[i];

                    let country = (row.member_state || "").toString().trim().toUpperCase();
                    let co2 = parseFloat(row.co2_nedc_gpkm);

                    if (!VALID_MS.has(country)) continue;   // ⬅️  REAL FILTER APPLIED
                    if (isNaN(co2)) continue;

                    if (!agg[country]) agg[country] = { sum: 0, count: 0 };
                    agg[country].sum += co2;
                    agg[country].count += 1;
                }

                let arr = [];

                for (let k in agg) {
                    if (agg[k].count >= 5) {
                        arr.push({
                            name: k,
                            avg: agg[k].sum / agg[k].count
                        });
                    }
                }

                if (this.sortMode === "co2") {
                    arr.sort((a, b) => b.avg - a.avg);
                } else {
                    arr.sort((a, b) => a.name.localeCompare(b.name));
                }

                manager._countryBars = arr;
            }

            var bars = manager._countryBars;

            // scaling
            var maxAvg = Math.max(...bars.map(d => d.avg));

            var rowH = bars.length > 0 ? (availH / bars.length) : 20;
            var barMaxW = availW - 150;

            p.push();

            // --------------------------------------------------------
            // Draw SORT button
            // --------------------------------------------------------
            var label = "Sort: " + this.sortMode;
            p.textSize(12);
            var tw = p.textWidth(label);

            var bw = tw + 20;
            var bh = 24;
            var bx = left + availW - bw;
            var by = top + 2;

            var mx = p.mouseX, my = p.mouseY;
            var hover = (mx>=bx && mx<=bx+bw && my>=by && my<=by+bh);

            p.fill(hover ? 225 : 240);
            p.stroke(0, 50);
            p.rect(bx, by, bw, bh, 6);

            p.fill(0);
            p.noStroke();
            p.textAlign(p.CENTER, p.CENTER);
            p.text(label, bx + bw/2, by + bh/2);

            window._vizcountry_btn = { x1:bx, y1:by, x2:bx+bw, y2:by+bh };

            // --------------------------------------------------------
            // Title + subtitle
            // --------------------------------------------------------
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(14);
            p.text("Average CO₂ Emissions by Member State", left + availW/2, top - 4);

            p.textSize(11);
            p.textAlign(p.CENTER, p.TOP);
            p.text("Average CO₂ Emissions by Member State", left + availW/2, top + 4);

            // --------------------------------------------------------
            // Bars
            // --------------------------------------------------------
            var plotTop = top + 30;

            p.textSize(12);
            for (let i=0; i<bars.length; i++) {
                var r = bars[i];
                var y = plotTop + i * rowH + rowH/2;

                p.fill(30);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(window.VizCountry.COUNTRY_NAMES[r.name] || r.name, left, y);



                var bw2 = (r.avg / maxAvg) * barMaxW;
                var bx2 = left + 120;
                var by2 = y - rowH*0.35;
                var bh2 = rowH*0.7;

                p.fill(80,150,200,220);
                p.noStroke();
                p.rect(bx2, by2, bw2, bh2, 3);

                p.fill(0);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(Math.round(r.avg) + " g/km", bx2 + bw2 + 6, y);
            }

            p.pop();
        }
    };

})();
