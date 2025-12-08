// sketch_renderer.js
// Responsible for rendering the main visualization based on the current active index
(function () {

    let lastAi = null;

    window.Renderer = {

        setData: function (manager) {
            manager.offsetX = (manager.margin && manager.margin.left) || 20;
            manager.offsetY = (manager.margin && manager.margin.top) || 0;

            return DataLoader.loadFinalData()
                .then(function (rows) {
                    manager.data = Array.isArray(rows) ? rows : [];
                    console.log('Renderer.setData: loaded rows:', manager.data.length);
                    return manager.data;
                })
                .catch(function (err) {
                    console.error('Renderer.setData: error loading FinalData.csv', err);
                    manager.data = [];
                    return manager.data;
                });
        },

        draw: function (p, manager, ai, progress) {
            try { console.log('Renderer: delegating draw, ai=', ai); } catch (e) {}

            // ---- LIFECYCLE SUPPORT -------------------------------------
            if (ai !== lastAi) {

                // previous viz exit
                if (lastAi === 6 && window.VizSearchCar.onExit) {
                    window.VizSearchCar.onExit(p, manager);
                }

                // new viz enter
                if (ai === 6 && window.VizSearchCar.onEnter) {
                    window.VizSearchCar.onEnter(p, manager);
                }

                lastAi = ai;
            }
            // --------------------------------------------------------------

if (ai === 0) return;
if (ai === 1) return window.VizFuelTypes.draw(p, manager, ai, progress);
if (ai === 2) return window.VizScatter.draw(p, manager, ai, progress);
if (ai === 3) return window.VizScatter2.draw(p, manager, ai, progress);
if (ai === 4) return window.VizBar2.draw(p, manager, ai, progress);
if (ai === 5) return window.VizCountry.draw(p, manager, ai, progress);
if (ai === 6) return window.VizFilterPanel.draw(p, manager, ai, progress);
if (ai === 7) return window.VizSearchCar.draw(p, manager, ai, progress);
        }
    };
})();
