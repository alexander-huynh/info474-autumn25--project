// data_loader.js
// Simple data loading and TSV parsing module. Exposes DataLoader.loadTSV(url)
(function () {
    function parseTSV(text) {
        var lines = (text || '').trim().split(/\r?\n/);
        if (!lines || lines.length === 0) return [];
        var header = lines[0].split('\t');
        var rows = lines.slice(1);
        return rows.map(function (line) {
            var parts = line.split('\t');
            var word = (parts[0] || '').replace(/^"|"$/g, '');
            var time = parseFloat(parts[1]);
            var filler = parts[2] ? (parts[2].trim() === '1' || parts[2].trim() === 'true') : false;
            return { word: word, time: time, filler: filler, min: Math.floor(time / 60) };
        });
    }

    function loadTSV(url) {
        return fetch(url).then(function (r) { return r.text(); }).then(function (text) {
            return parseTSV(text);
        });
    }

    function loadFinalData(url) {
        // default path if none is provided
        url = url || 'data/FinalData.csv';

        return fetch(url)
            .then(function (r) { return r.text(); })
            .then(function (text) {
                var lines = (text || '').trim().split(/\r?\n/);
                if (!lines.length) return [];

                // Parse header
                var header = lines[0].split(',').map(function (h) { return h.trim(); });

                var idxCo2   = header.indexOf('co2_nedc_gpkm');
                var idxPower = header.indexOf('engine_capacity_cc');

                if (idxCo2 === -1 || idxPower === -1) {
                    console.warn('FinalData.csv is missing expected columns');
                    return [];
                }

                var rows = lines.slice(1);
                var out = [];

                rows.forEach(function (line) {
                    if (!line.trim()) return;
                    var parts = line.split(',');

                    // Build full row object with all original columns
                    var rowObj = {};
                    header.forEach(function (name, i) {
                        rowObj[name] = (parts[i] !== undefined) ? parts[i].trim() : '';
                    });

                    // Add numeric convenience fields for visuals
                    var co2   = parseFloat(rowObj['co2_nedc_gpkm']);
                    var power = parseFloat(rowObj['engine_capacity_cc']);

                    if (!isNaN(co2) && !isNaN(power)) {
                        rowObj.co2   = co2;   // numeric CO2
                        rowObj.power = power; // numeric engine size / power
                        out.push(rowObj);
                    }
                });

                return out;
            });
    }



    window.DataLoader = {
       parseTSV: parseTSV,
       loadTSV: loadTSV,
       loadFinalData: loadFinalData
   };

    // Shared preprocess helper: normalize rows into the shape sketches expect.
    // Accepts an array of objects {word, time, filler, min} (as returned by parseTSV)
    // and returns an array with guaranteed types and an index property.
    window.DataLoader.preprocess = function (data) {
        data = data || [];
        return data.map(function (d, i) {
            return {
                word: (d.word || '').replace(/^"|"$/g, ''),
                filler: !!d.filler,
                time: +d.time || 0,
                min: (typeof d.min === 'number') ? d.min : Math.floor((+d.time || 0) / 60),
                index: i
            };
        });
    };
})();
