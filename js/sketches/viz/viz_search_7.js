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
        return getNumericFromKeys(d, [
            "engine_size",
            "engine_capacity",
            "engine_displacement",
            "engine_cc",
            "engine_size_cc"
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
            if (currentAi !== 6 || !inputFocused) return;

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
            if (currentAi !== 6 || !inputFocused) return;

            if (p.keyCode === p.BACKSPACE) {
                if (isPlaceholder || inputSelectAll) {
                    // delete everything (placeholder or selected text)
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
            if (currentAi !== 6) return;

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
            } else {
                inputFocused = false;
                inputSelectAll = false;
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

            // title + subtitle
            p.fill(0);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(30);
            p.text("How Does Your Car Compare?", cardX + 12, cardY + 10);

            p.textSize(18);
            p.fill(90);
            p.text(
                "Search your car model to compare its CO\u2082 and power to the dataset average.",
                cardX + 12,
                cardY + 45
            );

            // search label
            p.textSize(18);
            p.fill(0);
            p.text(
                "Search car model (type and press Enter):",
                cardX + 40,
                cardY + 85
            );

            // faux input box
            var inputX = cardX + 40;
            var inputY = cardY + 115;
            var inputW = cardW - 80;
            var inputH = 38;

            inputBounds = { x: inputX, y: inputY, w: inputW, h: inputH };

            p.stroke(inputFocused ? p.color(40, 120, 200) : p.color(210));
            p.strokeWeight(1.5);
            p.fill(255);
            p.rect(inputX, inputY, inputW, inputH, 4);

            p.noStroke();
            p.textAlign(p.LEFT, p.CENTER);
            p.textSize(16);

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
            var infoY = cardY + 170;

            if (!searchHasRun) {
                p.textSize(16);
                p.text(
                    "Start typing the name of your car and press Enter.\n" +
                    "We'll look it up in the EU emissions dataset and show how it compares\n" +
                    "to the average car in terms of CO\u2082 and horsepower.",
                    infoX,
                    infoY
                );
                return;
            }

            if (!lastResult) {
                p.textSize(16);
                p.text(
                    "No matching cars found in the dataset.\n" +
                    "Try a shorter or simpler search (for example just 'Golf' or 'Prius').",
                    infoX,
                    infoY
                );
                return;
            }

            // we have a match
            var car = lastResult;

            var lineY = infoY;
            p.textSize(18);
            p.text("Closest match:", infoX, lineY);
            lineY += 28;

            p.textSize(26);
            p.text(car.make + " " + car.model, infoX, lineY);
            lineY += 38;

            p.textSize(16);
            var engText = isFinite(car.engine) ? car.engine.toFixed(0) + " cc" : "n/a";
            p.text("Fuel: " + car.fuel + "    |    Engine: " + engText, infoX, lineY);
            lineY += 45;

            // Side-by-side comparison bars
            if (isFinite(avgCo2) && isFinite(avgHp)) {
                var barAreaX = infoX;
                var barAreaY = lineY;
                var barW = (cardW - 120) / 2 - 20; // two columns with gap
                var barH = 22;
                var gap = 50;

                // CO2 column (left)
                var co2X = barAreaX;
                p.textSize(17);
                p.fill(0);
                p.text("CO\u2082 (g/km)", co2X, barAreaY);
                p.textSize(13);
                p.fill(100);
                p.text("lower is better", co2X, barAreaY + 20);

                var co2BarY = barAreaY + 46;
                var maxCo2 = Math.max(avgCo2, car.co2) * 1.15;

                // Your car bar
                p.noStroke();
                p.fill(40, 120, 200);
                var carCo2Len = barW * (car.co2 / maxCo2);
                p.rect(co2X, co2BarY, carCo2Len, barH, 3);
                p.fill(0);
                p.textSize(15);
                p.text(car.co2.toFixed(0), co2X + carCo2Len + 10, co2BarY + 4);

                // Average bar
                p.fill(200);
                var avgCo2Len = barW * (avgCo2 / maxCo2);
                p.rect(co2X, co2BarY + 32, avgCo2Len, barH, 3);
                p.fill(100);
                p.text(avgCo2.toFixed(0) + " avg", co2X + avgCo2Len + 10, co2BarY + 36);

                // Delta label
                var dCo2 = car.co2 - avgCo2;
                p.textSize(15);
                if (Math.abs(dCo2) < 1) {
                    p.fill(100);
                    p.text("same as avg", co2X, co2BarY + 68);
                } else if (dCo2 < 0) {
                    p.fill(34, 139, 34); // green
                    p.text("\u2193 " + Math.abs(dCo2).toFixed(0) + " lower", co2X, co2BarY + 68);
                } else {
                    p.fill(200, 80, 80); // red
                    p.text("\u2191 " + dCo2.toFixed(0) + " higher", co2X, co2BarY + 68);
                }

                // HP column (right)
                var hpX = barAreaX + barW + gap;
                p.textSize(17);
                p.fill(0);
                p.text("Horsepower", hpX, barAreaY);
                p.textSize(13);
                p.fill(100);
                p.text("higher is better", hpX, barAreaY + 20);

                var hpBarY = barAreaY + 46;
                var maxHp = Math.max(avgHp, car.hp) * 1.15;

                // Your car bar
                p.noStroke();
                p.fill(40, 120, 200);
                var carHpLen = barW * (car.hp / maxHp);
                p.rect(hpX, hpBarY, carHpLen, barH, 3);
                p.fill(0);
                p.textSize(15);
                p.text(car.hp.toFixed(0), hpX + carHpLen + 10, hpBarY + 4);

                // Average bar
                p.fill(200);
                var avgHpLen = barW * (avgHp / maxHp);
                p.rect(hpX, hpBarY + 32, avgHpLen, barH, 3);
                p.fill(100);
                p.text(avgHp.toFixed(0) + " avg", hpX + avgHpLen + 10, hpBarY + 36);

                // Delta label
                var dHp = car.hp - avgHp;
                p.textSize(15);
                if (Math.abs(dHp) < 1) {
                    p.fill(100);
                    p.text("same as avg", hpX, hpBarY + 68);
                } else if (dHp > 0) {
                    p.fill(34, 139, 34); // green
                    p.text("\u2191 " + dHp.toFixed(0) + " more", hpX, hpBarY + 68);
                } else {
                    p.fill(200, 80, 80); // red
                    p.text("\u2193 " + Math.abs(dHp).toFixed(0) + " less", hpX, hpBarY + 68);
                }

                // Legend at bottom
                var legendY = hpBarY + 105;
                p.textSize(14);
                p.noStroke();
                p.fill(40, 120, 200);
                p.rect(barAreaX, legendY, 16, 16, 2);
                p.fill(80);
                p.text("Your car", barAreaX + 24, legendY + 1);

                p.fill(200);
                p.rect(barAreaX + 110, legendY, 16, 16, 2);
                p.fill(80);
                p.text("Dataset average", barAreaX + 134, legendY + 1);
            }
        }
    };
})();