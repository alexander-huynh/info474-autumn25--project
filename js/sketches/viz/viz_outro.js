// viz_outro.js
// New custom visualization for section 8
(function () {
    window.VizOutro = {
        draw: function (p, manager, ai, progress) {
            p.push();

            const left = manager.offsetX || 20;
            const top = manager.offsetY || 0;
            const w = manager.width || p.width;
            const h = manager.height || p.height;

            // Background
            p.background(240);

            // Example: concentric circles that react to scroll progress
            const cx = left + w / 2;
            const cy = top + h / 2;
            const maxR = Math.min(w, h) / 2.5;

            p.noFill();
            p.stroke(50, 120, 220);
            p.strokeWeight(2);

            const rings = 6;
            for (let i = 0; i < rings; i++) {
                const t = (i + 1) / rings;
                const r = maxR * t * (0.4 + 0.6 * progress);
                p.circle(cx, cy, 2 * r);
            }

            // Text
            p.noStroke();
            p.fill(0);
            p.textAlign(p.CENTER, p.CENTER);
            p.textSize(18);
            p.text('New outro sketch (section ' + ai + ')', cx, cy);

            p.pop();
        }
    };
})();
