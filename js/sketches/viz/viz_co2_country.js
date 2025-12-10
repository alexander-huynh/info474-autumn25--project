// viz_emission_standards.js
// Average CO₂ emissions by country (horizontal bar chart, combined vs dual fuel mode)
(function () {

    // Pagination state
    var itemsPerPage = 10;
    var pageIndex = 0;
    var maxPageIndex = 0;
    var leftArrowBounds = null;
    var rightArrowBounds = null;

    window.VizCountry = {

        COUNTRY_NAMES: {
            AT: "Austria", BE: "Belgium", BG: "Bulgaria", CY: "Cyprus", CZ: "Czechia",
            DE: "Germany", DK: "Denmark", EE: "Estonia", EL: "Greece", ES: "Spain",
            FI: "Finland", FR: "France", HR: "Croatia", HU: "Hungary", IE: "Ireland",
            IT: "Italy", LT: "Lithuania", LU: "Luxembourg", LV: "Latvia", MT: "Malta",
            NL: "Netherlands", PL: "Poland", PT: "Portugal", RO: "Romania", SE: "Sweden",
            SI: "Slovenia", SK: "Slovakia"
        },

        COUNTRY_FLAGS: {
            AT: "🇦🇹", BE: "🇧🇪", BG: "🇧🇬", CY: "🇨🇾", CZ: "🇨🇿",
            DE: "🇩🇪", DK: "🇩🇰", EE: "🇪🇪", EL: "🇬🇷", ES: "🇪🇸",
            FI: "🇫🇮", FR: "🇫🇷", HR: "🇭🇷", HU: "🇭🇺", IE: "🇮🇪",
            IT: "🇮🇹", LT: "🇱🇹", LU: "🇱🇺", LV: "🇱🇻", MT: "🇲🇹",
            NL: "🇳🇱", PL: "🇵🇱", PT: "🇵🇹", RO: "🇷🇴", SE: "🇸🇪",
            SI: "🇸🇮", SK: "🇸🇰"
        },

        // sorting + mode toggles
        sortMode: "co2",       // "co2" | "name"
        mode: "combined",      // "combined" | "dual"

        cycleSort: function () {
            this.sortMode = (this.sortMode === "co2" ? "name" : "co2");
            window._vizcountry_needsRecalc = true;
            pageIndex = 0; // Reset to first page on sort change
        },

        toggleMode: function () {
            this.mode = (this.mode === "combined" ? "dual" : "combined");
            window._vizcountry_needsRecalc = true;
        },

        draw: function (p, manager, ai, progress) {

            var left   = manager.offsetX || 20;
            var top    = manager.offsetY || 0;
            var availW = (manager.width  || 600) - 40;
            var availH = (manager.height || 520) - 60;

            // --------------------------------------------------------
            // REBUILD DATASET
            // --------------------------------------------------------
            if (window._vizcountry_needsRecalc) {
                manager._countryBarsAll = null;
            }

            if (!manager._countryBarsAll) {
                window._vizcountry_needsRecalc = false;

                const VALID_MS = new Set([
                    "AT","BE","BG","CY","CZ","DE","DK","EE","EL","ES",
                    "FI","FR","HR","HU","IE","IT","LT","LU","LV","MT",
                    "NL","PL","PT","RO","SE","SI","SK"
                ]);

                let agg = {};

                // Aggregate petrol vs diesel values per country
                for (let i = 0; i < manager.data.length; i++) {
                    let row = manager.data[i];

                    let country = (row.member_state || "")
                       .toString().trim().toUpperCase();
                    if (!VALID_MS.has(country)) continue;

                    let co2 = parseFloat(row.co2_nedc_gpkm);
                    if (isNaN(co2)) continue;

                    let rawFuel = (row.fuel_type || row.fuel || "")
                        .toString().toLowerCase();

                    let fuel = null;
                    if (rawFuel.includes("petrol") || rawFuel.includes("gasoline"))
                        fuel = "petrol";
                    else if (rawFuel.includes("diesel"))
                        fuel = "diesel";
                    else
                        continue;

                    if (!agg[country])
                        agg[country] = { pSum:0, pCount:0, dSum:0, dCount:0 };

                    if (fuel === "petrol") {
                        agg[country].pSum += co2;
                        agg[country].pCount++;
                    } else {
                        agg[country].dSum += co2;
                        agg[country].dCount++;
                    }
                }

                // Build final array
                let arr = [];

                for (let k in agg) {
                    let a = agg[k];
                    let total = a.pCount + a.dCount;
                    if (total < 5) continue;

                    let petrolAvg = (a.pCount > 0 ? a.pSum / a.pCount : null);
                    let dieselAvg = (a.dCount > 0 ? a.dSum / a.dCount : null);
                    let combinedAvg = (a.pSum + a.dSum) / total;

                    arr.push({
                        name: k,
                        petrol: petrolAvg,
                        diesel: dieselAvg,
                        combined: combinedAvg,
                        total: total
                    });
                }

                // Sort
                if (this.sortMode === "co2")
                    arr.sort((a, b) => b.combined - a.combined);
                else
                    arr.sort((a, b) => a.name.localeCompare(b.name));

                // Store ALL countries (not sliced)
                manager._countryBarsAll = arr;
            }

            var allBars = manager._countryBarsAll || [];

            if (!allBars || allBars.length === 0) {
                p.textAlign(p.CENTER, p.CENTER);
                p.fill(0);
                p.text("No country CO₂ data found.", left + availW / 2, top + availH / 2);
                return;
            }

            // --------------------------------------------------------
            // PAGINATION LOGIC
            // --------------------------------------------------------
            var totalCount = allBars.length;
            maxPageIndex = Math.max(0, Math.floor((totalCount - 1) / itemsPerPage));
            if (pageIndex > maxPageIndex) pageIndex = maxPageIndex;
            if (pageIndex < 0) pageIndex = 0;

            var startIdx = pageIndex * itemsPerPage;
            var endIdx = Math.min(startIdx + itemsPerPage, totalCount);
            var bars = allBars.slice(startIdx, endIdx);

            // --------------------------------------------------------
            // COMPUTE MAX VALUE (from ALL data for consistent scaling)
            // --------------------------------------------------------
            var maxVal = 0;
            if (this.mode === "combined") {
                for (let b of allBars)
                    if (b.combined > maxVal) maxVal = b.combined;
            } else {
                for (let b of allBars) {
                    if (b.petrol && b.petrol > maxVal) maxVal = b.petrol;
                    if (b.diesel && b.diesel > maxVal) maxVal = b.diesel;
                }
            }

            var rowH = (availH - 40) / itemsPerPage; // Reserve space for arrows
            var barMaxW = availW - 170; // Adjusted for flag space
            p.push();

            // --------------------------------------------------------
            // UI BUTTONS
            // --------------------------------------------------------

            var mx = p.mouseX, my = p.mouseY;

            // SORT BUTTON (top right)
            var sortLabel = "Sort: " + this.sortMode;
            p.textSize(18);
            var tw = p.textWidth(sortLabel);
            var bw = tw + 20, bh = 24;
            var bx = left + availW - bw;
            var by = top + 34;

            var hoverSort = (mx>=bx && mx<=bx+bw && my>=by && my<=by+bh);

            p.fill(hoverSort ? 230 : 245);
            p.stroke(0, 50);
            p.rect(bx, by, bw, bh, 6);
            p.noStroke();
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(sortLabel, bx + bw/2, by + bh/2);

            window._vizcountry_sort_btn = { x1:bx, y1:by, x2:bx+bw, y2:by+bh };


            // MODE BUTTON (top left)
            var modeLabel = (this.mode === "combined" ? "Mode: combined" : "Mode: petrol+diesel");
            p.textSize(18);
            var tw2 = p.textWidth(modeLabel);
            var bw2 = tw2 + 20, bh2 = 24;
            var bx2 = left;
            var by2 = top + 34;

            var hoverMode = (mx>=bx2 && mx<=bx2+bw2 && my>=by2 && my<=by2+bh2);

            p.fill(hoverMode ? 230 : 245);
            p.stroke(0, 50);
            p.rect(bx2, by2, bw2, bh2, 6);
            p.noStroke();
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.text(modeLabel, bx2 + bw2/2, by2 + bh2/2);

            window._vizcountry_mode_btn = { x1:bx2, y1:by2, x2:bx2+bw2, y2:by2+bh2 };


            // --------------------------------------------------------
            // CLICK HANDLER
            // --------------------------------------------------------
            if (!window._vizcountry_clickBound) {
                window._vizcountry_clickBound = true;

                p.canvas.addEventListener("mousedown", function(evt) {
                    var rect = p.canvas.getBoundingClientRect();
                    var x = evt.clientX - rect.left;
                    var y = evt.clientY - rect.top;

                    // Check if this viz is active (index 5)
                    if (manager.state.activeIndex !== 5) return;

                    let s = window._vizcountry_sort_btn;
                    if (s && x>=s.x1 && x<=s.x2 && y>=s.y1 && y<=s.y2) {
                        window.VizCountry.cycleSort();
                        return;
                    }

                    let m = window._vizcountry_mode_btn;
                    if (m && x>=m.x1 && x<=m.x2 && y>=m.y1 && y<=m.y2) {
                        window.VizCountry.toggleMode();
                        return;
                    }

                    // Left arrow
                    if (leftArrowBounds &&
                        x >= leftArrowBounds.x1 && x <= leftArrowBounds.x2 &&
                        y >= leftArrowBounds.y1 && y <= leftArrowBounds.y2) {
                        if (pageIndex > 0) pageIndex--;
                        return;
                    }

                    // Right arrow
                    if (rightArrowBounds &&
                        x >= rightArrowBounds.x1 && x <= rightArrowBounds.x2 &&
                        y >= rightArrowBounds.y1 && y <= rightArrowBounds.y2) {
                        if (pageIndex < maxPageIndex) pageIndex++;
                        return;
                    }
                });
            }

            // --------------------------------------------------------
            // TITLES
            // --------------------------------------------------------
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(22);
            p.fill(0);
            p.text("Average CO₂ Emissions by Country",
                   left + availW/2, top);

            p.textSize(14);
            p.text(
                this.mode === "combined"
                ? "Combined Fleet CO₂ (NEDC)"
                : "Petrol vs Diesel CO₂ (NEDC)",
                left + availW/2,
                top + 30
            );

            var plotTop = top + 70;

            // --------------------------------------------------------
            // BARS
            // --------------------------------------------------------
            p.textSize(16);
            for (let i = 0; i < bars.length; i++) {
                let b = bars[i];
                let yCenter = plotTop + i * rowH + rowH/2;

                // Flag on leftmost side
                var flag = window.VizCountry.COUNTRY_FLAGS[b.name] || "";
                p.textAlign(p.LEFT, p.CENTER);
                p.textSize(20);
                p.text(flag, left, yCenter);

                // Country name after flag
                p.textSize(16);
                p.fill(30);
                p.text(window.VizCountry.COUNTRY_NAMES[b.name] || b.name, left + 30, yCenter);

                let baseX = left + 140; // Adjusted for flag + name space

                // ---------------------------------------------
                // COMBINED MODE
                // ---------------------------------------------
                if (this.mode === "combined") {
                    let w = (b.combined / maxVal) * barMaxW;

                    p.fill(40, 120, 200);
                    p.noStroke();
                    p.rect(baseX, yCenter - rowH*0.25, w, rowH*0.5, 4);

                    p.fill(0);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text(Math.round(b.combined)+" g/km", baseX + w + 6, yCenter);
                    continue;
                }

                // ---------------------------------------------
                // DUAL MODE
                // ---------------------------------------------
                let barH = rowH * 0.28;
                let yP = yCenter - barH - 2;
                let yD = yCenter + 2;

                // Petrol bar
                if (b.petrol !== null) {
                    let wP = (b.petrol / maxVal) * barMaxW;
                    p.fill(240,140,40,220);
                    p.noStroke();
                    p.rect(baseX, yP - barH/2, wP, barH, 3);

                    p.fill(0);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text(Math.round(b.petrol)+" g/km", baseX + wP + 6, yP);
                } else {
                    // No petrol data - show placeholder
                    p.fill(180);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.textSize(12);
                    p.text("No petrol data", baseX, yP);
                    p.textSize(16);
                }

                // Diesel bar
                if (b.diesel !== null) {
                    let wD = (b.diesel / maxVal) * barMaxW;
                    p.fill(60,170,70,220);
                    p.noStroke();
                    p.rect(baseX, yD - barH/2, wD, barH, 3);

                    p.fill(0);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.text(Math.round(b.diesel)+" g/km", baseX + wD + 6, yD);
                } else {
                    // No diesel data - show placeholder
                    p.fill(180);
                    p.textAlign(p.LEFT, p.CENTER);
                    p.textSize(12);
                    p.text("No diesel data", baseX, yD);
                    p.textSize(16);
                }
            }

            // --------------------------------------------------------
            // PAGINATION ARROWS
            // --------------------------------------------------------
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