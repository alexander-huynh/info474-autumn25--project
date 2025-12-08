// viz_scatter.js
// CO₂ vs Engine Size (cropped domain + better ticks + CAR TYPE ICONS)
(function () {

    // ---------------------------------------------------------
    // Hover storage
    // ---------------------------------------------------------
    var screenPts = [];
    var hoverIndex = -1;

    // ---------------------------------------------------------
    // Fuel filter buttons (same as power scatter)
    // ---------------------------------------------------------
    var btns = [
        { label: "All", mode: "All", x: 0, y: 0, w: 60, h: 24 },
        { label: "Petrol", mode: "Petrol", x: 0, y: 0, w: 70, h: 24 },
        { label: "Diesel", mode: "Diesel", x: 0, y: 0, w: 70, h: 24 }
    ];

    window.VizScatter = {

        //------------------------------------------------------------------
        // DRAW
        //------------------------------------------------------------------
        draw: function (p, manager, ai, progress) {

            var data = manager.data || [];
            var left = manager.offsetX || 0;
            var top = manager.offsetY || 0;
            var w = manager.width || 600;
            var h = manager.height || 520;

            screenPts = [];
            hoverIndex = -1;

            //------------------------------------------------------------------
            // ONE-TIME CLICK HANDLER
            //------------------------------------------------------------------
            if (!window._vizscatter_clickBound) {
                window._vizscatter_clickBound = true;

                p.canvas.addEventListener("mousedown", function (evt) {
                    var rect = p.canvas.getBoundingClientRect();
                    var mx = evt.clientX - rect.left;
                    var my = evt.clientY - rect.top;

                    // Only process if this viz is active (index 2)
                    if (manager.state.activeIndex !== 2) return;

                    // Check fuel filter buttons
                    for (var bi = 0; bi < btns.length; bi++) {
                        var b = btns[bi];
                        if (
                            mx >= b.x && mx <= b.x + b.w &&
                            my >= b.y && my <= b.y + b.h
                        ) {
                            manager.fuelFilter = b.mode;
                            return;
                        }
                    }
                });
            }

            p.background(255);

            if (!data.length) {
                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(16);
                p.text('No data loaded for scatterplot.', left + w / 2, top + h / 2);
                return;
            }

            // -------------------------------------------------------------
            // Extract fields + fuel type
            // -------------------------------------------------------------
            var pts = [];
            for (var i = 0; i < data.length; i++) {
                var row = data[i];

                var co2 = parseFloat(row.co2);
                var eng = parseFloat(row.power);
                if (isNaN(co2) || isNaN(eng)) continue;

                var rawFuel = (
                    row.fuel_type ||
                    row.fuel ||
                    row.fueltype ||
                    row.fuelType ||
                    ""
                ).toString().toLowerCase();

                var fuel = "Diesel";
                if (rawFuel.includes("petrol") || rawFuel.includes("gasoline")) fuel = "Petrol";
                if (rawFuel.includes("diesel")) fuel = "Diesel";

                pts.push({ co2: co2, power: eng, fuel: fuel });
            }

            // -------------------------------------------------------------
            // Apply fuel filter
            // -------------------------------------------------------------
            var mode = manager.fuelFilter || "All";
            if (mode === "Petrol") pts = pts.filter(d => d.fuel === "Petrol");
            if (mode === "Diesel") pts = pts.filter(d => d.fuel === "Diesel");

            if (!pts.length) {
                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(16);
                p.text('No vehicles match this filter.', left + w / 2, top + h / 2);
                return;
            }

            // -------------------------------------------------------------
            // Min/max
            // -------------------------------------------------------------
            var minCo2 = Infinity, maxCo2 = -Infinity;
            var minPower = Infinity, maxPower = -Infinity;

            for (var i = 0; i < pts.length; i++) {
                var d = pts[i];
                if (d.power < minPower) minPower = d.power;
                if (d.power > maxPower) maxPower = d.power;
                if (d.co2 < minCo2) minCo2 = d.co2;
                if (d.co2 > maxCo2) maxCo2 = d.co2;
            }

            // Guard against weird data
            if (!isFinite(minPower) || !isFinite(maxPower)) {
                minPower = 0;
                maxPower = 7000;
            }
            if (!isFinite(minCo2) || !isFinite(maxCo2)) {
                minCo2 = 30;
                maxCo2 = 450;
            }

            // Round engine size to nearest 500cc, clamp at 0
            minPower = Math.max(0, Math.floor(minPower / 500) * 500);
            maxPower = Math.ceil(maxPower / 500) * 500;

            // Round CO₂ to nearest 20 g/km, clamp at 0
            minCo2 = Math.max(0, Math.floor(minCo2 / 20) * 20);
            maxCo2 = Math.ceil(maxCo2 / 20) * 20;

            function clamp(v, lo, hi) {
                return Math.max(lo, Math.min(hi, v));
            }

            // Layout
            var innerLeft = left + 60;
            var innerRight = left + w - 20;
            var innerTop = top + 60;
            var innerBottom = top + h - 50;

            // -------------------------------------------------------------
            // Gridlines
            // -------------------------------------------------------------
            p.stroke(220);
            p.strokeWeight(1);

            var xLiters = [];
            var minLit = minPower / 1000;
            var maxLit = maxPower / 1000;
            var startL = Math.max(1, Math.ceil(minLit));   // don't show 0L engines
            var endL = Math.floor(maxLit);

            for (var L = startL; L <= endL; L++) {
                xLiters.push(L);
            }
            // Fallback if range is tiny
            if (!xLiters.length) {
                xLiters.push(minLit);
                if (maxLit > minLit) xLiters.push(maxLit);
            }

            // vertical gridlines
            for (var iL = 0; iL < xLiters.length; iL++) {
                var cc = xLiters[iL] * 1000;
                var xPos = p.map(cc, minPower, maxPower, innerLeft, innerRight);
                p.line(xPos, innerTop, xPos, innerBottom);
            }

            var gridYTicks = 5;
            for (var gy = 0; gy <= gridYTicks; gy++) {
                var t = gy / gridYTicks;
                var yv = Math.round(p.lerp(minCo2, maxCo2, t) / 20) * 20;
                var yPos = p.map(yv, minCo2, maxCo2, innerBottom, innerTop);
                p.line(innerLeft, yPos, innerRight, yPos);
            }

            // -------------------------------------------------------------
            // Axes
            // -------------------------------------------------------------
            p.stroke(0);
            p.strokeWeight(1);
            p.line(innerLeft, innerTop, innerLeft, innerBottom);
            p.line(innerLeft, innerBottom, innerRight, innerBottom);

            // -------------------------------------------------------------
            // Tick labels
            // -------------------------------------------------------------
            p.textSize(13);
            p.fill(0);
            p.noStroke();

            for (var xi = 0; xi < xLiters.length; xi++) {
                var liters = xLiters[xi];
                var cc = liters * 1000;
                var xPos = p.map(cc, minPower, maxPower, innerLeft, innerRight);

                p.stroke(0);
                p.line(xPos, innerBottom, xPos, innerBottom + 4);

                p.noStroke();
                p.textAlign(p.CENTER, p.TOP);
                p.text(liters.toFixed(1) + "L", xPos, innerBottom + 6);
            }

            var yticks = 5;
            for (var yi = 0; yi <= yticks; yi++) {
                var yv = Math.round(p.lerp(minCo2, maxCo2, yi / yticks) / 20) * 20;
                var yPos = p.map(yv, minCo2, maxCo2, innerBottom, innerTop);

                p.stroke(0);
                p.line(innerLeft - 4, yPos, innerLeft, yPos);

                p.noStroke();
                p.textAlign(p.RIGHT, p.CENTER);
                p.text(yv, innerLeft - 6, yPos);
            }

            // -------------------------------------------------------------
            // Axis labels
            // -------------------------------------------------------------
            p.textAlign(p.CENTER, p.TOP);
            p.textSize(22);
            p.text('Engine Size (L)', (innerLeft + innerRight) / 2, innerBottom + 28);

            p.push();
            p.translate(left - 10, (innerTop + innerBottom) / 2);
            p.rotate(-Math.PI / 2);
            p.textAlign(p.CENTER, p.TOP);
            p.text('CO₂ NEDC (g/km)', 0, 0);
            p.pop();

            // -------------------------------------------------------------
            // Title
            // -------------------------------------------------------------
            p.textAlign(p.CENTER, p.BOTTOM);
            p.textSize(28);
            p.text('CO₂ Emissions vs Engine Size', left + w / 2, innerTop - 28);

            // -------------------------------------------------------------
            // Fuel Filter Buttons (moved to top-right)
            // -------------------------------------------------------------
            var btnY = innerTop - 24 + 14 + 6;   // same vertical logic as scatter2
            var activeMode = mode;

            // Compute total width of all 3 buttons + spacing
            var spacing = 20;
            var totalW = btns[0].w + btns[1].w + btns[2].w + spacing * 2;

            // Center horizontally
            var startX = left + (w - totalW) / 2;
            for (var bi = 0; bi < btns.length; bi++) {
                var b = btns[bi];
                var bx = startX + bi * (b.w + spacing);

                b.x = bx;
                b.y = btnY;

                // Store global coordinates (for consistency with viz_bar pattern)
                window['_vizscatter_btn' + bi] = {
                    x1: bx,
                    y1: btnY,
                    x2: bx + b.w,
                    y2: btnY + b.h
                };

                // Color-coded backgrounds based on fuel type
                var isActive = (activeMode === b.mode);

                if (b.mode === "All") {
                    // Blue for "All"
                    p.fill(isActive ? p.color(40, 110, 220) : p.color(180, 200, 230));
                } else if (b.mode === "Petrol") {
                    // Orange for Petrol (matches dot color)
                    p.fill(isActive ? p.color(255, 140, 0) : p.color(255, 210, 160));
                } else if (b.mode === "Diesel") {
                    // Green for Diesel (matches dot color)
                    p.fill(isActive ? p.color(34, 139, 34) : p.color(160, 210, 160));
                }

                p.stroke(0, 60);
                p.rect(bx, btnY, b.w, b.h, 4);

                // label - white when active, dark when inactive
                p.fill(isActive ? 255 : 60);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(18);
                p.text(b.label, bx + b.w / 2, btnY + b.h / 2);
            }


            // -------------------------------------------------------------
            // Draw points + record screen coords (colored by fuel)
            // -------------------------------------------------------------
            var dotColors = {
                Petrol: p.color(255, 140, 0, 170),   // orange
                Diesel: p.color(34, 139, 34, 170)    // green
            };

            p.noStroke();

            for (var j = 0; j < pts.length; j++) {
                var dpt = pts[j];
                var eng = clamp(dpt.power, minPower, maxPower);

                var x = p.map(eng, minPower, maxPower, innerLeft, innerRight);
                var y = p.map(dpt.co2, minCo2, maxCo2, innerBottom, innerTop);

                screenPts.push({
                    x: x,
                    y: y,
                    liters: dpt.power / 1000,
                    co2: dpt.co2
                });

                // fuel-based color
                p.fill(dotColors[dpt.fuel] || p.color(100, 100, 100, 150));

                p.circle(x, y, 4);
            }


            // -------------------------------------------------------------
            // Hover highlight
            // -------------------------------------------------------------
            var mx = p.mouseX;
            var my = p.mouseY;
            var bestDist = 99999;

            for (var idx = 0; idx < screenPts.length; idx++) {
                var pt = screenPts[idx];
                var dx = mx - pt.x;
                var dy = my - pt.y;
                var dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 8 && dist < bestDist) {
                    bestDist = dist;
                    hoverIndex = idx;
                }
            }

            if (hoverIndex !== -1) {
                var hpt = screenPts[hoverIndex];
                p.fill(30, 120, 240, 210);
                p.noStroke();
                p.circle(hpt.x, hpt.y, 8);
            }

            // -------------------------------------------------------------
            // Tooltip
            // -------------------------------------------------------------
            if (hoverIndex !== -1) {
                var tt = screenPts[hoverIndex];
                var boxW = 110;
                var boxH = 42;
                var pad = 8;

                var bx = mx + 12;
                var by = my - boxH - 8;

                if (bx + boxW > left + w) bx = left + w - boxW - 5;
                if (by < top) by = my + 12;

                p.noStroke();
                p.fill(0, 60);
                p.rect(bx + 2, by + 2, boxW, boxH, 6);

                p.fill(250);
                p.rect(bx, by, boxW, boxH, 6);

                p.fill(0);
                p.textSize(11);
                p.textAlign(p.LEFT, p.TOP);
                p.text("Engine: " + tt.liters.toFixed(1) + "L", bx + pad, by + 6);
                p.text("CO₂: " + tt.co2 + " g/km", bx + pad, by + 20);
            }

            // -------------------------------------------------------------
            // Car type icons
            // -------------------------------------------------------------
            p.stroke(180);
            p.strokeWeight(1);
            var iconBaselineY = innerBottom + 22;
            p.line(innerLeft, iconBaselineY, innerRight, iconBaselineY);

            var iconY = innerBottom + 18;
            var iconSize = 20;
            p.textSize(iconSize);
            p.textAlign(p.CENTER, p.CENTER);

            function drawEmoji(emoji, x, y) {
                p.noStroke();
                p.fill(255);
                p.circle(x, y, iconSize * 1.4);

                p.fill(0, 30);
                p.text(emoji, x, y + 2);

                p.fill(0);
                p.text(emoji, x, y);
            }

            var xSmall = p.map(1400, minPower, maxPower, innerLeft, innerRight);
            var xMedium = p.map(2300, minPower, maxPower, innerLeft, innerRight);
            var xLarge = p.map(3500, minPower, maxPower, innerLeft, innerRight);

            // -------------------------------------------------------------
            // Legend
            // -------------------------------------------------------------
            p.textSize(13);
            p.fill(60);
            p.textAlign(p.LEFT, p.TOP);

            var legendX = innerLeft + 6;
            var legendY = innerTop + 4;
            var legendSpacing = 16;

            // -------------------------------------------------------------
            // Caption
            // -------------------------------------------------------------
            p.textSize(11);
            p.fill(120);
            p.textAlign(p.CENTER, p.TOP);
            p.text("Data source: European Vehicle CO₂ Dataset (NEDC)",
                left + w / 2, top + h + 5);
        }

        // mousePressed function removed - now using direct canvas event listener
    };

})();