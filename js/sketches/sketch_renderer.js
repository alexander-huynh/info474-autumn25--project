// sketch_renderer.js

// Responsible for rendering the main visualization based on the current active index
(function () {
    window.Renderer = {

        setData: function (manager) {
            // basic layout offsets
            manager.offsetX = (manager.margin && manager.margin.left) || 20;
            manager.offsetY = (manager.margin && manager.margin.top) || 0;

            // load FinalData.csv using your new helper
            return DataLoader.loadFinalData()
                .then(function (rows) {
                    manager.data = Array.isArray(rows) ? rows : [];
                    try {
                        console.log('Renderer.setData: loaded rows:', manager.data.length);
                    } catch (e) { }
                    return manager.data;
                })
                .catch(function (err) {
                    console.error('Renderer.setData: error loading FinalData.csv', err);
                    manager.data = [];
                    return manager.data;
                });
        },


        draw: function (p, manager, ai, progress) {
            try { console.log('Renderer: delegating draw, ai=', ai); } catch (e) { }

            if (ai === 0) {
                // window.VizTitle.draw(p, manager, ai, progress);
                return;
            }

            if (ai === 1) { // Fuel Type vs CO2
                window.VizBar3.draw(p, manager, ai, progress);
                return;
            }

            if (ai === 2) { // Engine Size vs CO2
                window.VizScatter.draw(p, manager, ai, progress);
                return;
            }

            if (ai === 3) { // Engine Size vs CO2
                window.VizScatter2.draw(p, manager, ai, progress);
                return;
            }

            if (ai >= 4 && ai < 7) {
                window.VizBar.draw(p, manager, ai, progress);
                return;
            }

            if (ai === 7) {
                window.VizScatter.draw(p, manager, ai, progress);
                return;
            }

            // NEW: section 8 -> VizOutro
            if (ai === 8) {
                window.VizScatter2.draw(p, manager, ai, progress);
                return;
            }

            // NEW: section 8 -> VizOutro
            if (ai === 9) {
                window.VizBar3.draw(p, manager, ai, progress);
                return;
            }


        }
    };
})();
