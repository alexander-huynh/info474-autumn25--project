(function () {
    var currentAi = -1;

    // Slider state (CO2 + HP)
    var co2Slider = {
        min: 0,
        max: 260,
        value: 180,
        bounds: null
    };

    var hpSlider = {
        min: 0,
        max: 300,
        value: 70,
        bounds: null
    };

    // Drag state
    var activeSlider = null; // "co2", "hp", or null

    // Fuel filter buttons
    var fuelOptions = ["Any", "Petrol", "Diesel"];
    var selectedFuelIndex = 0;
    var fuelButtons = [];

    // Pagination
    var itemsPerPage = 10;
    var pageIndex = 0;
    var maxPageIndex = 0;
    var leftArrowBounds = null;
    var rightArrowBounds = null;

    var eventsBound = false;

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------
    function getNumericFromKeys(d, keys) {
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (d.hasOwnProperty(k) && d[k] != null) {
                var v = d[k];
                if (typeof v === "number" && isFinite(v)) return v;
                var num = +v;
                if (!isNaN(num) && isFinite(num)) return num;
            }
        }
        return NaN;
    }

    function getCo2(d) {
        return getNumericFromKeys(d, [
            "co2",
            "co2_nedc_gpkm",
            "co2NEDC",
            "co2_nedc"
        ]);
    }

    function getHP(d) {
        return getNumericFromKeys(d, [
            "hp",
            "horsepower",
            "engine_power_kw"
        ]);
    }

    function getFuelRaw(d) {
        var keys = ["fuel", "fuel_type", "fuelType", "fuel_mode"];
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (d.hasOwnProperty(k) && d[k] != null) return String(d[k]);
        }
        return "";
    }

    function mapFuelCategory(raw) {
        var f = raw.toUpperCase();
        if (f.indexOf("PETROL") !== -1 || f.indexOf("GASOLINE") !== -1) return "Petrol";
        if (f.indexOf("DIESEL") !== -1) return "Diesel";
        return "Other";
    }

    function getModel(d) {
        var keys = ["model", "version"];
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (d.hasOwnProperty(k) && d[k] != null) return String(d[k]);
        }
        return "Unknown model";
    }

    function getMake(d) {
        var keys = ["make", "manufacturer", "manufacturer_name_eu"];
        for (var i = 0; i < keys.length; i++) {
            var k = keys[i];
            if (d.hasOwnProperty(k) && d[k] != null) return String(d[k]);
        }
        return "Unknown make";
    }

    // Truncate long text with ellipsis so it doesn't bleed into next column
    function shorten(text, maxChars) {
        text = String(text);
        if (text.length <= maxChars) return text;
        return text.substring(0, maxChars - 1) + "…";
    }

    function updateSliderFromMouse(slider, mx) {
        if (!slider.bounds) return;
        var b = slider.bounds;
        var t = (mx - b.x1) / (b.x2 - b.x1);
        t = Math.max(0, Math.min(1, t));
        slider.value = slider.min + t * (slider.max - slider.min);
    }

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------
    function attachEventsOnce(p) {
        if (eventsBound) return;
        eventsBound = true;

        p.mousePressed = function () {
            if (currentAi !== 5) return;

            var mx = p.mouseX;
            var my = p.mouseY;
            activeSlider = null;

            // CO2 slider
            if (co2Slider.bounds) {
                var b = co2Slider.bounds;
                if (my >= b.y - 8 && my <= b.y + 8 && mx >= b.x1 && mx <= b.x2) {
                    updateSliderFromMouse(co2Slider, mx);
                    activeSlider = "co2";
                    pageIndex = 0;
                }
            }

            // HP slider
            if (hpSlider.bounds) {
                var hb = hpSlider.bounds;
                if (my >= hb.y - 8 && my <= hb.y + 8 && mx >= hb.x1 && mx <= hb.x2) {
                    updateSliderFromMouse(hpSlider, mx);
                    activeSlider = "hp";
                    pageIndex = 0;
                }
            }

            // Fuel buttons
            for (var i = 0; i < fuelButtons.length; i++) {
                var fb = fuelButtons[i];
                if (mx >= fb.x1 && mx <= fb.x2 && my >= fb.y1 && my <= fb.y2) {
                    selectedFuelIndex = i;
                    pageIndex = 0;
                    break;
                }
            }

            // Pagination arrows
            if (leftArrowBounds &&
                mx >= leftArrowBounds.x1 && mx <= leftArrowBounds.x2 &&
                my >= leftArrowBounds.y1 && my <= leftArrowBounds.y2) {
                if (pageIndex > 0) pageIndex--;
            }
            if (rightArrowBounds &&
                mx >= rightArrowBounds.x1 && mx <= rightArrowBounds.x2 &&
                my >= rightArrowBounds.y1 && my <= rightArrowBounds.y2) {
                if (pageIndex < maxPageIndex) pageIndex++;
            }
        };

        p.mouseDragged = function () {
            if (currentAi !== 5) return;
            if (!activeSlider) return;

            var mx = p.mouseX;
            if (activeSlider === "co2") {
                updateSliderFromMouse(co2Slider, mx);
            } else if (activeSlider === "hp") {
                updateSliderFromMouse(hpSlider, mx);
            }
        };

        p.mouseReleased = function () {
            activeSlider = null;
        };
    }

    // -----------------------------------------------------------------------
    // Main draw
    // -----------------------------------------------------------------------
    window.VizFilterPanel = {
        draw: function (p, manager, ai, progress) {
            var data = manager.data || [];
            currentAi = ai;
            attachEventsOnce(p);

            var left = manager.offsetX || 0;
            var top = manager.offsetY || 0;
            var w = manager.width || 600;
            var h = manager.height || 520;

            p.background(255);

            if (!data.length) {
                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(16);
                p.text("No data loaded for filter viz.", left + w / 2, top + h / 2);
                return;
            }

            // Card (same look as your screenshot)
            var cardX = left + 20;
            var cardY = top + 20;
            var cardW = w - 40;
            var cardH = h - 40;

            p.stroke(220);
            p.strokeWeight(1);
            p.fill(255);
            p.rectMode(p.CORNER);
            p.rect(cardX, cardY, cardW, cardH, 6);

            // Title + subtitle
            p.fill(0);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(14);
            p.text("Find a Car That Fits Your Values", cardX + 12, cardY + 10);

            p.textSize(11);
            p.fill(90);
            p.text("Filter by CO\u2082, power, and fuel type.", cardX + 12, cardY + 30);

            // Slider geometry (same as original)
            var sliderX1 = cardX + 40;
            var sliderX2 = cardX + 280;
            var co2Y    = cardY + 80;
            var hpY     = cardY + 130;

            co2Slider.bounds = { x1: sliderX1, x2: sliderX2, y: co2Y };
            hpSlider.bounds  = { x1: sliderX1, x2: sliderX2, y: hpY };

            // Labels
            p.fill(0);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(12);
            p.text("Max CO\u2082 (g/km): " + co2Slider.value.toFixed(0),
                   cardX + 40, cardY + 64);
            p.text("Min horsepower: " + hpSlider.value.toFixed(0),
                   cardX + 40, cardY + 114);

            // Sliders
            function drawSlider(slider, y) {
                p.stroke(210);
                p.strokeWeight(3);
                p.line(sliderX1, y, sliderX2, y);

                var t = (slider.value - slider.min) / (slider.max - slider.min);
                t = Math.max(0, Math.min(1, t));
                var hx = sliderX1 + t * (sliderX2 - sliderX1);

                p.noStroke();
                p.fill(255);
                p.circle(hx, y, 12);
                p.stroke(40, 120, 200);
                p.noFill();
                p.circle(hx, y, 12);
            }

            drawSlider(co2Slider, co2Y);
            drawSlider(hpSlider,  hpY);

            // Fuel buttons
            p.fill(0);
            p.noStroke();
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(12);
            p.text("Fuel type:", cardX + 40, cardY + 165);

            fuelButtons = [];
            var btnX = cardX + 40;
            var btnY = cardY + 185;
            var btnW = 70;
            var btnH = 22;
            var gap = 10;

            p.rectMode(p.CORNER); // make sure buttons use CORNER mode

            for (var i = 0; i < fuelOptions.length; i++) {
                var x1 = btnX + i * (btnW + gap);
                var y1 = btnY;
                var x2 = x1 + btnW;
                var y2 = y1 + btnH;

                fuelButtons.push({ x1: x1, y1: y1, x2: x2, y2: y2, label: fuelOptions[i] });

                if (i === selectedFuelIndex) {
                    p.fill(40, 120, 200); // blue active
                    p.noStroke();
                    p.rect(x1, y1, btnW, btnH, 4);
                    p.fill(255);
                } else {
                    p.fill(245);
                    p.stroke(220);
                    p.rect(x1, y1, btnW, btnH, 4);
                    p.noStroke();
                    p.fill(0);
                }
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(11);
                p.text(fuelOptions[i], x1 + btnW / 2, y1 + btnH / 2);
            }

            // ----------------------------------------------------------------
            // Filter + table
            // ----------------------------------------------------------------
            var maxCo2     = co2Slider.value;
            var minHp      = hpSlider.value;
            var fuelChoice = fuelOptions[selectedFuelIndex];

            var filtered = [];
            for (var idx = 0; idx < data.length; idx++) {
                var d = data[idx];
                var co2   = getCo2(d);
                var hp    = getHP(d);
                var fuel  = mapFuelCategory(getFuelRaw(d));

                if (!isFinite(co2) || !isFinite(hp)) continue;
                if (co2 > maxCo2) continue;
                if (hp  < minHp) continue;
                if (fuelChoice !== "Any" && fuel !== fuelChoice) continue;

                filtered.push({
                    make:  getMake(d),
                    model: getModel(d),
                    co2:   co2,
                    hp:    hp,
                    fuel:  fuel
                });
            }

            filtered.sort(function (a, b) { return a.co2 - b.co2; });

            var listX = cardX + 40;
            var listY = cardY + 225;

            p.textAlign(p.LEFT, p.TOP);
            p.textSize(12);
            p.fill(0);

            var totalCount = filtered.length;
            if (totalCount > 0) {
                maxPageIndex = Math.max(0, Math.floor((totalCount - 1) / itemsPerPage));
                if (pageIndex > maxPageIndex) pageIndex = maxPageIndex;
                if (pageIndex < 0) pageIndex = 0;
            } else {
                maxPageIndex = 0;
                pageIndex = 0;
            }

            if (!filtered.length) {
                p.text("No cars match your filters.\nTry relaxing CO\u2082 or HP.",
                       listX, listY);
            } else {
                var start = pageIndex * itemsPerPage;
                var end   = Math.min(start + itemsPerPage, totalCount);
                var shown = end - start;

                p.text(
                    "Top matching cars (lowest CO\u2082 first)\n" +
                    "Showing " + shown + " of " + totalCount +
                    " matches (page " + (pageIndex + 1) + " of " + (maxPageIndex + 1) + "):",
                    listX, listY
                );

                // Table
                var tableX  = listX;
                var tableY  = listY + 30;
                var rowH    = 20;
                var headerH = 22;

                var cols = [
                    { label: "#",             width: 24 },
                    { label: "Make & Model",  width: 210 },
                    { label: "CO\u2082 (g/km)", width: 70 },
                    { label: "HP",            width: 45 },
                    { label: "Fuel",          width: 55 }
                ];

                var totalW = 0;
                for (var c = 0; c < cols.length; c++) totalW += cols[c].width;

                // Header background
                p.stroke(220);
                p.fill(245);
                p.rect(tableX, tableY, totalW, headerH);

                // Header text
                var xCursor = tableX;
                p.textAlign(p.LEFT, p.CENTER);
                p.fill(0);
                p.textSize(11);
                for (var c2 = 0; c2 < cols.length; c2++) {
                    var col = cols[c2];
                    p.text(col.label, xCursor + 4, tableY + headerH / 2);
                    xCursor += col.width;
                }

                // Rows for current page
                for (var k = start; k < end; k++) {
                    var car = filtered[k];
                    var rowY = tableY + headerH + (k - start) * rowH;

                    // Zebra striping
                    p.noStroke();
                    if ((k - start) % 2 === 0) {
                        p.fill(252);
                        p.rect(tableX, rowY, totalW, rowH);
                    }

                    p.fill(0);
                    p.textAlign(p.LEFT, p.CENTER);
                    xCursor = tableX;

                    var makeModel = car.make + " " + car.model;
                    makeModel = shorten(makeModel, 26);

                    var cells = [
                        String(k + 1),
                        makeModel,
                        car.co2.toFixed(0),
                        car.hp.toFixed(0),
                        car.fuel
                    ];

                    for (var c3 = 0; c3 < cols.length; c3++) {
                        var col2 = cols[c3];
                        p.text(cells[c3], xCursor + 4, rowY + rowH / 2);
                        xCursor += col2.width;
                    }
                }

                // Pagination arrows at bottom-right of card
                var controlsY = cardY + cardH - 24;
                var controlsXRight = cardX + cardW - 20;
                var arrowSize = 20;
                var gapArrows = 6;

                rightArrowBounds = {
                    x1: controlsXRight - arrowSize,
                    y1: controlsY - arrowSize / 2,
                    x2: controlsXRight,
                    y2: controlsY + arrowSize / 2
                };

                leftArrowBounds = {
                    x1: rightArrowBounds.x1 - gapArrows - arrowSize,
                    y1: rightArrowBounds.y1,
                    x2: rightArrowBounds.x1 - gapArrows,
                    y2: rightArrowBounds.y2
                };

                // Page info text
                p.textAlign(p.RIGHT, p.CENTER);
                p.textSize(11);
                p.fill(0);
                var pageInfo = "Page " + (pageIndex + 1) + " / " + (maxPageIndex + 1);
                p.text(pageInfo, leftArrowBounds.x1 - 8, controlsY);

                // Draw left arrow box
                p.rectMode(p.CORNER);
                if (pageIndex === 0) {
                    p.fill(235);
                    p.stroke(210);
                } else {
                    p.fill(245);
                    p.stroke(200);
                }
                p.rect(leftArrowBounds.x1, leftArrowBounds.y1,
                       leftArrowBounds.x2 - leftArrowBounds.x1,
                       leftArrowBounds.y2 - leftArrowBounds.y1, 4);

                // Draw right arrow box
                if (pageIndex === maxPageIndex) {
                    p.fill(235);
                    p.stroke(210);
                } else {
                    p.fill(245);
                    p.stroke(200);
                }
                p.rect(rightArrowBounds.x1, rightArrowBounds.y1,
                       rightArrowBounds.x2 - rightArrowBounds.x1,
                       rightArrowBounds.y2 - rightArrowBounds.y1, 4);

                // Arrow labels
                p.noStroke();
                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.text("<",
                       (leftArrowBounds.x1 + leftArrowBounds.x2) / 2,
                       (leftArrowBounds.y1 + leftArrowBounds.y2) / 2);
                p.text(">",
                       (rightArrowBounds.x1 + rightArrowBounds.x2) / 2,
                       (rightArrowBounds.y1 + rightArrowBounds.y2) / 2);
            }
        }
    };
})();
