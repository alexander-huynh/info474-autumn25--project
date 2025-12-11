(function () {
    var currentAi = -1;

    // typing state
    var searchQuery = "e.g., Prius, Golf, 3 Series"; // start with placeholder as real text
    var searchHasRun = false;
    var lastResult = null;

    // dataset stats
    var statsInitialized = false;
    var avgCo2 = NaN;
    var avgHp = NaN;

    var eventsBound = false;

    // input focus / selection state
    var inputBounds = null;
    var inputFocused = false;
    var inputSelectAll = false;
    var isPlaceholder = true; // track if the current text is just placeholder

    // ---------- helpers for reading data -----------------------------------
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

    function getEngineSize(d) {
        // Dataset uses 'power' for engine size in cc
        return getNumericFromKeys(d, [
            "power",
            "engine_capacity_cm3",
            "engine_size",
            "engine_capacity",
            "engine_cc"
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

    // ---------- search logic -----------------------------------------------
    function runSearch(data) {
        searchHasRun = true;
        lastResult = null;

        var q = searchQuery.trim().toLowerCase();
        if (!q || isPlaceholder) return;

        var candidates = [];
        for (var i = 0; i < data.length; i++) {
            var d = data[i];
            var make = getMake(d);
            var model = getModel(d);
            var name = (make + " " + model).toLowerCase();

            if (name.indexOf(q) === -1) continue;

            var co2 = getCo2(d);
            var hp = getHP(d);
            var eng = getEngineSize(d);

            if (!isFinite(co2) || !isFinite(hp)) continue;

            candidates.push({
                raw: d,
                make: make,
                model: model,
                co2: co2,
                hp: hp,
                engine: eng,
                fuel: mapFuelCategory(getFuelRaw(d))
            });
        }

        if (!candidates.length) return;

        // pick the one with lowest CO2 among matches
        candidates.sort(function (a, b) { return a.co2 - b.co2; });
        lastResult = candidates[0];
    }

    // ---------- keyboard + mouse events -----------------------------------
    function attachEventsOnce(p, manager) {
        if (eventsBound) return;
        eventsBound = true;

        p.keyTyped = function () {
            if (currentAi !== 7 || !inputFocused) return;

            if (p.key.length === 1 && searchQuery.length < 30) {
                var ch = p.key;
                if (ch >= " " && ch <= "~") {
                    // if placeholder or "selected", clear first
                    if (isPlaceholder || inputSelectAll) {
                        searchQuery = "";
                        isPlaceholder = false;
                        inputSelectAll = false;
                    }
                    searchQuery += ch;
                }
            }
        };

        p.keyPressed = function () {
            if (currentAi !== 7 || !inputFocused) return;

            // Handle SPACE key here (before browser can scroll)
            if (p.keyCode === 32) {  // 32 = space
                if (searchQuery.length < 30) {
                    if (isPlaceholder || inputSelectAll) {
                        searchQuery = "";
                        isPlaceholder = false;
                        inputSelectAll = false;
                    }
                    searchQuery += " ";
                }
                return false;  // prevent default (scrolling)
            }

            if (p.keyCode === p.BACKSPACE) {
                if (isPlaceholder || inputSelectAll) {
                    searchQuery = "";
                    isPlaceholder = false;
                    inputSelectAll = false;
                } else if (searchQuery.length > 0) {
                    searchQuery = searchQuery.slice(0, -1);
                }
                return false;
            }

            if (p.keyCode === p.ENTER || p.keyCode === p.RETURN) {
                runSearch(manager.data || []);
                inputSelectAll = false;
                return false;
            }
        };

        p.mousePressed = function () {
            if (currentAi !== 7) return;
            if (
                inputBounds &&
                p.mouseX >= inputBounds.x &&
                p.mouseX <= inputBounds.x + inputBounds.w &&
                p.mouseY >= inputBounds.y &&
                p.mouseY <= inputBounds.y + inputBounds.h
            ) {
                // click inside: focus and visually "select all"
                inputFocused = true;
                inputSelectAll = (searchQuery.length > 0);
                window.__searchInputFocused = true;
            } else {
                inputFocused = false;
                inputSelectAll = false;
                window.__searchInputFocused = false;
            }
        };
    }

    // ---------- main draw --------------------------------------------------
    window.VizSearchCar = {
        draw: function (p, manager, ai, progress) {
            var data = manager.data || [];
            currentAi = ai;
            attachEventsOnce(p, manager);

            var left = manager.offsetX || 0;
            var top = manager.offsetY || 0;
            var w = manager.width || 600;
            var h = manager.height || 520;

            p.background(255);

            if (!data.length) {
                p.fill(0);
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(18);
                p.text("No data loaded for search viz.", left + w / 2, top + h / 2);
                return;
            }

            // compute dataset averages once
            if (!statsInitialized) {
                var sumC = 0, sumH = 0, count = 0;
                for (var i = 0; i < data.length; i++) {
                    var c = getCo2(data[i]);
                    var h = getHP(data[i]);
                    if (!isFinite(c) || !isFinite(h)) continue;
                    sumC += c;
                    sumH += h;
                    count++;
                }
                if (count > 0) {
                    avgCo2 = sumC / count;
                    avgHp = sumH / count;
                }
                statsInitialized = true;
            }

            // card
            var cardX = left + 20;
            var cardY = top + 20;
            var cardW = w - 40;
            var cardH = h - 40;

            // white card, NO border
            p.noStroke();
            p.fill(255);
            p.rect(cardX, cardY, cardW, cardH, 6);

            // title
            p.fill(0);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(28);
            p.text("How Does Your Car Compare?", cardX + 12, cardY + 10);

            // subtitle - shorter to avoid cutoff
            p.textSize(16);
            p.fill(90);
            p.text(
                "Compare your car's CO\u2082 and power to the dataset average.",
                cardX + 12,
                cardY + 44
            );

            // search label
            p.textSize(16);
            p.fill(0);
            p.text(
                "Search car model (type and press Enter):",
                cardX + 40,
                cardY + 80
            );

            // faux input box
            var inputX = cardX + 40;
            var inputY = cardY + 108;
            var inputW = cardW - 80;
            var inputH = 36;

            inputBounds = { x: inputX, y: inputY, w: inputW, h: inputH };

            p.stroke(inputFocused ? p.color(40, 120, 200) : p.color(210));
            p.strokeWeight(1.5);
            p.fill(255);
            p.rect(inputX, inputY, inputW, inputH, 4);

            p.noStroke();
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(15);

            // placeholder is just the initial text; draw it lighter when unfocused
            if (isPlaceholder && !inputFocused) {
                p.fill(140);
            } else {
                p.fill(0);
            }

            // selection highlight when "select all" is active
            if (inputFocused && inputSelectAll && searchQuery.length > 0) {
                var tw = p.textWidth(searchQuery);
                p.fill(200, 220, 255);
                p.rect(inputX + 6, inputY + 4, tw + 4, inputH - 8, 2);
                p.fill(0);
            }

            p.text(searchQuery, inputX + 10, inputY + inputH / 2);

            // ------------------ result / comparison area --------------------
            p.textAlign(p.LEFT, p.TOP);
            p.fill(0);

            var infoX = cardX + 40;
            var infoY = cardY + 158;

            if (!searchHasRun) {
                p.textSize(15);
                p.text(
                    "Start typing the name of your car and press Enter.\n" +
                    "We'll look it up in the EU emissions dataset and show\n" +
                    "how it compares to the average car.",
                    infoX,
                    infoY
                );
                return;
            }

            if (!lastResult) {
                p.textSize(15);
                p.text(
                    "No matching cars found in the dataset.\n" +
                    "Try a shorter or simpler search (e.g., 'Golf' or 'Prius').",
                    infoX,
                    infoY
                );
                return;
            }

            // we have a match
            var car = lastResult;

            var lineY = infoY;
            p.textSize(16);
            p.text("Closest match:", infoX, lineY);
            lineY += 24;

            p.textSize(24);
            p.text(car.make + " " + car.model, infoX, lineY);
            lineY += 32;

            // Just show fuel type and engine size
            p.textSize(15);
            p.fill(80);
            var engText = isFinite(car.engine) ? (car.engine / 1000).toFixed(1) + "L" : "";
            if (engText) {
                p.text("Fuel: " + car.fuel + "  |  Engine: " + engText, infoX, lineY);
            } else {
                p.text("Fuel: " + car.fuel, infoX, lineY);
            }
            lineY += 35;

            // Side-by-side comparison bars
            if (isFinite(avgCo2) && isFinite(avgHp)) {
                var barAreaX = infoX;
                var barAreaY = lineY;
                var barW = (cardW - 120) / 2 - 20; // two columns with gap
                var barH = 20;
                var gap = 50;

                // CO2 column (left)
                var co2X = barAreaX;
                p.textSize(16);
                p.fill(0);
                p.text("CO\u2082 (g/km)", co2X, barAreaY);
                p.textSize(12);
                p.fill(100);
                p.text("lower is better", co2X, barAreaY + 18);

                var co2BarY = barAreaY + 40;
                var maxCo2 = Math.max(avgCo2, car.co2) * 1.15;

                // Your car bar
                p.noStroke();
                p.fill(40, 120, 200);
                var carCo2Len = barW * (car.co2 / maxCo2);
                p.rect(co2X, co2BarY, carCo2Len, barH, 3);
                p.fill(0);
                p.textSize(14);
                p.text(car.co2.toFixed(0), co2X + carCo2Len + 8, co2BarY + 3);

                // Average bar
                p.fill(200);
                var avgCo2Len = barW * (avgCo2 / maxCo2);
                p.rect(co2X, co2BarY + 28, avgCo2Len, barH, 3);
                p.fill(100);
                p.text(avgCo2.toFixed(0), co2X + avgCo2Len + 8, co2BarY + 31);

                // Delta label with units
                var dCo2 = car.co2 - avgCo2;
                p.textSize(14);
                if (Math.abs(dCo2) < 1) {
                    p.fill(100);
                    p.text("same as avg", co2X, co2BarY + 58);
                } else if (dCo2 < 0) {
                    p.fill(34, 139, 34); // green
                    p.text("\u2193 " + Math.abs(dCo2).toFixed(0) + " g/km lower", co2X, co2BarY + 58);
                } else {
                    p.fill(200, 80, 80); // red
                    p.text("\u2191 " + dCo2.toFixed(0) + " g/km higher", co2X, co2BarY + 58);
                }

                // HP column (right)
                var hpX = barAreaX + barW + gap;
                p.textSize(16);
                p.fill(0);
                p.text("Horsepower", hpX, barAreaY);
                p.textSize(12);
                p.fill(100);
                p.text("higher is better", hpX, barAreaY + 18);

                var hpBarY = barAreaY + 40;
                var maxHp = Math.max(avgHp, car.hp) * 1.15;

                // Your car bar
                p.noStroke();
                p.fill(40, 120, 200);
                var carHpLen = barW * (car.hp / maxHp);
                p.rect(hpX, hpBarY, carHpLen, barH, 3);
                p.fill(0);
                p.textSize(14);
                p.text(car.hp.toFixed(0), hpX + carHpLen + 8, hpBarY + 3);

                // Average bar
                p.fill(200);
                var avgHpLen = barW * (avgHp / maxHp);
                p.rect(hpX, hpBarY + 28, avgHpLen, barH, 3);
                p.fill(100);
                p.text(avgHp.toFixed(0), hpX + avgHpLen + 8, hpBarY + 31);

                // Delta label with units
                var dHp = car.hp - avgHp;
                p.textSize(14);
                if (Math.abs(dHp) < 1) {
                    p.fill(100);
                    p.text("same as avg", hpX, hpBarY + 58);
                } else if (dHp > 0) {
                    p.fill(34, 139, 34); // green
                    p.text("\u2191 " + dHp.toFixed(0) + " hp more", hpX, hpBarY + 58);
                } else {
                    p.fill(200, 80, 80); // red
                    p.text("\u2193 " + Math.abs(dHp).toFixed(0) + " hp less", hpX, hpBarY + 58);
                }

                // Legend at bottom
                var legendY = hpBarY + 90;
                p.textSize(13);
                p.noStroke();
                p.fill(40, 120, 200);
                p.rect(barAreaX, legendY, 14, 14, 2);
                p.fill(80);
                p.text("Your car", barAreaX + 20, legendY);

                p.fill(200);
                p.rect(barAreaX + 100, legendY, 14, 14, 2);
                p.fill(80);
                p.text("Dataset average", barAreaX + 120, legendY);
            }
        }
    };
})();