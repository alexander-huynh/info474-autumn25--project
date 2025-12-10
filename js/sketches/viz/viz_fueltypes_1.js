(function () {
    window.VizFuelTypes = {
        draw: function (p, manager, ai, progress) {
            var data = manager.data || [];
            var left = manager.offsetX || 0;
            var top = manager.offsetY || 0;
            var w = manager.width || 600;
            var h = manager.height || 520;

            var MAX_Y = 200;

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

            // --- aggregate PETROL vs DIESEL ---------------------------------
            var categories = ['Petrol', 'Diesel'];
            var sums = { Petrol: 0, Diesel: 0 };
            var counts = { Petrol: 0, Diesel: 0 };

            for (var i = 0; i < data.length; i++) {
                var co2 = getCo2(data[i]);
                if (!isFinite(co2)) continue;

                var cat = mapFuelCategory(getFuelRaw(data[i]));
                if (!cat) continue;

                sums[cat] += co2;
                counts[cat] += 1;
            }

            var avg = {};
            categories.forEach(function (c) {
                avg[c] = counts[c] > 0 ? (sums[c] / counts[c]) : null;
            });

            // --- color map ---------------------------------------------------
            var barColors = {
                Petrol: p.color(255, 140, 0),  // orange
                Diesel: p.color(34, 139, 34)   // green
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
            p.text('Fuel Types: Where Emissions Begin (', titleX, titleY);
            titleX += p.textWidth('Fuel Types: Where Emissions Begin (');

            p.fill(255, 140, 0); // orange for Petrol
            p.text('Petrol', titleX, titleY);
            titleX += p.textWidth('Petrol');

            p.fill(0);
            p.text(' vs ', titleX, titleY);
            titleX += p.textWidth(' vs ');

            p.fill(34, 139, 34); // green for Diesel
            p.text('Diesel', titleX, titleY);
            titleX += p.textWidth('Diesel');

            p.fill(0);
            p.text(')', titleX, titleY);

            var plotX = cardX + 55;
            var plotY = cardY + 40;
            var plotW = cardW - 80;
            var plotH = cardH - 80;
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
            p.translate(cardX + 20, (innerTop + innerBottom) / 2);
            p.rotate(-Math.PI / 2);
            p.textAlign(p.CENTER, p.CENTER);
            p.fill(0);
            p.text('Average CO₂ (g/km)', 0, 0);
            p.pop();

            // y ticks 0–200
            p.textSize(14);
            p.fill(60);
            var yticks = 4;
            for (var yi = 0; yi <= yticks; yi++) {
                var t = yi / yticks;
                var val = MAX_Y * t;
                var yPos = p.map(val, 0, MAX_Y, innerBottom, innerTop);

                p.stroke(210);
                p.line(innerLeft, yPos, innerRight, yPos);

                p.noStroke();
                p.textAlign(p.RIGHT, p.CENTER);
                p.text(Math.round(val), innerLeft - 6, yPos);
            }

            // --- bars + hover detection -------------------------------------
            var n = categories.length;
            var barGap = 20;
            var barWidth = (plotW - barGap * (n + 1)) / n;

            var hovered = null;

            p.textAlign(p.CENTER, p.TOP);
            p.textSize(11);

            for (var j = 0; j < n; j++) {
                var cat = categories[j];
                var value = avg[cat];
                if (value == null) continue;

                var bx = innerLeft + barGap + j * (barWidth + barGap);
                var baseY = innerBottom;

                // clamp at MAX_Y for drawing
                var drawVal = Math.min(value, MAX_Y);
                var hVal = p.map(drawVal, 0, MAX_Y, 0, plotH);
                var by = baseY - hVal;

                // colored bars
                p.noStroke();
                p.fill(barColors[cat] || p.color(0, 120, 220));
                p.rect(bx, by, barWidth, hVal);

                // x-axis label - colored to match bar
                p.fill(barColors[cat]);
                p.textSize(22);
                p.text(cat, bx + barWidth / 2, baseY + 4);

                // hover detection
                if (p.mouseX >= bx && p.mouseX <= bx + barWidth &&
                    p.mouseY >= by && p.mouseY <= baseY) {
                    hovered = {
                        x: bx + barWidth / 2,
                        y: by - 12,
                        cat: cat,
                        value: value
                    };
                }
            }

            // --- tooltip if hovered -----------------------------------------
            if (hovered) {
                var label = hovered.cat + ': ' + hovered.value.toFixed(1) + ' g/km';

                p.textSize(11);
                p.textAlign(p.LEFT, p.TOP);

                var padding = 6;
                var tw = p.textWidth(label) + padding * 2;
                var th = 18;

                var tx = hovered.x - tw / 2;
                var ty = hovered.y - th - 4;
                if (tx < cardX + 4) tx = cardX + 4;
                if (tx + tw > cardX + cardW - 4) tx = cardX + cardW - tw - 4;
                if (ty < cardY + 4) ty = hovered.y + 10;

                p.noStroke();
                p.fill(0, 200);
                p.rect(tx, ty, tw, th, 4);

                p.fill(255);
                p.text(label, tx + padding, ty + 3);
            }
        }
    };
})();