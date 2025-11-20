(function () {
    var currentAi = -1;

    // Slider state (CO2 + HP use fixed, forgiving ranges)
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

    // Price range will be inferred from synthetic prices once
    var priceSlider = {
        min: 0,
        max: 100000,
        value: 100000,
        bounds: null
    };
    var priceRangeInitialized = false;

    var fuelOptions = ["Any", "Petrol", "Diesel"];
    var selectedFuelIndex = 0;
    var fuelButtons = [];

    var eventsBound = false;

    // -------- generic numeric field helper ---------------------------------
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

    // Synthetic price if no real price column exists
    function getPrice(d) {
        // 1) If you ever add a real price column, it will be used
        var direct = getNumericFromKeys(d, [
            "price",
            "price_eur",
            "priceEuro",
            "price_euro"
        ]);
        if (isFinite(direct)) return direct;

        // 2) Otherwise compute a made-up price from HP + CO2
        var hp = getHP(d);
        var co2 = getCo2(d);
        if (!isFinite(hp) && !isFinite(co2)) return NaN;

        var base = 15000; // base price
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

            // Price slider
            if (priceSlider.bounds) {
                var pb = priceSlider.bounds;
                if (my >= pb.y - 8 && my <= pb.y + 8 && mx >= pb.x1 && mx <= pb.x2) {
                    var tp = (mx - pb.x1) / (pb.x2 - pb.x1);
                    tp = Math.max(0, Math.min(1, tp));
                    priceSlider.value =
                        priceSlider.min + tp * (priceSlider.max - priceSlider.min);
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

            // Initialize price range from synthetic prices once
            if (!priceRangeInitialized) {
                var minP = Infinity, maxP = -Infinity;
                for (var i = 0; i < data.length; i++) {
                    var pr = getPrice(data[i]);
                    if (!isFinite(pr)) continue;
                    if (pr < minP) minP = pr;
                    if (pr > maxP) maxP = pr;
                }
                if (!isFinite(minP) || !isFinite(maxP) || minP === maxP) {
                    minP = 10000;
                    maxP = 150000;
                }
                priceSlider.min = minP;
                priceSlider.max = maxP;
                priceSlider.value = maxP; // default: no effective cap
                priceRangeInitialized = true;
            }

            // ---- Card ------------------------------------------------------
            var cardX = left + 20;
            var cardY = top + 20;
            var cardW = w - 40;
            var cardH = h - 40;

            p.noStroke();
            p.fill(230);
            p.rect(cardX, cardY, cardW, cardH, 6);

            // Title
            p.fill(0);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(14);
            p.text("Visual 6 – Find a Car That Fits Your Values",
                   cardX + 12, cardY + 10);

            p.textSize(12);
            p.textAlign(p.LEFT, p.TOP);

            // ---- Slider geometry -------------------------------------------
            var sliderX1 = cardX + 40;
            var sliderX2 = cardX + 260;
            var co2Y    = cardY + 80;
            var hpY     = cardY + 130;
            var priceY  = cardY + 180;

            co2Slider.bounds   = { x1: sliderX1, x2: sliderX2, y: co2Y };
            hpSlider.bounds    = { x1: sliderX1, x2: sliderX2, y: hpY };
            priceSlider.bounds = { x1: sliderX1, x2: sliderX2, y: priceY };

            // Labels
            p.fill(0);
            p.text("Max CO\u2082 (g/km): " + co2Slider.value.toFixed(0),
                   cardX + 40, cardY + 60);
            p.text("Min horsepower: " + hpSlider.value.toFixed(0),
                   cardX + 40, cardY + 110);

            var priceLabel = "Max price: ";
            var pv = priceSlider.value;
            if (pv >= 1000) {
                priceLabel += "\u20ac" + (pv / 1000).toFixed(1) + "k";
            } else {
                priceLabel += "\u20ac" + pv.toFixed(0);
            }
            p.text(priceLabel, cardX + 40, cardY + 160);

            // ---- Draw sliders ----------------------------------------------
            function drawSlider(slider, y) {
                p.stroke(160);
                p.strokeWeight(3);
                p.line(sliderX1, y, sliderX2, y);

                var t = (slider.value - slider.min) / (slider.max - slider.min);
                t = Math.max(0, Math.min(1, t));
                var hx = sliderX1 + t * (sliderX2 - sliderX1);

                p.noStroke();
                p.fill(255);
                p.circle(hx, y, 12);
                p.stroke(120);
                p.noFill();
                p.circle(hx, y, 12);
            }

            drawSlider(co2Slider,   co2Y);
            drawSlider(hpSlider,    hpY);
            drawSlider(priceSlider, priceY);

            // ---- Fuel buttons ----------------------------------------------
            p.fill(0);
            p.noStroke();
            p.text("Fuel type:", cardX + 40, cardY + 205);

            fuelButtons = [];
            var btnX = cardX + 40;
            var btnY = cardY + 225;
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
                    p.fill(50);
                    p.rect(x1, y1, btnW, btnH, 4);
                    p.fill(255);
                } else {
                    p.fill(245);
                    p.rect(x1, y1, btnW, btnH, 4);
                    p.fill(0);
                }
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(11);
                p.text(fuelOptions[i], x1 + btnW / 2, y1 + btnH / 2);
            }

            // ---- Filter + show cars (bottom of card) -----------------------
            var maxCo2    = co2Slider.value;
            var minHp     = hpSlider.value;
            var maxPrice  = priceSlider.value;
            var fuelChoice = fuelOptions[selectedFuelIndex];

            var filtered = [];
            for (var idx = 0; idx < data.length; idx++) {
                var d = data[idx];
                var co2   = getCo2(d);
                var hp    = getHP(d);
                var price = getPrice(d);
                var fuel  = mapFuelCategory(getFuelRaw(d));

                if (!isFinite(co2) || !isFinite(hp) || !isFinite(price)) continue;
                if (co2 > maxCo2) continue;
                if (hp < minHp) continue;
                if (price > maxPrice) continue;
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
            var listY = cardY + 265; // bottom band

            p.textAlign(p.LEFT, p.TOP);
            p.textSize(12);
            p.fill(0);

            if (!filtered.length) {
                p.text("No cars match your filters.\nTry relaxing CO\u2082, HP, or price.",
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

                    // Name line
                    p.textSize(12);
                    p.text(
                        (k + 1) + ". " + car.make + " " + car.model,
                        listX, ly
                    );
                    ly += 14;

                    // Details line
                    p.textSize(11);
                    var priceText;
                    if (car.price >= 1000) {
                        priceText = "\u20ac" + (car.price / 1000).toFixed(1) + "k";
                    } else {
                        priceText = "\u20ac" + car.price.toFixed(0);
                    }

                    p.text(
                        "CO\u2082 " + car.co2.toFixed(0) + " g/km, " +
                        car.hp.toFixed(0) + " HP, " +
                        priceText + ", " + car.fuel,
                        listX + 18, ly
                    );
                    ly += 22;
                }
            }
        }
    };
})();