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

    // We keep getPrice for display only, but no price slider/filter now
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

    // Synthetic price if no real price column exists (for display only)
    function getPrice(d) {
        var direct = getNumericFromKeys(d, [
            "price",
            "price_eur",
            "priceEuro",
            "price_euro"
        ]);
        if (isFinite(direct)) return direct;

        var hp = getHP(d);
        var co2 = getCo2(d);
        if (!isFinite(hp) && !isFinite(co2)) return NaN;

        var base = 15000;
        var hpComponent = isFinite(hp) ? hp * 80 : 0;
        var co2Component = isFinite(co2) ? co2 * 20 : 0;
        return base + hpComponent + co2Component;
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
        if (f.indexOf("PETROL") !== -1) return "Petrol";
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

    var fuelOptions = ["Any", "Petrol", "Diesel"];
    var selectedFuelIndex = 0;
    var fuelButtons = [];

    var eventsBound = false;

    // -----------------------------------------------------------------------
    function attachEventsOnce(p) {
        if (eventsBound) return;
        eventsBound = true;

        p.mousePressed = function () {
            if (currentAi !== 5) return;

            var mx = p.mouseX;
            var my = p.mouseY;

            // CO₂ slider
            if (co2Slider.bounds) {
                var b = co2Slider.bounds;
                if (my >= b.y - 8 && my <= b.y + 8 && mx >= b.x1 && mx <= b.x2) {
                    var t = (mx - b.x1) / (b.x2 - b.x1);
                    t = Math.max(0, Math.min(1, t));
                    co2Slider.value = co2Slider.min + t * (co2Slider.max - co2Slider.min);
                }
            }

            // HP slider
            if (hpSlider.bounds) {
                var hb = hpSlider.bounds;
                if (my >= hb.y - 8 && my <= hb.y + 8 && mx >= hb.x1 && mx <= hb.x2) {
                    var th = (mx - hb.x1) / (hb.x2 - hb.x1);
                    th = Math.max(0, Math.min(1, th));
                    hpSlider.value = hpSlider.min + th * (hpSlider.max - hpSlider.min);
                }
            }

            // Fuel buttons
            for (var i = 0; i < fuelButtons.length; i++) {
                var fb = fuelButtons[i];
                if (mx >= fb.x1 && mx <= fb.x2 && my >= fb.y1 && my <= fb.y2) {
                    selectedFuelIndex = i;
                    break;
                }
            }
        };
    }

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

            // ---- Card ------------------------------------------------------
            var cardX = left + 20;
            var cardY = top + 20;
            var cardW = w - 40;
            var cardH = h - 40;

            // white card, light border
            p.stroke(220);
            p.strokeWeight(1);
            p.fill(255);
            p.rect(cardX, cardY, cardW, cardH, 6);

            // Title + subtitle
            p.fill(0);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(14);
            p.text("Find a Car That Fits Your Values", cardX + 12, cardY + 10);

            p.textSize(11);
            p.fill(90);
            p.text("Filter by CO\u2082, power, and fuel type.", cardX + 12, cardY + 30);

            // ---- Slider geometry -------------------------------------------
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

            // ---- Draw sliders ----------------------------------------------
            function drawSlider(slider, y) {
                // track
                p.stroke(210);
                p.strokeWeight(3);
                p.line(sliderX1, y, sliderX2, y);

                // handle
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

            // ---- Fuel buttons ----------------------------------------------
            p.fill(0);
            p.noStroke();
            p.textAlign(p.LEFT, p.TOP);
            p.text("Fuel type:", cardX + 40, cardY + 165);

            fuelButtons = [];
            var btnX = cardX + 40;
            var btnY = cardY + 185;
            var btnW = 70;
            var btnH = 22;
            var gap = 10;

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

            // ---- Filter + show cars (bottom of card) -----------------------
            var maxCo2     = co2Slider.value;
            var minHp      = hpSlider.value;
            var fuelChoice = fuelOptions[selectedFuelIndex];

            var filtered = [];
            for (var idx = 0; idx < data.length; idx++) {
                var d = data[idx];
                var co2   = getCo2(d);
                var hp    = getHP(d);
                var price = getPrice(d);
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
                    price: price,
                    fuel:  fuel
                });
            }

            filtered.sort(function (a, b) { return a.co2 - b.co2; });

            var listX = cardX + 40;
            var listY = cardY + 225;

            p.textAlign(p.LEFT, p.TOP);
            p.textSize(12);
            p.fill(0);

            if (!filtered.length) {
                p.text("No cars match your filters.\nTry relaxing CO\u2082 or HP.",
                       listX, listY);
            } else {
                var maxShown = Math.min(5, filtered.length);
                p.text(
                    "Top matching cars (lowest CO\u2082 first)\n" +
                    "Showing " + maxShown + " of " + filtered.length + " matches:",
                    listX, listY
                );

                var ly = listY + 30;
                for (var k = 0; k < maxShown; k++) {
                    var car = filtered[k];

                    var priceText;
                    if (isFinite(car.price)) {
                        if (car.price >= 1000) {
                            priceText = "\u20ac" + (car.price / 1000).toFixed(1) + "k";
                        } else {
                            priceText = "\u20ac" + car.price.toFixed(0);
                        }
                    } else {
                        priceText = "price n/a";
                    }

                    p.textSize(12);
                    p.text(
                        (k + 1) + ". " + car.make + " " + car.model +
                        " — CO\u2082 " + car.co2.toFixed(0) + " g/km, " +
                        car.hp.toFixed(0) + " HP, " +
                        priceText + ", " + car.fuel,
                        listX, ly
                    );
                    ly += 20;
                }
            }
        }
    };
})();