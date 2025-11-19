(function () {
    window.VizBar3 = {
        draw: function (p, manager, ai, progress) {

            // layout from manager
            var data = manager.data || [];
            var left = manager.offsetX || 0;
            var top = manager.offsetY || 0;
            var w = manager.width || 600;
            var h = manager.height || 520;

            // background + default text
            p.background(255);
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(16);

            if (!data.length) {
                p.text('No data loaded for fuel-type plot.', left + w / 2, top + h / 2);
                return;
            }
        }
    };
