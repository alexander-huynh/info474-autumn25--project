// viz_bar.js
// Average CO₂ emissions by manufacturer, dual-mode (combined OR petrol vs diesel)
(function () {

    // Pagination state
    var itemsPerPage = 10;
    var pageIndex = 0;
    var maxPageIndex = 0;
    var leftArrowBounds = null;
    var rightArrowBounds = null;

    window.VizBar2 = {

        // sorting mode: "co2" | "count" | "name"
        sortMode: "co2",

        // bar mode: "dual" (petrol + diesel) or "combined" (single blue bar)
        barMode: "petrol+diesel",

        cycleSort: function () {
            if (this.sortMode === "co2") this.sortMode = "count";
            else if (this.sortMode === "count") this.sortMode = "name";
            else this.sortMode = "co2";
            window._vizbar2_needsRecalc = true;
            pageIndex = 0; // Reset to first page on sort change
        },

        toggleMode: function () {
            this.barMode = (this.barMode === "petrol+diesel" ? "combined" : "petrol+diesel");
        },

        draw: function (p, manager, ai, progress) {

            var data = manager.data || [];
            var left = manager.offsetX || 20;
            var top = manager.offsetY || 0;

            var availW = (manager.width || 600) - 40;
            var availH = (manager.height || 520) - 60;

            //------------------------------------------------------------------
            // ONE-TIME CLICK HANDLER
            //------------------------------------------------------------------
            if (!window._vizbar2_clickBound) {
                window._vizbar2_clickBound = true;

                p.canvas.addEventListener("mousedown", function (evt) {
                    var rect = p.canvas.getBoundingClientRect();
                    var mx = evt.clientX - rect.left;
                    var my = evt.clientY - rect.top;
                    if (manager.state.activeIndex !== 4) return;

                    // Sort button
                    var b = window._vizbar2_btn;
                    if (b && mx >= b.x1 && mx <= b.x2 && my >= b.y1 && my <= b.y2) {
                        window.VizBar2.cycleSort();
                        return;
                    }

                    // Mode button
                    var m = window._vizbar2_modeBtn;
                    if (m && mx >= m.x1 && mx <= m.x2 && my >= m.y1 && my <= m.y2) {
                        window.VizBar2.toggleMode();
                        return;
                    }

                    // Left arrow
                    if (leftArrowBounds &&
                        mx >= leftArrowBounds.x1 && mx <= leftArrowBounds.x2 &&
                        my >= leftArrowBounds.y1 && my <= leftArrowBounds.y2) {
                        if (pageIndex > 0) pageIndex--;
                        return;
                    }

                    // Right arrow
                    if (rightArrowBounds &&
                        mx >= rightArrowBounds.x1 && mx <= rightArrowBounds.x2 &&
                        my >= rightArrowBounds.y1 && my <= rightArrowBounds.y2) {
                        if (pageIndex < maxPageIndex) pageIndex++;
                        return;
                    }
                });
            }

            //------------------------------------------------------------------
            // 1. AGGREGATE MANUFACTURER STATS
            //------------------------------------------------------------------
            if (!manager._manufacturerBars || window._vizbar2_needsRecalc) {

                window._vizbar2_needsRecalc = false;

                var agg = {};

                for (var i = 0; i < data.length; i++) {
                    var row = data[i];
                    var manu = row.make;
                    if (!manu || !manu.trim()) continue;

                    var co2 = parseFloat(row.co2_nedc_gpkm);
                    if (isNaN(co2)) continue;

                    var rawFuel =
                        (row.fuel_type || row.fuel || row.fueltype || row.fuelType || "")
                        .toString().toLowerCase();

                    var fuel = null;
                    if (rawFuel.includes("petrol") || rawFuel.includes("gasoline")) fuel = "petrol";
                    else if (rawFuel.includes("diesel")) fuel = "diesel";
                    else continue;

                    if (!agg[manu]) agg[manu] = { pSum: 0, pCount: 0, dSum: 0, dCount: 0 };

                    if (fuel === "petrol") {
                        agg[manu].pSum += co2;
                        agg[manu].pCount++;
                    } else {
                        agg[manu].dSum += co2;
                        agg[manu].dCount++;
                    }
                }

                // Convert to array
                var arr = [];
                for (var k in agg) {
                    var o = agg[k];
                    var total = o.pCount + o.dCount;
                    if (total < 5) continue;

                    var petrolAvg = (o.pCount > 0 ? o.pSum / o.pCount : null);
                    var dieselAvg = (o.dCount > 0 ? o.dSum / o.dCount : null);
                    var combinedAvg = (o.pSum + o.dSum) / total;

                    arr.push({
                        name: k,
                        petrol: petrolAvg,
                        diesel: dieselAvg,
                        combined: combinedAvg,
                        pCount: o.pCount,
                        dCount: o.dCount,
                        total: total
                    });
                }

                // Sorting (on full dataset, not sliced)
                if (this.sortMode === "co2") arr.sort((a, b) => b.combined - a.combined);
                else if (this.sortMode === "count") arr.sort((a, b) => b.total - a.total);
                else arr.sort((a, b) => a.name.localeCompare(b.name));

                manager._manufacturerBarsAll = arr; // Store full sorted array
            }

            var allBars = manager._manufacturerBarsAll || [];

            if (!allBars || allBars.length === 0) {
                p.textAlign(p.CENTER, p.CENTER);
                p.fill(0);
                p.text("No manufacturer CO₂ data found.", left + availW / 2, top + availH / 2);
                return;
            }

            //------------------------------------------------------------------
            // PAGINATION LOGIC
            //------------------------------------------------------------------
            var totalCount = allBars.length;
            maxPageIndex = Math.max(0, Math.floor((totalCount - 1) / itemsPerPage));
            if (pageIndex > maxPageIndex) pageIndex = maxPageIndex;
            if (pageIndex < 0) pageIndex = 0;

            var startIdx = pageIndex * itemsPerPage;
            var endIdx = Math.min(startIdx + itemsPerPage, totalCount);
            var bars = allBars.slice(startIdx, endIdx);

//------------------------------------------------------------------
// 2. SCALE MAX (based on ALL data for consistent scaling across pages)
//------------------------------------------------------------------
var maxVal = 0;
if (this.barMode === "combined") {
    for (var i = 0; i < allBars.length; i++) {
        if (allBars[i].combined > maxVal) maxVal = allBars[i].combined;
    }
} else {
    for (var i = 0; i < allBars.length; i++) {
        if (allBars[i].petrol && allBars[i].petrol > maxVal) maxVal = allBars[i].petrol;
        if (allBars[i].diesel && allBars[i].diesel > maxVal) maxVal = allBars[i].diesel;
    }
}

            var rowH = (availH - 40) / itemsPerPage; // Reserve space for arrows
            var barMaxW = availW - 150;

            p.push();

            //------------------------------------------------------------------
            // TITLES (RESERVED VERTICAL SPACE)
            //------------------------------------------------------------------
            var titleMainY = top + 0;
            var titleSubY  = top + 30;
            var buttonY    = top + 48;
            var plotTop    = top + 80;  // plot begins safely below controls

            // main title
            p.textSize(22);
            p.textAlign(p.CENTER, p.TOP);
            p.fill(0);
            p.text("Average CO₂ Emissions by Manufacturer",
                   left + availW / 2, titleMainY);

            // subtitle
            p.textSize(14);
            p.textAlign(p.CENTER, p.TOP);
            p.text(
                this.barMode === "combined"
                ? "Combined Fleet CO₂ Emissions (NEDC)"
                : "Petrol vs Diesel CO₂ Emissions (NEDC)",
                left + availW / 2,
                titleSubY
            );

            //------------------------------------------------------------------
            // BUTTONS BELOW TITLES
            //------------------------------------------------------------------
            var mx = p.mouseX, my = p.mouseY;

            // Sort Button
            var sortLabel = "Sort: " + this.sortMode;
            p.textSize(18);
            var tw = p.textWidth(sortLabel);
            var bw = tw + 20;
            var bh = 24;

            var bx = left + availW - bw;
            var by = buttonY;

            var hoverSort = (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh);

            p.fill(hoverSort ? 235 : 245);
            p.stroke(0, 50);
            p.rect(bx, by, bw, bh, 6);

            p.noStroke();
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(sortLabel, bx + bw / 2, by + bh / 2);

            window._vizbar2_btn = { x1: bx, y1: by, x2: bx + bw, y2: by + bh };

            // Mode Toggle Button
            var modeLabel = "Mode: " + this.barMode;
            p.textSize(18);
            var tw2 = p.textWidth(modeLabel);
            var bw2 = tw2 + 24;
            var bh2 = 24;

            var bx2 = bx - bw2 - 10;
            var by2 = buttonY;

            var hoverMode = (mx >= bx2 && mx <= bx2 + bw2 && my >= by2 && my <= by2 + bh2);

            p.fill(hoverMode ? 235 : 245);
            p.stroke(0, 50);
            p.rect(bx2, by2, bw2, bh2, 6);

            p.noStroke();
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(modeLabel, bx2 + bw2 / 2, by2 + bh2 / 2);

            window._vizbar2_modeBtn = {
                x1: bx2, y1: by2,
                x2: bx2 + bw2, y2: by2 + bh2
            };

            //------------------------------------------------------------------
            // 3. DRAW ROWS
            //------------------------------------------------------------------
            p.textSize(16);

            for (var i = 0; i < bars.length; i++) {
                var m = bars[i];
                var yCenter = plotTop + i * rowH + rowH / 2;

                // Manufacturer name
                p.fill(30);
                p.textAlign(p.LEFT, p.CENTER);
                p.text(m.name, left, yCenter);

                var baseX = left + 150;

                //--------------------------------------------------------------
                // COMBINED MODE
                //--------------------------------------------------------------
                if (this.barMode === "combined") {

                    var w = (m.combined / maxVal) * barMaxW;

                    p.fill(80, 150, 200, 220);
                    p.noStroke();
                    p.rect(baseX, yCenter - rowH * 0.25, w, rowH * 0.5, 4);

                    p.fill(0);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text(Math.round(m.combined) + " g/km",
                           baseX + w + 6, yCenter);

                    continue;
                }

//--------------------------------------------------------------
// DUAL MODE (PETROL + DIESEL)
//--------------------------------------------------------------
var barH = rowH * 0.28;

var yPetrol = yCenter - barH - 2;
var yDiesel = yCenter + 2;

// Petrol bar
if (m.petrol !== null) {
    var wP = (m.petrol / maxVal) * barMaxW;
    p.fill(240, 140, 40, 220);
    p.noStroke();
    p.rect(baseX, yPetrol - barH / 2, wP, barH, 3);

    p.fill(0);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(Math.round(m.petrol) + " g/km",
           baseX + wP + 6, yPetrol);
} else {
    // No petrol data - show placeholder
    p.fill(180);
    p.textAlign(p.LEFT, p.CENTER);
    p.textSize(12);
    p.text("No petrol data", baseX, yPetrol);
    p.textSize(16);
}

// Diesel bar
if (m.diesel !== null) {
    var wD = (m.diesel / maxVal) * barMaxW;
    p.fill(60, 170, 70, 220);
    p.noStroke();
    p.rect(baseX, yDiesel - barH / 2, wD, barH, 3);

    p.fill(0);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(Math.round(m.diesel) + " g/km",
           baseX + wD + 6, yDiesel);
} else {
    // No diesel data - show placeholder
    p.fill(180);
    p.textAlign(p.LEFT, p.CENTER);
    p.textSize(12);
    p.text("No diesel data", baseX, yDiesel);
    p.textSize(16);
}
            }

            //------------------------------------------------------------------
            // PAGINATION ARROWS
            //------------------------------------------------------------------
            var arrowY = plotTop + itemsPerPage * rowH + 10;
            var arrowSize = 30;
            var gapArrows = 8;
            var controlsXRight = left + availW;

            rightArrowBounds = {
                x1: controlsXRight - arrowSize,
                y1: arrowY - arrowSize / 2,
                x2: controlsXRight,
                y2: arrowY + arrowSize / 2
            };

            leftArrowBounds = {
                x1: rightArrowBounds.x1 - gapArrows - arrowSize,
                y1: rightArrowBounds.y1,
                x2: rightArrowBounds.x1 - gapArrows,
                y2: rightArrowBounds.y2
            };

            // Page info text
            p.textAlign(p.RIGHT, p.CENTER);
            p.textSize(15);
            p.fill(0);
            p.noStroke();
            var pageInfo = (pageIndex + 1) + " / " + (maxPageIndex + 1);
            p.text(pageInfo, leftArrowBounds.x1 - 12, arrowY);

            // Draw left arrow box
            p.rectMode(p.CORNER);
            var hoverLeft = (mx >= leftArrowBounds.x1 && mx <= leftArrowBounds.x2 &&
                             my >= leftArrowBounds.y1 && my <= leftArrowBounds.y2);
            if (pageIndex === 0) {
                p.fill(235);
                p.stroke(210);
            } else {
                p.fill(hoverLeft ? 225 : 245);
                p.stroke(200);
            }
            p.rect(leftArrowBounds.x1, leftArrowBounds.y1,
                leftArrowBounds.x2 - leftArrowBounds.x1,
                leftArrowBounds.y2 - leftArrowBounds.y1, 4);

            // Draw right arrow box
            var hoverRight = (mx >= rightArrowBounds.x1 && mx <= rightArrowBounds.x2 &&
                              my >= rightArrowBounds.y1 && my <= rightArrowBounds.y2);
            if (pageIndex === maxPageIndex) {
                p.fill(235);
                p.stroke(210);
            } else {
                p.fill(hoverRight ? 225 : 245);
                p.stroke(200);
            }
            p.rect(rightArrowBounds.x1, rightArrowBounds.y1,
                rightArrowBounds.x2 - rightArrowBounds.x1,
                rightArrowBounds.y2 - rightArrowBounds.y1, 4);

            // Arrow labels
            p.noStroke();
            p.fill(pageIndex === 0 ? 180 : 0);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(16);
            p.text("<",
                (leftArrowBounds.x1 + leftArrowBounds.x2) / 2,
                (leftArrowBounds.y1 + leftArrowBounds.y2) / 2);

            p.fill(pageIndex === maxPageIndex ? 180 : 0);
            p.text(">",
                (rightArrowBounds.x1 + rightArrowBounds.x2) / 2,
                (rightArrowBounds.y1 + rightArrowBounds.y2) / 2);

            p.pop();
        }
    };

})();