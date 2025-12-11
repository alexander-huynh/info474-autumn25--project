(function () {
    window.VizFuelTypes = {
        draw: function (p, manager, ai, progress) {
            var data = manager.data || [];
            var left = manager.offsetX || 0;
            var top = manager.offsetY || 0;
            var w = manager.width || 600;
            var h = manager.height || 520;

            var MAX_Y = 300;

            p.background(255);

            if (!data.length) {
                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(16);
                p.text('No data loaded for fuel-type viz.', left + w / 2, top + h / 2);
                return;
            }

            // --- helpers -----------------------------------------------------
            function getCo2(d) {
                if (typeof d.co2 === 'number') return d.co2;
                if (d.co2_nedc_gpkm != null) return +d.co2_nedc_gpkm;
                return NaN;
            }

            function getFuelRaw(d) {
                if (d.fuel != null) return String(d.fuel);
                if (d.fuel_type != null) return String(d.fuel_type);
                if (d.fuelType != null) return String(d.fuelType);
                return '';
            }

            function mapFuelCategory(raw) {
                var f = raw.toUpperCase();
                if (f.indexOf('PETROL') !== -1) return 'Petrol';
                if (f.indexOf('DIESEL') !== -1) return 'Diesel';
                return null;
            }

            // --- Calculate boxplot statistics --------------------------------
            function calcBoxplotStats(arr) {
                if (!arr || arr.length === 0) return null;

                // Sort ascending
                arr.sort(function (a, b) { return a - b; });

                var n = arr.length;

                // Quartiles
                var q1Index = Math.floor(n * 0.25);
                var medIndex = Math.floor(n * 0.5);
                var q3Index = Math.floor(n * 0.75);

                var q1 = arr[q1Index];
                var median = arr[medIndex];
                var q3 = arr[q3Index];
                var iqr = q3 - q1;

                // Whisker bounds (1.5 * IQR)
                var whiskerLow = q1 - 1.5 * iqr;
                var whiskerHigh = q3 + 1.5 * iqr;

                // Find actual min/max within whisker range
                var min = arr[0];
                var max = arr[n - 1];

                for (var i = 0; i < n; i++) {
                    if (arr[i] >= whiskerLow) {
                        min = arr[i];
                        break;
                    }
                }

                for (var i = n - 1; i >= 0; i--) {
                    if (arr[i] <= whiskerHigh) {
                        max = arr[i];
                        break;
                    }
                }

                // Collect outliers
                var outliers = [];
                for (var i = 0; i < n; i++) {
                    if (arr[i] < whiskerLow || arr[i] > whiskerHigh) {
                        outliers.push(arr[i]);
                    }
                }

                return {
                    min: min,
                    q1: q1,
                    median: median,
                    q3: q3,
                    max: max,
                    iqr: iqr,
                    outliers: outliers,
                    count: n
                };
            }

            // --- Collect values into arrays ----------------------------------
            var categories = ['Petrol', 'Diesel'];
            var values = { Petrol: [], Diesel: [] };

            for (var i = 0; i < data.length; i++) {
                var co2 = getCo2(data[i]);
                if (!isFinite(co2)) continue;

                var cat = mapFuelCategory(getFuelRaw(data[i]));
                if (!cat) continue;

                values[cat].push(co2);
            }

            // Calculate stats for each category
            var stats = {};
            categories.forEach(function (c) {
                stats[c] = calcBoxplotStats(values[c]);
            });

            // --- color map ---------------------------------------------------
            var barColors = {
                Petrol: p.color(255, 140, 0),      // orange
                Diesel: p.color(34, 139, 34)       // green
            };
            var barColorsLight = {
                Petrol: p.color(255, 200, 130),    // light orange
                Diesel: p.color(130, 200, 130)    // light green
            };

            // --- layout ------------------------------------------------------
            var cardX = left + 20;
            var cardY = top + 20;
            var cardW = w - 40;
            var cardH = h - 40;

            p.noStroke();
            p.fill(255);
            p.rect(cardX, cardY, cardW, cardH, 6);

            // --- Title with colored Petrol/Diesel ----------------------------
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(24);

            var titleX = cardX + 12;
            var titleY = cardY + 10;

            p.fill(0);
            p.text('CO₂ Distribution: ', titleX, titleY);
            titleX += p.textWidth('CO₂ Distribution: ');

            p.fill(255, 140, 0); // orange for Petrol
            p.text('Petrol', titleX, titleY);
            titleX += p.textWidth('Petrol');

            p.fill(0);
            p.text(' vs ', titleX, titleY);
            titleX += p.textWidth(' vs ');

            p.fill(34, 139, 34); // green for Diesel
            p.text('Diesel', titleX, titleY);

            var plotX = cardX + 55;
            var plotY = cardY + 50;
            var plotW = cardW - 80;
            var plotH = cardH - 100;
            var innerLeft = plotX;
            var innerRight = plotX + plotW;
            var innerTop = plotY;
            var innerBottom = plotY + plotH;

            // axes
            p.stroke(80);
            p.strokeWeight(1);
            p.line(innerLeft, innerTop, innerLeft, innerBottom);      // y
            p.line(innerLeft, innerBottom, innerRight, innerBottom);  // x

            // y label
            p.noStroke();
            p.textSize(18);
            p.push();
            p.translate(cardX + 8, (innerTop + innerBottom) / 2);
            p.rotate(-Math.PI / 2);
            p.textAlign(p.CENTER, p.CENTER);
            p.fill(0);
            p.text('CO₂ Emissions (g/km)', 0, 0);
            p.pop();

            // y ticks
            p.textSize(14);
            p.fill(60);
            var yticks = 6;
            for (var yi = 0; yi <= yticks; yi++) {
                var t = yi / yticks;
                var val = MAX_Y * t;
                var yPos = p.map(val, 0, MAX_Y, innerBottom, innerTop);

                // Only draw gridline if not at the very top
                if (yi < yticks) {
                    p.stroke(220);
                    p.line(innerLeft, yPos, innerRight, yPos);
                }

                p.noStroke();
                p.textAlign(p.RIGHT, p.CENTER);
                p.text(Math.round(val), innerLeft - 6, yPos);
            }

            // --- Draw EU 2021 Target Line ------------------------------------
            var euTarget = 95;
            var yTarget = p.map(euTarget, 0, MAX_Y, innerBottom, innerTop);
            
            // Dashed line
            p.stroke(100, 100, 120);
            p.strokeWeight(2);
            p.drawingContext.setLineDash([8, 6]);
            p.line(innerLeft, yTarget, innerRight, yTarget);
            p.drawingContext.setLineDash([]); // Reset to solid
            
            // Label at right side
            p.noStroke();
            p.fill(100, 100, 120);
            p.textSize(12);
            p.textAlign(p.RIGHT, p.BOTTOM);
            p.text('EU 2021 Target: 95 g/km', innerRight, yTarget - 4);

            // --- Draw boxplots -----------------------------------------------
            var n = categories.length;
            var boxGap = 60;
            var boxWidth = (plotW - boxGap * (n + 1)) / n;
            var capWidth = boxWidth * 0.5;

            var hovered = null;

            for (var j = 0; j < n; j++) {
                var cat = categories[j];
                var s = stats[cat];
                if (!s) continue;

                var bx = innerLeft + boxGap + j * (boxWidth + boxGap);
                var centerX = bx + boxWidth / 2;

                // Map y values (clamped to MAX_Y)
                var yMin = p.map(Math.min(s.min, MAX_Y), 0, MAX_Y, innerBottom, innerTop);
                var yQ1 = p.map(Math.min(s.q1, MAX_Y), 0, MAX_Y, innerBottom, innerTop);
                var yMed = p.map(Math.min(s.median, MAX_Y), 0, MAX_Y, innerBottom, innerTop);
                var yQ3 = p.map(Math.min(s.q3, MAX_Y), 0, MAX_Y, innerBottom, innerTop);
                var yMax = p.map(Math.min(s.max, MAX_Y), 0, MAX_Y, innerBottom, innerTop);

                // Whisker lines (vertical) - from box to caps only, NOT through outliers
                p.stroke(80);
                p.strokeWeight(1.5);
                // Lower whisker: from Q1 down to min cap
                p.line(centerX, yQ1, centerX, yMin);
                // Upper whisker: from Q3 up to max cap
                p.line(centerX, yQ3, centerX, yMax);

                // Whisker caps (horizontal)
                p.strokeWeight(2);
                p.line(centerX - capWidth / 2, yMin, centerX + capWidth / 2, yMin);
                p.line(centerX - capWidth / 2, yMax, centerX + capWidth / 2, yMax);

                // Box (Q1 to Q3)
                p.fill(barColorsLight[cat]);
                p.stroke(barColors[cat]);
                p.strokeWeight(2);
                p.rect(bx, yQ3, boxWidth, yQ1 - yQ3);

                // Median line (thick, inside box)
                p.stroke(barColors[cat]);
                p.strokeWeight(4);
                p.line(bx, yMed, bx + boxWidth, yMed);

                // Outliers not drawn - too many to display cleanly
                // Count is shown in tooltip on hover

                // x-axis label - colored to match, no stroke
                p.noStroke();
                p.fill(barColors[cat]);
                p.textSize(28);
                p.textAlign(p.CENTER, p.TOP);
                p.text(cat, centerX, innerBottom + 8);

                // Count label
                p.noStroke();
                p.fill(100);
                p.textSize(16);
                p.text('n=' + s.count, centerX, innerBottom + 38);

                // Hover detection (over the box area)
                var boxTop = yQ3;
                var boxBottom = yQ1;
                if (p.mouseX >= bx && p.mouseX <= bx + boxWidth &&
                    p.mouseY >= Math.min(yMax, boxTop) - 10 && p.mouseY <= Math.max(yMin, boxBottom) + 10) {
                    hovered = {
                        x: centerX,
                        y: yQ3 - 10,
                        cat: cat,
                        stats: s
                    };
                }
            }

            // Legend removed - boxplot is intuitive enough without it
            // Tooltip on hover provides detailed stats if needed

            // --- Tooltip if hovered ------------------------------------------
            if (hovered) {
                var s = hovered.stats;

                var lines = [
                    hovered.cat + ' CO₂ Distribution',
                    '─────────────────',
                    'Median: ' + s.median.toFixed(0) + ' g/km',
                    'IQR: ' + s.q1.toFixed(0) + '–' + s.q3.toFixed(0) + ' g/km',
                    'Range: ' + s.min.toFixed(0) + '–' + s.max.toFixed(0) + ' g/km',
                    'Outliers: ' + s.outliers.length + ' vehicles',
                    'Total: ' + s.count + ' vehicles'
                ];

                p.textSize(12);
                p.textAlign(p.LEFT, p.TOP);

                var padding = 10;
                var lineHeight = 16;
                var tw = 0;
                for (var li = 0; li < lines.length; li++) {
                    var lw = p.textWidth(lines[li]);
                    if (lw > tw) tw = lw;
                }
                tw += padding * 2;
                var th = lines.length * lineHeight + padding * 2 - 4;

                var tx = hovered.x - tw / 2;
                var ty = hovered.y - th - 10;

                // Keep tooltip in bounds
                if (tx < cardX + 4) tx = cardX + 4;
                if (tx + tw > cardX + cardW - 4) tx = cardX + cardW - tw - 4;
                if (ty < cardY + 4) ty = hovered.y + 20;

                // Shadow
                p.noStroke();
                p.fill(0, 40);
                p.rect(tx + 3, ty + 3, tw, th, 6);

                // Background
                p.fill(255);
                p.stroke(barColors[hovered.cat]);
                p.strokeWeight(2);
                p.rect(tx, ty, tw, th, 6);

                // Text
                p.fill(0);
                p.noStroke();
                for (var li = 0; li < lines.length; li++) {
                    if (li === 0) {
                        p.fill(barColors[hovered.cat]);
                        p.textStyle(p.BOLD);
                    } else if (li === 1) {
                        p.fill(180);
                        p.textStyle(p.NORMAL);
                    } else {
                        p.fill(40);
                        p.textStyle(p.NORMAL);
                    }
                    p.text(lines[li], tx + padding, ty + padding + li * lineHeight);
                }
                p.textStyle(p.NORMAL);
            }
        }
    };
})();