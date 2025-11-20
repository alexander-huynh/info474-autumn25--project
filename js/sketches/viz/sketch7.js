(function () {
    var currentAi = -1;

    // typing state
    var searchQuery = "";
    var searchHasRun = false;
    var lastResult = null;

    // dataset stats
    var statsInitialized = false;
    var avgCo2 = NaN;
    var avgHp = NaN;

    var eventsBound = false;

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
        if (!q) return;

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

    // ---------- keyboard events -------------------------------------------
    function attachEventsOnce(p, manager) {
        if (eventsBound) return;
        eventsBound = true;

        p.keyTyped = function () {

            // allow basic letters, numbers, space
            if (p.key.length === 1 && searchQuery.length < 30) {
                var ch = p.key;
                // ignore weird control characters
                if (ch >= " " && ch <= "~") {
                    searchQuery += ch;
                }
            }
        };

        p.keyPressed = function () {

            if (p.keyCode === p.BACKSPACE) {
                if (searchQuery.length > 0) {
                    searchQuery = searchQuery.slice(0, -1);
                }
                return false; // prevent browser going back
            }

            if (p.keyCode === p.ENTER || p.keyCode === p.RETURN) {
                runSearch(manager.data || []);
                return false;
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
                p.textSize(16);
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

            p.noStroke();
            p.fill(230);
            p.rect(cardX, cardY, cardW, cardH, 6);

            // title
            p.fill(0);
            p.textAlign(p.LEFT, p.TOP);
            p.textSize(14);
            p.text("Visual 7 – Search Your Car: See How It Compares",
                   cardX + 12, cardY + 10);

            p.textSize(12);

            // search label
            p.text("Search car model (type and press Enter):",
                   cardX + 40, cardY + 60);

            // fake input box
            var inputX = cardX + 40;
            var inputY = cardY + 80;
            var inputW = cardW - 80;
            var inputH = 26;

            p.stroke(160);
            p.strokeWeight(1.5);
            p.fill(245);
            p.rect(inputX, inputY, inputW, inputH, 4);

            p.noStroke();
            p.fill(0);
            p.textAlign(p.LEFT, p.CENTER);

            var displayText = searchQuery || "e.g., Prius, Golf, 3 Series";
            var placeholder = searchQuery.length === 0;
            if (placeholder) p.fill(120);

            p.text(displayText, inputX + 8, inputY + inputH / 2);

            // ------------------ result / comparison area --------------------
            p.textAlign(p.LEFT, p.TOP);
            p.fill(0);

            var infoX = cardX + 40;
            var infoY = cardY + 120;

            if (!searchHasRun) {
                p.text(
                    "Start typing the name of your car and press Enter.\n" +
                    "We’ll look it up in the EU emissions dataset and show how it\n" +
                    "compares to the average car in terms of CO\u2082 and horsepower.",
                    infoX, infoY
                );
                return;
            }

            if (!lastResult) {
                p.text(
                    "No matching cars found in the dataset.\n" +
                    "Try a shorter or simpler search (for example just 'Golf' or 'Prius').",
                    infoX, infoY
                );
                return;
            }

            // we have a match
            var car = lastResult;

            var lineY = infoY;
            p.textSize(13);
            p.text("Closest match:", infoX, lineY); lineY += 20;

            p.textSize(15);
            p.text(car.make + " " + car.model, infoX, lineY);
            lineY += 22;

            p.textSize(12);

            var engText = isFinite(car.engine) ? car.engine.toFixed(0) + " cc" : "n/a";
            p.text(
                "Fuel: " + car.fuel +
                "    |    Engine: " + engText,
                infoX, lineY
            );
            lineY += 18;

            p.text(
                "Your car – CO\u2082: " + car.co2.toFixed(0) + " g/km,  HP: " +
                car.hp.toFixed(0),
                infoX, lineY
            );
            lineY += 18;

            if (isFinite(avgCo2) && isFinite(avgHp)) {
                p.text(
                    "Dataset average – CO\u2082: " + avgCo2.toFixed(0) +
                    " g/km,  HP: " + avgHp.toFixed(0),
                    infoX, lineY
                );
                lineY += 20;

                // quick verbal comparison
                var dCo2 = car.co2 - avgCo2;
                var dHp = car.hp - avgHp;

                var co2Phrase =
                    (Math.abs(dCo2) < 1) ? "about the same emissions as" :
                    (dCo2 < 0 ? Math.abs(dCo2).toFixed(0) + " g/km lower CO\u2082 than" :
                                dCo2.toFixed(0) + " g/km higher CO\u2082 than");

                var hpPhrase =
                    (Math.abs(dHp) < 1) ? "about the same power as" :
                    (dHp > 0 ? dHp.toFixed(0) + " more HP than" :
                               Math.abs(dHp).toFixed(0) + " less HP than");

                p.text(
                    "Interpretation: your car has " + co2Phrase +
                    " the average car,\n" +
                    "and " + hpPhrase + " the average car in this dataset.",
                    infoX, lineY
                );
            }

            // simple horizontal comparison bar for CO2
            if (isFinite(avgCo2)) {
                var barX = cardX + 40;
                var barY = cardY + cardH - 70;
                var barW = cardW - 80;
                var barH = 10;

                // base axis
                p.textSize(12);
                p.fill(0);
                p.text("CO\u2082 comparison (lower is better):", barX, barY - 18);

                var maxScale = Math.max(avgCo2, car.co2) * 1.2;

                // average bar (grey)
                p.noStroke();
                p.fill(190);
                var avgLen = barW * (avgCo2 / maxScale);
                p.rect(barX, barY, avgLen, barH, 3);
                p.fill(60);
                p.text("Average", barX + avgLen + 6, barY - 2);

                // your car bar (purple-ish)
                p.fill(80);
                var carLen = barW * (car.co2 / maxScale);
                p.rect(barX, barY + 18, carLen, barH, 3);
                p.fill(20);
                p.text("Your car", barX + carLen + 6, barY + 16);
            }
        }
    };
})();